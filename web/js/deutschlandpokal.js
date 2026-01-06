const CONFIG_EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx";
const CONFIG_SHEET = "DP";
const CONFIG_TABLE_NAME = "DP_konfig";

const DATA_EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test%20(1).xlsx";
const DATA_SHEET = "Tabelle2";

const now = new Date();
const yNow = now.getFullYear();
const mNow = now.getMonth() + 1;
const SEASON_YEAR = mNow >= 11 ? yNow + 1 : yNow;

const COLS_DEFAULT = {
  gender: 0,
  name: 1,
  zeit_100_lifesaver: 3,
  zeit_50_retten: 4,
  zeit_200_superlifesaver: 5,
  zeit_100_kombi: 6,
  zeit_100_retten_flossen: 7,
  zeit_200_hindernis: 8,
  excelDatum: 9,
  meet_name: 10,
  yy2: 11,
  ortsgruppe: 12,
  landesverband: 13,
  poollaenge: 21,
  regelwerk: 25,
};

function timeToSeconds(text) {
  const t = String(text ?? "").trim();
  if (!t) return NaN;
  const parts = t.split(":");
  if (parts.length === 1) {
    const s = Number(parts[0].replace(",", "."));
    return Number.isFinite(s) ? s : NaN;
  }
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const s = Number(parts[1].replace(",", "."));
    if (!Number.isFinite(m) || !Number.isFinite(s)) return NaN;
    return m * 60 + s;
  }
  return NaN;
}

let COLS = { ...COLS_DEFAULT };

let DISCIPLINES = [
  { key: "lifesaver100", label: "100m Lifersver", wrKey: "lifesaver100", col: COLS.zeit_100_lifesaver },
  { key: "retten50", label: "50m Retten", wrKey: "retten50", col: COLS.zeit_50_retten },
  { key: "super200", label: "200m Super-Lifesaver", wrKey: "super200", col: COLS.zeit_200_superlifesaver },
  { key: "kombi100", label: "100m Kombi", wrKey: "kombi100", col: COLS.zeit_100_kombi },
  { key: "retten100", label: "100m Retten", wrKey: "retten100", col: COLS.zeit_100_retten_flossen },
  { key: "hindernis200", label: "200m Hindernis", wrKey: "hindernis200", col: COLS.zeit_200_hindernis },
];

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeGender(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "m" || s === "male" || s === "mann" || s === "männlich") return "m";
  if (s === "w" || s === "f" || s === "female" || s === "frau" || s === "weiblich") return "w";
  return "";
}

function fmtYY2(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  const yy = ((Math.trunc(n) % 100) + 100) % 100;
  return String(yy).padStart(2, "0");
}

function birthYearFromYY2(yy2, refYear) {
  const yy = Number(yy2);
  if (!Number.isFinite(yy)) return refYear;
  let y = 2000 + yy;
  if (y > refYear) y -= 100;
  return y;
}

function determineAKFromAge(age) {
  if (age <= 10) return "10";
  if (age <= 12) return "12";
  if (age <= 14) return "13/14";
  if (age <= 16) return "15/16";
  if (age <= 18) return "17/18";
  return "Offen";
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

function fmtNumDE(x) {
  return Number(x).toFixed(2).replace(".", ",");
}

function calcPointsFromRatio(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  if (ratio >= 5) return 0;
  if (ratio >= 2) return 2000 / 3 - (400 / 3) * ratio;
  return 467 * ratio * ratio - 2001 * ratio + 2534;
}

function normalizeTimeCell(v) {
  if (v === null || v === undefined) return "";

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const sec =
      v.getUTCHours() * 3600 +
      v.getUTCMinutes() * 60 +
      v.getUTCSeconds() +
      v.getUTCMilliseconds() / 1000;

    if (sec > 0 && sec < 24 * 3600) {
      const mm = Math.floor(sec / 60);
      const ss = sec - mm * 60;
      const sTxt = ss.toFixed(2).replace(".", ",").padStart(5, "0");
      return `${mm}:${sTxt}`;
    }
  }

  if (typeof v === "number" && v > 0 && v < 1) {
    const sec = v * 24 * 3600;
    const mm = Math.floor(sec / 60);
    const ss = sec - mm * 60;
    const sTxt = ss.toFixed(2).replace(".", ",").padStart(5, "0");
    return `${mm}:${sTxt}`;
  }

  return String(v).trim();
}


