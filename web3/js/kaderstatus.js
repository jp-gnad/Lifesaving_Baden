const EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/test (1).xlsx";

// =====================
// HILFSFUNKTIONEN / KONSTANTEN
// =====================

let PFLICHTZEITEN = {
  weiblich: { U17: {}, U19: {}, Offen: {} },
  maennlich: { U17: {}, U19: {}, Offen: {} }
};

function normWk(s) {
  return (s || "").toString().toLowerCase()
    .normalize("NFKD").replace(/\p{Diacritic}/gu,"")
    .replace(/[–—−]/g, "-").replace(/\s+/sg," ").trim();
}

function minNum(a, b) { 
  return a == null ? b : (b == null ? a : Math.min(a, b)); 
}

// nutzt deine Ranks:
function pickBetter(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ar = (STATUS_RANK[a.kader || ""] || 0), br = (STATUS_RANK[b.kader || ""] || 0);
  if (ar !== br) return ar > br ? a : b;
  const ai = (COLOR_RANK[a.icon] || 0), bi = (COLOR_RANK[b.icon] || 0);
  if (ai !== bi) return ai > bi ? a : b;
  if ((a.reqPlatz ?? 1e9) !== (b.reqPlatz ?? 1e9)) return (a.reqPlatz < b.reqPlatz) ? a : b;
  if ((a.achieved ?? 1e9) !== (b.achieved ?? 1e9)) return (a.achieved < b.achieved) ? a : b;
  return a;
}

// =====================
// Anmeldungen (nur aktuelles Jahr)
// =====================

let ANMELDUNGEN = {}; // { [jahr]: Set<lowerName> }

function istAngemeldet(name, jahr) {
  const set = ANMELDUNGEN[jahr];
  if (!set) return false;
  const key = (name || "").toString().trim().toLowerCase();
  return set.has(key);
}

async function ladeAnmeldungen(aktuellesJahr) {
  const res = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const jahr = aktuellesJahr; // nur aktuelles Jahr relevant
  const ws = wb.Sheets[jahr.toString()];
  const set = new Set();

  if (ws) {
    // L17:L500 lesen (Namenliste)
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1, range: "L17:L500", defval: null, blankrows: false
    });
    for (const r of rows) {
      const name = (r[0] ?? "").toString().trim();
      if (name) set.add(name.toLowerCase());
    }
  }

  ANMELDUNGEN[jahr] = set;
  console.log(`Anmeldungen ${jahr}:`, set.size, "Namen");
}

function berechneKaderBis(person, aktuellesJahr) {
  const anyGreen = [person.Icon_Time, person.Icon_Comp, person.Icon_Ocean, person.Icon_Coach]
    .some(c => c === "green");
  const year = anyGreen ? (aktuellesJahr + 1) : aktuellesJahr;
  return `31.12.${year}`;
}

function parsePflichtzeit(zeitRaw) {
  if (!zeitRaw) return null;
  let str = zeitRaw.toString().trim().replace(",", ".");
  const sekunden = parseFloat(str);
  return isNaN(sekunden) ? null : sekunden;
}

// =====================
// Sonderregeln Entfernen
// =====================

let SONDERREGELN_ENTFERNEN = {}; // { [jahr]: Set<lowerName> }

function istEntferntImJahr(name, jahr) {
  const set = SONDERREGELN_ENTFERNEN[jahr];
  if (!set) return false;
  const key = (name || "").toString().trim().toLowerCase();
  return set.has(key);
}

async function ladeSonderregelnEntfernen(aktuellesJahr) {
  const res = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const jahr = aktuellesJahr;
  const ws = wb.Sheets[jahr.toString()];
  const set = new Set();
  if (ws) {
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1, range: "H17:J500", defval: null, blankrows: false
    });
    for (const r of rows) {
      const name = (r[0] ?? "").toString().trim();
      const kriterium = (r[1] ?? "").toString().trim().toLowerCase();
      if (!name) continue;
      if (kriterium === "entfernen") {
        set.add(name.toLowerCase());
      }
    }
  }
  SONDERREGELN_ENTFERNEN[jahr] = set;
  console.log(`Entfernen-Liste ${jahr}:`, set.size, "Namen");
}

// =====================
// Sonderregeln Trainer
// =====================

let SONDERREGELN_TRAINER = {}; // { [jahr]: Map(lowerName -> { kader: ... }) }

function findeSonderregelTrainer(name, jahr) {
  const m = SONDERREGELN_TRAINER[jahr];
  return m ? (m.get((name || "").toString().trim().toLowerCase()) || null) : null;
}

