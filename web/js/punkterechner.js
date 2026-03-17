const PR_RECORDS_URL =
  window.location.protocol === "file:"
    ? "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx"
    : "./utilities/records_kriterien.xlsx";

const PR_NATIONAL_RECORDS_URL = "https://www.dennisfabri.de/assets/js/calculator.bundle.js";
const PR_LANG_KEY = "pr-lang";

const prRecords = {
  workbook: null,
  sheetDR: null,
  sheetName: null,
  years: [],
  yearRowIndex: {},
  columnIndex: {},
  earliestYear: null,
  latestYear: null
};

const prNationalRecords = {
  years: [],
  latestYear: null,
  data: {}
};

const prState = {
  infoStatus: null,
  infoData: {},
  nationalLoadPromise: null
};

const prLangState = {
  current: localStorage.getItem(PR_LANG_KEY) === "en" ? "en" : "de"
};

const PR_DISCIPLINES = {
  Einzel: {
    "12": [
      { id: "E12_50_HIND", label: "50m Hindernisschwimmen ", excelKey: "50m hindernis", drKey: "50m Hindernis" },
      { id: "E12_50_KOMB", label: "50m komb. Schwimmen", excelKey: "50m komb schwimmen", drKey: "50m komb. Schwimmen" },
      { id: "E12_50_FLOSS", label: "50m Flossen", excelKey: "50m flossen", drKey: "50m Flossen" }
    ],
    "13/14": [
      { id: "E1314_100_HIND", label: "100m Hindernisschwimmen ", excelKey: "100m hindernis", drKey: "100m Hindernis" },
      { id: "E1314_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E1314_50_FLOSS", label: "50m Retten mit Flossen", excelKey: "50m retten mit flossen", drKey: "50m Retten mit Flossen" }
    ],
    "15/16": [
      { id: "E1516_200_HIND", label: "200m Hindernisschwimmen ", excelKey: "200m hindernis", drKey: "200m Hindernis" },
      { id: "E1516_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" },
      { id: "E1516_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E1516_100_KOMB", label: "100m komb. Rettungsübung", excelKey: "100m komb rettungs", drKey: "100m Kombi" },
      { id: "E1516_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten", drKey: "100m Retten" },
      { id: "E1516_200_SUPER", label: "200m Super-Lifesaver", excelKey: "200m super lifesaver", drKey: "200m Superlifesaver" }
    ],
    "17/18": [
      { id: "E1718_200_HIND", label: "200m Hindernisschwimmen ", excelKey: "200m hindernis", drKey: "200m Hindernis" },
      { id: "E1718_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" },
      { id: "E1718_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E1718_100_KOMB", label: "100m komb. Rettungsübung", excelKey: "100m komb rettungs", drKey: "100m Kombi" },
      { id: "E1718_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten", drKey: "100m Retten" },
      { id: "E1718_200_SUPER", label: "200m Super-Lifesaver", excelKey: "200m super lifesaver", drKey: "200m Superlifesaver" }
    ],
    Offen: [
      { id: "EO_200_HIND", label: "200m Hindernisschwimmen ", excelKey: "200m hindernis", drKey: "200m Hindernis" },
      { id: "EO_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" },
      { id: "EO_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "EO_100_KOMB", label: "100m komb. Rettungsübung", excelKey: "100m komb rettungs", drKey: "100m Kombi" },
      { id: "EO_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten", drKey: "100m Retten" },
      { id: "EO_200_SUPER", label: "200m Super-Lifesaver", excelKey: "200m super lifesaver", drKey: "200m Superlifesaver" }
    ]
  },
  Mannschaft: {
    "12": [
      { id: "M12_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M12_4x25_RUECK", label: "4×25m Rückenlage ohne Arme", excelKey: "4*25m rueckenlage ohne arme" },
      { id: "M12_4x25_GURT", label: "4×25m Gurtretterstaffel", excelKey: "4*25m gurtretterstaffel" },
      { id: "M12_4x25_RETT", label: "4×25m Rettungsstaffel", excelKey: "4*25m rettungsstaffel" }
    ],
    "13/14": [
      { id: "M1314_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M1314_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M1314_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M1314_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    "15/16": [
      { id: "M1516_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M1516_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M1516_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M1516_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    "17/18": [
      { id: "M1718_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M1718_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M1718_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M1718_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    Offen: [
      { id: "MO_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "MO_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "MO_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "MO_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ]
  }
};

PR_DISCIPLINES.Einzel.Junioren = PR_DISCIPLINES.Einzel["17/18"];
PR_DISCIPLINES.Mannschaft.Junioren = PR_DISCIPLINES.Mannschaft["17/18"];

const PR_DISCIPLINE_LABELS_EN = {
  "50m Hindernisschwimmen ": "50m obstacle swim",
  "50m komb. Schwimmen": "50m medley swim",
  "50m Flossen": "50m fins swim",
  "100m Hindernisschwimmen ": "100m obstacle swim",
  "50m Retten": "50m manikin carry",
  "50m Retten mit Flossen": "50m manikin carry with fins",
  "200m Hindernisschwimmen ": "200m obstacle swim",
  "100m Lifesaver": "100m lifesaver",
  "100m komb. Rettungsübung": "100m rescue medley",
  "100m Retten mit Flossen": "100m manikin carry with fins",
  "200m Super-Lifesaver": "200m super lifesaver",
  "4×50m Hindernisstaffel": "4×50m obstacle relay",
  "4×25m Rückenlage ohne Arme": "4×25m backstroke without arms",
  "4×25m Gurtretterstaffel": "4×25m belt relay",
  "4×25m Rettungsstaffel": "4×25m rescue relay",
  "4×25m Puppenstaffel": "4×25m manikin relay",
  "4×50m Gurtretterstaffel": "4×50m belt relay",
  "4×50m Rettungsstaffel": "4×50m rescue relay"
};

const prI18n = {
  de: {
    title: "Punkterechner",
    switchText: "English",
    switchFlag: "./svg/Großbritannien.svg",
    switchAlt: "English",
    modeLabel: "Wertung",
    modeIndividual: "Einzel",
    modeTeam: "Mannschaft",
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
    ageOpenShort: "Offen",
    ageJunior: "Junioren",
    tableDiscipline: "Disziplin",
    tableTime: "Zeit",
    pointsDE: "Punkte (DE)",
    pointsWR: "Punkte (WR)",
    summaryAll4: "Gesamt ({rule}, alle 4 Disziplinen)",
    summaryTop3: "Gesamt ({rule}, beste 3 Disziplinen)",
    summaryTop4: "Gesamt ({rule}, beste 4 Disziplinen)",
    ruleGermanyLower: "deutschland",
    ruleWorldLower: "weltrekord",
    loading: "Rekordwerte werden initialisiert …",
    noDisc: "Für diese Kombination sind keine Disziplinen definiert.",
    xlsxMissing: "XLSX-Bibliothek nicht gefunden – Rekordzeiten können nicht geladen werden.",
    nationalLoaded: "Deutsche Rekordwerte 2007–{latestYear} geladen.",
    workbookLoadFail: "Deutsche Rekordwerte konnten nicht geladen werden.",
    workbookLoadError: "Fehler beim Laden der Rekordwerte – Daten werden nicht angezeigt."
  },
  en: {
    title: "Points Calculator",
    switchText: "Deutsch",
    switchFlag: "./svg/Deutschland.svg",
    switchAlt: "Deutsch",
    modeLabel: "Scoring",
    modeIndividual: "Individual",
    modeTeam: "Team",
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
    ageOpenShort: "Open",
    ageJunior: "Youth",
    tableDiscipline: "Discipline",
    tableTime: "Time",
    pointsDE: "Points (GER)",
    pointsWR: "Points (WR)",
    summaryAll4: "Total ({rule}, all 4 disciplines)",
    summaryTop3: "Total ({rule}, best 3 disciplines)",
    summaryTop4: "Total ({rule}, best 4 disciplines)",
    ruleGermanyLower: "germany",
    ruleWorldLower: "world record",
    loading: "Record values are being initialized …",
    noDisc: "No disciplines are defined for this combination.",
    xlsxMissing: "XLSX library not found – record times cannot be loaded.",
    nationalLoaded: "German record values 2007–{latestYear} loaded.",
    workbookLoadFail: "German record values could not be loaded.",
    workbookLoadError: "Error while loading the record values – data is not displayed."
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

function prRenderAgeOptions(selectedValue) {
  const ageSel = document.getElementById("pr-age");
  if (!ageSel) return;

  const options = prGetRule() === "International"
    ? [
        { value: "Junioren", label: prT("ageJunior") },
        { value: "Offen", label: prT("ageOpenShort") }
      ]
    : [
        { value: "12", label: prT("age12") },
        { value: "13/14", label: prT("age1314") },
        { value: "15/16", label: prT("age1516") },
        { value: "17/18", label: prT("age1718") },
        { value: "Offen", label: prT("ageOpen") }
      ];

  prBuildOptions(ageSel, options, selectedValue);
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

  const info = document.getElementById("pr-info");
  if (!info) return;

  if (status === "xlsxMissing") {
    info.textContent = prT("xlsxMissing");
  } else if (status === "nationalLoaded") {
    info.textContent = prT("nationalLoaded", {
      latestYear: String(data.latestYear || "")
    });
  } else if (status === "loadFail") {
    info.textContent = prT("workbookLoadFail");
  } else if (status === "loadError") {
    info.textContent = prT("workbookLoadError");
  } else {
    info.textContent = "";
  }
}

function prApplyLanguage() {
  const modeSel = document.getElementById("pr-mode");
  const ageSel = document.getElementById("pr-age");
  const genderSel = document.getElementById("pr-gender");
  const ruleSel = document.getElementById("pr-rule");

  const modeValue = modeSel ? modeSel.value : "Einzel";
  const ageValue = ageSel ? ageSel.value : "12";
  const genderValue = genderSel ? genderSel.value : "weiblich";
  const ruleValue = ruleSel ? ruleSel.value : "National";

  const title = document.getElementById("pr-page-title");
  const modeLabel = document.getElementById("pr-mode-label");
  const ageLabel = document.getElementById("pr-age-label");
  const genderLabel = document.getElementById("pr-gender-label");
  const ruleLabel = document.getElementById("pr-rule-label");
  const disciplineHeader = document.getElementById("pr-discipline-header");
  const timeHeader = document.getElementById("pr-time-header");
  const loading = document.getElementById("pr-loading");

  if (title) title.textContent = prT("title");
  if (modeLabel) modeLabel.textContent = prT("modeLabel");
  if (ageLabel) ageLabel.textContent = prT("ageLabel");
  if (genderLabel) genderLabel.textContent = prT("genderLabel");
  if (ruleLabel) ruleLabel.textContent = prT("ruleLabel");
  if (disciplineHeader) disciplineHeader.textContent = prT("tableDiscipline");
  if (timeHeader) timeHeader.textContent = prT("tableTime");
  if (loading) loading.textContent = prT("loading");

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
      values[tr.dataset.disciplineId] = input.value;
    }
  });
  return values;
}

function prRestoreTimes(values) {
  Object.entries(values || {}).forEach(([id, time]) => {
    const tr = document.querySelector(`#discipline-table tbody tr[data-discipline-id="${id}"]`);
    if (!tr) return;
    const input = tr.querySelector(".pr-time-input");
    if (!input) return;
    input.value = prNormalizeTimeInputValue(time);
    prRecalcRowPoints(tr);
  });
  prUpdateTotalPointsDe();
}

async function prToggleLanguage() {
  const savedTimes = prCaptureTimes();

  prLangState.current = prLangState.current === "de" ? "en" : "de";
  localStorage.setItem(PR_LANG_KEY, prLangState.current);

  prApplyLanguage();
  await prRenderCurrentSelection();
  prRestoreTimes(savedTimes);
}

function prNormalizeKey(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[×*]/g, "x")
    .replace(/[^a-z0-9x]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function prFixMojibake(str) {
  return String(str || "")
    .replace(/Ã¤/g, "ä")
    .replace(/Ã„/g, "Ä")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã–/g, "Ö")
    .replace(/Ã¼/g, "ü")
    .replace(/Ãœ/g, "Ü")
    .replace(/ÃŸ/g, "ß")
    .replace(/Â/g, "");
}

function prFindMatching(source, startIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = startIndex; i < source.length; i++) {
    const ch = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function prExtractConstructorBlocks(source, marker) {
  const blocks = [];
  let searchIndex = 0;

  while (true) {
    const start = source.indexOf(marker, searchIndex);
    if (start === -1) break;

    const openParenIndex = start + marker.length - 1;
    const closeParenIndex = prFindMatching(source, openParenIndex, "(", ")");
    if (closeParenIndex === -1) break;

    blocks.push(source.slice(openParenIndex + 1, closeParenIndex));
    searchIndex = closeParenIndex + 1;
  }

  return blocks;
}

function prCanonicalAgegroup(label) {
  const cleaned = prFixMojibake(label).trim().replace(/^AK\s+/i, "").trim();
  if (/^offen$/i.test(cleaned)) return "Offen";
  return cleaned;
}

function prCanonicalMode(typeToken) {
  return typeToken === "team" ? "Mannschaft" : "Einzel";
}

function prCanonicalGender(sexToken) {
  return sexToken === "male" ? "männlich" : "weiblich";
}

function prCanonicalNationalDisciplineKey(name) {
  let s = prNormalizeKey(prFixMojibake(name));

  s = s.replace(/\bhindernisschwimmen\b/g, "hindernis schwimmen");
  s = s.replace(/\bfreistilschwimmen\b/g, "freistil schwimmen");
  s = s.replace(/\bflossenschwimmen\b/g, "flossen");
  s = s.replace(/\bkombiniertes schwimmen\b/g, "komb schwimmen");
  s = s.replace(/\b100m komb. Rettungsuebung\b/g, "komb rettungs");
  s = s.replace(/\bkombinierte rettungs uebung\b/g, "komb rettungs");
  s = s.replace(/\bkomb rettungs uebung\b/g, "komb rettungs");
  s = s.replace(/\brueckenlage ohne armtaetigkeit\b/g, "rueckenlage ohne arme");
  s = s.replace(/\bschleppen einer puppe\b/g, "schleppen puppe");

  s = s.replace(/\b100m lifesaver\b/g, "100m lifesaver");

  return s.replace(/\s+/g, " ").trim();
}

function prGetNationalDisciplineKeyForUI(discipline) {
  return prCanonicalNationalDisciplineKey(
    discipline.label || discipline.drKey || discipline.excelKey || ""
  );
}

function prStoreNationalRecord(year, mode, ak, gender, discKey, seconds) {
  if (!prNationalRecords.data[year]) {
    prNationalRecords.data[year] = {};
  }
  if (!prNationalRecords.data[year][mode]) {
    prNationalRecords.data[year][mode] = {};
  }
  if (!prNationalRecords.data[year][mode][ak]) {
    prNationalRecords.data[year][mode][ak] = {};
  }
  if (!prNationalRecords.data[year][mode][ak][gender]) {
    prNationalRecords.data[year][mode][ak][gender] = {};
  }

  prNationalRecords.data[year][mode][ak][gender][discKey] = seconds;
}

function prParseNationalRecordsFromBundle(recordsHistory, TypesRef, SexesRef) {
  prNationalRecords.years = [];
  prNationalRecords.latestYear = null;
  prNationalRecords.data = {};

  if (!Array.isArray(recordsHistory)) {
    throw new Error("recordsHistory ist kein Array.");
  }

  recordsHistory.forEach(yearEntry => {
    if (!yearEntry) return;

    const year =
      typeof yearEntry.getYear === "function"
        ? yearEntry.getYear()
        : yearEntry.year;

    const agegroups =
      typeof yearEntry.getAgegroups === "function"
        ? yearEntry.getAgegroups()
        : yearEntry.agegroups;

    if (!isFinite(year) || !Array.isArray(agegroups)) return;

    prNationalRecords.years.push(year);

    agegroups.forEach(agegroup => {
      if (!agegroup) return;

      const rawType =
        typeof agegroup.getType === "function"
          ? agegroup.getType()
          : agegroup.type;

      const rawName =
        typeof agegroup.getName === "function"
          ? agegroup.getName()
          : agegroup.name;

      const disciplines =
        typeof agegroup.getDisciplines === "function"
          ? agegroup.getDisciplines()
          : agegroup.disciplines;

      if (!rawName || !Array.isArray(disciplines)) return;

      const mode =
        rawType === TypesRef.team || String(rawType).toLowerCase() === "team"
          ? "Mannschaft"
          : "Einzel";

      const ak = prCanonicalAgegroup(rawName);

      disciplines.forEach(discipline => {
        if (!discipline) return;

        const rawDiscName =
          typeof discipline.getName === "function"
            ? discipline.getName()
            : discipline.name;

        if (!rawDiscName) return;

        const discKey = prCanonicalNationalDisciplineKey(rawDiscName);

        const femaleValue =
          typeof discipline.getRecord === "function"
            ? discipline.getRecord(SexesRef.female)
            : 0;

        const maleValue =
          typeof discipline.getRecord === "function"
            ? discipline.getRecord(SexesRef.male)
            : 0;

        if (isFinite(femaleValue) && femaleValue > 0) {
          prStoreNationalRecord(year, mode, ak, "weiblich", discKey, femaleValue);
        }

        if (isFinite(maleValue) && maleValue > 0) {
          prStoreNationalRecord(year, mode, ak, "männlich", discKey, maleValue);
        }
      });
    });
  });

  prNationalRecords.years = Array.from(new Set(prNationalRecords.years)).sort((a, b) => a - b);
  prNationalRecords.latestYear = prNationalRecords.years.length
    ? prNationalRecords.years[prNationalRecords.years.length - 1]
    : null;

  if (!prNationalRecords.latestYear) {
    throw new Error("Es konnten keine deutschen Rekordwerte aus recordsHistory gelesen werden.");
  }
}

async function prEnsureNationalRecords() {
  if (prNationalRecords.years.length) return;

  if (prState.nationalLoadPromise) {
    return prState.nationalLoadPromise;
  }

  prState.nationalLoadPromise = new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      reject(new Error("iframe konnte nicht erstellt werden."));
      return;
    }

    doc.open();
    doc.write("<!doctype html><html><head></head><body></body></html>");
    doc.close();

    const script = doc.createElement("script");
    script.src = PR_NATIONAL_RECORDS_URL;
    script.async = true;

    script.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) {
          throw new Error("iframe window nicht verfügbar.");
        }

        if (!Array.isArray(win.recordsHistory)) {
          throw new Error("recordsHistory wurde im Bundle nicht gefunden.");
        }

        prParseNationalRecordsFromBundle(
          win.recordsHistory,
          win.Types || { team: "team", individual: "individual" },
          win.Sexes || { female: "female", male: "male" }
        );

        iframe.remove();
        resolve();
      } catch (err) {
        iframe.remove();
        reject(err);
      }
    };

    script.onerror = () => {
      iframe.remove();
      reject(new Error("calculator.bundle.js konnte nicht geladen werden."));
    };

    doc.head.appendChild(script);
  });

  return prState.nationalLoadPromise;
}

