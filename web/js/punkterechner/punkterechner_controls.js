const PR_LANG_KEY = "pr-lang";

const prLangState = {
  current: localStorage.getItem(PR_LANG_KEY) === "en" ? "en" : "de"
};

let prControlsResizeObserver = null;

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
  "4×50m Lifesavingstaffel": "4×50m lifesaving relay",
  "Leinenwurf": "Line throw",
  "50m Freistilschwimmen": "50m freestyle swim",
  "25m Schleppen einer Puppe": "25m manikin",
  "4×50m Freistilstaffel": "4×50m freestyle relay"
};

const prI18n = {
  de: {
    title: "Punkterechner",
    switchText: "Deutsch",
    switchFlag: "./assets/svg/Deutschland.svg",
    switchAlt: "Deutsch",
    settingsTitle: "Einstellungen",
    settingsExpand: "Einstellungen ausklappen",
    settingsCollapse: "Einstellungen einklappen",
    languageLabel: "Sprache",
    modeLabel: "Disziplinen",
    modeIndividual: "Einzel",
    modeTeam: "Mannschaft",
    scoreLabel: "Wertung",
    ageLabel: "Altersklasse",
    genderLabel: "Geschlecht",
    genderFemale: "Weiblich",
    genderMale: "Männlich",
    genderMixed: "Mixed",
    ruleLabel: "Rekordwerte",
    ruleNational: "Deutschland",
    ruleInternational: "Weltrekord",
    age12: "12",
    age1314: "13/14",
    age1516: "15/16",
    age1718: "17/18",
    ageOpen: "Offen",
    age25: "25",
    age30: "30",
    age35: "35",
    age40: "40",
    age45: "45",
    age50: "50",
    age55: "55",
    age60: "60",
    age65: "65",
    age70: "70",
    age75: "75",
    age80: "80",
    age85: "85",
    age90: "90",
    age100: "100",
    age120: "120",
    age140: "140",
    age170: "170",
    age200: "200",
    age240: "240",
    age280: "280+",
    ageOpenShort: "Offen",
    ageJunior: "Junioren",
    ageYouth: "Youth",
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
    ilsLoading: "Offizielle ILS-Weltrekorde werden geladen …",
    ilsLoadError: "Die offiziellen ILS-Weltrekorde sind derzeit nicht erreichbar. Bitte versuche es später erneut.",
    sourceNote: "Quellenhinweis: Die Rekordwerte und die fachliche Orientierung basieren unter anderem auf den öffentlich verfügbaren Informationen von",
    sourceLinkText: "Dennis Fabri",
    sourceNoteInternational: "Quellenhinweis: Die Weltrekorde werden live abgerufen von",
    sourceLinkInternational: "ILS Lifesaving Sport",
    athletePoolQuestion: "Welche Bahnlänge?",
    athletePool25Title: "25m Bahn",
    athletePool50Title: "50m Bahn",
    athletePoolAnyTitle: "25m & 50m",
    athleteTimeQuestion: "Welche Zeiten?",
    athleteTimeBestAllTitle: "Bestzeit",
    athleteTimeBestAllText: "insgesamt",
    athleteTimeBestRecentTitle: "Bestzeit",
    athleteTimeBestRecentText: "letzten 2 Jahre",
    athleteTimeAverageAllTitle: "Durchschnittszeit",
    athleteTimeAverageAllText: "insgesamt",
    athleteTimeAverageRecentTitle: "Durchschnittszeit",
    athleteTimeAverageRecentText: "letzten 2 Jahre",
    athleteImportBack: "Zurück",
    athletePoolClose: "Auswahl schließen"
  },
  en: {
    title: "Points Calculator",
    switchText: "English",
    switchFlag: "./assets/svg/Großbritannien.svg",
    switchAlt: "English",
    settingsTitle: "Settings",
    settingsExpand: "Expand settings",
    settingsCollapse: "Collapse settings",
    languageLabel: "Language",
    modeLabel: "Disciplines",
    modeIndividual: "Individual",
    modeTeam: "Team",
    scoreLabel: "Scoring",
    ageLabel: "Age group",
    genderLabel: "Gender",
    genderFemale: "Female",
    genderMale: "Male",
    genderMixed: "Mixed",
    ruleLabel: "Record values",
    ruleNational: "Germany",
    ruleInternational: "World record",
    age12: "12",
    age1314: "13/14",
    age1516: "15/16",
    age1718: "17/18",
    ageOpen: "Open",
    age25: "25",
    age30: "30",
    age35: "35",
    age40: "40",
    age45: "45",
    age50: "50",
    age55: "55",
    age60: "60",
    age65: "65",
    age70: "70",
    age75: "75",
    age80: "80",
    age85: "85",
    age90: "90",
    age100: "100",
    age120: "120",
    age140: "140",
    age170: "170",
    age200: "200",
    age240: "240",
    age280: "280+",
    ageOpenShort: "Open",
    ageJunior: "Youth",
    ageYouth: "Youth",
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
    ilsLoading: "Official ILS world records are being loaded …",
    ilsLoadError: "The official ILS world records are currently unavailable. Please try again later.",
    sourceNote: "Source note: The record values and the technical orientation are based in part on the publicly available information provided by",
    sourceLinkText: "Dennis Fabri",
    sourceNoteInternational: "Source note: World records are loaded live from",
    sourceLinkInternational: "ILS Lifesaving Sport",
    athletePoolQuestion: "Which pool length?",
    athletePool25Title: "25m pool",
    athletePool50Title: "50m pool",
    athletePoolAnyTitle: "25m & 50m",
    athleteTimeQuestion: "Which times?",
    athleteTimeBestAllTitle: "Personal best",
    athleteTimeBestAllText: "overall",
    athleteTimeBestRecentTitle: "Personal best",
    athleteTimeBestRecentText: "last 2 years",
    athleteTimeAverageAllTitle: "Average time",
    athleteTimeAverageAllText: "overall",
    athleteTimeAverageRecentTitle: "Average time",
    athleteTimeAverageRecentText: "last 2 years",
    athleteImportBack: "Back",
    athletePoolClose: "Close selection"
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
    return disc.labelEn || PR_DISCIPLINE_LABELS_EN[disc.label] || disc.label;
  }
  return disc.label;
}