function parseExcelDate(v) {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  const n = Number(v);
  if (Number.isFinite(n) && n > 20000 && n < 60000) {
    const ms = Math.round((n - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(s);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    let yy = Number(m[3]);
    if (yy < 100) yy += 2000;
    const d = new Date(yy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d2 = new Date(s);
  return Number.isNaN(d2.getTime()) ? null : d2;
}

function isoDate(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function normalizeHeaderKey(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("\u00A0", " ")
    .replace(/\s+/g, " ")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
}

function parseBoolDE(v, fallback = false) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "ja" || s === "true" || s === "1" || s === "y") return true;
  if (s === "nein" || s === "false" || s === "0" || s === "n") return false;
  return fallback;
}

function parseIntMaybe(v, fallback = 0) {
  const s = String(v ?? "").trim();
  if (!s) return fallback;
  const n = parseInt(s.replace(",", "."), 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatMaybe(v, fallback = 0) {
  const s = String(v ?? "").trim();
  if (!s) return fallback;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function parseYearExpr(v, baseYear) {
  if (v === null || v === undefined || v === "") return baseYear;
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = Math.trunc(v);
    if (n > 1900 && n < 3000) return n;
  }
  const s0 = String(v ?? "").trim();
  if (!s0) return baseYear;
  const s = s0.replace(/\s+/g, " ");
  const m = /^jahr(?:\s*([+-])\s*(\d+))?$/i.exec(s);
  if (m) {
    const op = m[1];
    const k = m[2] ? parseInt(m[2], 10) : 0;
    if (!op) return baseYear;
    if (op === "+") return baseYear + k;
    return baseYear - k;
  }
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && n > 1900 && n < 3000) return n;
  return baseYear;
}

function parseDateExprToISO(v, baseYear) {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return isoDate(v);
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 20000 && v < 60000) {
      const d = parseExcelDate(v);
      return d ? isoDate(d) : "";
    }
    const n = Math.trunc(v);
    if (n > 1900 && n < 3000) return `${n}-01-01`;
  }
  const s0 = String(v ?? "").trim();
  if (!s0) return "";
  const s = s0.replace(/\s+/g, " ");
  const m1 = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (m1) {
    const dd = Number(m1[1]);
    const mm = Number(m1[2]);
    const yy = Number(m1[3]);
    const d = new Date(yy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? "" : isoDate(d);
  }
  const m2 = /^(\d{1,2})\.(\d{1,2})\.\s*jahr(?:\s*([+-])\s*(\d+))?$/i.exec(s);
  if (m2) {
    const dd = Number(m2[1]);
    const mm = Number(m2[2]);
    const op = m2[3];
    const k = m2[4] ? parseInt(m2[4], 10) : 0;
    let yy = baseYear;
    if (op === "+") yy = baseYear + k;
    if (op === "-") yy = baseYear - k;
    const d = new Date(yy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? "" : isoDate(d);
  }
  const d2 = new Date(s);
  if (!Number.isNaN(d2.getTime())) return isoDate(d2);
  return "";
}

function parseAbsagenList(v) {
  const s0 = String(v ?? "").trim();
  if (!s0) return [];
  const s = s0.replaceAll("\r", "\n");
  const parts = s.split(/[,;\n]+/g).map(x => x.trim()).filter(Boolean);
  return parts.map(x => x.replace(/\.+$/g, "").trim()).filter(Boolean);
}

function extractKampfFromWertung(v, fallback = 4) {
  const s = String(v ?? "").trim().toLowerCase();
  const m = /(\d+)/.exec(s);
  const n = m ? parseInt(m[1], 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function findHeaderRowIndex(rows, requiredKeys) {
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const r = rows[i] || [];
    const keys = r.map(normalizeHeaderKey);
    const ok = requiredKeys.every(k => keys.includes(k));
    if (ok) return i;
  }
  return -1;
}

function buildHeaderIndexMap(headerRow) {
  const map = new Map();
  for (let i = 0; i < headerRow.length; i++) {
    const k = normalizeHeaderKey(headerRow[i]);
    if (k) map.set(k, i);
  }
  return map;
}

function findWrHeaderRowIndex(rows) {
  const required = [
    "50m retten",
    "100m retten",
    "100m kombi",
    "100m lifesaver",
    "200m superlifesaver",
    "200m hindernis",
    "50m retten2",
    "100m retten2",
    "100m kombi2",
    "100m lifesaver2",
    "200m superlifesaver2",
    "200m hindernis2",
  ];

  for (let i = 0; i < Math.min(rows.length, 60); i++) {
    const r = rows[i] || [];
    const keys = r.map(normalizeHeaderKey);
    const hasAll = required.every(k => keys.includes(k));
    const hasFirst = keys.includes("wr-open") || keys.includes("wr-youth");
    if (hasAll && hasFirst) return i;
  }
  return -1;
}

function toYearNumber(v) {
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function findBestYearRow(rows, yearCol, targetYear, startIdx) {
  let bestBelow = null; // max <= targetYear
  let bestAbove = null; // min >= targetYear

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const y = toYearNumber(r[yearCol]);
    if (!Number.isFinite(y)) continue;

    if (y === targetYear) return { row: r, foundYear: y, mode: "exact" };
    if (y < targetYear) {
      if (!bestBelow || y > bestBelow.foundYear) bestBelow = { row: r, foundYear: y, mode: "below" };
    } else {
      if (!bestAbove || y < bestAbove.foundYear) bestAbove = { row: r, foundYear: y, mode: "above" };
    }
  }

  return bestBelow || bestAbove || null;
}

function readWrTimesFromConfigWorkbook(cfgWb, refName, refYear) {
  const sheetName = normalizeReferenceName(refName);
  const ws = cfgWb.Sheets[sheetName];
  if (!ws) return null;

  const rows = window.XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });

  const headerIdx = findWrHeaderRowIndex(rows);
  if (headerIdx < 0) return null;

  const headerRow = rows[headerIdx] || [];
  const idxMap = buildHeaderIndexMap(headerRow);

  const yearCol =
    idxMap.get("wr-open") ??
    idxMap.get("wr-youth") ??
    0;

  const pick = findBestYearRow(rows, yearCol, refYear, headerIdx + 1);
  if (!pick) return null;

  const r = pick.row;

  const getTimeObj = (colKey) => {
    const col = idxMap.get(colKey);
    if (col === undefined) return { text: "", sec: 0 };
    const t = normalizeTimeCell(r[col]);
    const sec = timeToSeconds(t);
    return { text: t, sec: Number.isFinite(sec) ? sec : 0 };
  };

  return {
    foundYear: pick.foundYear,
    mode: pick.mode,
    w: {
      retten50: getTimeObj("50m retten"),
      retten100: getTimeObj("100m retten"),
      kombi100: getTimeObj("100m kombi"),
      lifesaver100: getTimeObj("100m lifesaver"),
      super200: getTimeObj("200m superlifesaver"),
      hindernis200: getTimeObj("200m hindernis"),
    },
    m: {
      retten50: getTimeObj("50m retten2"),
      retten100: getTimeObj("100m retten2"),
      kombi100: getTimeObj("100m kombi2"),
      lifesaver100: getTimeObj("100m lifesaver2"),
      super200: getTimeObj("200m superlifesaver2"),
      hindernis200: getTimeObj("200m hindernis2"),
    },
  };
}

function attachReferenceTimesToConfigs(cfgs, cfgWb) {
  for (const cfg of cfgs) {
    const refName = cfg.REFERENZ || "WR-Open";
    const refYear = Number.isFinite(cfg.REF_YEAR) ? cfg.REF_YEAR : SEASON_YEAR;

    const wr = readWrTimesFromConfigWorkbook(cfgWb, refName, refYear);

    cfg.REF_WR = wr ? { w: wr.w, m: wr.m } : null;
    cfg.REF_WR_INFO = wr ? { refName: normalizeReferenceName(refName), requestedYear: refYear, foundYear: wr.foundYear, mode: wr.mode } : null;
  }
}


function getCell(row, idx) {
  if (!row) return "";
  return idx >= 0 ? row[idx] : "";
}

function loadConfigsFromWorkbook(wb) {
  const ws = wb.Sheets[CONFIG_SHEET];
  if (!ws) return [];
  const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "", blankrows: false });
  const required = [
    "tabellen name",
    "geschlecht",
    "mindest alter",
    "maximales alter",
    "qualizeitraum anfang",
    "qualizeitraum ende",
    "letzter wettkampf am",
    "wertung",
    "landesverband",
    "oms",
    "pool-laenge",
    "regelwerk",
    "referenz",
    "referenz jahr",
    "mindest punktzahl",
    "mindest disziplinen",
    "3-kampf regel",
    "anzahl nominierte",
    "anzahl nachruecker",
    "seiten anzahl",
    "absagen",
  ];
  const headerIdx = findHeaderRowIndex(rows, required);
  if (headerIdx < 0) return [];
  const headerRow = rows[headerIdx] || [];
  const idxMap = buildHeaderIndexMap(headerRow);

  const out = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const tableName = String(getCell(r, idxMap.get("tabellen name") ?? -1) ?? "").trim();
    const gender = normalizeGender(getCell(r, idxMap.get("geschlecht") ?? -1));

    const isEmptyRow = !tableName && !gender && r.every(x => String(x ?? "").trim() === "");
    if (isEmptyRow) break;

    if (!tableName) continue;

    const ageMin = parseIntMaybe(getCell(r, idxMap.get("mindest alter") ?? -1), NaN);
    const ageMax = parseIntMaybe(getCell(r, idxMap.get("maximales alter") ?? -1), NaN);

    const dateFromISO = parseDateExprToISO(getCell(r, idxMap.get("qualizeitraum anfang") ?? -1), SEASON_YEAR);
    const dateToISO = parseDateExprToISO(getCell(r, idxMap.get("qualizeitraum ende") ?? -1), SEASON_YEAR);
    const lastCompFromISO = parseDateExprToISO(getCell(r, idxMap.get("letzter wettkampf am") ?? -1), SEASON_YEAR);

    const kampf = extractKampfFromWertung(getCell(r, idxMap.get("wertung") ?? -1), 4);

    const landesverband = String(getCell(r, idxMap.get("landesverband") ?? -1) ?? "").trim();
    const omsAllowed = parseBoolDE(getCell(r, idxMap.get("oms") ?? -1), false);

    const pool = String(getCell(r, idxMap.get("pool-laenge") ?? -1) ?? "").trim();
    const regelwerk = String(getCell(r, idxMap.get("regelwerk") ?? -1) ?? "").trim();

    const ref = normalizeReferenceName(getCell(r, idxMap.get("referenz") ?? -1)) || "WR-Open";
    const refYear = parseYearExpr(getCell(r, idxMap.get("referenz jahr") ?? -1), SEASON_YEAR);

    const minPoints = parseFloatMaybe(getCell(r, idxMap.get("mindest punktzahl") ?? -1), 0);

    const rule3 = parseBoolDE(getCell(r, idxMap.get("3-kampf regel") ?? -1), true);
    
    const minDisciplines = parseIntMaybe(getCell(r, idxMap.get("mindest disziplinen") ?? -1), 0);

    const nNom = parseIntMaybe(getCell(r, idxMap.get("anzahl nominierte") ?? -1), 0);
    const nNach = parseIntMaybe(getCell(r, idxMap.get("anzahl nachruecker") ?? -1), 0);
    const pageSize = parseIntMaybe(getCell(r, idxMap.get("seiten anzahl") ?? -1), 10);

    const absagen = parseAbsagenList(getCell(r, idxMap.get("absagen") ?? -1));

    out.push({
      id: `t${out.length + 1}`,
      TABELLEN_NAME: tableName,
      GENDER: gender,
      AGE_MIN: ageMin,
      AGE_MAX: ageMax,
      DATE_FROM: dateFromISO,
      DATE_TO: dateToISO,
      LAST_COMP_FROM: lastCompFromISO,
      KAMPF: kampf,
      LANDESVERBAND: landesverband,
      OMS_ALLOWED: omsAllowed,
      POOL: pool,
      REGELWERK: regelwerk,
      REFERENZ: ref,
      REF_YEAR: refYear,
      MIN_POINTS: minPoints,
      MIN_DISCIPLINES: minDisciplines,
      DP_3KAMPF_RULE: rule3,
      NOMINIERTEN_ANZAHL: nNom,
      NACHRUECKER_ANZAHL: nNach,
      PAGE_SIZE: pageSize,
      ABSAGEN: absagen,
    });
  }
  return out;
}

