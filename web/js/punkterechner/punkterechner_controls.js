const PR_LANG_KEY = "pr-lang";

const prLangState = {
  current: localStorage.getItem(PR_LANG_KEY) === "en" ? "en" : "de"
};

const PR_DISCIPLINE_LABELS_EN = {
  "50m Hindernisschwimmen": "50m obstacle swim",
  "50m Hindernisschwimmen ": "50m obstacle swim",
  "50m komb. Schwimmen": "50m rescue medley",
  "50m Flossen": "50m fins swim",
  "100m Hindernisschwimmen": "100m obstacle swim",
  "100m Hindernisschwimmen ": "100m obstacle swim",
  "50m Retten": "50m manikin carry",
  "50m Retten mit Flossen": "50m manikin carry with fins",
  "200m Hindernisschwimmen": "200m obstacle swim",
  "200m Hindernisschwimmen ": "200m obstacle swim",
  "100m Lifesaver": "100m lifesaver",
  "100m komb. Rettungsübung": "100m rescue medley",
  "100m Retten mit Flossen": "100m manikin carry with fins",
  "200m Super-Lifesaver": "200m super lifesaver",
  "4×50m Hindernisstaffel": "4×50m obstacle relay",
  "4×25m Rückenlage ohne Arme": "4×25m backstroke without arms",
  "4×25m Gurtretterstaffel": "4×25m medley relay",
  "4×25m Rettungsstaffel": "4×25m pool lifesaver relay",
  "4×25m Puppenstaffel": "4×25m manikin relay",
  "4×50m Gurtretterstaffel": "4×50m medley relay",
  "4×50m Rettungsstaffel": "4×50m pool lifesaver relay",
  "50m Freistilschwimmen": "50m freestyle swim",
  "25m Schleppen einer Puppe": "25m manikin",
  "4×50m Freistilstaffel": "4×50m freestyle relay"
};