function prRenderSegmentedControl(select) {
  if (!select || typeof document.querySelector !== "function") return;

  const group = document.querySelector(`[data-pr-select="${select.id}"]`);
  if (!group) return;

  const options = Array.from(select.options || []);
  group.replaceChildren();
  group.style.setProperty("--pr-choice-count", String(Math.max(options.length, 1)));

  options.forEach(option => {
    const button = document.createElement("button");
    const isSelected = option.value === select.value;

    button.type = "button";
    button.className = "pr-choice-option";
    button.dataset.value = option.value;
    button.textContent = option.textContent;
    button.setAttribute("aria-pressed", String(isSelected));
    button.classList.toggle("is-selected", isSelected);

    button.addEventListener("click", () => {
      if (select.value === option.value) return;
      select.value = option.value;
      prRenderSegmentedControl(select);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    group.appendChild(button);
  });

  if (select.id === "pr-gender" || select.id === "pr-rule") {
    prUpdateControlsCompactSummary();
  }
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

  prRenderSegmentedControl(select);
}

function prGetAgeOptions(rule, mode) {
  if (rule === "International") {
    const options = [
      { value: "Offen", label: prT("ageOpenShort") },
      { value: "Youth", label: prT("ageYouth") }
    ];

    if (mode === "Einzel" && typeof window.prGetIlsMasterAgeValues === "function") {
      window.prGetIlsMasterAgeValues().forEach(age => {
        options.push({
          value: String(age),
          label: String(age)
        });
      });
    }

    return options;
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

function prMapAgeForRuleChange(ageValue, nextRule) {
  if (nextRule !== "International") return ageValue;

  return ["12", "13/14", "15/16", "17/18"].includes(String(ageValue))
    ? "Youth"
    : "Offen";
}

function prGetGenderOptions(rule, mode) {
  const options = [
    { value: "weiblich", label: prT("genderFemale") },
    { value: "männlich", label: prT("genderMale") }
  ];

  if (rule === "International" && mode === "Mannschaft") {
    options.push({ value: "mixed", label: prT("genderMixed") });
  }

  return options;
}

function prRenderGenderOptions(selectedValue) {
  const genderSel = document.getElementById("pr-gender");
  const modeSel = document.getElementById("pr-mode");
  const ruleSel = document.getElementById("pr-rule");
  if (!genderSel) return;

  const mode = modeSel ? modeSel.value : "Einzel";
  const rule = ruleSel ? ruleSel.value : "National";
  const options = prGetGenderOptions(rule, mode);
  const targetValue = options.some(option => option.value === selectedValue)
    ? selectedValue
    : options[0]?.value;

  prBuildOptions(genderSel, options, targetValue);
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
  prUpdateControlsCompactSummary();
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

function prGetCompactGenderLabel(value) {
  if (value === "weiblich") return prLangState.current === "en" ? "female" : "weiblich";
  if (value === "männlich") return prLangState.current === "en" ? "male" : "männlich";
  return "mixed";
}

function prUpdateControlsCompactSummary() {
  const summary = document.getElementById("pr-controls-compact-summary");
  if (!summary) return;

  const ruleSel = document.getElementById("pr-rule");
  const ageSel = document.getElementById("pr-age");
  const genderSel = document.getElementById("pr-gender");

  const ruleCode = ruleSel?.value === "International"
    ? "WR"
    : prLangState.current === "en" ? "GER" : "DE";
  const ageLabel = ageSel?.selectedOptions?.[0]?.textContent?.trim() || ageSel?.value || "–";
  const genderLabel = prGetCompactGenderLabel(genderSel?.value || "");

  summary.textContent = `${ruleCode} · ${ageLabel} · ${genderLabel}`;
}

function prUpdateControlsDisclosureState() {
  const wrapper = document.querySelector(".pr-controls-wrapper");
  const toggle = document.getElementById("pr-controls-toggle");
  if (!wrapper || !toggle) return;

  const expanded = !wrapper.classList.contains("is-collapsed");
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.setAttribute("aria-label", prT(expanded ? "settingsCollapse" : "settingsExpand"));
  toggle.title = prT(expanded ? "settingsCollapse" : "settingsExpand");
}

function prUpdateControlsBodyHeight() {
  const controlsBody = document.getElementById("pr-controls-body");
  const controlsGrid = document.getElementById("pr-controls-grid");
  if (!controlsBody || !controlsGrid) return;

  const gridHeight = Math.max(
    controlsGrid.scrollHeight,
    controlsGrid.getBoundingClientRect().height
  );

  controlsBody.style.setProperty(
    "--pr-controls-body-height",
    `${Math.ceil(gridHeight)}px`
  );
}

function prSetControlsCollapsed(collapsed) {
  const wrapper = document.querySelector(".pr-controls-wrapper");
  const controlsGrid = document.getElementById("pr-controls-grid");
  if (!wrapper) return;

  prUpdateControlsBodyHeight();
  wrapper.classList.toggle("is-collapsed", !!collapsed);
  if (controlsGrid) {
    controlsGrid.toggleAttribute("inert", !!collapsed);
    controlsGrid.setAttribute("aria-hidden", String(!!collapsed));
  }
  prUpdateControlsDisclosureState();
}

function prInitControlsDisclosure() {
  const toggle = document.getElementById("pr-controls-toggle");
  if (!toggle) return;

  const compactViewport = window.matchMedia("(max-width: 1279px)");
  const controlsGrid = document.getElementById("pr-controls-grid");

  prUpdateControlsBodyHeight();
  if (controlsGrid && typeof ResizeObserver === "function") {
    prControlsResizeObserver?.disconnect();
    prControlsResizeObserver = new ResizeObserver(prUpdateControlsBodyHeight);
    prControlsResizeObserver.observe(controlsGrid);
  }

  window.addEventListener("resize", prUpdateControlsBodyHeight, { passive: true });

  toggle.addEventListener("click", () => {
    const wrapper = document.querySelector(".pr-controls-wrapper");
    if (!wrapper || !compactViewport.matches) return;
    prSetControlsCollapsed(!wrapper.classList.contains("is-collapsed"));
  });

  const syncViewportState = event => {
    prSetControlsCollapsed(!!event.matches);
  };

  if (typeof compactViewport.addEventListener === "function") {
    compactViewport.addEventListener("change", syncViewportState);
  } else if (typeof compactViewport.addListener === "function") {
    compactViewport.addListener(syncViewportState);
  }

  syncViewportState(compactViewport);
  requestAnimationFrame(prUpdateControlsBodyHeight);
}

function prUpdatePointsHeader() {
  const pointsHeader = document.getElementById("pr-points-header");
  if (!pointsHeader) return;
  pointsHeader.textContent = prT("points");
}

function prUpdateSourceNote() {
  const sourceNoteText = document.getElementById("pr-source-note-text");
  const sourceNoteLink = document.getElementById("pr-source-note-link");
  const useIls = prGetRule() === "International";

  if (sourceNoteText) {
    sourceNoteText.textContent = prT(useIls ? "sourceNoteInternational" : "sourceNote");
  }

  if (sourceNoteLink) {
    sourceNoteLink.textContent = prT(useIls ? "sourceLinkInternational" : "sourceLinkText");
    sourceNoteLink.href = useIls
      ? "https://sport.ilsf.org/records"
      : "https://www.dennisfabri.de/rettungssport/punkterechner.html";
  }
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
  const settingsTitle = document.getElementById("pr-settings-title");
  const languageLabel = document.getElementById("pr-language-label");
  const modeLabel = document.getElementById("pr-mode-label");
  const scoreLabel = document.getElementById("pr-score-label");
  const ageLabel = document.getElementById("pr-age-label");
  const genderLabel = document.getElementById("pr-gender-label");
  const ruleLabel = document.getElementById("pr-rule-label");
  const disciplineHeader = document.getElementById("pr-discipline-header");
  const timeHeader = document.getElementById("pr-time-header");
  const loading = document.getElementById("pr-loading");

  if (title) title.textContent = prT("title");
  if (settingsTitle) settingsTitle.textContent = prT("settingsTitle");
  if (languageLabel) languageLabel.textContent = prT("languageLabel");
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
  prBuildOptions(modeSel, [
    { value: "Einzel", label: prT("modeIndividual") },
    { value: "Mannschaft", label: prT("modeTeam") }
  ], modeValue);

  prBuildOptions(ruleSel, [
    { value: "National", label: prT("ruleNational") },
    { value: "International", label: prT("ruleInternational") }
  ], ruleValue);

  prRenderAgeOptions(ageValue);
  prRenderGenderOptions(genderValue);
  prRenderScoringOptions(scoreValue);
  prUpdateLanguageSwitch();
  prUpdatePointsHeader();
  prUpdateSummaryLabel();
  prUpdateSourceNote();
  prUpdateControlsCompactSummary();
  prUpdateControlsDisclosureState();

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
    <aside class="pr-controls-wrapper is-collapsed" aria-labelledby="pr-settings-title">
      <div class="pr-controls-surface">
        <div class="pr-controls-head">
          <div class="pr-controls-head-copy">
            <h2 id="pr-settings-title" class="pr-controls-title">Einstellungen</h2>
            <span id="pr-controls-compact-summary" class="pr-controls-compact-summary">DE · Offen · weiblich</span>
          </div>
          <button
            id="pr-controls-toggle"
            class="pr-controls-toggle"
            type="button"
            aria-expanded="false"
            aria-controls="pr-controls-grid"
            aria-label="Einstellungen ausklappen"
          ><span aria-hidden="true"></span></button>
        </div>
        <div id="pr-controls-body" class="pr-controls-body">
        <div id="pr-controls-grid" class="pr-controls-grid" aria-hidden="true" inert>
        <div class="pr-control pr-choice-control">
          <span class="pr-control-label" id="pr-mode-label">Disziplinen</span>
          <select id="pr-mode" class="pr-choice-native" hidden aria-hidden="true" tabindex="-1">
            <option value="Einzel">Einzel</option>
            <option value="Mannschaft">Mannschaft</option>
          </select>
          <div class="pr-choice-group" data-pr-select="pr-mode" role="group" aria-labelledby="pr-mode-label"></div>
        </div>

        <div class="pr-control pr-choice-control">
          <span class="pr-control-label" id="pr-gender-label">Geschlecht</span>
          <select id="pr-gender" class="pr-choice-native" hidden aria-hidden="true" tabindex="-1">
            <option value="weiblich">Weiblich</option>
            <option value="männlich">Männlich</option>
          </select>
          <div class="pr-choice-group" data-pr-select="pr-gender" role="group" aria-labelledby="pr-gender-label"></div>
        </div>

        <div class="pr-control">
          <label for="pr-age" id="pr-age-label">Altersklasse</label>
          <select id="pr-age">
            <option value="12">12</option>
            <option value="13/14">13/14</option>
            <option value="15/16">15/16</option>
            <option value="17/18">17/18</option>
            <option value="Offen" selected>Offen</option>
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

        <div class="pr-control pr-choice-control">
          <span class="pr-control-label" id="pr-rule-label">Rekordwerte</span>
          <select id="pr-rule" class="pr-choice-native" hidden aria-hidden="true" tabindex="-1">
            <option value="National">Deutschland</option>
            <option value="International">Weltrekord</option>
          </select>
          <div class="pr-choice-group" data-pr-select="pr-rule" role="group" aria-labelledby="pr-rule-label"></div>
        </div>

        <div class="pr-control pr-language-control">
          <label for="pr-lang-switch" id="pr-language-label">Sprache</label>
          <button id="pr-lang-switch" class="pr-lang-switch" type="button">
            <img id="pr-lang-switch-icon" src="./assets/svg/Deutschland.svg" alt="Deutsch">
            <span id="pr-lang-switch-text">Deutsch</span>
          </button>
        </div>
        </div>
        </div>
      </div>
    </aside>
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
      const genderValue = genderSel ? genderSel.value : "weiblich";
      const scoreValue = scoreSel ? scoreSel.value : "3";

      prRenderSelectionPreservingTimes(() => {
        prRenderAgeOptions(ageValue);
        prRenderGenderOptions(genderValue);
        prRenderScoringOptions(scoreValue);
        prUpdateSummaryLabel();
        prUpdateControlsCompactSummary();
      });
    });
  }

  if (scoreSel) {
    scoreSel.addEventListener("change", () => {
      prUpdateSummaryLabel();
      prUpdateTotalPointsDe();
    });
  }

  if (genderSel) {
    genderSel.addEventListener("change", () => {
      prUpdateControlsCompactSummary();
      prRenderSelectionPreservingTimes();
    });
  }

  if (ageSel) {
    ageSel.addEventListener("change", () => {
      const scoreValue = scoreSel ? scoreSel.value : "3";

      prRenderSelectionPreservingTimes(() => {
        prRenderScoringOptions(scoreValue);
        prUpdateSummaryLabel();
        prUpdateControlsCompactSummary();
      });
    });
  }

  if (ruleSel) {
    ruleSel.addEventListener("change", () => {
      const ageElement = document.getElementById("pr-age");
      const ageValue = ageElement ? ageElement.value : "Offen";
      const nextAgeValue = prMapAgeForRuleChange(ageValue, ruleSel.value);
      const genderValue = genderSel ? genderSel.value : "weiblich";
      const scoreValue = scoreSel ? scoreSel.value : "3";

      prRenderSelectionPreservingTimes(() => {
        prRenderAgeOptions(nextAgeValue);
        prRenderGenderOptions(genderValue);
        prRenderScoringOptions(scoreValue);
        prUpdateSummaryLabel();
        prUpdatePointsHeader();
        prUpdateSourceNote();
        prUpdateControlsCompactSummary();
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