function prGetNationalRecordSeconds(year, mode, ak, gender, discipline) {
  const discKey = prGetNationalDisciplineKeyForUI(discipline);
  const years = prNationalRecords.years
    .filter(y => y <= year)
    .sort((a, b) => b - a);

  for (const y of years) {
    const value =
      prNationalRecords.data?.[y]?.[mode]?.[ak]?.[gender]?.[discKey];

    if (typeof value === "number" && isFinite(value)) {
      return value;
    }
  }

  return null;
}

function prParseTimeString(str) {
  let s = String(str || "").trim();
  if (!s) return NaN;

  s = s.replace(",", ".");

  let minutes = 0;
  let seconds = 0;

  if (s.includes(":")) {
    const parts = s.split(":");
    minutes = parseInt(parts[0], 10) || 0;
    seconds = parseFloat(parts[1]) || 0;
  } else {
    seconds = parseFloat(s) || 0;
  }

  return minutes * 60 + seconds;
}

function prFormatSeconds(totalSeconds) {
  if (totalSeconds == null || !isFinite(totalSeconds)) return "";
  const centi = Math.round(totalSeconds * 100);
  const minutes = Math.floor(centi / 6000);
  const sec = Math.floor((centi - minutes * 6000) / 100);
  const cs = centi % 100;
  return `${minutes}:${String(sec).padStart(2, "0")},${String(cs).padStart(2, "0")}`;
}