const prI18n = {
  de: {
    title: "Punkterechner",
    switchText: "English",
    switchFlag: "./svg/Großbritannien.svg",
    switchAlt: "English",
    modeLabel: "Disziplinen",
    modeIndividual: "Einzel",
    modeTeam: "Mannschaft",
    scoreLabel: "Wertung",
    ageLabel: "Altersklasse",
    genderLabel: "Geschlecht",
    genderFemale: "Weiblich",
    genderMale: "Männlich",
    ruleLabel: "Rekordwerte",
    ruleNational: "Deutschland",
    ruleInternational: "Weltrekord",
    age12: "AK 12",
    age1314: "AK 13/14",
    age1516: "AK 15/16",
    age1718: "AK 17/18",
    ageOpen: "AK Offen",
    age25: "AK 25",
    age30: "AK 30",
    age35: "AK 35",
    age40: "AK 40",
    age45: "AK 45",
    age50: "AK 50",
    age55: "AK 55",
    age60: "AK 60",
    age65: "AK 65",
    age70: "AK 70",
    age75: "AK 75",
    age80: "AK 80",
    age85: "AK 85",
    age90: "AK 90",
    age100: "AK 100",
    age120: "AK 120",
    age140: "AK 140",
    age170: "AK 170",
    age200: "AK 200",
    age240: "AK 240",
    age280: "AK 280+",
    ageOpenShort: "Offen",
    ageJunior: "Junioren",
    tableDiscipline: "Disziplinen",
    tableTime: "Zeit",
    points: "Punkte",
    summaryCombined: "Gesamt 3-Kampf / 4-Kampf",
    loading: "Rekordwerte werden initialisiert …",
    noDisc: "Für diese Kombination sind keine Disziplinen definiert.",
    xlsxMissing: "XLSX-Bibliothek nicht gefunden – Rekordzeiten können nicht geladen werden.",
    nationalLoaded: "Deutsche Rekordwerte 2007–{latestYear} geladen.",
    workbookLoadFail: "Deutsche Rekordwerte konnten nicht geladen werden.",
    workbookLoadError: "Fehler beim Laden der Rekordwerte – Daten werden nicht angezeigt.",
    sourceNote: "Quellenhinweis: Die Rekordwerte und die fachliche Orientierung basieren unter anderem auf den öffentlich verfügbaren Informationen von",
    sourceLinkText: "Dennis Fabri"
  },
  en: {
    title: "Points Calculator",
    switchText: "Deutsch",
    switchFlag: "./svg/Deutschland.svg",
    switchAlt: "Deutsch",
    modeLabel: "Disciplines",
    modeIndividual: "Individual",
    modeTeam: "Team",
    scoreLabel: "Scoring",
    ageLabel: "Age group",
    genderLabel: "Gender",
    genderFemale: "Female",
    genderMale: "Male",
    ruleLabel: "Record values",
    ruleNational: "Germany",
    ruleInternational: "World record",
    age12: "Age 12",
    age1314: "Age 13/14",
    age1516: "Age 15/16",
    age1718: "Age 17/18",
    ageOpen: "Open",
    age25: "Age 25",
    age30: "Age 30",
    age35: "Age 35",
    age40: "Age 40",
    age45: "Age 45",
    age50: "Age 50",
    age55: "Age 55",
    age60: "Age 60",
    age65: "Age 65",
    age70: "Age 70",
    age75: "Age 75",
    age80: "Age 80",
    age85: "Age 85",
    age90: "Age 90",
    age100: "Age 100",
    age120: "Age 120",
    age140: "Age 140",
    age170: "Age 170",
    age200: "Age 200",
    age240: "Age 240",
    age280: "Age 280+",
    ageOpenShort: "Open",
    ageJunior: "Youth",
    tableDiscipline: "Disciplines",
    tableTime: "Time",
    points: "Points",
    summaryCombined: "Total 3-event / 4-event",
    loading: "Record values are being initialized …",
    noDisc: "No disciplines are defined for this combination.",
    xlsxMissing: "XLSX library not found – record times cannot be loaded.",
    nationalLoaded: "German record values 2007–{latestYear} loaded.",
    workbookLoadFail: "German record values could not be loaded.",
    workbookLoadError: "Error while loading the record values – data is not displayed.",
    sourceNote: "Source note: The record values and the technical orientation are based in part on the publicly available information provided by",
    sourceLinkText: "Dennis Fabri"
  }
};

function prT(key, vars = {}) {
  let text = prI18n[prLangState.current][key] || "";
  Object.keys(vars).forEach(k => {
    text = text.replaceAll(`{${k}}`, vars[k]);
  });
  return text;
}

function prGetDisciplineLabel(disc) {
  if (prLangState.current === "en") {
    return PR_DISCIPLINE_LABELS_EN[disc.label] || disc.label;
  }
  return disc.label;
}

function prBuildOptions(select, options, selectedValue) {
  if (!select) return;
  select.innerHTML = options
    .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
    .join("");

  if (options.some(opt => opt.value === selectedValue)) {
    select.value = selectedValue;
  } else if (options.length) {
    select.value = options[0].value;
  }
}

