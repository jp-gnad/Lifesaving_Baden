(function () {
  "use strict";

  if (window.__prAthleteSearchInitialized) return;
  window.__prAthleteSearchInitialized = true;

  const COLS = {
    gender: 0,
    name: 1,
    z_100l: 3,
    z_50r: 4,
    z_200s: 5,
    z_100k: 6,
    z_100r: 7,
    z_200h: 8,
    excelDate: 9,
    yy2: 11,
    pool: 21
  };

  const TIME_FIELD_BY_DISCIPLINE = {
    "100m lifesaver": COLS.z_100l,
    "50m retten": COLS.z_50r,
    "100m komb rettungs": COLS.z_100k,
    "100m kombi": COLS.z_100k,
    "100m retten mit flossen": COLS.z_100r,
    "200m super lifesaver": COLS.z_200s,
    "200m super-lifesaver": COLS.z_200s,
    "200m hindernis": COLS.z_200h,
    "200m hindernisschwimmen": COLS.z_200h
  };

  const state = {
    athletes: [],
    rowsById: new Map(),
    initStarted: false
  };

  if (document.readyState === "loading" || !document.querySelector(".pr-controls-wrapper")) {
    document.addEventListener("DOMContentLoaded", prAthleteSearchInit, { once: true });
  } else {
    prAthleteSearchInit();
  }

  function prAthleteSearchInit() {
    if (state.initStarted) return;

    const mount = prEnsureSearchMounted();
    if (!mount) {
      window.setTimeout(prAthleteSearchInit, 0);
      return;
    }

    state.initStarted = true;

    if (window.AthSearch && typeof window.AthSearch.mount === "function") {
      window.AthSearch.mount(mount, { openProfile: prApplyAthleteSelection });
      prMountSettingsLauncherInSearch(mount);
    }

    prLoadAthleteSearchData();
  }

  function prMountSettingsLauncherInSearch(mount) {
    const inputWrap = mount?.querySelector(".ath-input-wrap");
    const launcher = document.getElementById("pr-controls-launcher");
    if (!inputWrap || !launcher) return;

    inputWrap.appendChild(launcher);
  }

  function prEnsureSearchMounted() {
    let section = document.getElementById("pr-ath-search-section");
    if (section) return section.querySelector("#pr-ath-search-mount");

    const heroSlot = document.getElementById("pr-ath-search-slot");
    const controls = document.querySelector(".pr-controls-wrapper");
    const fallbackParent = (controls && controls.parentNode) || document.querySelector(".hero");
    if (!heroSlot && !fallbackParent) return null;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <section id="pr-ath-search-section" class="pr-ath-search-section">
        <div id="pr-ath-search-mount"></div>
      </section>
    `.trim();

    section = wrapper.firstElementChild;
    if (!section) return null;

    if (heroSlot) {
      heroSlot.replaceChildren(section);
    } else if (controls && controls.parentNode) {
      controls.parentNode.insertBefore(section, controls);
    } else {
      fallbackParent.appendChild(section);
    }

    return section.querySelector("#pr-ath-search-mount");
  }

  async function prLoadAthleteSearchData() {
    try {
      if (!window.AthDataSmall || typeof window.AthDataSmall.loadAthletes !== "function") {
        throw new Error("AthDataSmall missing");
      }

      const [athletes, rows] = await Promise.all([
        window.AthDataSmall.loadAthletes({ sheetName: "Tabelle2" }),
        window.AthDataSmall.loadWorkbookArray("Tabelle2")
      ]);

      state.athletes = Array.isArray(athletes) ? athletes : [];
      state.rowsById = prBuildRowsByAthleteId(rows);

      if (window.AthSearch && typeof window.AthSearch.setAthletes === "function") {
        window.AthSearch.setAthletes(state.athletes);
      }
    } catch (error) {
      console.error("Athleten-Suche im Punkterechner konnte nicht geladen werden:", error);

      if (window.AthSearch && typeof window.AthSearch.showError === "function") {
        window.AthSearch.showError("Fehler beim Laden der Athletendaten.");
      }
    }
  }

  async function prApplyAthleteSelection(athlete) {
    if (!athlete) return;

    const searchWrap = document.querySelector("#pr-ath-search-section .ath-search-wrap");
    searchWrap?.classList.add("is-importing-athlete");

    try {
      const birthYear = Number(athlete.jahrgang);
      const currentYear = new Date().getFullYear();
      const age = Number.isFinite(birthYear) ? currentYear - birthYear : NaN;

      if (!Number.isFinite(age)) {
        return;
      }

      const availablePools = prGetAvailablePoolsForAthlete(athlete);
      const onlyPool = availablePools.length === 1 ? availablePools[0] : null;
      const importOptions = !availablePools.length
        ? { poolChoice: "any", timeMode: "best-all" }
        : onlyPool && !prHasRecentTimesForPool(athlete, onlyPool)
          ? { poolChoice: onlyPool, timeMode: "best-all" }
          : await prRequestImportOptions(athlete, availablePools);
      if (!importOptions) return;

      const modeSel = document.getElementById("pr-mode");
      const ruleSel = document.getElementById("pr-rule");
      const ageSel = document.getElementById("pr-age");
      const genderSel = document.getElementById("pr-gender");

      if (!modeSel || !ruleSel || !ageSel || !genderSel) return;

      modeSel.value = "Einzel";
      if (typeof prRenderSegmentedControl === "function") {
        prRenderSegmentedControl(modeSel);
      }

      const ageValue = prMapAgeToCalculatorAge(age, ruleSel.value);
      prRenderAgeOptions(ageValue);
      ageSel.value = ageValue;
      genderSel.value = prMapAthleteGender(athlete.geschlecht);
      if (typeof prRenderSegmentedControl === "function") {
        prRenderSegmentedControl(genderSel);
      }
      if (typeof prUpdateControlsCompactSummary === "function") {
        prUpdateControlsCompactSummary();
      }

      await prRenderCurrentSelection();

      const bestTimes = prBuildTimesForAthlete(
        athlete,
        importOptions.poolChoice,
        importOptions.timeMode
      );
      const disciplines = typeof prGetDisciplines === "function" ? prGetDisciplines(modeSel.value, ageSel.value) : [];
      const restoredValues = prBuildRestoreMap(bestTimes, disciplines);
      prRestoreTimes(restoredValues);
    } finally {
      searchWrap?.classList.remove("is-importing-athlete");
    }
  }

  function prBuildRowsByAthleteId(rows) {
    const byId = new Map();
    const list = Array.isArray(rows) ? rows : [];

    for (const row of list) {
      if (!row || !row.length) continue;

      const athleteId = prBuildAthleteIdFromRow(row);
      if (!athleteId) continue;

      if (!byId.has(athleteId)) {
        byId.set(athleteId, []);
      }

      byId.get(athleteId).push(row);
    }

    return byId;
  }

  function prBuildAthleteIdFromRow(row) {
    const name = String(row[COLS.name] || "").trim();
    const gender = String(row[COLS.gender] || "").trim();
    const birthYear = prParseTwoDigitYearWithMeetYear(row[COLS.yy2], row[COLS.excelDate]);

    if (!name || !birthYear) return "";
    return prMakeAthleteId(name, gender, birthYear);
  }

  function prParseTwoDigitYearWithMeetYear(twoDigit, excelDate) {
    const yy = Number(twoDigit);
    const meetDate = Number(excelDate);

    if (!Number.isFinite(yy) || !Number.isFinite(meetDate)) return null;

    const base = new Date(Date.UTC(1899, 11, 30));
    const meet = new Date(base.getTime() + meetDate * 86400000);
    const meetYear = meet.getUTCFullYear();

    if (!Number.isFinite(meetYear)) return null;

    let year = 1900 + yy;
    while (meetYear - year > 100) year += 100;
    return year;
  }

  function prMakeAthleteId(name, gender, birthYear) {
    const base = String(name || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");

    const g = String(gender || "").toLowerCase().startsWith("w") ? "w" : "m";
    return `ath_${base}_${birthYear || "x"}_${g}`;
  }

  function prRequestImportOptions(athlete, availablePools) {
    return new Promise(resolve => {
      const dialog = document.createElement("dialog");
      dialog.className = "pr-pool-dialog";
      dialog.tabIndex = -1;
      dialog.setAttribute("aria-labelledby", "pr-pool-dialog-title");
      dialog.innerHTML = `
        <div class="pr-pool-dialog-panel">
          <button class="pr-pool-dialog-close" type="button" aria-label="">
            <span aria-hidden="true">×</span>
          </button>
          <p class="pr-pool-dialog-athlete"></p>
          <div class="pr-import-progress" aria-hidden="true">
            <span data-progress-step="pool"></span>
            <span data-progress-step="time"></span>
          </div>
          <h2 id="pr-pool-dialog-title" tabindex="-1" aria-live="polite"></h2>
          <section class="pr-import-step" data-import-step="pool">
            <div class="pr-pool-options pr-import-options" role="group" aria-labelledby="pr-pool-dialog-title"></div>
          </section>
          <section class="pr-import-step" data-import-step="time" hidden>
            <div class="pr-time-mode-options pr-import-options" role="group" aria-labelledby="pr-pool-dialog-title"></div>
          </section>
          <div class="pr-pool-dialog-actions">
            <button class="pr-pool-dialog-back" type="button" hidden></button>
          </div>
        </div>
      `.trim();

      const athleteLabel = dialog.querySelector(".pr-pool-dialog-athlete");
      const title = dialog.querySelector("#pr-pool-dialog-title");
      const poolStep = dialog.querySelector('[data-import-step="pool"]');
      const timeStep = dialog.querySelector('[data-import-step="time"]');
      const poolOptions = dialog.querySelector(".pr-pool-options");
      const timeOptions = dialog.querySelector(".pr-time-mode-options");
      const closeButton = dialog.querySelector(".pr-pool-dialog-close");
      const actions = dialog.querySelector(".pr-pool-dialog-actions");
      const backButton = dialog.querySelector(".pr-pool-dialog-back");
      const progressSteps = Array.from(dialog.querySelectorAll("[data-progress-step]"));

      athleteLabel.textContent = `${String(athlete.name || "").trim()} · ${String(athlete.jahrgang || "").trim()}`;
      closeButton.setAttribute("aria-label", prT("athletePoolClose"));
      backButton.textContent = prT("athleteImportBack");

      const poolChoices = [
        { value: "25", title: prT("athletePool25Title") },
        { value: "50", title: prT("athletePool50Title") },
        { value: "any", title: prT("athletePoolAnyTitle") }
      ];

      const createChoiceButton = (choice, dataKey) => {
        const button = document.createElement("button");
        const heading = document.createElement("strong");

        button.type = "button";
        button.className = "pr-pool-option";
        button.dataset[dataKey] = choice.value;
        button.setAttribute("aria-pressed", "false");
        heading.textContent = choice.title;
        button.appendChild(heading);
        if (choice.subtitle) {
          const subtitle = document.createElement("span");
          subtitle.textContent = choice.subtitle;
          button.appendChild(subtitle);
        }
        return button;
      };

      const buildTimeChoices = selectedPool => {
        const bestOverall = {
          value: "best-all",
          title: prT("athleteTimeBestAllTitle"),
          subtitle: prT("athleteTimeBestAllText")
        };

        if (!prGetPoolTimeCoverage(athlete, selectedPool).hasOlder) {
          return [
            bestOverall,
            {
              value: "average-all",
              title: prT("athleteTimeAverageAllTitle"),
              subtitle: prT("athleteTimeAverageAllText")
            }
          ];
        }

        return [
          bestOverall,
          {
            value: "best-recent",
            title: prT("athleteTimeBestRecentTitle"),
            subtitle: prT("athleteTimeBestRecentText")
          },
          {
            value: "average-recent",
            title: prT("athleteTimeAverageRecentTitle"),
            subtitle: prT("athleteTimeAverageRecentText")
          }
        ];
      };

      const renderTimeChoices = selectedPool => {
        timeOptions.replaceChildren();
        buildTimeChoices(selectedPool).forEach(choice => {
          timeOptions.appendChild(createChoiceButton(choice, "timeMode"));
        });
      };

      const normalizedPools = ["25", "50"].filter(pool => availablePools.includes(pool));
      const hasPoolStep = normalizedPools.length > 1;
      let currentStep = hasPoolStep ? "pool" : "time";
      let poolChoice = hasPoolStep ? null : normalizedPools[0];
      let timeMode = null;

      if (hasPoolStep) {
        poolChoices.forEach(choice => {
          poolOptions.appendChild(createChoiceButton(choice, "poolChoice"));
        });
      }

      if (!hasPoolStep) renderTimeChoices(poolChoice);

      const markSelected = (container, selector, value) => {
        container.querySelectorAll(selector).forEach(button => {
          const selected = button.dataset.poolChoice === value || button.dataset.timeMode === value;
          button.classList.toggle("is-selected", selected);
          button.setAttribute("aria-pressed", String(selected));
        });
      };

      const renderStep = (moveFocus = false) => {
        const isPoolStep = currentStep === "pool";
        dialog.dataset.importStep = currentStep;
        poolStep.hidden = !isPoolStep;
        timeStep.hidden = isPoolStep;
        title.textContent = prT(isPoolStep ? "athletePoolQuestion" : "athleteTimeQuestion");
        backButton.hidden = isPoolStep || !hasPoolStep;
        actions.hidden = backButton.hidden;

        progressSteps.forEach(step => {
          const isActive = step.dataset.progressStep === currentStep;
          const isComplete = currentStep === "time" && step.dataset.progressStep === "pool";
          step.classList.toggle("is-active", isActive);
          step.classList.toggle("is-complete", isComplete);
        });

        if (moveFocus) title.focus({ preventScroll: true });
      };

      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(value);
      };

      poolOptions.addEventListener("click", event => {
        const button = event.target.closest("[data-pool-choice]");
        if (!button) return;
        poolChoice = button.dataset.poolChoice || null;
        markSelected(poolOptions, "[data-pool-choice]", poolChoice);
        if (!prHasRecentTimesForPool(athlete, poolChoice)) {
          finish({ poolChoice, timeMode: "best-all" });
          return;
        }
        renderTimeChoices(poolChoice);
        currentStep = "time";
        renderStep(true);
      });

      timeOptions.addEventListener("click", event => {
        const button = event.target.closest("[data-time-mode]");
        if (!button) return;
        timeMode = button.dataset.timeMode || null;
        markSelected(timeOptions, "[data-time-mode]", timeMode);
        if (poolChoice && timeMode) finish({ poolChoice, timeMode });
      });

      backButton.addEventListener("click", () => {
        if (!hasPoolStep) return;
        currentStep = "pool";
        renderStep(true);
      });
      closeButton.addEventListener("click", () => finish(null));
      dialog.addEventListener("cancel", event => {
        event.preventDefault();
        finish(null);
      });
      dialog.addEventListener("click", event => {
        if (event.target === dialog) finish(null);
      });

      document.body.appendChild(dialog);
      renderStep();
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }

      dialog.focus({ preventScroll: true });
    });
  }

  function prNormalizePoolLength(raw) {
    const match = String(raw ?? "").trim().match(/(?:^|\D)(25|50)(?:\D|$)/);
    return match ? match[1] : "";
  }

  function prGetAvailablePoolsForAthlete(athlete) {
    const rows = state.rowsById.get(String(athlete.id || "")) || [];
    const availablePools = new Set();

    rows.forEach(row => {
      const rowPool = prNormalizePoolLength(row[COLS.pool]);
      if (rowPool !== "25" && rowPool !== "50") return;

      const hasValidTime = Object.values(TIME_FIELD_BY_DISCIPLINE)
        .some(index => Number.isFinite(prParseBestTimeSeconds(row[index])));

      if (hasValidTime) availablePools.add(rowPool);
    });

    return ["25", "50"].filter(pool => availablePools.has(pool));
  }

  function prGetTwoYearCutoffExcelSerial(referenceDate = new Date()) {
    const baseUtc = Date.UTC(1899, 11, 30);
    const cutoffUtc = Date.UTC(
      referenceDate.getFullYear() - 2,
      referenceDate.getMonth(),
      referenceDate.getDate()
    );
    return (cutoffUtc - baseUtc) / 86400000;
  }

  function prHasRecentTimesForPool(athlete, poolChoice) {
    return prGetPoolTimeCoverage(athlete, poolChoice).hasRecent;
  }

  function prGetPoolTimeCoverage(athlete, poolChoice) {
    const rows = state.rowsById.get(String(athlete.id || "")) || [];
    const selectedPool = poolChoice === "25" || poolChoice === "50" ? poolChoice : "any";
    const cutoffSerial = prGetTwoYearCutoffExcelSerial();
    let hasRecent = false;
    let hasOlder = false;

    rows.forEach(row => {
      const rowPool = prNormalizePoolLength(row[COLS.pool]);
      if (rowPool !== "25" && rowPool !== "50") return;
      if (selectedPool !== "any" && rowPool !== selectedPool) return;

      const hasValidTime = Array.from(new Set(Object.values(TIME_FIELD_BY_DISCIPLINE)))
        .some(index => Number.isFinite(prParseBestTimeSeconds(row[index])));
      if (!hasValidTime) return;

      const meetDate = Number(row[COLS.excelDate]);
      if (Number.isFinite(meetDate) && meetDate >= cutoffSerial) {
        hasRecent = true;
      } else {
        hasOlder = true;
      }
    });

    return { hasRecent, hasOlder };
  }

  function prBuildTimesForAthlete(athlete, poolChoice = "any", timeMode = "best-all") {
    const rows = state.rowsById.get(String(athlete.id || "")) || [];
    const valuesByField = {};
    const selectedPool = poolChoice === "25" || poolChoice === "50" ? poolChoice : "any";
    const selectedTimeMode = ["best-all", "best-recent", "average-all", "average-recent"].includes(timeMode)
      ? timeMode
      : "best-all";
    const recentOnly = selectedTimeMode === "best-recent" || selectedTimeMode === "average-recent";
    const cutoffSerial = recentOnly ? prGetTwoYearCutoffExcelSerial() : null;

    rows.forEach(row => {
      const rowPool = prNormalizePoolLength(row[COLS.pool]);
      if (rowPool !== "25" && rowPool !== "50") return;
      if (selectedPool !== "any" && rowPool !== selectedPool) return;

      if (recentOnly) {
        const meetDate = Number(row[COLS.excelDate]);
        if (!Number.isFinite(meetDate) || meetDate < cutoffSerial) return;
      }

      Array.from(new Set(Object.values(TIME_FIELD_BY_DISCIPLINE)))
        .forEach(index => {
          const seconds = prParseBestTimeSeconds(row[index]);
          if (!Number.isFinite(seconds)) return;

          if (!valuesByField[index]) valuesByField[index] = [];
          valuesByField[index].push(seconds);
        });
    });

    return Object.fromEntries(
      Object.entries(valuesByField).map(([index, values]) => {
        const result = selectedTimeMode === "average-all" || selectedTimeMode === "average-recent"
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : Math.min(...values);
        return [index, result];
      })
    );
  }

  function prParseBestTimeSeconds(raw) {
    const value = String(raw ?? "").trim();
    if (!value || /^dq$/i.test(value)) return null;

    const seconds = prParseTimeString(value);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }

  function prBuildRestoreMap(bestTimes, disciplines) {
    const restoreMap = {};
    const list = Array.isArray(disciplines) ? disciplines : [];

    list.forEach(discipline => {
      const fieldIndex = prGetTimeFieldForDiscipline(discipline);
      const seconds = fieldIndex != null ? bestTimes[fieldIndex] : null;

      if (Number.isFinite(seconds)) {
        restoreMap[discipline.id] = prFormatSeconds(seconds);
      }
    });

    return restoreMap;
  }

  function prGetTimeFieldForDiscipline(discipline) {
    if (!discipline) return null;

    const candidates = [
      discipline.label,
      discipline.drKey,
      discipline.excelKey
    ];

    for (const candidate of candidates) {
      const normalized = prNormalizeDisciplineName(candidate);
      if (!normalized) continue;

      if (Object.prototype.hasOwnProperty.call(TIME_FIELD_BY_DISCIPLINE, normalized)) {
        return TIME_FIELD_BY_DISCIPLINE[normalized];
      }
    }

    return null;
  }

  function prNormalizeDisciplineName(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/hindernisschwimmen/g, "hindernis")
      .replace(/kombiniertes schwimmen/g, "komb schwimmen")
      .replace(/rettungsuebung/g, "rettungs")
      .replace(/rettungsubung/g, "rettungs")
      .replace(/super lifesaver/g, "super-lifesaver")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function prMapAthleteGender(gender) {
    return String(gender || "").toLowerCase().startsWith("w") ? "weiblich" : "männlich";
  }

  function prMapAgeToCalculatorAge(age, rule) {
    if (rule === "International") {
      if (age <= 18) return "Youth";
      if (age < 30) return "Offen";

      const mastersAge = String(Math.floor(age / 5) * 5);
      const availableMasters = typeof window.prGetIlsMasterAgeValues === "function"
        ? window.prGetIlsMasterAgeValues()
        : [];

      return availableMasters.includes(mastersAge) ? mastersAge : "Offen";
    }

    if (age <= 12) return "12";
    if (age <= 14) return "13/14";
    if (age <= 16) return "15/16";
    if (age <= 18) return "17/18";
    return "Offen";
  }
})();