function detectAthleteSheetName(wb) {
  const names = wb.SheetNames || [];
  const preferred = ["Tabelle2", "Tabelle1", "DP_Daten", "DP Daten", "DP-Data", "DP Data", "Daten", "Data", "Nominierung", "Nominierungsliste"];
  for (const n of preferred) {
    if (names.includes(n)) return n;
  }
  const skip = new Set([CONFIG_SHEET, "WR-Open", "WR-Youth", "WR Open", "WR Youth", "WR_Open", "WR_Youth"]);
  for (const sn of names) {
    if (skip.has(sn)) continue;
    const ws = wb.Sheets[sn];
    if (!ws) continue;
    const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "", blankrows: false });
    const idx = findHeaderRowIndex(rows, ["gender", "name"]);
    if (idx >= 0) return sn;
    const idx2 = findHeaderRowIndex(rows, ["geschlecht", "name"]);
    if (idx2 >= 0) return sn;
  }
  for (const sn of names) {
    if (!skip.has(sn)) return sn;
  }
  return names[0] || CONFIG_SHEET;
}

function detectColsFromHeader(rows) {
  const idx = findHeaderRowIndex(rows, ["name"]);
  if (idx < 0) return { ...COLS_DEFAULT };
  const header = rows[idx] || [];
  const keys = header.map(normalizeHeaderKey);

  const find = (pred) => {
    const j = keys.findIndex(pred);
    return j >= 0 ? j : -1;
  };

  const cols = { ...COLS_DEFAULT };

  const g = find(k => k === "gender" || k === "geschlecht");
  if (g >= 0) cols.gender = g;

  const n = find(k => k === "name" || k === "nachname" || k === "vorname nachname");
  if (n >= 0) cols.name = n;

  const d = find(k => k.includes("datum") || k.includes("date"));
  if (d >= 0) cols.excelDatum = d;

  const meet = find(k => k.includes("meet") || k.includes("wettkampf") || k.includes("veranstaltung") || k.includes("competition"));
  if (meet >= 0) cols.meet_name = meet;

  const yy2 = find(k => k.includes("yy2") || k.includes("jahrgang") || k.includes("geburtsjahr") || k.includes("birth"));
  if (yy2 >= 0) cols.yy2 = yy2;

  const og = find(k => k.includes("ortsgruppe") || k.includes("gliederung") || k.includes("og"));
  if (og >= 0) cols.ortsgruppe = og;

  const lv = find(k => k.includes("landesverband") || k === "lv");
  if (lv >= 0) cols.landesverband = lv;

  const pool = find(k => (k.includes("pool") && (k.includes("laenge") || k.includes("länge"))) || k.includes("bahnenlaenge"));
  if (pool >= 0) cols.poollaenge = pool;

  const rw = find(k => k.includes("regelwerk"));
  if (rw >= 0) cols.regelwerk = rw;

  const ls100 = find(k => k.includes("100") && k.includes("life") && k.includes("saver"));
  if (ls100 >= 0) cols.zeit_100_lifesaver = ls100;

  const r50 = find(k => k.includes("50") && k.includes("rett"));
  if (r50 >= 0) cols.zeit_50_retten = r50;

  const s200 = find(k => k.includes("200") && (k.includes("super") || (k.includes("life") && k.includes("saver"))));
  if (s200 >= 0) cols.zeit_200_superlifesaver = s200;

  const k100 = find(k => k.includes("100") && k.includes("kombi"));
  if (k100 >= 0) cols.zeit_100_kombi = k100;

  const r100 = find(k => k.includes("100") && k.includes("rett") && (k.includes("floss") || k.includes("flossen")));
  if (r100 >= 0) cols.zeit_100_retten_flossen = r100;

  const h200 = find(k => k.includes("200") && k.includes("hindern"));
  if (h200 >= 0) cols.zeit_200_hindernis = h200;

  return cols;
}

function updateDisciplinesCols() {
  DISCIPLINES = [
    { key: "lifesaver100", label: "100m Lifersver", wrKey: "lifesaver100", col: COLS.zeit_100_lifesaver },
    { key: "retten50", label: "50m Retten", wrKey: "retten50", col: COLS.zeit_50_retten },
    { key: "super200", label: "200m Super-Lifesaver", wrKey: "super200", col: COLS.zeit_200_superlifesaver },
    { key: "kombi100", label: "100m Kombi", wrKey: "kombi100", col: COLS.zeit_100_kombi },
    { key: "retten100", label: "100m Retten", wrKey: "retten100", col: COLS.zeit_100_retten_flossen },
    { key: "hindernis200", label: "200m Hindernis", wrKey: "hindernis200", col: COLS.zeit_200_hindernis },
  ];
}