function prGetAgeOptions(rule, mode) {
  if (rule === "International") {
    return [
      { value: "Junioren", label: prT("ageJunior") },
      { value: "Offen", label: prT("ageOpenShort") }
    ];
  }

  if (mode === "Mannschaft") {
    return [
      { value: "12", label: prT("age12") },
      { value: "13/14", label: prT("age1314") },
      { value: "15/16", label: prT("age1516") },
      { value: "17/18", label: prT("age1718") },
      { value: "Offen", label: prT("ageOpen") },
      { value: "100", label: prT("age100") },
      { value: "120", label: prT("age120") },
      { value: "140", label: prT("age140") },
      { value: "170", label: prT("age170") },
      { value: "200", label: prT("age200") },
      { value: "240", label: prT("age240") },
      { value: "280+", label: prT("age280") }
    ];
  }

  return [
    { value: "12", label: prT("age12") },
    { value: "13/14", label: prT("age1314") },
    { value: "15/16", label: prT("age1516") },
    { value: "17/18", label: prT("age1718") },
    { value: "Offen", label: prT("ageOpen") },
    { value: "25", label: prT("age25") },
    { value: "30", label: prT("age30") },
    { value: "35", label: prT("age35") },
    { value: "40", label: prT("age40") },
    { value: "45", label: prT("age45") },
    { value: "50", label: prT("age50") },
    { value: "55", label: prT("age55") },
    { value: "60", label: prT("age60") },
    { value: "65", label: prT("age65") },
    { value: "70", label: prT("age70") },
    { value: "75", label: prT("age75") },
    { value: "80", label: prT("age80") },
    { value: "85", label: prT("age85") },
    { value: "90", label: prT("age90") }
  ];
}

function prRenderAgeOptions(selectedValue) {
  const ageSel = document.getElementById("pr-age");
  const modeSel = document.getElementById("pr-mode");
  const ruleSel = document.getElementById("pr-rule");
  if (!ageSel) return;

  const mode = modeSel ? modeSel.value : "Einzel";
  const rule = ruleSel ? ruleSel.value : "National";

  const options = prGetAgeOptions(rule, mode);

  let targetValue = selectedValue;
  if (!options.some(opt => opt.value === targetValue)) {
    targetValue = options.some(opt => opt.value === "Offen")
      ? "Offen"
      : options[0]?.value;
  }

  prBuildOptions(ageSel, options, targetValue);
}

function prUpdateLanguageSwitch() {
  const icon = document.getElementById("pr-lang-switch-icon");
  const text = document.getElementById("pr-lang-switch-text");
  if (!icon || !text) return;

  icon.src = prT("switchFlag");
  icon.alt = prT("switchAlt");
  text.textContent = prT("switchText");
}

function prSetInfo(status, data = {}) {
  prState.infoStatus = status;
  prState.infoData = data;

  if (status === "xlsxMissing") {
    console.warn(prT("xlsxMissing"));
  } else if (status === "nationalLoaded") {
    console.info(prT("nationalLoaded", {
      latestYear: String(data.latestYear || "")
    }));
  } else if (status === "loadFail") {
    console.warn(prT("workbookLoadFail"));
  } else if (status === "loadError") {
    console.error(prT("workbookLoadError"));
  }
}

function prGetRule() {
  const el = document.getElementById("pr-rule");
  return el ? el.value : "National";
}

function prFormatScoringLabel(count) {
  const safeCount = Math.max(1, Number(count) || 1);
  return prLangState.current === "en" ? `${safeCount}-event` : `${safeCount}-Kampf`;
}

function prGetSummaryLabelText(count) {
  const safeCount = Math.max(1, Number(count) || 1);
  return prLangState.current === "en"
    ? `Total ${prFormatScoringLabel(safeCount)}`
    : `Gesamt ${prFormatScoringLabel(safeCount)}`;
}

function prGetDisciplineCountForCurrentSelection() {
  const modeSel = document.getElementById("pr-mode");
  const ageSel = document.getElementById("pr-age");
  const mode = modeSel ? modeSel.value : "Einzel";
  const age = ageSel ? ageSel.value : "Offen";
  const disciplines = typeof prGetDisciplines === "function" ? prGetDisciplines(mode, age) : [];
  return Array.isArray(disciplines) ? disciplines.length : 0;
}

function prRenderScoringOptions(selectedValue) {
  const scoreSel = document.getElementById("pr-score");
  if (!scoreSel) return;

  const disciplineCount = Math.max(1, prGetDisciplineCountForCurrentSelection());
  const options = Array.from({ length: disciplineCount }, (_, index) => {
    const count = index + 1;
    return { value: String(count), label: prFormatScoringLabel(count) };
  });

  const fallbackValue = options.some(opt => opt.value === "3")
    ? "3"
    : options[options.length - 1].value;
  const targetValue = options.some(opt => opt.value === String(selectedValue))
    ? String(selectedValue)
    : fallbackValue;

  prBuildOptions(scoreSel, options, targetValue);
}

