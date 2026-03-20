(function () {
  "use strict";

  if (window.__prPastTableInitialized) return;
  window.__prPastTableInitialized = true;

  const PR_PAST_START_YEAR = 2007;

  const prPastState = {
    renderToken: 0,
    inputTimer: null,
    domReadyHandled: false,
    chartRows: []
  };

  prPastExtendI18n();
  prPastPatchFunctions();
  prPastBindGlobalEvents();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", prPastInitDom);
  } else {
    prPastInitDom();
  }

  function prPastExtendI18n() {
    if (typeof prI18n !== "object" || !prI18n) return;

    if (prI18n.de) {
      prI18n.de.pastTitle = "Punkteverlauf";
      prI18n.de.pastYear = "Jahr";
      prI18n.de.pastTotal3 = "Summe 3-Kampf";
      prI18n.de.pastTotal4 = "Summe 4-Kampf";
      prI18n.de.pastLoading = "Punkteverlauf wird berechnet …";
      prI18n.de.pastNoData = "Für diese Auswahl sind keine Verlaufsdaten verfügbar.";
      prI18n.de.pastLoadError = "Fehler beim Laden der Verlaufsdaten.";
    }

    if (prI18n.en) {
      prI18n.en.pastTitle = "Points history";
      prI18n.en.pastYear = "Year";
      prI18n.en.pastTotal3 = "Total 3-event";
      prI18n.en.pastTotal4 = "Total 4-event";
      prI18n.en.pastLoading = "Points history is being calculated …";
      prI18n.en.pastNoData = "No history data is available for this selection.";
      prI18n.en.pastLoadError = "Error while loading the history data.";
    }
  }

  function prPastPatchFunctions() {
    if (typeof window.prRenderCurrentSelection === "function" && !window.prRenderCurrentSelection.__prPastWrapped) {
      const originalRender = window.prRenderCurrentSelection;

      window.prRenderCurrentSelection = async function (...args) {
        const result = await originalRender.apply(this, args);
        await prRenderPastTable();
        return result;
      };

      window.prRenderCurrentSelection.__prPastWrapped = true;
    }

    if (typeof window.prApplyLanguage === "function" && !window.prApplyLanguage.__prPastWrapped) {
      const originalApplyLanguage = window.prApplyLanguage;

      window.prApplyLanguage = function (...args) {
        const result = originalApplyLanguage.apply(this, args);
        prPastApplyLanguageOnly();
        return result;
      };

      window.prApplyLanguage.__prPastWrapped = true;
    }

    if (typeof window.prRestoreTimes === "function" && !window.prRestoreTimes.__prPastWrapped) {
      const originalRestoreTimes = window.prRestoreTimes;

      window.prRestoreTimes = function (...args) {
        const result = originalRestoreTimes.apply(this, args);
        prSchedulePastTableRender(0);
        return result;
      };

      window.prRestoreTimes.__prPastWrapped = true;
    }
  }

  function prPastBindGlobalEvents() {
    document.addEventListener("input", event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("pr-time-input")) return;

      prSchedulePastTableRender(60);
    });
  }

  function prPastInitDom() {
    if (prPastState.domReadyHandled) return;
    prPastState.domReadyHandled = true;

    prPastInjectStyles();
    prEnsurePastTableMounted();
    prPastApplyLanguageOnly();
    prSchedulePastTableRender(0);
  }

  function prPastInjectStyles() {
    if (document.getElementById("pr-past-table-style")) return;

    const style = document.createElement("style");
    style.id = "pr-past-table-style";
    style.textContent = `
      .pr-past-table-section {
        position: relative;
        max-width: 960px;
        margin: 0 auto 2rem;
        background: rgba(15, 15, 18, 0.35);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        z-index: 1;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
        color: #f9fafb;
        overflow: hidden;
      }

      .pr-past-table-head {
        padding: 0.9rem 1rem 0.2rem;
      }

      .pr-past-table-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #f9fafb;
      }

      .pr-past-table-loading {
        margin: 0.25rem 1rem 0.75rem;
        font-size: 0.9rem;
        color: rgba(249, 250, 251, 0.88);
      }

      .pr-past-table-scroll {
        width: 100%;
        overflow: hidden;
      }

      .pr-past-table {
        width: 100%;
        min-width: 0;
        max-width: 100%;
        table-layout: fixed;
        border-collapse: separate;
        border-spacing: 0;
        overflow: hidden;
        border-radius: 8px;
        background: rgba(15, 15, 18, 0.2);
        font-variant-numeric: tabular-nums;
        font-size: clamp(0.5rem, 1.95vw, 0.98rem);
        line-height: 1.08;
      }

      .pr-past-table thead th,
      .pr-past-table tbody td {
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .pr-past-table thead th {
        position: sticky;
        top: 0;
        z-index: 1;
        padding: 0.52rem 0.14rem;
        background: rgba(15, 15, 18, 0.6);
        color: #f9fafb;
        border-bottom: 1px solid rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        text-align: center;
        white-space: nowrap;
        line-height: 1.05;
        font-weight: 700;
        letter-spacing: -0.01em;
      }

      .pr-past-table thead th:first-child {
        width: 12%;
        min-width: 12%;
        max-width: 12%;
        text-align: left;
        padding-left: 0.4rem;
      }

      .pr-past-table thead th:not(:first-child) {
        width: calc(88% / (var(--pr-past-col-count, 9) - 1));
        min-width: calc(88% / (var(--pr-past-col-count, 9) - 1));
        max-width: calc(88% / (var(--pr-past-col-count, 9) - 1));
      }

      .pr-past-table tbody td {
        padding: 0.4rem 0.14rem;
        border-bottom: 1.2px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.02);
        vertical-align: middle;
        text-align: center;
        color: rgba(249, 250, 251, 0.96);
        white-space: nowrap;
        letter-spacing: -0.01em;
      }

      .pr-past-table tbody td:first-child {
        width: 12%;
        min-width: 12%;
        max-width: 12%;
        text-align: left;
        padding-left: 0.4rem;
        font-weight: 700;
        color: #f9fafb;
      }

      .pr-past-table tbody td:not(:first-child) {
        width: calc(88% / (var(--pr-past-col-count, 9) - 1));
        min-width: calc(88% / (var(--pr-past-col-count, 9) - 1));
        max-width: calc(88% / (var(--pr-past-col-count, 9) - 1));
      }

      .pr-past-table tbody tr:nth-child(even) td {
        background: rgba(255, 255, 255, 0.04);
      }

      .pr-past-table tbody tr:hover td {
        background: rgba(255, 255, 255, 0.06);
      }

      .pr-past-table .pr-past-total {
        font-weight: 700;
        color: rgb(255, 237, 0);
      }

      .pr-past-table td.pr-past-points-counted {
        color: rgba(255, 255, 255, 0.95);
        font-weight: 700;
      }

      .pr-past-table .pr-past-missing {
        text-align: center;
        color: rgba(255, 255, 255, 0.45);
        font-weight: 500;
      }

      .pr-past-table .pr-past-empty-row td {
        text-align: left;
        font-style: italic;
        white-space: normal;
        color: rgba(255, 255, 255, 0.82);
        padding: 0.7rem 0.8rem;
      }

      .pr-past-disc-head,
      .pr-past-sum-head {
        text-align: center;
      }

      @media (max-width: 720px) {
        .pr-past-table-section {
          margin: 0 0.5rem 2rem;
        }

        .pr-past-table-head {
          padding: 0.8rem 0.85rem 0.15rem;
        }

        .pr-past-table-title {
          font-size: 0.98rem;
        }

        .pr-past-table-loading {
          margin: 0.2rem 0.85rem 0.65rem;
          font-size: 0.82rem;
        }

        .pr-past-table {
          font-size: clamp(0.47rem, 1.82vw, 0.78rem);
          line-height: 1.02;
        }

        .pr-past-table thead th {
          padding: 0.45rem 0.08rem;
          letter-spacing: -0.02em;
        }

        .pr-past-table tbody td {
          padding: 0.34rem 0.08rem;
          letter-spacing: -0.02em;
        }

        .pr-past-table thead th:first-child,
        .pr-past-table tbody td:first-child {
          width: 12%;
          min-width: 12%;
          max-width: 12%;
          padding-left: 0.22rem;
        }

        .pr-past-table thead th:not(:first-child),
        .pr-past-table tbody td:not(:first-child) {
          width: calc(88% / (var(--pr-past-col-count, 9) - 1));
          min-width: calc(88% / (var(--pr-past-col-count, 9) - 1));
          max-width: calc(88% / (var(--pr-past-col-count, 9) - 1));
        }
      }
    `;
    document.head.appendChild(style);
  }

  function prCreatePastTableMarkup() {
    return `
      <section id="pr-past-table-section" class="pr-past-table-section">
        <div class="pr-past-table-head">
          <h2 id="pr-past-table-title" class="pr-past-table-title">Punkteverlauf</h2>
        </div>

        <div id="pr-past-table-loading" class="pr-past-table-loading"></div>

        <div class="pr-past-table-scroll">
          <table id="pr-past-table" class="pr-past-table" hidden>
            <thead></thead>
            <tbody></tbody>
          </table>
        </div>
      </section>
    `;
  }

  function prEnsurePastTableMounted() {
    let section = document.getElementById("pr-past-table-section");
    if (section) return section;

    const tableWrapper = document.querySelector(".pr-table-wrapper");
    const sourceNote =
      document.querySelector(".pr-source-note") ||
      document.getElementById("pr-source-note-text")?.closest("section") ||
      document.getElementById("pr-source-note-text")?.parentElement;

    const parent = (tableWrapper && tableWrapper.parentNode) || (sourceNote && sourceNote.parentNode);
    if (!parent) return null;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = prCreatePastTableMarkup().trim();
    section = wrapper.firstElementChild;

    if (!section) return null;

    if (tableWrapper) {
      parent.insertBefore(section, tableWrapper);
    } else if (sourceNote) {
      parent.insertBefore(section, sourceNote);
    } else {
      return null;
    }

    return section;
  }

  function prPastApplyLanguageOnly() {
    prEnsurePastTableMounted();

    const title = document.getElementById("pr-past-table-title");
    const loading = document.getElementById("pr-past-table-loading");

    if (title) title.textContent = prT("pastTitle");
    if (loading && !loading.dataset.messageLocked) {
      loading.textContent = prT("pastLoading");
    }
  }

  function prSchedulePastTableRender(delayMs) {
    window.clearTimeout(prPastState.inputTimer);
    prPastState.inputTimer = window.setTimeout(() => {
      prRenderPastTable();
    }, Math.max(0, delayMs || 0));
  }

  function prPastGetElements() {
    return {
      section: document.getElementById("pr-past-table-section"),
      loading: document.getElementById("pr-past-table-loading"),
      table: document.getElementById("pr-past-table"),
      thead: document.querySelector("#pr-past-table thead"),
      tbody: document.querySelector("#pr-past-table tbody")
    };
  }

  function prPastShowMessage(message, keepTableHidden = true) {
    const { loading, table, thead, tbody } = prPastGetElements();

    if (thead) thead.innerHTML = "";
    if (tbody) tbody.innerHTML = "";

    if (loading) {
      loading.textContent = message || "";
      loading.style.display = "";
      loading.dataset.messageLocked = "1";
    }

    if (table && keepTableHidden) {
      table.hidden = true;
    }
  }

  function prPastHideMessage() {
    const { loading } = prPastGetElements();
    if (!loading) return;

    loading.textContent = "";
    loading.style.display = "none";
    delete loading.dataset.messageLocked;
  }

  function prPastGetNumberLocale() {
    return prLangState && prLangState.current === "en" ? "en-GB" : "de-DE";
  }

  function prPastFormatNumber(value) {
    const safeValue = isFinite(value) ? value : 0;
    return new Intl.NumberFormat(prPastGetNumberLocale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeValue);
  }

  function prPastCreateTh(text) {
    const th = document.createElement("th");
    th.textContent = text;
    return th;
  }

  function prPastCreateTd(text, className) {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) td.className = className;
    td.title = text;
    return td;
  }

  function prPastShortenHeaderLabel(disc) {
    const fullLabel = prGetDisciplineLabel(disc);

    const mapDe = {
      "50m Hindernisschwimmen": "50m Hinder.",
      "100m Hindernisschwimmen": "100m Hinder.",
      "200m Hindernisschwimmen": "200m Hinder.",
      "50m komb. Schwimmen": "50m Komb.",
      "100m komb. Rettungsübung": "100m Komb.",
      "50m Flossen": "50m Flossen",
      "50m Retten": "50m Retten",
      "50m Retten mit Flossen": "50m Flossen",
      "100m Retten mit Flossen": "100m Flossen",
      "100m Lifesaver": "100m Life.",
      "200m Super-Lifesaver": "200m Super",
      "50m Freistilschwimmen": "50m Frei.",
      "25m Schleppen einer Puppe": "25m Puppe",
      "4×50m Hindernisstaffel": "4×50 Hinder.",
      "4×25m Rückenlage ohne Arme": "4×25 Rücken",
      "4×25m Gurtretterstaffel": "4×25 Gurt",
      "4×25m Rettungsstaffel": "4×25 Rett.",
      "4×25m Puppenstaffel": "4×25 Puppe",
      "4×50m Gurtretterstaffel": "4×50 Gurt",
      "4×50m Rettungsstaffel": "4×50 Rett.",
      "4×50m Freistilstaffel": "4×50 Frei."
    };

    const mapEn = {
      "50m obstacle swim": "50m Obst.",
      "100m obstacle swim": "100m Obst.",
      "200m obstacle swim": "200m Obst.",
      "50m rescue medley": "50m Medley",
      "100m rescue medley": "100m Medley",
      "50m fins swim": "50m Fins",
      "50m manikin carry": "50m Carry",
      "50m manikin carry with fins": "50m Fins",
      "100m manikin carry with fins": "100m Fins",
      "100m lifesaver": "100m Life.",
      "200m super lifesaver": "200m Super",
      "50m freestyle swim": "50m Free",
      "25m manikin": "25m Mani.",
      "4×50m obstacle relay": "4×50 Obst.",
      "4×25m backstroke without arms": "4×25 Back",
      "4×25m medley relay": "4×25 Med.",
      "4×25m pool lifesaver relay": "4×25 Pool",
      "4×25m manikin relay": "4×25 Mani.",
      "4×50m medley relay": "4×50 Med.",
      "4×50m pool lifesaver relay": "4×50 Pool",
      "4×50m freestyle relay": "4×50 Free"
    };

    const map = prLangState.current === "en" ? mapEn : mapDe;
    return map[fullLabel] || fullLabel;
  }

  function prPastGetColumnCount(disciplines) {
    return 1 + disciplines.length + 1;
  }

  function prPastGetSumHeaderLabel() {
    const scoringCount = typeof prGetScoringCount === "function" ? prGetScoringCount() : 3;
    return prLangState.current === "en"
      ? `Total ${prFormatScoringLabel(scoringCount)}`
      : `Summe ${prFormatScoringLabel(scoringCount)}`;
  }

  function prPastBuildHeader(disciplines) {
    const { thead, table } = prPastGetElements();
    if (!thead || !table) return;

    thead.innerHTML = "";

    const colCount = prPastGetColumnCount(disciplines);
    table.style.setProperty("--pr-past-col-count", String(colCount));
    table.style.setProperty("--pr-past-disc-count", String(disciplines.length));

    const tr = document.createElement("tr");
    tr.appendChild(prPastCreateTh(prT("pastYear")));

    disciplines.forEach(disc => {
      const th = prPastCreateTh(prPastShortenHeaderLabel(disc));
      th.title = prGetDisciplineLabel(disc);
      th.classList.add("pr-past-disc-head");
      tr.appendChild(th);
    });

    const thSum = prPastCreateTh(prPastGetSumHeaderLabel());
    thSum.classList.add("pr-past-sum-head");
    tr.appendChild(thSum);

    thead.appendChild(tr);
  }

  function prPastCollectEnteredTimes() {
    const timesByDisciplineId = {};

    document.querySelectorAll("#discipline-table tbody tr").forEach(tr => {
      const disciplineId = tr.dataset.disciplineId;
      const input = tr.querySelector(".pr-time-input");

      if (!disciplineId || !input) return;

      const seconds = prParseTimeString(input.value);
      if (input.value && isFinite(seconds)) {
        timesByDisciplineId[disciplineId] = seconds;
      } else {
        timesByDisciplineId[disciplineId] = null;
      }
    });

    return timesByDisciplineId;
  }

  function prPastBuildYearRange(latestYear) {
    const years = [];
    const latest = parseInt(latestYear, 10);

    if (!isFinite(latest)) return years;

    for (let y = latest; y >= PR_PAST_START_YEAR; y--) {
      years.push(y);
    }

    return years;
  }

  function prPastCalcTopSum(values, count) {
    const nums = values
      .filter(v => typeof v === "number" && isFinite(v))
      .sort((a, b) => b - a);

    return nums.slice(0, count).reduce((sum, v) => sum + v, 0);
  }

  function prPastGetCurrentContext() {
    const modeEl = document.getElementById("pr-mode");
    const ageEl = document.getElementById("pr-age");
    const genderEl = document.getElementById("pr-gender");

    if (!modeEl || !ageEl || !genderEl) return null;

    return {
      mode: modeEl.value,
      ak: ageEl.value,
      gender: genderEl.value,
      rule: typeof prGetRule === "function" ? prGetRule() : "National"
    };
  }

  function prPastGetLatestYearForRule(rule) {
    if (rule === "International") {
      return prRecords && isFinite(prRecords.latestYear) ? prRecords.latestYear : null;
    }
    return prNationalRecords && isFinite(prNationalRecords.latestYear) ? prNationalRecords.latestYear : null;
  }

  function prPastGetRecordSecondsForYear(year, context, discipline) {
    if (!context || !discipline) return null;

    if (context.rule === "International") {
      return prGetDRRecordSeconds(year, context.ak, context.gender, discipline);
    }

    return prGetNationalRecordSeconds(
      year,
      context.mode,
      context.ak,
      context.gender,
      discipline
    );
  }

  async function prPastEnsureDataSource(context) {
    if (!context) return;

    if (context.rule === "International") {
      if (!window.ExcelLoader || typeof window.ExcelLoader.ensureXLSX !== "function") {
        throw new Error(prT("xlsxMissing"));
      }
      await window.ExcelLoader.ensureXLSX();
      await prEnsureRecordsWorkbook();
      prSelectRecordsSheet();
      return;
    }

    await prEnsureNationalRecords();
  }

  function prPastRenderEmptyRow(message, colSpan) {
    const { tbody } = prPastGetElements();
    if (!tbody) return;

    const tr = document.createElement("tr");
    tr.className = "pr-past-empty-row";

    const td = document.createElement("td");
    td.colSpan = colSpan;
    td.textContent = message;

    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function prPastPublishChartData(rows) {
    prPastState.chartRows = Array.isArray(rows) ? rows.slice() : [];
    window.prPastChartData = prPastState.chartRows.slice();

    document.dispatchEvent(new CustomEvent("pr:past-data-updated", {
      detail: {
        rows: window.prPastChartData.slice()
      }
    }));
  }

  async function prRenderPastTable() {
    const section = prEnsurePastTableMounted();
    if (!section) return;

    const currentToken = ++prPastState.renderToken;
    const { table, thead, tbody } = prPastGetElements();

    if (!table || !thead || !tbody) return;

    const context = prPastGetCurrentContext();
    if (!context) return;

    const disciplines = prGetDisciplines(context.mode, context.ak) || [];

    thead.innerHTML = "";
    tbody.innerHTML = "";

    if (!disciplines.length) {
      prPastPublishChartData([]);
      prPastShowMessage("");
      table.hidden = false;
      prPastBuildHeader([]);
      prPastRenderEmptyRow(prT("noDisc"), 1);
      return;
    }

    const sourceAlreadyAvailable =
      context.rule === "International"
        ? !!(prRecords && prRecords.workbook)
        : !!(prNationalRecords && Array.isArray(prNationalRecords.years) && prNationalRecords.years.length);

    if (!sourceAlreadyAvailable) {
      prPastShowMessage(prT("pastLoading"), true);
    } else {
      prPastHideMessage();
    }

    try {
      await prPastEnsureDataSource(context);

      if (currentToken !== prPastState.renderToken) return;

      const latestYear = prPastGetLatestYearForRule(context.rule);
      const years = prPastBuildYearRange(latestYear);

      if (!years.length) {
        prPastPublishChartData([]);
        prPastShowMessage(prT("pastNoData"), true);
        return;
      }

      const enteredTimes = prPastCollectEnteredTimes();
      const chartRows = [];
      const scoringCount = typeof prGetScoringCount === "function" ? prGetScoringCount() : 3;

      prPastBuildHeader(disciplines);

      const fragment = document.createDocumentFragment();

      years.forEach(year => {
        const tr = document.createElement("tr");

        tr.appendChild(prPastCreateTd(String(year)));

        const numericValuesForSums = [];
        const disciplinePointEntries = [];
        const disciplineChartEntries = [];

        disciplines.forEach(disc => {
          const timeSec = enteredTimes[disc.id];
          const disciplineLabel = prGetDisciplineLabel(disc);

          if (timeSec == null || !isFinite(timeSec)) {
            numericValuesForSums.push(0);
            const td = prPastCreateTd(prPastFormatNumber(0));
            tr.appendChild(td);
            disciplinePointEntries.push({ td, val: 0 });
            disciplineChartEntries.push({
              id: disc.id,
              label: disciplineLabel,
              points: 0
            });
            return;
          }

          const recSec = prPastGetRecordSecondsForYear(year, context, disc);

          if (typeof recSec !== "number" || !isFinite(recSec) || recSec <= 0) {
            const td = prPastCreateTd("-", "pr-past-missing");
            tr.appendChild(td);
            disciplineChartEntries.push({
              id: disc.id,
              label: disciplineLabel,
              points: null
            });
            return;
          }

          const pts = prCalcNationalPoints(timeSec, recSec);
          const safePts = isFinite(pts) && pts > 0 ? pts : 0;

          numericValuesForSums.push(safePts);

          const td = prPastCreateTd(prPastFormatNumber(safePts));
          tr.appendChild(td);

          disciplinePointEntries.push({ td, val: safePts });
          disciplineChartEntries.push({
            id: disc.id,
            label: disciplineLabel,
            points: safePts
          });
        });

        const rankedEntries = disciplinePointEntries
          .filter(entry => entry && entry.td && isFinite(entry.val) && entry.val > 0)
          .sort((a, b) => b.val - a.val);

        rankedEntries.slice(0, scoringCount).forEach(entry => {
          entry.td.classList.add("pr-past-points-counted");
        });

        const totalSelected = prPastCalcTopSum(numericValuesForSums, scoringCount);

        chartRows.push({
          year,
          disciplines: disciplineChartEntries,
          selectedTotal: totalSelected
        });

        tr.appendChild(prPastCreateTd(prPastFormatNumber(totalSelected), "pr-past-total"));

        fragment.appendChild(tr);
      });

      tbody.innerHTML = "";
      tbody.appendChild(fragment);
      table.hidden = false;
      prPastHideMessage();
      prPastPublishChartData(chartRows);
    } catch (err) {
      console.error(err);
      prPastPublishChartData([]);
      prPastShowMessage(err && err.message ? err.message : prT("pastLoadError"), true);
    }
  }

  window.prGetPastChartData = function () {
    return prPastState.chartRows.slice();
  };
  window.prRenderPastTable = prRenderPastTable;
})();
