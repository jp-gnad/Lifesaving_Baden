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
    yy2: 11
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

    prSetSearchMeta("Athlet auswählen, um Bestzeiten direkt in den Rechner zu übernehmen.");

    if (window.AthSearch && typeof window.AthSearch.mount === "function") {
      window.AthSearch.mount(mount, { openProfile: prApplyAthleteSelection });
    }

    prLoadAthleteSearchData();
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
        <p id="pr-ath-search-meta" class="pr-ath-search-meta" aria-live="polite"></p>
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

  function prSetSearchMeta(message, tone = "") {
    const meta = document.getElementById("pr-ath-search-meta");
    if (!meta) return;

    meta.textContent = String(message || "");
    meta.classList.remove("is-warning", "is-error");

    if (tone === "warning") {
      meta.classList.add("is-warning");
    } else if (tone === "error") {
      meta.classList.add("is-error");
    }
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

      prSetSearchMeta("Athlet auswählen, um Bestzeiten direkt in den Rechner zu übernehmen.");
    } catch (error) {
      console.error("Athleten-Suche im Punkterechner konnte nicht geladen werden:", error);

      if (window.AthSearch && typeof window.AthSearch.showError === "function") {
        window.AthSearch.showError("Fehler beim Laden der Athletendaten.");
      }

      prSetSearchMeta("Die Athletendaten konnten nicht geladen werden.", "error");
    }
  }

  async function prApplyAthleteSelection(athlete) {
    if (!athlete) return;

    const birthYear = Number(athlete.jahrgang);
    const currentYear = new Date().getFullYear();
    const age = Number.isFinite(birthYear) ? currentYear - birthYear : NaN;

    if (!Number.isFinite(age)) {
      prSetSearchMeta(`${athlete.name}: Der Jahrgang konnte nicht eindeutig ausgewertet werden.`, "warning");
      return;
    }

    const modeSel = document.getElementById("pr-mode");
    const ruleSel = document.getElementById("pr-rule");
    const ageSel = document.getElementById("pr-age");
    const genderSel = document.getElementById("pr-gender");

    if (!modeSel || !ruleSel || !ageSel || !genderSel) return;

    modeSel.value = "Einzel";

    const ageValue = prMapAgeToCalculatorAge(age, ruleSel.value);
    prRenderAgeOptions(ageValue);
    ageSel.value = ageValue;
    genderSel.value = prMapAthleteGender(athlete.geschlecht);

    await prRenderCurrentSelection();

    const bestTimes = prBuildBestTimesForAthlete(athlete);
    const disciplines = typeof prGetDisciplines === "function" ? prGetDisciplines(modeSel.value, ageSel.value) : [];
    const restoredValues = prBuildRestoreMap(bestTimes, disciplines);
    prRestoreTimes(restoredValues);

    const displayGroup = String(athlete.ortsgruppe || "").trim();
    const groupText = displayGroup ? ` · DLRG ${displayGroup}` : "";
    const importedCount = Object.keys(restoredValues).length;
    const totalCount = disciplines.length;

    if (!importedCount) {
      prSetSearchMeta(
        `${athlete.name} (${birthYear})${groupText}: Für die aktuelle Altersklasse konnten aus den vorhandenen Athletendaten keine passenden Zeiten übernommen werden.`,
        "warning"
      );
      return;
    }

    if (importedCount < totalCount) {
      prSetSearchMeta(
        `${athlete.name} (${birthYear})${groupText} wurde teilweise in den Rechner übernommen (${importedCount}/${totalCount} Disziplinen).`,
        "warning"
      );
      return;
    }

    prSetSearchMeta(`${athlete.name} (${birthYear})${groupText} wurde in den Rechner übernommen.`);
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

  function prBuildBestTimesForAthlete(athlete) {
    const rows = state.rowsById.get(String(athlete.id || "")) || [];
    const bestByField = {};

    rows.forEach(row => {
      Object.values(COLS)
        .filter(value => typeof value === "number" && value >= COLS.z_100l && value <= COLS.z_200h)
        .forEach(index => {
          if (index < COLS.z_100l || index > COLS.z_200h) return;

          const seconds = prParseBestTimeSeconds(row[index]);
          if (!Number.isFinite(seconds)) return;

          const current = bestByField[index];
          if (!Number.isFinite(current) || seconds < current) {
            bestByField[index] = seconds;
          }
        });
    });

    return bestByField;
  }

  function prParseBestTimeSeconds(raw) {
    const value = String(raw ?? "").trim();
    if (!value || /^dq$/i.test(value)) return null;

    const seconds = prParseTimeString(value);
    return Number.isFinite(seconds) ? seconds : null;
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
      return age <= 18 ? "Junioren" : "Offen";
    }

    if (age <= 12) return "12";
    if (age <= 14) return "13/14";
    if (age <= 16) return "15/16";
    if (age <= 18) return "17/18";
    return "Offen";
  }
})();