function prGetScoringCount() {
  const disciplineCount = prGetDisciplineCountForCurrentSelection();
  if (!disciplineCount) return 0;

  const scoreSel = document.getElementById("pr-score");
  const rawValue = parseInt(scoreSel ? scoreSel.value : "", 10);
  const fallbackValue = Math.min(3, disciplineCount);
  const targetValue = Number.isFinite(rawValue) ? rawValue : fallbackValue;
  return Math.max(1, Math.min(targetValue, disciplineCount));
}

function prUpdateSummaryLabel() {
  const cell = document.getElementById("pr-summary-label");
  if (!cell) return;
  cell.textContent = prGetSummaryLabelText(prGetScoringCount());
}

function prUpdatePointsHeader() {
  const pointsHeader = document.getElementById("pr-points-header");
  if (!pointsHeader) return;
  pointsHeader.textContent = prT("points");
}

function prApplyLanguage() {
  const modeSel = document.getElementById("pr-mode");
  const ageSel = document.getElementById("pr-age");
  const genderSel = document.getElementById("pr-gender");
  const ruleSel = document.getElementById("pr-rule");
  const scoreSel = document.getElementById("pr-score");

  const modeValue = modeSel ? modeSel.value : "Einzel";
  const ageValue = ageSel ? ageSel.value : "Offen";
  const genderValue = genderSel ? genderSel.value : "weiblich";
  const ruleValue = ruleSel ? ruleSel.value : "National";
  const scoreValue = scoreSel ? scoreSel.value : "3";

  const title = document.getElementById("pr-page-title");
  const modeLabel = document.getElementById("pr-mode-label");
  const scoreLabel = document.getElementById("pr-score-label");
  const ageLabel = document.getElementById("pr-age-label");
  const genderLabel = document.getElementById("pr-gender-label");
  const ruleLabel = document.getElementById("pr-rule-label");
  const disciplineHeader = document.getElementById("pr-discipline-header");
  const timeHeader = document.getElementById("pr-time-header");
  const loading = document.getElementById("pr-loading");
  const sourceNoteText = document.getElementById("pr-source-note-text");
  const sourceNoteLink = document.getElementById("pr-source-note-link");

  if (title) title.textContent = prT("title");
  if (modeLabel) modeLabel.textContent = prT("modeLabel");
  if (scoreLabel) scoreLabel.textContent = prT("scoreLabel");
  if (ageLabel) ageLabel.textContent = prT("ageLabel");
  if (genderLabel) genderLabel.textContent = prT("genderLabel");
  if (ruleLabel) ruleLabel.textContent = prT("ruleLabel");

  if (disciplineHeader) {
    disciplineHeader.textContent = prT("tableDiscipline");
    disciplineHeader.dataset.mobileTime = prT("tableTime");
  }

  if (timeHeader) {
    timeHeader.textContent = prT("tableTime");
  }

  if (loading) loading.textContent = prT("loading");
  if (sourceNoteText) sourceNoteText.textContent = prT("sourceNote");
  if (sourceNoteLink) sourceNoteLink.textContent = prT("sourceLinkText");

  prBuildOptions(modeSel, [
    { value: "Einzel", label: prT("modeIndividual") },
    { value: "Mannschaft", label: prT("modeTeam") }
  ], modeValue);

  prBuildOptions(genderSel, [
    { value: "weiblich", label: prT("genderFemale") },
    { value: "männlich", label: prT("genderMale") }
  ], genderValue);

  prBuildOptions(ruleSel, [
    { value: "National", label: prT("ruleNational") },
    { value: "International", label: prT("ruleInternational") }
  ], ruleValue);

  prRenderAgeOptions(ageValue);
  prRenderScoringOptions(scoreValue);
  prUpdateLanguageSwitch();
  prUpdatePointsHeader();
  prUpdateSummaryLabel();

  if (prState.infoStatus) {
    prSetInfo(prState.infoStatus, prState.infoData);
  }
}

