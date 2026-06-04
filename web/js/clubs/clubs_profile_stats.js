(function () {
  let shared = {};

  const CLUB_STATS_STATE = {
    includeOms: true
  };

  const COLS = new Proxy({}, {
    get(_target, key) {
      return getShared("COLS")?.[key];
    }
  });

  function getShared(name) {
    const value = shared?.[name];
    if (value == null) {
      throw new Error(`ClubsProfileStats missing helper: ${name}`);
    }
    return value;
  }

  function h(...args) {
    return getShared("h")(...args);
  }

  function normalize(...args) {
    return getShared("normalize")(...args);
  }

  function normalizeForCompare(...args) {
    return getShared("normalizeForCompare")(...args);
  }

  function groupMatchesRow(...args) {
    return getShared("groupMatchesRow")(...args);
  }

  function excelSerialToISO(...args) {
    return getShared("excelSerialToISO")(...args);
  }

  function getYearFromISO(...args) {
    return getShared("getYearFromISO")(...args);
  }

  function normalizeMeetName(...args) {
    return getShared("normalizeMeetName")(...args);
  }

  function normalizeGender(...args) {
    return getShared("normalizeGender")(...args);
  }

  function parseTwoDigitYearWithMeetYear(...args) {
    return getShared("parseTwoDigitYearWithMeetYear")(...args);
  }

  function makeAthleteId(...args) {
    return getShared("makeAthleteId")(...args);
  }

  async function getBestenlisteRows() {
    return getShared("getBestenlisteRows")();
  }

  function formatClubStatsNumber(value) {
    return Number(value || 0).toLocaleString("de-DE");
  }

  function isOmsMeetName(value) {
    return /^OMS\s*-/i.test(normalize(value));
  }

  function buildClubStatsData(rows, group, settings = {}) {
    const byYear = new Map();
    const allAthletes = new Set();
    const includeOms = settings.includeOms !== false;

    const ensureYear = (year) => {
      if (!byYear.has(year)) {
        byYear.set(year, {
          year,
          meetKeys: new Set(),
          athletes: new Set(),
          femaleAthletes: new Set(),
          maleAthletes: new Set()
        });
      }
      return byYear.get(year);
    };

    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || !groupMatchesRow(group, row)) continue;

      const rawName = normalize(row[COLS.meetName]);
      if (!includeOms && isOmsMeetName(rawName)) continue;

      const dateIso = excelSerialToISO(row[COLS.excelDate]);
      const year = getYearFromISO(dateIso);
      if (!Number.isFinite(year) || year < 1900) continue;

      const yearEntry = ensureYear(year);
      const name = normalizeMeetName(rawName);

      if (name) {
        const meetKey = normalizeForCompare(name);

        yearEntry.meetKeys.add(meetKey);
      }

      const athleteName = normalize(row[COLS.name]);
      if (athleteName) {
        const gender = normalizeGender(row[COLS.gender]);
        const birthYear = parseTwoDigitYearWithMeetYear(row[COLS.yy2], dateIso);
        const athleteId = makeAthleteId(athleteName, gender, birthYear);

        yearEntry.athletes.add(athleteId);
        if (gender === "w") {
          yearEntry.femaleAthletes.add(athleteId);
        } else {
          yearEntry.maleAthletes.add(athleteId);
        }
        allAthletes.add(athleteId);
      }
    }

    const years = Array.from(byYear.keys()).sort((left, right) => left - right);
    const series = years.map((year) => {
      const entry = byYear.get(year);
      return {
        year,
        competitions: entry.meetKeys.size,
        athletes: entry.athletes.size,
        femaleAthletes: entry.femaleAthletes.size,
        maleAthletes: entry.maleAthletes.size
      };
    });

    const femaleAthletes = new Set();
    const maleAthletes = new Set();
    series.forEach((point) => {
      const entry = byYear.get(point.year);
      entry?.femaleAthletes?.forEach((id) => femaleAthletes.add(id));
      entry?.maleAthletes?.forEach((id) => maleAthletes.add(id));
    });

    return {
      years,
      series,
      totals: {
        competitions: series.reduce((sum, point) => sum + point.competitions, 0),
        athletes: allAthletes.size,
        femaleAthletes: femaleAthletes.size,
        maleAthletes: maleAthletes.size
      }
    };
  }

  function s(tag, props = {}, ...children) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);

    for (const [key, value] of Object.entries(props || {})) {
      if (key === "class") el.setAttribute("class", value);
      else if (value !== false && value != null) el.setAttribute(key, value === true ? "" : value);
    }

    for (const child of children.flat()) {
      if (child == null) continue;
      el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }

    return el;
  }

  function getClubStatsUnitLabel(value, labels = {}) {
    const number = Number(value) || 0;
    if (number === 1 && labels.singular) return labels.singular;
    return labels.plural || labels.singular || "";
  }

  function formatClubStatsPointLabel(point, key, labels) {
    const value = point[key];
    return `${point.year}: ${formatClubStatsNumber(value)} ${getClubStatsUnitLabel(value, labels)}`;
  }

  function renderClubStatsChart(series, valueKey, options = {}) {
    const points = Array.isArray(series) ? series : [];
    const chartLabel = options.chartLabel || "Jahresverlauf";
    const unitLabels = options.unitLabels || {};
    const chartType = options.type || "bar";
    const W = 520;
    const H = 178;
    const m = { t: 18, r: 14, b: 30, l: 34 };
    const cw = W - m.l - m.r;
    const ch = H - m.t - m.b;
    const maxValue = Math.max(1, ...points.map((point) => Number(point[valueKey]) || 0));
    const tickValues = Array.from(new Set([0, Math.ceil(maxValue / 2), maxValue]));
    const xForIndex = (index) => points.length <= 1 ? m.l + cw / 2 : m.l + (index / (points.length - 1)) * cw;
    const yForValue = (value) => m.t + ch - ((Number(value) || 0) / maxValue) * ch;
    const svg = s("svg", {
      class: `club-stats-chart club-stats-chart--${chartType}`,
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": chartLabel,
      focusable: "false"
    });

    const grid = s("g", { class: "club-stats-chart-grid" });
    tickValues.forEach((tick) => {
      const y = yForValue(tick);
      grid.appendChild(s("line", { x1: m.l, y1: y, x2: W - m.r, y2: y, class: "club-stats-grid-line" }));
      grid.appendChild(s("text", { x: m.l - 8, y: y + 4, class: "club-stats-y-label", "text-anchor": "end" }, formatClubStatsNumber(tick)));
    });
    svg.appendChild(grid);

    svg.appendChild(s("line", { x1: m.l, y1: m.t + ch, x2: W - m.r, y2: m.t + ch, class: "club-stats-axis" }));

    if (points.length) {
      const step = points.length > 7 ? Math.ceil(points.length / 6) : 1;
      const xAxis = s("g", { class: "club-stats-x-axis" });
      points.forEach((point, index) => {
        const showTick = index === 0 || index === points.length - 1 || index % step === 0;
        if (!showTick) return;
        const x = xForIndex(index);
        xAxis.appendChild(s("text", { x, y: H - 8, class: "club-stats-x-label", "text-anchor": "middle" }, String(point.year)));
      });
      svg.appendChild(xAxis);
    }

    if (chartType === "line") {
      const path = points.map((point, index) => {
        const prefix = index === 0 ? "M" : "L";
        return `${prefix}${xForIndex(index).toFixed(2)} ${yForValue(point[valueKey]).toFixed(2)}`;
      }).join(" ");

      if (path) {
        svg.appendChild(s("path", { d: path, class: "club-stats-line" }));
      }

      const dots = s("g", { class: "club-stats-dots" });
      points.forEach((point, index) => {
        dots.appendChild(
          s(
            "circle",
            { cx: xForIndex(index), cy: yForValue(point[valueKey]), r: 3.2, class: "club-stats-dot" },
            s("title", {}, formatClubStatsPointLabel(point, valueKey, unitLabels))
          )
        );
      });
      svg.appendChild(dots);
    } else {
      const bars = s("g", { class: "club-stats-bars" });
      const barWidth = Math.max(3, Math.min(18, cw / Math.max(1, points.length * 1.85)));

      points.forEach((point, index) => {
        const value = Number(point[valueKey]) || 0;
        const x = xForIndex(index) - barWidth / 2;
        const y = yForValue(value);
        const height = Math.max(1, m.t + ch - y);

        bars.appendChild(
          s(
            "rect",
            { x, y, width: barWidth, height, rx: 2, class: "club-stats-bar" },
            s("title", {}, formatClubStatsPointLabel(point, valueKey, unitLabels))
          )
        );
      });
      svg.appendChild(bars);
    }

    return svg;
  }

  function formatClubStatsGenderLabel(female, male) {
    return `${formatClubStatsNumber(female)} weiblich / ${formatClubStatsNumber(male)} m\u00e4nnlich`;
  }

  function formatClubStatsPercent(value, total) {
    if (!total) return "0,0%";
    return `${((Number(value) / Number(total)) * 100).toFixed(1).replace(".", ",")}%`;
  }

  function formatClubStatsGenderPercentLabel(female, male) {
    const total = (Number(female) || 0) + (Number(male) || 0);
    return `${formatClubStatsPercent(female, total)} weiblich / ${formatClubStatsPercent(male, total)} m\u00e4nnlich`;
  }

  function renderClubStatsGenderChart(series, totals = {}) {
    const points = Array.isArray(series) ? series : [];
    const W = 520;
    const H = 178;
    const m = { t: 18, r: 14, b: 30, l: 34 };
    const cw = W - m.l - m.r;
    const ch = H - m.t - m.b;
    const maxValue = 100;
    const tickValues = [0, 50, 100];
    const xForIndex = (index) => points.length <= 1 ? m.l + cw / 2 : m.l + (index / (points.length - 1)) * cw;
    const yForValue = (value) => m.t + ch - ((Number(value) || 0) / maxValue) * ch;
    const svg = s("svg", {
      class: "club-stats-chart club-stats-chart--gender",
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Prozentuale Verteilung der Sportler nach Geschlecht und Jahr",
      focusable: "false"
    });

    const grid = s("g", { class: "club-stats-chart-grid" });
    tickValues.forEach((tick) => {
      const y = yForValue(tick);
      grid.appendChild(s("line", { x1: m.l, y1: y, x2: W - m.r, y2: y, class: "club-stats-grid-line" }));
      grid.appendChild(s("text", { x: m.l - 8, y: y + 4, class: "club-stats-y-label", "text-anchor": "end" }, `${tick}%`));
    });
    svg.appendChild(grid);
    svg.appendChild(s("line", { x1: m.l, y1: m.t + ch, x2: W - m.r, y2: m.t + ch, class: "club-stats-axis" }));

    if (points.length) {
      const step = points.length > 7 ? Math.ceil(points.length / 6) : 1;
      const xAxis = s("g", { class: "club-stats-x-axis" });
      points.forEach((point, index) => {
        const showTick = index === 0 || index === points.length - 1 || index % step === 0;
        if (!showTick) return;
        const x = xForIndex(index);
        xAxis.appendChild(s("text", { x, y: H - 8, class: "club-stats-x-label", "text-anchor": "middle" }, String(point.year)));
      });
      svg.appendChild(xAxis);
    }

    const bars = s("g", { class: "club-stats-gender-bars" });
    const barWidth = Math.max(6, Math.min(20, cw / Math.max(1, points.length * 1.9)));
    const totalFemale = Number(totals?.femaleAthletes) || 0;
    const totalMale = Number(totals?.maleAthletes) || 0;
    const totalAthletes = totalFemale + totalMale;

    points.forEach((point, index) => {
      const female = Number(point.femaleAthletes) || 0;
      const male = Number(point.maleAthletes) || 0;
      const total = female + male;
      const femalePercent = total ? (female / total) * 100 : 0;
      const malePercent = total ? 100 - femalePercent : 0;
      const x = xForIndex(index) - barWidth / 2;
      const base = m.t + ch;
      let femaleHeight = 0;
      let maleHeight = 0;

      if (female > 0 && male > 0) {
        femaleHeight = Math.max(1, Math.min(ch - 1, (femalePercent / 100) * ch));
        maleHeight = ch - femaleHeight;
      } else if (female > 0) {
        femaleHeight = ch;
      } else if (male > 0) {
        maleHeight = ch;
      }

      const femaleY = base - femaleHeight;
      const maleY = femaleY - maleHeight;
      const title = `${point.year}: ${formatClubStatsGenderPercentLabel(female, male)} (${formatClubStatsGenderLabel(female, male)})`;

      if (male > 0) {
        bars.appendChild(
          s(
            "rect",
            { x, y: maleY, width: barWidth, height: maleHeight, rx: 2, class: "club-stats-gender-bar club-stats-gender-bar--male" },
            s("title", {}, title)
          )
        );
      }

      if (female > 0) {
        bars.appendChild(
          s(
            "rect",
            { x, y: femaleY, width: barWidth, height: femaleHeight, rx: 2, class: "club-stats-gender-bar club-stats-gender-bar--female" },
            s("title", {}, title)
          )
        );
      }
    });

    svg.appendChild(bars);

    if (totalAthletes > 0) {
      const totalFemalePercent = (totalFemale / totalAthletes) * 100;
      const y = yForValue(totalFemalePercent);
      const label = `Gesamt: ${formatClubStatsGenderPercentLabel(totalFemale, totalMale)} (${formatClubStatsGenderLabel(totalFemale, totalMale)})`;

      svg.appendChild(
        s(
          "g",
          { class: "club-stats-gender-total", "aria-label": label },
          s(
            "line",
            { x1: m.l, y1: y, x2: W - m.r, y2: y, class: "club-stats-gender-total-line" },
            s("title", {}, label)
          ),
          s(
            "text",
            { x: W - m.r - 4, y: y - 5, class: "club-stats-gender-total-label", "text-anchor": "end" },
            `Gesamt ${formatClubStatsPercent(totalFemale, totalAthletes)} w`
          )
        )
      );
    }

    return svg;
  }

  function getClubStatsRangeLabel(data) {
    const years = Array.isArray(data?.years) ? data.years : [];
    if (!years.length) return "";
    if (years.length === 1) return String(years[0]);
    return `${years[0]}-${years[years.length - 1]}`;
  }

  function getClubStatsLatestLabel(series, valueKey, unitLabels) {
    const points = Array.isArray(series) ? series : [];
    if (!points.length) return "";
    const latest = points[points.length - 1];
    return `${latest.year}: ${formatClubStatsNumber(latest[valueKey])} ${getClubStatsUnitLabel(latest[valueKey], unitLabels)}`;
  }

  function renderClubStatCard(config, data) {
    const unitLabels = {
      singular: config.unitSingular,
      plural: config.unitPlural
    };
    const latestLabel = getClubStatsLatestLabel(data.series, config.key, unitLabels);

    return h(
      "section",
      { class: `club-stats-card club-stats-card--${config.key}` },
      h(
        "header",
        { class: "club-stats-card-head" },
        h(
          "div",
          { class: "club-stats-title-group" },
          h("h3", {}, config.title),
          h("p", {}, "Gesamt")
        ),
        h("strong", { class: "club-stats-value" }, formatClubStatsNumber(data.totals[config.key]))
      ),
      latestLabel ? h("div", { class: "club-stats-latest" }, latestLabel) : null,
      h(
        "div",
        { class: "club-stats-chart-wrap" },
        renderClubStatsChart(data.series, config.key, {
          type: config.chartType,
          chartLabel: `${config.title} nach Jahren`,
          unitLabels
        })
      )
    );
  }

  function renderClubGenderStatsCard(data) {
    const points = Array.isArray(data?.series) ? data.series : [];
    const latest = points[points.length - 1] || null;
    const latestLabel = latest
      ? `${latest.year}: ${formatClubStatsGenderPercentLabel(latest.femaleAthletes, latest.maleAthletes)} (${formatClubStatsGenderLabel(latest.femaleAthletes, latest.maleAthletes)})`
      : "";

    return h(
      "section",
      { class: "club-stats-card club-stats-card--gender" },
      h(
        "header",
        { class: "club-stats-card-head" },
        h(
          "div",
          { class: "club-stats-title-group" },
          h("h3", {}, "Sportler nach Geschlecht"),
          h("p", {}, "Gesamt")
        ),
        h("strong", { class: "club-stats-value" }, formatClubStatsNumber(data?.totals?.athletes))
      ),
      latestLabel ? h("div", { class: "club-stats-latest" }, latestLabel) : null,
      h(
        "div",
        { class: "club-stats-legend", "aria-hidden": "true" },
        h("span", { class: "club-stats-legend-item" }, h("span", { class: "club-stats-legend-swatch club-stats-legend-swatch--female" }), "weiblich"),
        h("span", { class: "club-stats-legend-item" }, h("span", { class: "club-stats-legend-swatch club-stats-legend-swatch--male" }), "m\u00e4nnlich")
      ),
      h(
        "div",
        { class: "club-stats-chart-wrap" },
        renderClubStatsGenderChart(data.series, data.totals)
      )
    );
  }

  function renderClubStatsControls(onChange) {
    const checkbox = h("input", {
      type: "checkbox",
      checked: CLUB_STATS_STATE.includeOms,
      onchange: (event) => {
        CLUB_STATS_STATE.includeOms = !!event.currentTarget.checked;
        if (typeof onChange === "function") onChange();
      }
    });

    checkbox.checked = CLUB_STATS_STATE.includeOms;

    return h(
      "label",
      { class: "club-stats-toggle" },
      checkbox,
      h("span", {}, "OMS berücksichtigen")
    );
  }

  async function renderClubStats(panel, group) {
    if (!panel || !group) return;

    panel.innerHTML = "";
    const section = h("section", { class: "club-stats-section" });
    section.appendChild(h("div", { class: "club-bests-status" }, "Stats werden geladen ..."));
    panel.appendChild(section);

    try {
      const rows = await getBestenlisteRows();

      section.innerHTML = "";
      const summaryValue = h("span", { class: "club-stats-summary-value" }, "");
      const content = h("div", { class: "club-stats-content" });

      const toolbar = h(
        "div",
        { class: "club-stats-toolbar" },
        h(
          "div",
          { class: "club-stats-summary" },
          h("span", { class: "club-stats-summary-label" }, "Zeitraum"),
          summaryValue
        ),
        renderClubStatsControls(paint)
      );

      section.appendChild(toolbar);
      section.appendChild(content);
      paint();

      function paint() {
        const data = buildClubStatsData(rows, group, CLUB_STATS_STATE);
        summaryValue.textContent = getClubStatsRangeLabel(data) || "—";
        content.innerHTML = "";

        if (!data.series.length) {
          content.appendChild(h("div", { class: "club-bests-empty" }, "Keine Statistikdaten erfasst."));
          return;
        }

        content.appendChild(
          h(
            "div",
            { class: "club-stats-grid" },
            renderClubStatCard({
              key: "competitions",
              title: "Wettk\u00e4mpfe besucht",
              unitSingular: "Wettkampf",
              unitPlural: "Wettk\u00e4mpfe",
              chartType: "bar"
            }, data),
            renderClubStatCard({
              key: "athletes",
              title: "Sportler Anzahl",
              unitSingular: "Sportler",
              unitPlural: "Sportler",
              chartType: "line"
            }, data),
            renderClubGenderStatsCard(data)
          )
        );
      }
    } catch (error) {
      console.error("Club-Stats konnten nicht geladen werden:", error);
      section.innerHTML = "";
      section.appendChild(
        h("div", { class: "club-bests-status club-bests-status--error" }, "Stats konnten nicht geladen werden.")
      );
    }
  }


  window.ClubsProfileStats = {
    render(panel, group, helpers = {}) {
      shared = helpers || {};
      return renderClubStats(panel, group);
    }
  };
})();