function prSanitizeTimeDigits(value) {
  return String(value || "")
    .replace(/\D+/g, "")
    .slice(0, 6);
}

function prFormatTimeDigits(digits) {
  const d = prSanitizeTimeDigits(digits);

  if (!d) return "";
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, -2)},${d.slice(-2)}`;
  return `${d.slice(0, -4)}:${d.slice(-4, -2)},${d.slice(-2)}`;
}

function prNormalizeTimeInputValue(value) {
  return prFormatTimeDigits(value);
}

function prExcelTimeCellToSeconds(cell) {
  if (!cell) return null;
  if (typeof cell.v === "number") {
    return cell.v * 24 * 60 * 60;
  }
  const raw = String(cell.w || cell.v || "").trim();
  if (!raw) return null;
  const sec = prParseTimeString(raw);
  return isNaN(sec) ? null : sec;
}

function prCalcNationalPoints(timeSec, recSec) {
  if (!recSec || !timeSec || !isFinite(timeSec) || !isFinite(recSec)) return 0;
  const ratio = timeSec / recSec;
  if (ratio >= 5) return 0;
  if (ratio < 2) {
    return 467 * Math.pow(ratio, 2) - 2001 * ratio + 2534;
  }
  if (ratio <= 5) {
    return 2000 / 3 - (400 / 3) * ratio;
  }
  return 0;
}

function prGetRule() {
  const el = document.getElementById("pr-rule");
  return el ? el.value : "National";
}

function prGetRuleLabelLower() {
  return prGetRule() === "International"
    ? prT("ruleWorldLower")
    : prT("ruleGermanyLower");
}

function prUpdateSummaryLabel() {
  const modeEl = document.getElementById("pr-mode");
  const rule = prGetRule();
  const isTeam = modeEl ? modeEl.value === "Mannschaft" : false;
  const cell = document.getElementById("pr-summary-label");
  if (!cell) return;

  const ruleLabel = prGetRuleLabelLower();

  if (isTeam) {
    cell.textContent = prT("summaryAll4", { rule: ruleLabel });
  } else if (rule === "International") {
    cell.textContent = prT("summaryTop4", { rule: ruleLabel });
  } else {
    cell.textContent = prT("summaryTop3", { rule: ruleLabel });
  }
}

function prUpdatePointsHeader() {
  const pointsHeader = document.getElementById("pr-points-header");
  if (!pointsHeader) return;
  pointsHeader.textContent = prGetRule() === "International" ? prT("pointsWR") : prT("pointsDE");
}

function prUpdateDisciplineRecordDisplay() {
  const cells = document.querySelectorAll(".pr-disc-name");

  cells.forEach(cell => {
    const baseLabel = cell.dataset.baseLabel || cell.textContent;
    const rec = cell.dataset.recDisplay || "";
    cell.textContent = rec ? `${baseLabel} (${rec})` : baseLabel;
  });
}

async function prEnsureRecordsWorkbook() {
  if (typeof XLSX === "undefined") return;

  try {
    if (!prRecords.workbook) {
      const resp = await fetch(PR_RECORDS_URL);
      if (!resp.ok) {
        console.warn("records_kriterien.xlsx konnte nicht geladen werden:", resp.status);
        return;
      }
      const buf = await resp.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      prRecords.workbook = wb;
    }

    prSelectRecordsSheet();
  } catch (e) {
    console.warn("Fehler beim Laden von records_kriterien.xlsx:", e);
  }
}

function prSelectRecordsSheet() {
  if (!prRecords.workbook) return;

  const rule = prGetRule();
  const ageSel = document.getElementById("pr-age");
  const ak = ageSel ? ageSel.value : "Offen";

  let sheetName = "DR";
  if (rule === "International") {
    sheetName = ak === "Junioren" ? "WR-Youth" : "WR-Open";
  }

  if (prRecords.sheetName === sheetName && prRecords.sheetDR) {
    return;
  }

  const sheet = prRecords.workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`Arbeitsblatt '${sheetName}' in records_kriterien.xlsx nicht gefunden.`);
    prRecords.sheetDR = null;
    prRecords.sheetName = null;
    prRecords.years = [];
    prRecords.yearRowIndex = {};
    prRecords.columnIndex = {};
    prRecords.earliestYear = null;
    prRecords.latestYear = null;
    return;
  }

  prRecords.sheetDR = sheet;
  prRecords.sheetName = sheetName;
  prBuildDRIndex(sheetName);
}

function prBuildDRIndex(sheetName) {
  const sheet = prRecords.sheetDR;
  if (!sheet || !sheet["!ref"]) return;

  const range = XLSX.utils.decode_range(sheet["!ref"]);

  prRecords.years = [];
  prRecords.yearRowIndex = {};
  prRecords.columnIndex = {};

  for (let r = 4; r <= range.e.r; r++) {
    const addr = XLSX.utils.encode_cell({ c: 0, r });
    const cell = sheet[addr];
    const year = parseInt(cell && cell.v, 10);
    if (!isNaN(year)) {
      prRecords.years.push(year);
      prRecords.yearRowIndex[year] = r;
    }
  }

  prRecords.years.sort((a, b) => a - b);
  prRecords.earliestYear = prRecords.years[0] || null;
  prRecords.latestYear = prRecords.years[prRecords.years.length - 1] || null;

  const headerRow = 3;

  if (sheetName === "DR") {
    for (let c = 1; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ c, r: headerRow });
      const cell = sheet[addr];
      if (!cell || cell.v == null) continue;

      const text = String(cell.v).trim();
      if (!text) continue;

      const partsRaw = text.split("-").map(p => p.trim()).filter(Boolean);
      if (partsRaw.length < 3) continue;
      if (partsRaw.length > 3) continue;

      const discName = partsRaw[0];
      const akHeader = partsRaw[1].toLowerCase();
      const genderHeader = partsRaw[2].toLowerCase();

      const discKey = prNormalizeKey(discName);
      const genderKey = genderHeader.startsWith("w") ? "w" : "m";

      const key = `${discKey}|${akHeader}|${genderKey}`;
      prRecords.columnIndex[key] = c;
    }
  } else {
    const akKey = sheetName === "WR-Open" ? "offen" : "junioren";
    const wrOpenNorm = prNormalizeKey("WR-Open");
    const wrYouthNorm = prNormalizeKey("WR-Youth");

    for (let c = 1; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ c, r: headerRow });
      const cell = sheet[addr];
      if (!cell || cell.v == null) continue;

      const raw = String(cell.v).trim();
      if (!raw) continue;

      const headerNorm = prNormalizeKey(raw);
      if (!headerNorm) continue;
      if (headerNorm === wrOpenNorm || headerNorm === wrYouthNorm) continue;

      let discNorm = headerNorm;
      let genderKey = "w";

      if (/\d$/.test(discNorm)) {
        const lastChar = discNorm.charAt(discNorm.length - 1);
        if (lastChar === "2") {
          genderKey = "m";
          discNorm = discNorm.slice(0, -1).trim();
        }
      }

      const key = `${discNorm}|${akKey}|${genderKey}`;
      prRecords.columnIndex[key] = c;
    }
  }
}

function prGetDRKey(ak, gender, discipline) {
  let akKey = String(ak || "").toLowerCase();
  if (akKey === "offen") akKey = "offen";
  if (akKey === "junioren") akKey = "junioren";

  const g = String(gender || "").toLowerCase();
  const genderKey = g.startsWith("w") ? "w" : "m";

  const discKey = prNormalizeKey(
    discipline.drKey || discipline.excelKey || discipline.label
  );

  return `${discKey}|${akKey}|${genderKey}`;
}

function prGetDRRecordSeconds(year, ak, gender, discipline) {
  const sheet = prRecords.sheetDR;
  if (!sheet || !prRecords.years.length) return null;

  const key = prGetDRKey(ak, gender, discipline);
  const col = prRecords.columnIndex[key];

  if (col == null) {
    return null;
  }

  const years = prRecords.years.slice().sort((a, b) => a - b);

  let idx = years.indexOf(year);
  if (idx === -1) {
    for (let i = years.length - 1; i >= 0; i--) {
      if (years[i] <= year) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return null;
  }

  for (let i = idx; i >= 0; i--) {
    const y = years[i];
    const r = prRecords.yearRowIndex[y];
    const addr = XLSX.utils.encode_cell({ c: col, r });
    const cell = sheet[addr];
    const sec = prExcelTimeCellToSeconds(cell);
    if (sec != null) return sec;
  }

  return null;
}

function prInitEvents() {
  const modeSel = document.getElementById("pr-mode");
  const ageSel = document.getElementById("pr-age");
  const genderSel = document.getElementById("pr-gender");
  const ruleSel = document.getElementById("pr-rule");

  if (modeSel) {
    modeSel.addEventListener("change", () => prRenderCurrentSelection());
  }

  if (genderSel) {
    genderSel.addEventListener("change", () => prRenderCurrentSelection());
  }

  if (ageSel) {
    ageSel.addEventListener("change", () => prRenderCurrentSelection());
  }

  if (ruleSel) {
    ruleSel.addEventListener("change", () => {
      const ageElement = document.getElementById("pr-age");
      const ageValue = ageElement ? ageElement.value : "12";

      prRenderAgeOptions(ageValue);
      prUpdateSummaryLabel();
      prUpdatePointsHeader();
      prRenderCurrentSelection();
    });
  }

  const langSwitch = document.getElementById("pr-lang-switch");
  if (langSwitch) {
    langSwitch.addEventListener("click", () => {
      prToggleLanguage();
    });
  }
}

function prGetDisciplines(mode, ak) {
  const m = PR_DISCIPLINES[mode];
  if (!m) return [];
  return m[ak] || [];
}

async function prRenderCurrentSelection() {
  const loading = document.getElementById("pr-loading");
  const table = document.getElementById("discipline-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const totalDe = document.getElementById("pr-total-de");

  if (tbody) tbody.innerHTML = "";
  if (totalDe) totalDe.textContent = "";

  const modeElem = document.getElementById("pr-mode");
  const ageElem = document.getElementById("pr-age");
  const genderElem = document.getElementById("pr-gender");
  if (!modeElem || !ageElem || !genderElem) return;

  const mode = modeElem.value;
  const ak = ageElem.value;
  const gender = genderElem.value;
  const rule = prGetRule();

  if (rule === "International" && mode === "Einzel") {
    await prEnsureRecordsWorkbook();
  }

  prUpdateSummaryLabel();
  prUpdatePointsHeader();

  const list = prGetDisciplines(mode, ak);

  if (!list.length) {
    if (tbody) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.textContent = prT("noDisc");
      row.appendChild(cell);
      tbody.appendChild(row);
    }
  } else {
    list.forEach(disc => {
      const tr = document.createElement("tr");
      tr.dataset.disciplineId = disc.id;
      tr.dataset.pointsDe = "0";

      const tdName = document.createElement("td");
      tdName.className = "pr-disc-name";
      const discLabel = prGetDisciplineLabel(disc);
      tdName.dataset.baseLabel = discLabel;
      tdName.textContent = discLabel;
      tr.appendChild(tdName);

      const tdInput = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "pr-time-input";
      input.placeholder = "m:ss,cc";
      input.autocomplete = "off";
      input.inputMode = "numeric";
      input.maxLength = 8;
      tdInput.appendChild(input);
      tr.appendChild(tdInput);

      let recSeconds = null;
      const useNationalRecords = rule === "National" || mode === "Mannschaft";

      if (useNationalRecords) {
        if (prNationalRecords.latestYear != null) {
          recSeconds = prGetNationalRecordSeconds(
            prNationalRecords.latestYear,
            mode,
            ak,
            gender,
            disc
          );
        }
      } else {
        if (prRecords.latestYear != null) {
          recSeconds = prGetDRRecordSeconds(prRecords.latestYear, ak, gender, disc);
        }
      }

      if (recSeconds != null) {
        tr.dataset.recSeconds = String(recSeconds);
        tdName.dataset.recDisplay = prFormatSeconds(recSeconds);
      } else {
        tr.dataset.recSeconds = "";
        tdName.dataset.recDisplay = "";
      }

      const tdPointsDe = document.createElement("td");
      tdPointsDe.className = "pr-points-de";
      tr.appendChild(tdPointsDe);

      if (tbody) tbody.appendChild(tr);

      input.addEventListener("input", () => {
        const formattedValue = prNormalizeTimeInputValue(input.value);

        if (input.value !== formattedValue) {
          input.value = formattedValue;
        }

        prRecalcRowPoints(tr);
        prUpdateTotalPointsDe();
      });
    });
  }

  table.hidden = false;
  if (loading) loading.style.display = "none";

  prUpdateDisciplineRecordDisplay();
  prUpdateTotalPointsDe();
}

function prRecalcRowPoints(tr) {
  const input = tr.querySelector(".pr-time-input");
  const pointsCell = tr.querySelector(".pr-points-de");
  if (!input || !pointsCell) return;

  const recSeconds = parseFloat(tr.dataset.recSeconds || "");
  const timeSec = prParseTimeString(input.value);

  if (!input.value || !recSeconds || isNaN(timeSec)) {
    pointsCell.textContent = "";
    tr.dataset.pointsDe = "0";
    return;
  }

  const pts = prCalcNationalPoints(timeSec, recSeconds);
  tr.dataset.pointsDe = pts > 0 ? String(pts) : "0";
  pointsCell.textContent = pts > 0 ? pts.toFixed(2) + " P" : "0,00 P";
}

function prUpdateTotalPointsDe() {
  const table = document.getElementById("discipline-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
  const totalCell = document.getElementById("pr-total-de");
  if (!totalCell) return;

  const modeElem = document.getElementById("pr-mode");
  const mode = modeElem ? modeElem.value : "Einzel";
  const isTeam = mode === "Mannschaft";

  const rule = prGetRule();
  const isIntl = rule === "International";

  const entries = rows.map(row => {
    const cell = row.querySelector(".pr-points-de");
    const val = cell ? parseFloat(cell.textContent) : NaN;
    return { row, cell, val: isNaN(val) ? 0 : val };
  });

  entries.forEach(e => {
    if (e.cell) {
      e.cell.classList.remove("pr-points-de-top3", "pr-points-de-top4");
    }
  });

  const vals = entries.map(e => e.val).filter(v => v > 0);
  if (!vals.length) {
    totalCell.textContent = "";
    return;
  }

  let total;
  if (isTeam) {
    total = vals.reduce((a, b) => a + b, 0);
  } else {
    const valsSorted = vals.slice().sort((a, b) => b - a);
    const k = isIntl ? 4 : 3;
    total = valsSorted.slice(0, k).reduce((a, b) => a + b, 0);
  }

  totalCell.textContent = total.toFixed(2) + " P";

  if (isTeam) {
    entries.forEach(e => {
      if (e.cell && e.val > 0) e.cell.classList.add("pr-points-de-top3");
    });
  } else {
    const entriesSorted = entries.slice().sort((a, b) => b.val - a.val);
    const k = isIntl ? 4 : 3;

    entriesSorted.slice(0, k).forEach(e => {
      if (e.cell && e.val > 0) e.cell.classList.add("pr-points-de-top3");
    });

    const extraIndex = k;
    if (entriesSorted.length > extraIndex && entriesSorted[extraIndex].val > 0 && entriesSorted[extraIndex].cell) {
      entriesSorted[extraIndex].cell.classList.add("pr-points-de-top4");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <button id="pr-lang-switch" class="pr-lang-switch" type="button">
        <img id="pr-lang-switch-icon" src="./svg/Großbritannien.svg" alt="English">
        <span id="pr-lang-switch-text">English</span>
      </button>
      <h1 id="pr-page-title">Punkterechner</h1>
    </section>

    <section class="pr-controls-wrapper">
      <div class="pr-controls-grid">
        <div class="pr-control">
          <label for="pr-mode" id="pr-mode-label">Wertung</label>
          <select id="pr-mode">
            <option value="Einzel">Einzel</option>
            <option value="Mannschaft">Mannschaft</option>
          </select>
        </div>

        <div class="pr-control">
          <label for="pr-age" id="pr-age-label">Altersklasse</label>
          <select id="pr-age">
            <option value="12">AK 12</option>
            <option value="13/14">AK 13/14</option>
            <option value="15/16">AK 15/16</option>
            <option value="17/18">AK 17/18</option>
            <option value="Offen">AK Offen</option>
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
      <div id="pr-info" class="pr-info"></div>
    </section>

    <section class="pr-table-wrapper">
      <div id="pr-loading" class="pr-loading">Rekordwerte werden initialisiert …</div>
      <table id="discipline-table" class="pr-table" hidden>
        <thead>
          <tr>
            <th id="pr-discipline-header">Disziplin</th>
            <th id="pr-time-header">Zeit</th>
            <th id="pr-points-header">Punkte (DE)</th>
          </tr>
        </thead>
        <tbody></tbody>
        <tfoot>
          <tr class="pr-summary-row">
            <td colspan="2" id="pr-summary-label">Gesamt (deutschland, beste 3 Disziplinen)</td>
            <td id="pr-total-de"></td>
          </tr>
        </tfoot>
      </table>
    </section>
  `;

  prApplyLanguage();

  if (typeof XLSX === "undefined") {
    prSetInfo("xlsxMissing");
    prInitEvents();
    prRenderCurrentSelection();
    return;
  }

  Promise.all([
    prEnsureNationalRecords(),
    prEnsureRecordsWorkbook()
  ])
    .then(() => {
      if (prNationalRecords.latestYear != null) {
        prSetInfo("nationalLoaded", { latestYear: prNationalRecords.latestYear });
      } else {
        prSetInfo("loadFail");
      }
      prInitEvents();
      prRenderCurrentSelection();
    })
    .catch(err => {
      console.error(err);
      prSetInfo("loadError");
      prInitEvents();
      prRenderCurrentSelection();
    });
});