function prCaptureTimes() {
  const values = {};

  document.querySelectorAll("#discipline-table tbody tr").forEach(tr => {
    const input = tr.querySelector(".pr-time-input");
    if (input && input.value) {
      const disciplineId = String(tr.dataset.disciplineId || "");
      const restoreKey = prGetDisciplineRestoreKeyFromRow(tr, disciplineId);

      values[restoreKey] = input.value;
      if (disciplineId) {
        values[disciplineId] = input.value;
      }
    }
  });
  return values;
}

function prRestoreTimes(values) {
  document.querySelectorAll("#discipline-table tbody tr").forEach(tr => {
    const disciplineId = String(tr.dataset.disciplineId || "");
    const restoreKey = prGetDisciplineRestoreKeyFromRow(tr, disciplineId);
    const input = tr.querySelector(".pr-time-input");
    if (!input) return;

    const time =
      values?.[restoreKey] ??
      values?.[disciplineId] ??
      "";

    if (!time) return;

    input.value = prNormalizeTimeInputValue(time);
    prRecalcRowPoints(tr);
  });

  prUpdateTotalPointsDe();
}

function prGetDisciplineRestoreKeyFromRow(tr, fallbackId = "") {
  if (!tr) return String(fallbackId || "");

  const nameCell = tr.querySelector(".pr-disc-name");
  const label =
    nameCell?.dataset?.baseLabel ||
    nameCell?.textContent ||
    "";
  const normalized = prNormalizeDisciplineRestoreName(label);

  if (normalized) {
    return `disc:${normalized}`;
  }

  return String(fallbackId || tr.dataset.disciplineId || "");
}

function prGetCurrentDisciplinesById() {
  const modeSel = document.getElementById("pr-mode");
  const ageSel = document.getElementById("pr-age");

  const mode = modeSel ? modeSel.value : "Einzel";
  const age = ageSel ? ageSel.value : "Offen";
  const disciplines = typeof prGetDisciplines === "function" ? prGetDisciplines(mode, age) : [];

  return new Map(
    (Array.isArray(disciplines) ? disciplines : []).map(discipline => [String(discipline.id || ""), discipline])
  );
}

function prGetDisciplineRestoreKey(discipline, fallbackId = "") {
  if (discipline && typeof window.prGetTimeFieldForDiscipline === "function") {
    const fieldIndex = window.prGetTimeFieldForDiscipline(discipline);
    if (fieldIndex != null) {
      return `field:${fieldIndex}`;
    }
  }

  const candidates = [
    discipline?.label,
    discipline?.drKey,
    discipline?.excelKey
  ];

  for (const candidate of candidates) {
    const normalized = prNormalizeDisciplineRestoreName(candidate);
    if (normalized) {
      return `disc:${normalized}`;
    }
  }

  return String(fallbackId || discipline?.id || "");
}

function prNormalizeDisciplineRestoreName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/hindernisschwimmen/g, "hindernis")
    .replace(/rettungsuebung/g, "rettungs")
    .replace(/rettungsubung/g, "rettungs")
    .replace(/super lifesaver/g, "super-lifesaver")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function prRenderSelectionPreservingTimes(onBeforeRender) {
  const savedTimes = prCaptureTimes();

  if (typeof onBeforeRender === "function") {
    onBeforeRender();
  }

  await prRenderCurrentSelection();
  prRestoreTimes(savedTimes);
}