function countValidDisciplinesInRow(r) {
  let c = 0;
  for (const dis of DISCIPLINES) {
    const t = normalizeTimeCell(r[dis.col]);
    if (!t) continue;
    if (String(t).toUpperCase().includes("DQ")) continue;
    const sec = timeToSeconds(String(t));
    if (Number.isFinite(sec) && sec > 0) c++;
  }
  return c;
}

function buildAthletesForConfig(rows, cfg) {
  if (!rows || !rows.length) return [];

  const r0 = rows[0] || [];
  const maybeHeader = String(r0[COLS.gender] ?? "").toLowerCase();
  const startIdx = maybeHeader.includes("gender") || maybeHeader.includes("geschlecht") ? 1 : 0;

  const byKey = new Map();
  const discLen = DISCIPLINES.length;
  const topCount = Math.max(1, Math.min(cfg.KAMPF || 4, discLen));
  const minNeeded = Math.max(
    1,
    Math.min(discLen, Number.isFinite(cfg.MIN_DISCIPLINES) && cfg.MIN_DISCIPLINES > 0 ? cfg.MIN_DISCIPLINES : topCount)
  );
  const ageRefYear = (() => {
    const s = String(cfg?.DATE_TO ?? "").trim();
    const y = s && s.length >= 4 ? parseInt(s.slice(0, 4), 10) : NaN;
    return Number.isFinite(y) ? y : SEASON_YEAR;
  })();


  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const gender = normalizeGender(r[COLS.gender]);
    if (cfg.GENDER && gender !== cfg.GENDER) continue;
    if (gender !== "m" && gender !== "w") continue;

    const nameRaw = String(r[COLS.name] ?? "").trim();
    if (!nameRaw) continue;

    const yy2 = fmtYY2(r[COLS.yy2]);
    const birthYear = birthYearFromYY2(yy2, ageRefYear);
    const age = ageRefYear - birthYear;

    if (Number.isFinite(cfg.AGE_MIN) && age < cfg.AGE_MIN) continue;
    if (Number.isFinite(cfg.AGE_MAX) && age > cfg.AGE_MAX) continue;

    if (cfg.LANDESVERBAND) {
      const lv = String(r[COLS.landesverband] ?? "").trim();
      if (lv !== cfg.LANDESVERBAND) continue;
    }

    const meet = String(r[COLS.meet_name] ?? "").trim();
    if (!cfg.OMS_ALLOWED && meet.startsWith("OMS")) continue;

    if (cfg.POOL) {
      const pool = String(r[COLS.poollaenge] ?? "").trim();
      if (pool !== cfg.POOL) continue;
    }

    if (cfg.REGELWERK) {
      const rw = String(r[COLS.regelwerk] ?? "").trim();
      if (rw !== cfg.REGELWERK) continue;
    }

    const key = `${nameRaw}__${yy2}__${gender}`;
    const rowDate = parseExcelDate(r[COLS.excelDatum]);

    let a = byKey.get(key);
    if (!a) {
      const ak = determineAKFromAge(age);
      const display = `${nameRaw}${yy2 ? ` (${yy2})` : ""}`;

      const absageList = Array.isArray(cfg.ABSAGEN) ? cfg.ABSAGEN : [];
      const absage = absageList.includes(nameRaw) || absageList.includes(display);

      a = {
        gender,
        name: display,
        ak: `${ak} - ${age}`,
        og: "",
        ogDate: null,
        ogRowIndex: -1,
        yy2,
        birthYear,
        age,
        best: {},
        points: {},
        total: 0,
        topFlags: {},
        lastCompOk: false,
        baseName: nameRaw,
        absage,
        rankActive: null,
      };
      byKey.set(key, a);
    }

    const ogCandidate = String(r[COLS.ortsgruppe] ?? "").trim();
    if (ogCandidate) {
      const newerByDate = rowDate && (!a.ogDate || rowDate.getTime() > a.ogDate.getTime());
      const sameDateButLaterRow = rowDate && a.ogDate && rowDate.getTime() === a.ogDate.getTime() && i > a.ogRowIndex;
      const noDateFallback = !rowDate && !a.ogDate && i > a.ogRowIndex;
      if (newerByDate || sameDateButLaterRow || noDateFallback) {
        a.og = ogCandidate;
        if (rowDate) a.ogDate = rowDate;
        a.ogRowIndex = i;
      }
    }

    if (cfg.LAST_COMP_FROM && rowDate) {
      const fromLC = new Date(cfg.LAST_COMP_FROM + "T00:00:00");
      const toLC = cfg.DATE_TO ? new Date(cfg.DATE_TO + "T23:59:59") : null;
      const inLastCompWindow = rowDate >= fromLC && (!toLC || rowDate <= toLC);
      if (inLastCompWindow) {
        if (!cfg.DP_3KAMPF_RULE) {
          a.lastCompOk = true;
        } else {
          const cnt = countValidDisciplinesInRow(r);
          if (cnt >= 3) a.lastCompOk = true;
        }
      }
    }

    let inQualiWindow = true;
    if (cfg.DATE_FROM || cfg.DATE_TO) {
      if (!rowDate) {
        inQualiWindow = false;
      } else {
        if (cfg.DATE_FROM) {
          const fromQ = new Date(cfg.DATE_FROM + "T00:00:00");
          if (rowDate < fromQ) inQualiWindow = false;
        }
        if (cfg.DATE_TO) {
          const toQ = new Date(cfg.DATE_TO + "T23:59:59");
          if (rowDate > toQ) inQualiWindow = false;
        }
      }
    }

    if (!inQualiWindow) continue;

    for (const dis of DISCIPLINES) {
      const rawVal = r[dis.col];
      const t = normalizeTimeCell(rawVal);
      if (!t) continue;
      if (String(t).toUpperCase().includes("DQ")) continue;

      const sec = timeToSeconds(String(t));
      if (!Number.isFinite(sec) || sec <= 0) continue;

      const current = a.best[dis.key];
      if (!current || sec < current.sec) {
        a.best[dis.key] = {
          sec,
          timeText: String(t).trim(),
          meetName: meet,
          date: rowDate,
        };
      }
    }
  }

  const out = [];

  for (const a of byKey.values()) {
    if (cfg.LAST_COMP_FROM && !a.lastCompOk) continue;
    
    const startedCount = DISCIPLINES.reduce((c, dis) => c + (a.best?.[dis.key] ? 1 : 0), 0);
    if (startedCount < minNeeded) continue;

    const wrMap = cfg?.REF_WR;
    if (!wrMap) return [];
    const wr = wrMap[a.gender];
    let nonZeroCount = 0;

    for (const dis of DISCIPLINES) {
      const best = a.best[dis.key];
      if (!best) {
        a.points[dis.key] = 0;
        continue;
      }

      const wrSec = wr?.[dis.wrKey]?.sec ?? 0;
      if (!wrSec) {
        a.points[dis.key] = 0;
        continue;
      }

      const ratio = best.sec / wrSec;
      const pts = calcPointsFromRatio(ratio);
      const pts2 = round2(pts);

      a.points[dis.key] = pts2;
      if (pts2 > 0) nonZeroCount++;
    }

    const ptsArr = DISCIPLINES.map(d => ({ key: d.key, v: a.points[d.key] || 0 }));
    ptsArr.sort((x, y) => y.v - x.v);

    a.total = round2(ptsArr.slice(0, topCount).reduce((s, x) => s + x.v, 0));

    if (Number.isFinite(cfg.MIN_POINTS) && cfg.MIN_POINTS > 0) {
      if (a.total < cfg.MIN_POINTS) continue;
    }

    a.topFlags = {};
    for (let i = 0; i < topCount; i++) {
      if (ptsArr[i] && ptsArr[i].v > 0) a.topFlags[ptsArr[i].key] = true;
    }

    out.push(a);
  }

  return out;
}