async function ladeSonderregelnTrainer(aktuellesJahr) {
  const res = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  for (const jahr of [aktuellesJahr, aktuellesJahr - 1]) {
    const ws = wb.Sheets[jahr.toString()];
    if (!ws) { SONDERREGELN_TRAINER[jahr] = new Map(); continue; }

    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1, range: "H17:J500", defval: null, blankrows: false
    });

    const map = new Map();
    for (const r of rows) {
      const name = (r[0] ?? "").toString().trim();
      const kriterium = (r[1] ?? "").toString().trim().toLowerCase();
      const kader = (r[2] ?? "").toString().trim();
      if (!name) continue;
      if (kriterium !== "sondernominierung") continue;
      map.set(name.toLowerCase(), { kader });
    }

    SONDERREGELN_TRAINER[jahr] = map;
    console.log(`Sonderregeln Trainer ${jahr}:`, map.size, "Einträge");
  }
}

// =====================
// Sonderregeln Ocean
// =====================

let SONDERREGELN_OCEAN = {}; // { [jahr]: Map(lowerName -> { kader: ... }) }

function findeSonderregelOcean(name, jahr) {
  const m = SONDERREGELN_OCEAN[jahr];
  return m ? (m.get((name || "").toString().trim().toLowerCase()) || null) : null;
}

async function ladeSonderregelnOcean(aktuellesJahr) {
  const res = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  for (const jahr of [aktuellesJahr, aktuellesJahr - 1]) {
    const ws = wb.Sheets[jahr.toString()];
    if (!ws) { SONDERREGELN_OCEAN[jahr] = new Map(); continue; }

    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1, range: "H17:J500", defval: null, blankrows: false
    });

    const map = new Map();
    for (const r of rows) {
      const name = (r[0] ?? "").toString().trim();
      const kriterium = (r[1] ?? "").toString().trim().toLowerCase();
      const kader = (r[2] ?? "").toString().trim();
      if (!name) continue;
      if (kriterium !== "ocean") continue;
      map.set(name.toLowerCase(), { kader });
    }

    SONDERREGELN_OCEAN[jahr] = map;
    console.log(`Sonderregeln Ocean ${jahr}:`, map.size, "Einträge");
  }
}

// =====================
// Prioritäten / Ranks
// =====================

const STATUS_RANK = { "": 0, "Juniorenkader": 1, "Badenkader": 2 };

function promoteStatus(current = "", incoming = "") {
  if (!incoming) return current;
  return (STATUS_RANK[incoming] || 0) > (STATUS_RANK[current] || 0) ? incoming : current;
}

const COLOR_RANK = { "": 0, grey: 0, yellow: 1, green: 2 };

function hoechsteFarbe(alt = "", neu = "") {
  return (COLOR_RANK[neu] || 0) > (COLOR_RANK[alt] || 0) ? neu : alt;
}

// =====================
// Pflichtzeiten laden
// =====================

async function ladePflichtzeiten(aktuellesJahr) {
  const response = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const jahre = [aktuellesJahr, aktuellesJahr - 1];

  for (const jahr of jahre) {
    const sheetName = jahr.toString();
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      PFLICHTZEITEN.weiblich.U17[jahr] = Array(6).fill(null);
      PFLICHTZEITEN.weiblich.U19[jahr] = Array(6).fill(null);
      PFLICHTZEITEN.weiblich.Offen[jahr] = Array(6).fill(null);

      PFLICHTZEITEN.maennlich.U17[jahr] = Array(6).fill(null);
      PFLICHTZEITEN.maennlich.U19[jahr] = Array(6).fill(null);
      PFLICHTZEITEN.maennlich.Offen[jahr] = Array(6).fill(null);
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: "B2:M4" });

    PFLICHTZEITEN.weiblich.U17[jahr] = rows[0].slice(0, 6).map(parsePflichtzeit);
    PFLICHTZEITEN.weiblich.U19[jahr] = rows[1].slice(0, 6).map(parsePflichtzeit);
    PFLICHTZEITEN.weiblich.Offen[jahr] = rows[2].slice(0, 6).map(parsePflichtzeit);

    PFLICHTZEITEN.maennlich.U17[jahr] = rows[0].slice(6, 12).map(parsePflichtzeit);
    PFLICHTZEITEN.maennlich.U19[jahr] = rows[1].slice(6, 12).map(parsePflichtzeit);
    PFLICHTZEITEN.maennlich.Offen[jahr] = rows[2].slice(6, 12).map(parsePflichtzeit);
  }
}

// =====================
// Platzierungs-Kriterien
// =====================

let PLATZIERUNGS_KRITERIEN = {};

async function ladePlatzierungsKriterien(aktuellesJahr) {
  const res = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const jahre = [aktuellesJahr, aktuellesJahr - 1];

  for (const jahr of jahre) {
    const ws = wb.Sheets[jahr.toString()];
    if (!ws) { PLATZIERUNGS_KRITERIEN[jahr] = []; continue; }

    ws["!ref"] = "A1:Z500";

    const grid = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      blankrows: false
    });

    const headerRow = grid.findIndex(r =>
      r && r[0] && r[0].toString().trim().toLowerCase() === "wettkampf"
    );
    if (headerRow === -1) { PLATZIERUNGS_KRITERIEN[jahr] = []; continue; }

    const out = [];
    for (let i = headerRow + 1; i < grid.length; i++) {
      const r = grid[i];
      if (!r) continue;
      const wk = (r[0] ?? "").toString().trim();
      if (!wk) continue;
      out.push({
        wettkampf: r[0].toString().trim(),
        minAlter: parseInt(r[1], 10),
        maxAlter: parseInt(r[2], 10),
        platzierung: parseInt(r[3], 10),
        wertung: (r[4] ?? "").toString().trim(),
        kader: (r[5] ?? "").toString().trim()
      });
    }

    PLATZIERUNGS_KRITERIEN[jahr] = out;
  }
}