async function prToggleLanguage() {
  const savedTimes = prCaptureTimes();

  prLangState.current = prLangState.current === "de" ? "en" : "de";
  localStorage.setItem(PR_LANG_KEY, prLangState.current);

  prApplyLanguage();
  await prRenderCurrentSelection();
  prRestoreTimes(savedTimes);
}

function prCreateControlsMarkup() {
  return `
    <section class="pr-controls-wrapper">
      <div class="pr-controls-grid">
        <div class="pr-control">
          <label for="pr-mode" id="pr-mode-label">Disziplinen</label>
          <select id="pr-mode">
            <option value="Einzel">Einzel</option>
            <option value="Mannschaft">Mannschaft</option>
          </select>
        </div>

        <div class="pr-control">
          <label for="pr-score" id="pr-score-label">Wertung</label>
          <select id="pr-score">
            <option value="1">1-Kampf</option>
            <option value="2">2-Kampf</option>
            <option value="3" selected>3-Kampf</option>
          </select>
        </div>

        <div class="pr-control">
          <label for="pr-age" id="pr-age-label">Altersklasse</label>
          <select id="pr-age">
            <option value="12">AK 12</option>
            <option value="13/14">AK 13/14</option>
            <option value="15/16">AK 15/16</option>
            <option value="17/18">AK 17/18</option>
            <option value="Offen" selected>AK Offen</option>
          </select>
        </div>

        <div class="pr-control">
          <label for="pr-gender" id="pr-gender-label">Geschlecht</label>
          <select id="pr-gender">
            <option value="weiblich">Weiblich</option>
            <option value="männlich">Männlich</option>
          </select>
        </div>

        <div class="pr-control">
          <label for="pr-rule" id="pr-rule-label">Rekordwerte</label>
          <select id="pr-rule">
            <option value="National">Deutschland</option>
            <option value="International">Weltrekord</option>
          </select>
        </div>
      </div>
    </section>
  `;
}

function prInitEvents() {
  const modeSel = document.getElementById("pr-mode");
  const scoreSel = document.getElementById("pr-score");
  const ageSel = document.getElementById("pr-age");
  const genderSel = document.getElementById("pr-gender");
  const ruleSel = document.getElementById("pr-rule");

  if (modeSel) {
    modeSel.addEventListener("change", () => {
      const ageElement = document.getElementById("pr-age");
      const ageValue = ageElement ? ageElement.value : "Offen";
      const scoreValue = scoreSel ? scoreSel.value : "3";

      prRenderSelectionPreservingTimes(() => {
        prRenderAgeOptions(ageValue);
        prRenderScoringOptions(scoreValue);
        prUpdateSummaryLabel();
      });
    });
  }

  if (scoreSel) {
    scoreSel.addEventListener("change", () => {
      prUpdateSummaryLabel();
      prUpdateTotalPointsDe();
      if (typeof window.prRenderPastTable === "function") {
        window.prRenderPastTable();
      }
    });
  }

  if (genderSel) {
    genderSel.addEventListener("change", () => prRenderSelectionPreservingTimes());
  }

  if (ageSel) {
    ageSel.addEventListener("change", () => {
      const scoreValue = scoreSel ? scoreSel.value : "3";

      prRenderSelectionPreservingTimes(() => {
        prRenderScoringOptions(scoreValue);
        prUpdateSummaryLabel();
      });
    });
  }

  if (ruleSel) {
    ruleSel.addEventListener("change", () => {
      const ageElement = document.getElementById("pr-age");
      const ageValue = ageElement ? ageElement.value : "Offen";
      const scoreValue = scoreSel ? scoreSel.value : "3";

      prRenderSelectionPreservingTimes(() => {
        prRenderAgeOptions(ageValue);
        prRenderScoringOptions(scoreValue);
        prUpdateSummaryLabel();
        prUpdatePointsHeader();
      });
    });
  }

  const langSwitch = document.getElementById("pr-lang-switch");
  if (langSwitch) {
    langSwitch.addEventListener("click", () => {
      prToggleLanguage();
    });
  }
}