function sortWithAbsagenLast(list) {
  const active = list.filter(x => !x.absage).sort((a, b) => b.total - a.total);
  const abs = list.filter(x => x.absage).sort((a, b) => b.total - a.total);
  return active.concat(abs);
}

function assignActiveRanks(list) {
  let r = -1;
  for (const a of list) {
    if (!a.absage) {
      r++;
      a.rankActive = r;
    } else {
      a.rankActive = null;
    }
  }
}

function normalizeReferenceName(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "wr-open" || s === "wr open" || s === "wropen") return "WR-Open";
  if (s === "wr-youth" || s === "wr youth" || s === "wryouth") return "WR-Youth";
  return String(v).trim();
}


function getMaxPage(list, pageSize) {
  const n = Array.isArray(list) ? list.length : 0;
  return Math.max(1, Math.ceil(n / pageSize));
}

function getPagerItems(current, max) {
  if (max <= 7) return Array.from({ length: max }, (_, i) => ({ type: "page", page: i + 1 }));
  const items = [];
  const addPage = p => items.push({ type: "page", page: p });
  const addDots = () => items.push({ type: "dots" });

  addPage(1);

  let start = Math.max(2, current - 1);
  let end = Math.min(max - 1, current + 1);

  if (current <= 3) {
    start = 2;
    end = 4;
  }

  if (current >= max - 2) {
    start = max - 3;
    end = max - 1;
  }

  if (start > 2) addDots();
  for (let p = start; p <= end; p++) addPage(p);
  if (end < max - 1) addDots();

  addPage(max);
  return items;
}

const CAP_SVG_FOLDER = "./svg/";
const CAP_FALLBACK_SRC = CAP_SVG_FOLDER + "Cap-Baden_light.svg";

function capSrcForOrtsgruppe(og) {
  const raw = String(og ?? "").trim();
  const safe = raw.replace(/[\/\\]/g, "-");
  return CAP_SVG_FOLDER + "Cap-" + encodeURIComponent(safe) + ".svg";
}

function getDisciplineDetailsSorted(a) {
  const out = [];
  for (const dis of DISCIPLINES) {
    const pts = a.points?.[dis.key] ?? 0;
    if (!pts || pts <= 0) continue;
    const best = a.best?.[dis.key];
    if (!best) continue;
    out.push({
      key: dis.key,
      points: pts,
      label: dis.label,
      meet: best.meetName || "",
      time: best.timeText || "",
      counted: !!a.topFlags?.[dis.key],
    });
  }
  out.sort((x, y) => y.points - x.points);
  return out;
}

function renderAthleteRow(a, cfg) {
  const r = a.rankActive;

  const isNominiert = !a.absage && r !== null && r < (cfg.NOMINIERTEN_ANZAHL || 0);
  const isNachruecker =
    !a.absage &&
    r !== null &&
    r >= (cfg.NOMINIERTEN_ANZAHL || 0) &&
    r < ((cfg.NOMINIERTEN_ANZAHL || 0) + (cfg.NACHRUECKER_ANZAHL || 0));

  const rowClass =
    "athlete-row " +
    (isNominiert ? "nominiert " : "") +
    (isNachruecker ? "nachruecker " : "") +
    (a.absage ? "absage-row " : "") +
    (a.gender === "w" ? "w-row" : "m-row");

  const totalText = a.absage ? "Abgesagt" : `${fmtNumDE(a.total)} P`;
  const details = getDisciplineDetailsSorted(a);

  const detailsHtml = details.length
    ? `
      <table class="nom-details-table" role="presentation">
        <tbody>
          ${details.map(d => `
            <tr class="detail-row ${d.counted ? "counted" : "noncount"}">
              <td class="d-main">
                <div class="d-dis">${escapeHtml(d.label)}</div>
                <div class="d-sub">
                  <span class="d-time">${escapeHtml(d.time)}</span>
                  <span class="d-sep"> | </span>
                  <span class="d-meet">${escapeHtml(d.meet)}</span>
                </div>
              </td>
              <td class="d-pts">${fmtNumDE(d.points)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `
    : `<div class="nom-details-empty">Keine Disziplindaten.</div>`;

  return `
    <tr class="${rowClass}" aria-expanded="false">
      <td class="col-cap">
        <img class="og-cap" src="${capSrcForOrtsgruppe(a.og)}" alt="" loading="lazy" decoding="async">
      </td>
      <td class="col-person">
        <div class="person-name">${escapeHtml(a.name)}</div>
        <div class="person-og">${escapeHtml(a.og)}</div>
      </td>
      <td class="col-total ${a.absage ? "absage-cell" : ""}">${escapeHtml(totalText)}</td>
    </tr>
    <tr class="athlete-details">
      <td colspan="3">
        <div class="athlete-details__inner">
          ${detailsHtml}
        </div>
      </td>
  </tr>
  `;
}

function renderCompactTableSlice(list, cfg) {
  if (!list.length) return `<p class="info-status">Keine Einträge.</p>`;
  const titleKampf = `${Math.max(1, cfg.KAMPF || 4)}-Kampf`;
  return `
    <div class="nom-table-wrap">
      <table class="nom-compact-table" role="table">
        <thead>
          <tr>
            <th class="col-person" colspan="2">Name / Gliederung</th>
            <th class="col-total">${escapeHtml(titleKampf)}</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(a => renderAthleteRow(a, cfg)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCompactTablePaged(fullList, cfg, page, pageSize) {
  if (!fullList.length) return `<p class="info-status">Keine Einträge.</p>`;
  const start = (page - 1) * pageSize;
  const slice = fullList.slice(start, start + pageSize);
  return renderCompactTableSlice(slice, cfg);
}

function renderPager(tableId, page, maxPage, standText) {
  const showControls = maxPage > 1;

  if (!showControls) {
    return `
      <div class="nom-pager" role="navigation" aria-label="Seitenwahl ${escapeHtml(tableId)}">
        <div class="nom-stand">${escapeHtml(standText || "")}</div>
      </div>
    `;
  }

  const prevDisabled = page <= 1 ? "disabled" : "";
  const nextDisabled = page >= maxPage ? "disabled" : "";
  const items = getPagerItems(page, maxPage);

  return `
    <div class="nom-pager" role="navigation" aria-label="Seitenwahl ${escapeHtml(tableId)}">
      <div class="nom-stand">${escapeHtml(standText || "")}</div>
      <div class="nom-pager__group">
        <button type="button"
          class="nom-pager__btn"
          data-table="${escapeHtml(tableId)}"
          data-action="prev"
          ${prevDisabled}
          aria-label="Vorherige Seite">‹</button>

        ${items.map(it => {
          if (it.type === "dots") return `<span class="nom-pager__ellipsis">…</span>`;
          const isActive = it.page === page;
          return `
            <button type="button"
              class="nom-pager__btn ${isActive ? "is-active" : ""}"
              data-table="${escapeHtml(tableId)}"
              data-page="${it.page}"
              ${isActive ? 'aria-current="page"' : ""}>
              ${it.page}
            </button>
          `;
        }).join("")}

        <button type="button"
          class="nom-pager__btn"
          data-table="${escapeHtml(tableId)}"
          data-action="next"
          ${nextDisabled}
          aria-label="Nächste Seite">›</button>
      </div>
    </div>
  `;
}


function computeStandTextFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const r0 = rows[0] || [];
  const g0 = String(r0[COLS.gender] ?? "").toLowerCase();
  const d0 = String(r0[COLS.excelDatum] ?? "").toLowerCase();
  const startIdx = g0.includes("gender") || g0.includes("geschlecht") || d0.includes("datum") ? 1 : 0;

  let latest = null;
  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const d = parseExcelDate(r[COLS.excelDatum]);
    if (!d) continue;
    if (!latest || d.getTime() > latest.getTime()) latest = d;
  }
  if (!latest) return "";
  const fmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });
  return `Stand: ${fmt.format(latest)}`;
}