// =====================
// Altersklassen / Matrix
// =====================

const AK_INDEX = { U17: 0, U19: 1, Offen: 2 };

function getAltersklasse(alter) {
  if (alter < 17) return "U17";
  if (alter < 19) return "U19";
  return "Offen";
}

function createEmptyMatrix() {
  return Array.from({ length: 6 }, () =>
    Array.from({ length: 3 }, () =>
      Array.from({ length: 2 }, () => null)
    )
  );
}

function berechneAlter(jahrRaw, jahrgangRaw) {
  if (jahrRaw == null || jahrgangRaw == null || jahrgangRaw === "") return null;

  const excelBase = new Date(Date.UTC(1900, 0, 1));
  const wettkampfDatum = new Date(excelBase.getTime() + (jahrRaw - 1) * 24*60*60*1000);
  const jahrWettkampf = wettkampfDatum.getUTCFullYear();

  let jahrgang = parseInt(jahrgangRaw, 10);
  if (Number.isNaN(jahrgang)) return null;

  jahrgang += 1900;
  while (jahrWettkampf - jahrgang > 100) jahrgang += 100;

  return jahrWettkampf - jahrgang;
}

// =====================
// Zeiten parsen/formatieren
// =====================

function parseZeit(zeitRaw) {
  if (!zeitRaw) return null;
  let str = zeitRaw.toString().trim();
  str = str.replace(",", ".");

  if (str.includes(":")) {
    const [minStr, secStr] = str.split(":");
    const minuten = parseInt(minStr, 10);
    const sekunden = parseFloat(secStr);
    return minuten * 60 + sekunden;
  }

  const sekunden = parseFloat(str);
  return isNaN(sekunden) ? null : sekunden;
}

function formatZeit(sekunden) {
  if (sekunden === null) return "";
  const min = Math.floor(sekunden / 60);
  const rest = (sekunden % 60).toFixed(2).replace(".", ",");
  return `${min}:${rest.padStart(5, "0")}`;
}

