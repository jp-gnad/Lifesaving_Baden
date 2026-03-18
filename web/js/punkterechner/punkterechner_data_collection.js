const PR_RECORDS_URL =
  window.location.protocol === "file:"
    ? "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx"
    : "./utilities/records_kriterien.xlsx";

const PR_NATIONAL_RECORDS_URL = "https://www.dennisfabri.de/assets/js/calculator.bundle.js";

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

function prCanonicalAgegroup(label) {
  const cleaned = prFixMojibake(label).trim().replace(/^AK\s+/i, "").trim();
  if (/^offen$/i.test(cleaned)) return "Offen";
  return cleaned;
}

function prCanonicalNationalDisciplineKey(name) {
  let s = prNormalizeKey(prFixMojibake(name));

  s = s.replace(/\bhindernisschwimmen\b/g, "hindernis schwimmen");
  s = s.replace(/\bfreistilschwimmen\b/g, "freistil schwimmen");
  s = s.replace(/\bflossenschwimmen\b/g, "flossen");
  s = s.replace(/\bkombiniertes schwimmen\b/g, "komb schwimmen");

  s = s.replace(/\b100m kombinierte rettungsuebung\b/g, "100m komb rettungs");
  s = s.replace(/\b100m kombinierte rettungs uebung\b/g, "100m komb rettungs");
  s = s.replace(/\b100m komb rettungsuebung\b/g, "100m komb rettungs");
  s = s.replace(/\b100m komb rettungs uebung\b/g, "100m komb rettungs");

  s = s.replace(/\b100m retten m fl u gr\b/g, "100m lifesaver");
  s = s.replace(/\b100m retten m fl u gr\.\b/g, "100m lifesaver");
  s = s.replace(/\b100m retten m flossen u gr\b/g, "100m lifesaver");
  s = s.replace(/\b100m retten mit flossen u gr\b/g, "100m lifesaver");
  s = s.replace(/\b100m lifesaver\b/g, "100m lifesaver");

  s = s.replace(/\brueckenlage ohne armtaetigkeit\b/g, "rueckenlage ohne arme");
  s = s.replace(/\bschleppen einer puppe\b/g, "schleppen puppe");

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
  const modeSel = document.getElementById("pr-mode");

  const ak = ageSel ? ageSel.value : "Offen";
  const mode = modeSel ? modeSel.value : "Einzel";

  let sheetName = "DR";

  if (rule === "International") {
    if (mode === "Mannschaft") {
      sheetName = ak === "Junioren" ? "WR-Team-Youth" : "WR-Team-Open";
    } else {
      sheetName = ak === "Junioren" ? "WR-Youth" : "WR-Open";
    }
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