let NOM_TABLES = [];
let NOM_MOUNT = null;
let NOM_UI_WIRED = false;
let NOM_STAND_TEXT = "";

async function loadNominierungslisteFromExcel() {
  const mount = document.getElementById("dp-list");
  if (!mount) return;

  NOM_MOUNT = mount;
  mount.innerHTML = `<p class="info-status">Lade Nominierungsliste…</p>`;

  await ensureXlsxLoaded();

  const cfgRes = await fetch(CONFIG_EXCEL_URL, { cache: "no-store" });
  if (!cfgRes.ok) throw new Error(`Konfig-Excel konnte nicht geladen werden (${cfgRes.status})`);
  const cfgWb = window.XLSX.read(await cfgRes.arrayBuffer(), { type: "array" });

  const cfgs = loadConfigsFromWorkbook(cfgWb);
  if (!cfgs.length) {
    mount.innerHTML = `<p class="info-status info-error">Keine Konfigurationen in "${CONFIG_SHEET}" gefunden.</p>`;
    return;
  }
  attachReferenceTimesToConfigs(cfgs, cfgWb);

  const dataRes = await fetch(DATA_EXCEL_URL, { cache: "no-store" });
  if (!dataRes.ok) throw new Error(`Daten-Excel konnte nicht geladen werden (${dataRes.status})`);
  const dataWb = window.XLSX.read(await dataRes.arrayBuffer(), { type: "array", cellDates: true });

  const wsData = dataWb.Sheets[DATA_SHEET];
  if (!wsData) {
    mount.innerHTML = `<p class="info-status info-error">Arbeitsblatt "${DATA_SHEET}" nicht gefunden.</p>`;
    return;
  }

  const dataRows = window.XLSX.utils.sheet_to_json(wsData, { header: 1, raw: true, defval: "", blankrows: false });

  COLS = detectColsFromHeader(dataRows);
  updateDisciplinesCols();

  NOM_STAND_TEXT = computeStandTextFromRows(dataRows);

  NOM_TABLES = cfgs.map(cfg => {
    const athletes = buildAthletesForConfig(dataRows, cfg);
    const sorted = sortWithAbsagenLast(athletes);
    assignActiveRanks(sorted);
    const pageSize = Math.max(1, cfg.PAGE_SIZE || 10);
    const maxPage = getMaxPage(sorted, pageSize);
    return { id: cfg.id, cfg, data: sorted, page: 1, maxPage };
  });

  renderAllNomTables();

  if (!NOM_UI_WIRED) {
    NOM_UI_WIRED = true;

    document.addEventListener(
      "error",
      ev => {
        const el = ev.target;
        if (!(el instanceof HTMLImageElement)) return;
        if (!el.classList.contains("og-cap")) return;
        if (el.dataset.fallbackDone === "1") return;
        el.dataset.fallbackDone = "1";
        el.src = CAP_FALLBACK_SRC;
      },
      true
    );

    mount.addEventListener("click", ev => {
      const pagerBtn = ev.target.closest("button[data-table]");
      if (pagerBtn && (pagerBtn.dataset.action || pagerBtn.dataset.page)) {
        const tableId = pagerBtn.dataset.table;
        const t = NOM_TABLES.find(x => x.id === tableId);
        if (!t) return;

        const maxPage = getMaxPage(t.data, Math.max(1, t.cfg.PAGE_SIZE || 10));
        t.maxPage = maxPage;

        if (pagerBtn.dataset.action === "prev") {
          t.page = Math.max(1, t.page - 1);
        } else if (pagerBtn.dataset.action === "next") {
          t.page = Math.min(maxPage, t.page + 1);
        } else if (pagerBtn.dataset.page) {
          const p = Number(pagerBtn.dataset.page);
          if (Number.isFinite(p)) t.page = Math.min(maxPage, Math.max(1, p));
        }

        renderAllNomTables();
        return;
      }

      const row = ev.target.closest("tr.athlete-row");
      if (!row) return;

      const details = row.nextElementSibling;
      if (!details || !details.classList.contains("athlete-details")) return;

      const inner = details.querySelector(".athlete-details__inner");
      if (!inner) return;

      const isOpen = details.classList.contains("is-open");

      if (!isOpen) {
        details.classList.add("is-open");
        row.setAttribute("aria-expanded", "true");

        inner.style.maxHeight = "0px";
        requestAnimationFrame(() => {
          inner.style.maxHeight = inner.scrollHeight + "px";
        });
      } else {
        row.setAttribute("aria-expanded", "false");

        inner.style.maxHeight = inner.scrollHeight + "px";
        requestAnimationFrame(() => {
          inner.style.maxHeight = "0px";
        });

        const onEnd = (e) => {
          if (e.propertyName !== "max-height") return;
          details.classList.remove("is-open");
          inner.removeEventListener("transitionend", onEnd);
        };
        inner.addEventListener("transitionend", onEnd);
      }

    });
  }
}

function renderAllNomTables() {
  if (!NOM_MOUNT) return;

  const panels = NOM_TABLES.map(t => {
    const list = Array.isArray(t.data) ? t.data : [];

    const pageSize = Math.max(1, t.cfg.PAGE_SIZE || 10);
    t.maxPage = getMaxPage(list, pageSize); // ergibt bei 0 Einträgen: 1
    t.page = Math.min(Math.max(1, t.page), t.maxPage);

    return `
      <section class="nom-panel">
        <h3>${escapeHtml(t.cfg.TABELLEN_NAME || "")}</h3>
        ${renderCompactTablePaged(list, t.cfg, t.page, pageSize)}
        ${renderPager(t.id, t.page, t.maxPage, NOM_STAND_TEXT)}
      </section>
    `;
  }).join("");

  NOM_MOUNT.innerHTML = `<div class="nom-grid">${panels}</div>`;
}