function formatDatum(d) {
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

function rundeZeit(zeit) {
  if (zeit === null) return null;
  return Math.round(zeit * 100) / 100;
}

function bestimmeIconTime(matrix) {
  function countFilled(yIndex, zIndex) {
    let count = 0;
    for (let x = 0; x < 6; x++) {
      if (matrix[x][yIndex][zIndex] !== null) {
        count++;
      }
    }
    return count;
  }

  if (
    countFilled(2, 1) >= 2 ||
    countFilled(1, 1) >= 2 ||
    countFilled(0, 1) >= 2
  ) {
    return "green";
  }

  if (
    countFilled(2, 0) >= 2 ||
    countFilled(1, 0) >= 2 ||
    countFilled(0, 0) >= 2
  ) {
    return "yellow";
  }

  return "";
}

function pruefePlatzierungsKriterienAusComps(person, aktuellesJahr) {
  let best = null;

  for (const comp of person.comps.values()) {
    const liste = PLATZIERUNGS_KRITERIEN[comp.jahr] || [];
    const wk = normWk(comp.wettkampf);

    const matched = liste.filter(k =>
      normWk(k.wettkampf) === wk &&
      comp.age != null &&
      Number.isFinite(k.minAlter) && Number.isFinite(k.maxAlter) &&
      comp.age >= k.minAlter && comp.age <= k.maxAlter &&
      (k.wertung === "Mehrkampf" || k.wertung === "Einzelkampf")
    );

    for (const k of matched) {
      const req = parseInt(k.platzierung, 10);
      const platz = (k.wertung === "Mehrkampf") ? comp.mehr : comp.einz;
      console.log(`[Kriterium] ${person.ortsgruppe ? person.ortsgruppe + ' | ' : ''}${person?.name || ''} | ${comp.wettkampf} ${comp.jahr} | ${k.wertung} Platz=${platz} ≤ ${req} | Kader=${k.kader}`);

      if (Number.isFinite(platz) && Number.isFinite(req) && platz <= req) {
        const icon = (comp.jahr === aktuellesJahr) ? "green" : "yellow";
        best = pickBetter(best, { icon, kader: k.kader, reqPlatz: req, achieved: platz });
      }
    }
  }

  return best ? { icon: best.icon, kader: best.kader } : { icon: "", kader: "" };
}

// =====================
// Kaderstatus aus Matrix
// =====================

function bestimmeKaderstatus(matrix, alter) {
  function countFilled(yIndex, zIndex) {
    let count = 0;
    for (let x = 0; x < 6; x++) {
      if (matrix[x][yIndex][zIndex] !== null) count++;
    }
    return count;
  }

  if (
    countFilled(2, 1) >= 2 ||
    countFilled(2, 0) >= 2 ||
    (countFilled(1, 0) >= 2 && alter === 19)
  ) {
    return "Badenkader";
  }

  if (
    alter < 19 && (
      countFilled(1, 1) >= 2 ||
      countFilled(0, 1) >= 2 ||
      countFilled(0, 0) >= 2 ||
      countFilled(1, 0) >= 2
    )
  ) {
    return "Juniorenkader";
  }

  return "";
}

// =====================
// Zebra-Streifen
// =====================

function applyZebraStripes() {
  const rows = document.querySelectorAll("#kader-container table tr");
  let visibleIndex = 0;

  rows.forEach((row, index) => {
    if (index === 0) return; // Header auslassen

    if (row.style.display === "none") {
      row.classList.remove("odd", "even");
      return;
    }

    row.classList.remove("odd", "even");
    row.classList.add(visibleIndex % 2 === 0 ? "even" : "odd");
    visibleIndex++;
  });
}

// =====================
// Zebra-Streifen für mehrere Tabellen
// =====================
function applyZebraStripes() {
  const tables = document.querySelectorAll("#kader-container table");
  tables.forEach(table => {
    const rows = table.querySelectorAll("tbody tr");
    let visibleIndex = 0;
    rows.forEach(row => {
      if (row.style.display === "none") {
        row.classList.remove("odd", "even");
        return;
      }
      row.classList.remove("odd", "even");
      row.classList.add(visibleIndex % 2 === 0 ? "even" : "odd");
      visibleIndex++;
    });
  });
}


// =====================
// Excel laden und in Datenbank umwandeln
// =====================

async function ladeExcelUndVerarbeite() {
  const response = await fetch(EXCEL_URL);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  let sheetName = "Tabelle2";
  if (!workbook.Sheets[sheetName]) {
    sheetName = workbook.SheetNames[0];
  }
  console.log("Verwendetes Sheet:", sheetName);

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const datenbank = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row[1]) continue;

    const geschlechtRaw = row[0]?.toString().toLowerCase();
    const geschlecht = geschlechtRaw === "m" ? "maennlich" : "weiblich";
    const name = row[1];

    const jahrgangRaw = row[11];
    const jahrgang = jahrgangRaw?.toString().padStart(2, "0");
    const jahrRaw = row[9];
    const alter = berechneAlter(jahrRaw, jahrgangRaw);

    const ortsgruppe = row[12] || "";
    const wettkampfName = row[10] ? row[10].toString() : "";
    const landesverband = row[13] || "";
    const mehrkampfPlatzierung = row[14];

    const parsePlatz = v => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 1 ? n : null;
    };
    const einzelPlaetze = [row[15], row[16], row[17], row[18], row[19], row[20]];
    const einzelkampfPlatzierung = einzelPlaetze.reduce((min, v) => {
      const n = parsePlatz(v);
      return n !== null && (min === null || n < min) ? n : min;
    }, null);

    const excelBase = new Date(Date.UTC(1900, 0, 1));
    const wettkampfDatum = new Date(excelBase.getTime() + (jahrRaw - 1) * 24 * 60 * 60 * 1000);
    const jahr = wettkampfDatum.getUTCFullYear();

    const disziplinen = [
      { zeit: row[4], nr: 1 },
      { zeit: row[7], nr: 2 },
      { zeit: row[6], nr: 3 },
      { zeit: row[3], nr: 4 },
      { zeit: row[5], nr: 5 },
      { zeit: row[8], nr: 6 }
    ];

    let jahrgangNum = parseInt(jahrgangRaw, 10);
    if (isNaN(jahrgangNum)) {
      jahrgangNum = null;
    } else {
      jahrgangNum += 1900;
      while (new Date().getFullYear() - jahrgangNum > 100) {
        jahrgangNum += 100;
      }
    }

    for (const d of disziplinen) {
      const zeit = parseZeit(d.zeit);
      if (zeit !== null) {
        datenbank.push({
          name,
          geschlecht,
          alter,
          aktuellesAlter: jahrgangNum ? new Date().getFullYear() - jahrgangNum : null,
          jahrgang,
          disziplin: d.nr,
          jahr,
          zeit,
          ortsgruppe,
          landesverband,
          datum: wettkampfDatum,
          wettkampf: wettkampfName,
          mehrkampfPlatzierung,
          einzelkampfPlatzierung,
        });
      }
    }
  }

  console.log("Excel geladen, Einträge:", datenbank.length);
  return datenbank;
}

// =====================
// Datenbank → Personen-Map
// =====================

function bessereZeit(alt, neu) {
  if (neu === null) return alt;
  if (alt === null) return rundeZeit(neu);
  return rundeZeit(Math.min(alt, neu));
}