async function ensureXlsxLoaded() {
  if (window.XLSX) return;
  const CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  await loadScript(CDN);
  if (!window.XLSX) throw new Error("XLSX (SheetJS) konnte nicht initialisiert werden");
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Script konnte nicht geladen werden: ${src}`));
    document.head.appendChild(s);
  });
}

const DP_BADGE_FOLDER = "./png/events/";

function dpBadgeUrlFromSlideImg(slideImgPath) {
  const m = String(slideImgPath).match(/(\d{4})/);
  if (!m) return null;
  const year = m[1];
  return DP_BADGE_FOLDER + encodeURIComponent(`DP - ${year}.png`);
}

const DP_FOLDER = "./png/DP-Team/";
const DP_MIN_YEAR = 2000;
const DP_MAX_YEAR = new Date().getFullYear() + 1;
const DP_EXTS = [".jpg"];

const DP_SLIDE_SETTINGS = {
  "2025": {
    text: "LV-Gesamtwertung: 8. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg.de/mitmachen/rettungssport/news-detail/drei-badische-rekorde-in-warendorf-134005-n/",
    },
    bgPos: "center 25%",
  },
  "2024": {
    text: "LV-Gesamtwertung: 9. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/deutschlandpokal-2024/",
    },
    bgPos: "center 40%",
  },
  "2023": {
    text: "LV-Gesamtwertung: 9. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/internationaler-deutschlandpokal-2023/",
    },
    bgPos: "center 65%",
  },
  "2022": {
    text: "LV-Gesamtwertung: 5. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/deutschlandpokal-2022/ergebnisse-einzel/#:~:text=Ergebnisse%20Einzel%20%2D%20Deutschlandpokal%202022%20%7C%20DLRG%20e.V.",
    },
    bgPos: "center 25%",
  },
  "2019": {
    text: "LV-Gesamtwertung: 5. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/internationaler-deutschlandpokal-2019-312-n/",
    },
    bgPos: "center 35%",
  },
  "2017": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/deutschlandpokal-2017-234-n/",
    },
    bgPos: "center 50%",
  },
  "2016": {
    text: "LV-Gesamtwertung: 4. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/erfolgreicher-deutschlandpokal-2016-199-n/",
    },
    bgPos: "center 15%",
  },
  "2015": {
    text: "LV-Gesamtwertung: 8. Platz",
    cta: { label: "Mehr Infos!", href: "https://www.youtube.com/watch?v=AwgeM_VwPOs" },
    bgPos: "center 30%",
  },
  "2014": {
    text: "LV-Gesamtwertung: 8. Platz",
    cta: { label: "Mehr Infos!", href: "https://www.badische-zeitung.de/verena-weis-knackt-rekord" },
    bgPos: "center 10%",
  },
  "2013": {
    text: "LV-Gesamtwertung: 5. Platz",
    cta: { label: "Mehr Infos!", href: "https://sachsen-anhalt.dlrg.de/rettungssport/deutschlandpokal/dp-2013/" },
    bgPos: "center 20%",
  },
  "2011": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.durlacher.de/start/neuigkeiten-archiv/artikel/2011/dezember/15/schwimmer-der-dlrg-durlach-auch-international-erfolgreich",
    },
    bgPos: "center 30%",
  },
  "2000": {
    text: "LV-Gesamtwertung: 11. Platz",
    bgPos: "center 15%",
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="wide-carousel" aria-label="Deutschlandpokal Rückblick">
      <div class="wide-carousel__viewport" data-wide-carousel tabindex="0">
        <div class="wide-carousel__slides">
          <article class="wide-carousel__slide" style="background:#111">
            <div class="wide-carousel__content">
              <h2>Deutschlandpokal</h2>
              <p>Lade Bilder…</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  `;

  const slides = await buildDpSlides();

  if (!slides.length) {
    main.innerHTML = `
      <section class="intro">
        <div class="container">
          <h2>Deutschlandpokal</h2>
          <p>Keine Jahresbilder im Ordner <code>${DP_FOLDER}</code> gefunden.</p>
        </div>
      </section>
    `;
    return;
  }

  renderPage(main, slides);
  initWideCarousel();
  loadLatestDpPdfAndRenderCard();
  loadNominierungslisteFromExcel().catch(console.error);
});

async function buildDpSlides() {
  const slides = [];
  for (let year = DP_MAX_YEAR; year >= DP_MIN_YEAR; year--) {
    const imgUrl = await firstExistingUrl(DP_FOLDER, year, DP_EXTS);
    if (!imgUrl) continue;

    const key = String(year);
    const cfg = DP_SLIDE_SETTINGS[key] || {};
    slides.push({
      year,
      title: cfg.title ?? `Deutschlandpokal ${year}`,
      text: cfg.text ?? "",
      img: imgUrl,
      cta: cfg.cta ?? null,
      bgPos: cfg.bgPos ?? "center center",
      h: cfg.h ?? null,
      textPos: cfg.textPos ?? "bottom",
      textAlign: cfg.textAlign ?? "center",
      contentBottom: cfg.contentBottom ?? null,
    });
  }
  return slides;
}