function verarbeiteDatenbank(datenbank, aktuellesJahr) {
  const personenMap = new Map();
  const excludeSet = SONDERREGELN_ENTFERNEN[aktuellesJahr] || new Set();

  for (const eintrag of datenbank) {
    const nameKey = (eintrag.name || "").toString().trim().toLowerCase();
    if (excludeSet.has(nameKey)) {
      continue;
    }

    if (eintrag.jahr < aktuellesJahr - 1) continue;
    if (eintrag.wettkampf && eintrag.wettkampf.substring(0, 3).toUpperCase() === "OMS") continue;
    if (eintrag.landesverband && eintrag.landesverband.toUpperCase() !== "BA") continue;

    if (!personenMap.has(eintrag.name)) {
      const angemeldet = istAngemeldet(eintrag.name, aktuellesJahr);

      personenMap.set(eintrag.name, {
        matrix: createEmptyMatrix(),
        geschlecht: eintrag.geschlecht,
        alter: eintrag.alter,
        aktuellesAlter: eintrag.aktuellesAlter,
        jahrgang: eintrag.jahrgang,
        ortsgruppe: eintrag.ortsgruppe,
        landesverband: eintrag.landesverband,
        datumLetzterStart: eintrag.datum,

        Icon_Time: "",
        Icon_Comp: "",
        Icon_Ocean: "",
        Icon_Coach: "",
        Kaderstatus: "",

        angemeldet,
        Status_Anmeldung: angemeldet ? "angemeldet" : "",

        comps: new Map()
      });
    }

    const person = personenMap.get(eintrag.name);

    const compKey = `${eintrag.jahr}||${normWk(eintrag.wettkampf)}`;
    let comp = person.comps.get(compKey);
    if (!comp) {
      comp = {
        jahr: eintrag.jahr,
        wettkampf: eintrag.wettkampf,
        age: eintrag.alter,
        mehr: null,
        einz: null
      };
      person.comps.set(compKey, comp);
    }

    const mk = parseInt(eintrag.mehrkampfPlatzierung, 10);
    if (Number.isFinite(mk) && mk >= 1) comp.mehr = minNum(comp.mehr, mk);

    const ek = parseInt(eintrag.einzelkampfPlatzierung, 10);
    if (Number.isFinite(ek) && ek >= 1) comp.einz = minNum(comp.einz, ek);

    console.log(`[COMPS] ${eintrag.name} | ${eintrag.wettkampf} ${eintrag.jahr} | mehr=${comp.mehr} | einz=${comp.einz}`);

    if (eintrag.datum > person.datumLetzterStart) {
      person.ortsgruppe = eintrag.ortsgruppe;
      person.datumLetzterStart = eintrag.datum;
    }

    const jahrIndex = (eintrag.jahr === aktuellesJahr) ? 1 : 0;

    const norms = PFLICHTZEITEN[person.geschlecht];
    const normU17 = norms.U17[eintrag.jahr]?.[eintrag.disziplin - 1] ?? null;
    const normU19 = norms.U19[eintrag.jahr]?.[eintrag.disziplin - 1] ?? null;
    const normOffen = norms.Offen[eintrag.jahr]?.[eintrag.disziplin - 1] ?? null;

    const zeit = eintrag.zeit;

    if (zeit !== null && normOffen !== null && zeit <= normOffen) {
      person.matrix[eintrag.disziplin - 1][AK_INDEX.Offen][jahrIndex] =
        bessereZeit(person.matrix[eintrag.disziplin - 1][AK_INDEX.Offen][jahrIndex], zeit);
    }

    if (zeit !== null && normU19 !== null && zeit <= normU19 && eintrag.alter < 19) {
      person.matrix[eintrag.disziplin - 1][AK_INDEX.U19][jahrIndex] =
        bessereZeit(person.matrix[eintrag.disziplin - 1][AK_INDEX.U19][jahrIndex], zeit);
    }

    if (zeit !== null && normU17 !== null && zeit <= normU17 && eintrag.alter < 17) {
      person.matrix[eintrag.disziplin - 1][AK_INDEX.U17][jahrIndex] =
        bessereZeit(person.matrix[eintrag.disziplin - 1][AK_INDEX.U17][jahrIndex], zeit);
    }

    person.Icon_Time = bestimmeIconTime(person.matrix);

    const timesStatus = bestimmeKaderstatus(person.matrix, person.aktuellesAlter);
    person.Kaderstatus = promoteStatus(person.Kaderstatus, timesStatus);

    // Ocean
    let oceanColor = "";
    let oceanKader = "";

    const srPrev = findeSonderregelOcean(eintrag.name, aktuellesJahr - 1);
    if (srPrev) { oceanColor = "yellow"; oceanKader = srPrev.kader || ""; }

    const srCurr = findeSonderregelOcean(eintrag.name, aktuellesJahr);
    if (srCurr) { oceanColor = "green"; oceanKader = srCurr.kader || oceanKader; }

    if (oceanColor) {
      person.Icon_Ocean = hoechsteFarbe(person.Icon_Ocean, oceanColor);
      person.Kaderstatus = promoteStatus(person.Kaderstatus, oceanKader);
      console.log(`[${eintrag.name}] OceanSonderregel`, { oceanColor, oceanKader, Kaderstatus: person.Kaderstatus });
    }

    // Trainer / Coach
    let coachColor = "";
    let coachKader = "";

    const trPrev = findeSonderregelTrainer(eintrag.name, aktuellesJahr - 1);
    if (trPrev) { coachColor = "yellow"; coachKader = trPrev.kader || ""; }

    const trCurr = findeSonderregelTrainer(eintrag.name, aktuellesJahr);
    if (trCurr) { coachColor = "green"; coachKader = trCurr.kader || coachKader; }

    if (coachColor) {
      person.Icon_Coach = hoechsteFarbe(person.Icon_Coach, coachColor);
      person.Kaderstatus = promoteStatus(person.Kaderstatus, coachKader);
      console.log(`[${eintrag.name}] TrainerSonderregel`, { coachColor, coachKader, Kaderstatus: person.Kaderstatus });
    }
  }

  for (const [name, person] of personenMap.entries()) {
    const compRes = pruefePlatzierungsKriterienAusComps(person, aktuellesJahr);
    person.Icon_Comp = hoechsteFarbe(person.Icon_Comp, compRes.icon || "");
    person.Kaderstatus = promoteStatus(person.Kaderstatus, compRes.kader || "");
    console.log(`[Comp-Ergebnis] ${name}`, compRes, 'aus', Array.from(person.comps.values()));
  }

  return personenMap;
}

// =====================
// Tabelle(n) bauen – 4 Gruppen
// =====================
function baueKaderTabelle(result, aktuellesJahr) {
  const container = document.getElementById("kader-container");
  if (!container) {
    console.error('#kader-container nicht gefunden – Tabellen können nicht erzeugt werden.');
    return;
  }
  container.innerHTML = "";

  // Alle Personen mit gültigem Kaderstatus holen
  const allPersons = Array.from(result.entries())
    .filter(([_, p]) => p.Kaderstatus === "Badenkader" || p.Kaderstatus === "Juniorenkader");

  // 4 Gruppen: Offener Kader m/w = Badenkader, Juniorenkader m/w
  const offenM = [];
  const offenW = [];
  const juniorM = [];
  const juniorW = [];

  for (const [name, p] of allPersons) {
    if (p.Kaderstatus === "Badenkader") {
      if (p.geschlecht === "maennlich") {
        offenM.push([name, p]);
      } else {
        offenW.push([name, p]);
      }
    } else if (p.Kaderstatus === "Juniorenkader") {
      if (p.geschlecht === "maennlich") {
        juniorM.push([name, p]);
      } else {
        juniorW.push([name, p]);
      }
    }
  }

  // Sortierung innerhalb jeder Gruppe: Ortsgruppe, dann Name
  function sortGroup(arr) {
    arr.sort((a, b) => {
      const [nameA, pA] = a;
      const [nameB, pB] = b;
      const ogA = (pA.ortsgruppe || "").toString().trim();
      const ogB = (pB.ortsgruppe || "").toString().trim();
      const cmpOG = ogA === "" && ogB !== "" ? 1
                  : ogB === "" && ogA !== "" ? -1
                  : ogA.localeCompare(ogB, "de", { sensitivity: "base" });
      if (cmpOG !== 0) return cmpOG;
      return nameA.localeCompare(nameB, "de", { sensitivity: "base" });
    });
  }

  sortGroup(offenM);
  sortGroup(offenW);
  sortGroup(juniorM);
  sortGroup(juniorW);

  // Hilfsfunktion: Tabelle für eine Gruppe bauen (Struktur wie bisher)
  function createTableForGroup(personenArray) {
    const table = document.createElement("table");

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    trHead.innerHTML = `
      <th></th>
      <th>Sportler / Ortsgruppe</th>
      <th colspan="4" style="text-align:center;">Kriterien</th>
      <th style="text-align:center;">Status</th>
    `;
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (const [name, person] of personenArray) {
      const tr = document.createElement("tr");
      tr.dataset.kaderstatus = person.Kaderstatus;
      tr.dataset.aktuellesalter = person.aktuellesAlter;
      const farbe = person.geschlecht === "maennlich" ? "#1e90ff" : "#ff69b4";

      // 1) Cap
      const tdCap = document.createElement("td");
      tdCap.style.textAlign = "right";
      const imgCap = document.createElement("img");
      const ortsgruppe = person.ortsgruppe || "placeholder";
      imgCap.src = `./svg/${encodeURIComponent(`Cap-${ortsgruppe}.svg`)}`;
      imgCap.style.width = "35px";
      imgCap.alt = `Cap von ${person.ortsgruppe}`;
      imgCap.onerror = () => { imgCap.onerror = null; imgCap.src = `./svg/Cap-Baden_light.svg`; };
      tdCap.appendChild(imgCap);
      tr.appendChild(tdCap);

      // 2) Name/Zusatz
      const tdName = document.createElement("td");
      tdName.innerHTML = `
        <span style="color:${farbe}; font-weight:bold;">
          ${name} (${person.jahrgang})
        </span><br>
        <small style="color: rgb(68, 68, 69); font-weight: bold;">
          DLRG ${person.ortsgruppe || ""}
        </small>
      `;
      tr.appendChild(tdName);

      // 3) Icon_Time
      const tdIcon_time = document.createElement("td");
      tdIcon_time.style.textAlign = "center";
      const imgIcon_time = document.createElement("img");
      const icon1 = person.Icon_Time === "green" ? "icon_time_green.svg"
                  : person.Icon_Time === "yellow" ? "icon_time_yellow.svg"
                  : "icon_time_grey.svg";
      imgIcon_time.src = `https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/${encodeURIComponent(icon1)}`;
      imgIcon_time.style.width = "35px";
      tdIcon_time.appendChild(imgIcon_time);
      tr.appendChild(tdIcon_time);

      // 4) Icon_Comp
      const tdIcon_comp = document.createElement("td");
      tdIcon_comp.style.textAlign = "center";
      const imgIcon_comp = document.createElement("img");
      const icon2 = person.Icon_Comp === "green" ? "icon_medal_green.svg"
                  : person.Icon_Comp === "yellow" ? "icon_medal_yellow.svg"
                  : "icon_medal_grey.svg";
      imgIcon_comp.src = `https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/${encodeURIComponent(icon2)}`;
      imgIcon_comp.style.width = "35px";
      tdIcon_comp.appendChild(imgIcon_comp);
      tr.appendChild(tdIcon_comp);

      // 5) Icon_Ocean
      const tdIcon_ocean = document.createElement("td");
      tdIcon_ocean.style.textAlign = "center";
      const imgIcon_ocean = document.createElement("img");
      const icon3 = person.Icon_Ocean === "green" ? "icon_ocean_green.svg"
                  : person.Icon_Ocean === "yellow" ? "icon_ocean_yellow.svg"
                  : "icon_ocean_grey.svg";
      imgIcon_ocean.src = `https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/${encodeURIComponent(icon3)}`;
      imgIcon_ocean.style.width = "35px";
      tdIcon_ocean.appendChild(imgIcon_ocean);
      tr.appendChild(tdIcon_ocean);

      // 6) Icon_Coach
      const tdIcon_coach = document.createElement("td");
      tdIcon_coach.style.textAlign = "center";
      const imgIcon_coach = document.createElement("img");
      const icon4 = person.Icon_Coach === "green" ? "icon_trainer_green.svg"
                  : person.Icon_Coach === "yellow" ? "icon_trainer_yellow.svg"
                  : "icon_trainer_grey.svg";
      imgIcon_coach.src = `https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/${encodeURIComponent(icon4)}`;
      imgIcon_coach.style.width = "35px";
      tdIcon_coach.appendChild(imgIcon_coach);
      tr.appendChild(tdIcon_coach);

      // 7) Status-Zelle mit Tooltip
      const tdStatus = document.createElement("td");
      tdStatus.classList.add("status-cell");
      const wrapper = document.createElement("div");
      wrapper.className = "status-wrapper";
      const statusIcon = document.createElement("img");
      statusIcon.className = "status-icon";
      statusIcon.src = person.angemeldet
        ? "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/icon_status_green.svg"
        : "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/icon_status_yellow.svg";
      statusIcon.alt = person.angemeldet ? "Status: angemeldet" : "Anmeldung erforderlich";
      statusIcon.style.width = "27.5px";
      statusIcon.setAttribute("tabindex", "0");
      statusIcon.setAttribute("aria-haspopup", "true");
      statusIcon.setAttribute("aria-expanded", "false");

      const tooltip = document.createElement("div");
      tooltip.className = "status-tooltip";
      tooltip.setAttribute("role", "tooltip");
      tooltip.setAttribute("aria-hidden", "true");
      tooltip.textContent = person.angemeldet
        ? `Kaderberechtigt bis ${berechneKaderBis(person, aktuellesJahr)}`
        : "Anmeldung erforderlich";
      document.body.appendChild(tooltip);

      function positionTooltip() {
        const margin = 8;
        const r = statusIcon.getBoundingClientRect();
        tooltip.style.visibility = "hidden";
        tooltip.classList.add("is-visible");
        const tW = tooltip.offsetWidth, tH = tooltip.offsetHeight;
        let left = r.right + margin;
        let top  = Math.round(r.top + r.height / 2 - tH / 2);
        tooltip.classList.remove("left");
        if (left + tW > window.innerWidth - 8) {
          left = r.left - margin - tW;
          tooltip.classList.add("left");
        }
        if (top < 8) top = 8;
        if (top + tH > window.innerHeight - 8) top = window.innerHeight - tH - 8;
        tooltip.style.left = `${left}px`;
        tooltip.style.top  = `${top}px`;
        tooltip.style.visibility = "";
      }
      function hide() {
        tooltip.classList.remove("is-visible");
        tooltip.setAttribute("aria-hidden", "true");
        statusIcon.setAttribute("aria-expanded", "false");
        document.removeEventListener("click", onDocClick);
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("scroll", onScrollOrResize, true);
        window.removeEventListener("resize", onScrollOrResize);
        if (window.__closeOpenStatusTooltip === hide) window.__closeOpenStatusTooltip = null;
      }
      function show() {
        if (window.__closeOpenStatusTooltip && window.__closeOpenStatusTooltip !== hide) {
          window.__closeOpenStatusTooltip();
        }
        positionTooltip();
        tooltip.classList.add("is-visible");
        tooltip.setAttribute("aria-hidden", "false");
        statusIcon.setAttribute("aria-expanded", "true");
        document.addEventListener("click", onDocClick);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", onScrollOrResize, true);
        window.addEventListener("resize", onScrollOrResize);
        window.__closeOpenStatusTooltip = hide;
      }
      const onDocClick = (e) => { if (!wrapper.contains(e.target) && !tooltip.contains(e.target)) hide(); };
      const onKey = (e) => { if (e.key === "Escape") hide(); };
      const onScrollOrResize = () => { if (tooltip.classList.contains("is-visible")) positionTooltip(); };
      statusIcon.addEventListener("click", (e) => { e.stopPropagation(); tooltip.classList.contains("is-visible") ? hide() : show(); });
      statusIcon.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tooltip.classList.contains("is-visible") ? hide() : show(); } });

      wrapper.appendChild(statusIcon);
      tdStatus.appendChild(wrapper);

      // kein zusätzlicher Kader-Badge mehr
      tr.appendChild(tdStatus);
      tbody.appendChild(tr);

    }

    table.appendChild(tbody);
    return table;
  }

  // Grid-Container für 4 Boxen
  const grid = document.createElement("div");
  grid.className = "kader-grid";

  function addTableBox(title, arr) {
    if (!arr.length) return; // leere Gruppe auslassen
    const box = document.createElement("div");
    box.className = "kader-box";

    const heading = document.createElement("h3");
    heading.textContent = title;
    box.appendChild(heading);

    const table = createTableForGroup(arr);
    box.appendChild(table);

    grid.appendChild(box);
  }

  addTableBox("Offener Kader – männlich", offenM);
  addTableBox("Offener Kader – weiblich", offenW);
  addTableBox("Juniorenkader – männlich", juniorM);
  addTableBox("Juniorenkader – weiblich", juniorW);

  container.appendChild(grid);

  if (window.applyKaderFilter) window.applyKaderFilter();
  applyZebraStripes();
}