function renderPage(main, slides) {
  main.innerHTML = `
    <section class="wide-carousel" aria-label="Deutschlandpokal Rückblick">
      <div class="wide-carousel__viewport" data-wide-carousel tabindex="0">
        <div class="wide-carousel__slides">
          ${slides
            .map((s, i) => {
              const justify = s.textPos === "top" ? "flex-start" : s.textPos === "center" ? "center" : "flex-end";
              const contentBottomVar = s.contentBottom ? String(s.contentBottom) : "";

              return `
                <article
                  class="wide-carousel__slide ${i === 0 ? "wide-carousel__slide--center" : ""}"
                  style="
                    background-image:url('${s.img}');
                    background-position:${s.bgPos || "center center"};
                    background-size:cover;
                    background-repeat:no-repeat;
                    --dp-justify:${justify};
                    --dp-text-align:${s.textAlign || "center"};
                    ${contentBottomVar ? `--dp-content-bottom:${contentBottomVar};` : ""}
                  "
                  ${s.h ? `data-h="${s.h}"` : ""}
                  role="group"
                  aria-roledescription="Folie"
                  aria-label="${i + 1} von ${slides.length}"
                >
                  ${
                    dpBadgeUrlFromSlideImg(s.img)
                      ? `<img class="wide-carousel__badge" src="${dpBadgeUrlFromSlideImg(s.img)}" alt="" loading="lazy" decoding="async">`
                      : ``
                  }
                  <div class="wide-carousel__content">
                    <h2>${escapeHtml(s.title)}</h2>
                    ${s.text ? `<p>${escapeHtml(s.text)}</p>` : ``}
                    ${s.cta ? `<a class="wide-carousel__cta" href="${s.cta.href}">${escapeHtml(s.cta.label)}</a>` : ``}
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>

        <button class="wide-carousel__arrow wide-carousel__arrow--prev" type="button" aria-label="Vorherige Folie">
          <svg class="wide-carousel__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </button>

        <button class="wide-carousel__arrow wide-carousel__arrow--next" type="button" aria-label="Nächste Folie">
          <svg class="wide-carousel__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </button>
      </div>
    </section>

    <section class="info-wrap" aria-label="Nominierungen">
      <section class="info-section" aria-labelledby="dp-guidelines-title">
        <h2 id="dp-guidelines-title">Aktuelle Nominierungsrichtlinien</h2>
        <div id="dp-guidelines" class="info-links">
          <p class="info-status">Lade Nominierungsrichtlinien…</p>
        </div>
      </section>

      <section class="info-section" aria-labelledby="dp-list-title">
        <h2>Aktuelle Nominierungsliste</h2>
        <div id="dp-list"></div>
        </div>
      </section>
    </section>
  `;

  document.querySelectorAll(".wide-carousel__badge").forEach(img => {
    img.addEventListener("error", () => img.remove());
  });
}

function initWideCarousel() {
  const root = document.querySelector("[data-wide-carousel]");
  if (!root) return;

  const track = root.querySelector(".wide-carousel__slides");
  const slides = Array.from(root.querySelectorAll(".wide-carousel__slide"));
  const prevBtn = root.querySelector(".wide-carousel__arrow--prev");
  const nextBtn = root.querySelector(".wide-carousel__arrow--next");
  const count = slides.length;

  let index = 0;
  let autoTimer = null;

  const startAuto = () => {
    stopAuto();
    autoTimer = setInterval(() => goTo(index + 1), 10000);
  };

  const stopAuto = () => {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
  };

  const readPxVar = (name, fallback) => {
    const v = getComputedStyle(root).getPropertyValue(name).trim();
    const num = parseFloat(v);
    return Number.isFinite(num) ? num : fallback;
  };

  const fitHeight = () => {
    const active = slides[index];
    if (!active) return;

    const fixedH = parseFloat(active.dataset.h);
    if (Number.isFinite(fixedH)) {
      root.style.height = `${fixedH}px`;
      return;
    }

    const content = active.querySelector(".wide-carousel__content");
    if (!content) return;

    requestAnimationFrame(() => {
      const minH = readPxVar("--wide-min-h", 260);
      const maxH = readPxVar("--wide-max-h", 560);
      const desired = content.scrollHeight;
      const h = Math.max(minH, Math.min(maxH, desired));
      root.style.height = `${h}px`;
    });
  };

  const update = () => {
    track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
    slides.forEach((s, i) => s.classList.toggle("wide-carousel__slide--center", i === index));
    fitHeight();
  };

  const goTo = i => {
    index = (i + count) % count;
    update();
  };

  prevBtn?.addEventListener("click", () => {
    goTo(index - 1);
    startAuto();
  });

  nextBtn?.addEventListener("click", () => {
    goTo(index + 1);
    startAuto();
  });

  root.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
      startAuto();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
      startAuto();
    }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitHeight, 80);
  });

  root.addEventListener("mouseenter", stopAuto);
  root.addEventListener("mouseleave", startAuto);
  root.addEventListener("focusin", stopAuto);
  root.addEventListener("focusout", startAuto);

  startAuto();
  update();
}

async function firstExistingUrl(folder, year, exts) {
  for (const ext of exts) {
    const url = `${folder}${year}${ext}`;
    if (await urlExists(url)) return url;
  }
  return null;
}

async function urlExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
    return res.ok;
  } catch {
    return await probeByImage(url, 3500);
  }
}

function probeByImage(url, timeoutMs) {
  return new Promise(resolve => {
    const img = new Image();
    let done = false;

    const t = window.setTimeout(() => {
      if (done) return;
      done = true;
      img.src = "";
      resolve(false);
    }, timeoutMs);

    img.onload = () => {
      if (done) return;
      done = true;
      window.clearTimeout(t);
      resolve(true);
    };

    img.onerror = () => {
      if (done) return;
      done = true;
      window.clearTimeout(t);
      resolve(false);
    };

    img.src = url;
  });
}

async function loadLatestDpPdfAndRenderCard() {
  const mount = document.getElementById("dp-guidelines");
  if (!mount) return;

  const cfg = {
    owner: "jp-gnad",
    repo: "Lifesaving_Baden",
    branch: "main",
    dirCandidates: ["nominierungsrichtlinien", "web/nominierungsrichtlinien"],
    cacheKey: "lsb_dp_latest_pdf_v2",
    cacheTtlMs: 10 * 60 * 1000,
  };

  const cached = readCache(cfg.cacheKey, cfg.cacheTtlMs);
  if (cached?.year && cached?.fileName) {
    mount.innerHTML = renderDpPdfBriefCard(cached.year, cached.fileName);
    return;
  }

  try {
    const found = await fetchLatestDpPdfFromGitHub(cfg);
    writeCache(cfg.cacheKey, found);
    mount.innerHTML = renderDpPdfBriefCard(found.year, found.fileName);
  } catch (e) {
    const stale = readCache(cfg.cacheKey, Number.MAX_SAFE_INTEGER);
    if (stale?.year && stale?.fileName) {
      mount.innerHTML = renderDpPdfBriefCard(stale.year, stale.fileName);
      return;
    }
    mount.innerHTML = `<p class="info-status info-error">Nominierungsrichtlinien konnten nicht geladen werden.</p>`;
  }
}

async function fetchLatestDpPdfFromGitHub(cfg) {
  let items = null;

  for (const dirPath of cfg.dirCandidates) {
    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(dirPath)}?ref=${encodeURIComponent(cfg.branch)}`;

    const res = await fetchWithTimeout(apiUrl, 9000, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        items = data;
        break;
      }
    } else {
      const remaining = res.headers.get("X-RateLimit-Remaining");
      if (res.status === 403 && remaining === "0") throw new Error("rate_limit");
    }
  }

  if (!items) throw new Error("no_dir");

  const re = /^deutschlandpokal\s*(?:-|–)?\s*(19\d{2}|20\d{2})\.pdf$/i;

  let best = null;
  for (const it of items) {
    if (!it || it.type !== "file" || typeof it.name !== "string") continue;
    const m = it.name.match(re);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    if (!Number.isFinite(year)) continue;
    if (!best || year > best.year) best = { year, fileName: it.name };
  }

  if (!best) throw new Error("no_match");
  return best;
}

async function fetchWithTimeout(url, ms, options) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function renderDpPdfBriefCard(year, fileName) {
  const href = `../nominierungsrichtlinien/${encodeURIComponent(fileName)}`;

  return `
    <a class="info-brief" href="${href}" target="_blank" rel="noopener noreferrer"
       aria-label="Deutschlandpokal Nominierungsrichtlinien ${escapeHtml(year)} öffnen">
      <img class="info-brief__img" src="./png/icons/brief.png" alt="" loading="lazy" decoding="async" />
      <div class="info-brief__overlay" aria-hidden="true">
        <div class="info-brief__t1">Deutschlandpokal</div>
        <div class="info-brief__t2">Nominierungsrichtlinien ${escapeHtml(year)}</div>
        <div class="info-brief__spacer"></div>
        <div class="info-brief__t3">Landesverband Baden</div>
      </div>
    </a>
  `;
}

function readCache(key, ttlMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    if (!obj.ts || Date.now() - obj.ts > ttlMs) return null;
    return obj.data || null;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}