// =====================
// DOMContentLoaded: Hero + Updates + Kader-Container & Daten laden
// =====================

document.addEventListener("DOMContentLoaded", async () => {
  const main = document.getElementById("content");
  if (!main) return;

  // Dein bisheriger Inhalt (Hero + Aktuelles) bleibt erhalten
  main.innerHTML = `
    <section class="hero">
      <h1>Kaderstatus</h1>
    </section>

    <section class="updates">
      <h2>Aktuelles</h2>
      <ul>
        <li>Erste Inhalte folgen.</li>
      </ul>
    </section>

    <section class="kaderstatus-section">
      <div id="kader-container"></div>
    </section>
  `;

  const aktuellesJahr = 2025;

  await Promise.all([
    ladePflichtzeiten(aktuellesJahr),
    ladePlatzierungsKriterien(aktuellesJahr),
    ladeSonderregelnOcean(aktuellesJahr),
    ladeSonderregelnTrainer(aktuellesJahr),
    ladeSonderregelnEntfernen(aktuellesJahr),
    ladeAnmeldungen(aktuellesJahr)
  ]);

  const datenbank = await ladeExcelUndVerarbeite();
  const result = verarbeiteDatenbank(datenbank, aktuellesJahr);
  baueKaderTabelle(result, aktuellesJahr);

  console.log("===== Ergebnisse =====");
  for (const [name, daten] of result.entries()) {
    console.log("Name:", name,
      "Geschlecht:", daten.geschlecht,
      "| Jahrgang:", daten.jahrgang,
      "| Alter:", daten.alter,
      "| Aktuelles Alter:", daten.aktuellesAlter,
      "| Ortsgruppe:", daten.ortsgruppe,
      "| Landesverband:", daten.landesverband,
      "| Letzter Wettkampf:", formatDatum(daten.datumLetzterStart),
      "| Icon_Time:", daten.Icon_Time,
      "| Icon_Comp:", daten.Icon_Comp,
      "| Kaderstatus:", daten.Kaderstatus
    );
    console.log("Matrix:", daten.matrix);
    console.log("----------------------");
  }
});
