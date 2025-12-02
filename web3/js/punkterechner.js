// punkterechner.js

// Basis-URL des GitHub-Repos (rohe Dateien)
const PR_BASE_URL = "https://raw.githubusercontent.com/dennisfabri/DLRG-Punketabellen/main/";

// bekannte Punktetabellen-Dateien je Jahr
// null = es gibt bewusst keine Datei (wir nutzen dann das Vorjahr)
const PR_FILE_INFO = {
  2007: "xls",
  2008: "xls",
  2009: "xls",
  2010: "xlsx",
  2011: "xlsx",
  2012: "xlsx",
  2013: "xlsx",
  2014: "xlsx",
  2015: "xlsx",
  2016: "xlsx",
  2017: null,   // keine eigene Datei → 2016 verwenden
  2018: "xlsx",
  2019: "xlsx",
  2020: "xlsx",
  2021: "xlsx",
  2022: "xlsx",
  2023: "xlsx",
  2024: null,   // keine eigene Datei → 2023 verwenden
  2025: "xlsx"
};

// Fallback-Regel, falls in Zukunft neue Jahre hinzukommen
function prGetExtForYear(year) {
  if (Object.prototype.hasOwnProperty.call(PR_FILE_INFO, year)) {
    return PR_FILE_INFO[year];   // "xls", "xlsx" oder null
  }
  // ältere Jahre (theoretisch) nur als .xls
  if (year <= 2009) return "xls";
  // neuere Jahre standardmäßig als .xlsx
  return "xlsx";
}


// -------------------------
// Konfiguration Disziplinen
// -------------------------

const PR_DISCIPLINES = {
  Einzel: {
    "12": [
      { id: "E12_50_HIND",   label: "50m Hindernis-schwimmen",          excelKey: "50m hindernis" },
      { id: "E12_50_KOMB",   label: "50m komb. Schwimmen",              excelKey: "50m komb schwimmen" },
      { id: "E12_50_FLOSS",  label: "50m Flossen",                       excelKey: "50m flossen" }
    ],
    "13/14": [
      { id: "E1314_100_HIND", label: "100m Hindernis-schwimmen",        excelKey: "100m hindernis" },
      { id: "E1314_50_RETT",  label: "50m Retten",                      excelKey: "50m retten" },
      { id: "E1314_50_FLOSS", label: "50m Retten mit Flossen",          excelKey: "50m retten mit flossen" }
    ],
    "15/16": [
      { id: "E1516_200_HIND",  label: "200m Hindernis-schwimmen",       excelKey: "200m hindernis" },
      { id: "E1516_100_LIFE",  label: "100m Retten m. Fl. u. GR. (Lifesaver)", excelKey: "100m retten m fl u gr" },
      { id: "E1516_50_RETT",   label: "50m Retten",                     excelKey: "50m retten" },
      { id: "E1516_100_KOMB",  label: "100m komb. Rettungs-übung",      excelKey: "100m komb rettungs" },
      { id: "E1516_100_FLOSS", label: "100m Retten mit Flossen",        excelKey: "100m retten mit flossen" },
      { id: "E1516_200_SUPER", label: "200m Super-Lifesaver",           excelKey: "200m super lifesaver" }
    ],
    "17/18": [
      { id: "E1718_200_HIND",  label: "200m Hindernis-schwimmen",       excelKey: "200m hindernis" },
      { id: "E1718_100_LIFE",  label: "100m Retten m. Fl. u. GR. (Lifesaver)", excelKey: "100m retten m fl u gr" },
      { id: "E1718_50_RETT",   label: "50m Retten",                     excelKey: "50m retten" },
      { id: "E1718_100_KOMB",  label: "100m komb. Rettungs-übung",      excelKey: "100m komb rettungs" },
      { id: "E1718_100_FLOSS", label: "100m Retten mit Flossen",        excelKey: "100m retten mit flossen" },
      { id: "E1718_200_SUPER", label: "200m Super-Lifesaver",           excelKey: "200m super lifesaver" }
    ],
    "Offen": [
      { id: "EO_200_HIND",  label: "200m Hindernis-schwimmen",          excelKey: "200m hindernis" },
      { id: "EO_100_LIFE",  label: "100m Retten m. Fl. u. GR. (Lifesaver)", excelKey: "100m retten m fl u gr" },
      { id: "EO_50_RETT",   label: "50m Retten",                        excelKey: "50m retten" },
      { id: "EO_100_KOMB",  label: "100m komb. Rettungs-übung",         excelKey: "100m komb rettungs" },
      { id: "EO_100_FLOSS", label: "100m Retten mit Flossen",           excelKey: "100m retten mit flossen" },
      { id: "EO_200_SUPER", label: "200m Super-Lifesaver",              excelKey: "200m super lifesaver" }
    ]
  },

  Mannschaft: {
    "12": [
      // WICHTIG: "rueckenlage" mit "ue", damit die Normalisierung mit "Rückenlage" matcht
      { id: "M12_4x50_HIND",    label: "4×50m Hindernisstaffel",        excelKey: "4*50m hindernisstaffel" },
      { id: "M12_4x25_RUECK",   label: "4×25m Rückenlage ohne Arme",    excelKey: "4*25m rueckenlage ohne arme" },
      { id: "M12_4x25_GURT",    label: "4×25m Gurtretterstaffel",       excelKey: "4*25m gurtretterstaffel" },
      { id: "M12_4x25_RETT",    label: "4×25m Rettungsstaffel",         excelKey: "4*25m rettungsstaffel" }
    ],
    "13/14": [
      { id: "M1314_4x50_HIND",  label: "4×50m Hindernisstaffel",        excelKey: "4*50m hindernisstaffel" },
      { id: "M1314_4x25_PUPPE", label: "4×25m Puppenstaffel",           excelKey: "4*25m puppenstaffel" },
      { id: "M1314_4x50_GURT",  label: "4×50m Gurtretterstaffel",       excelKey: "4*50m gurtretterstaffel" },
      { id: "M1314_4x50_RETT",  label: "4×50m Rettungsstaffel",         excelKey: "4*50m rettungsstaffel" }
    ],
    "15/16": [
      { id: "M1516_4x50_HIND",  label: "4×50m Hindernisstaffel",        excelKey: "4*50m hindernisstaffel" },
      { id: "M1516_4x25_PUPPE", label: "4×25m Puppenstaffel",           excelKey: "4*25m puppenstaffel" },
      { id: "M1516_4x50_GURT",  label: "4×50m Gurtretterstaffel",       excelKey: "4*50m gurtretterstaffel" },
      { id: "M1516_4x50_RETT",  label: "4×50m Rettungsstaffel",         excelKey: "4*50m rettungsstaffel" }
    ],
    "17/18": [
      { id: "M1718_4x50_HIND",  label: "4×50m Hindernisstaffel",        excelKey: "4*50m hindernisstaffel" },
      { id: "M1718_4x25_PUPPE", label: "4×25m Puppenstaffel",           excelKey: "4*25m puppenstaffel" },
      { id: "M1718_4x50_GURT",  label: "4×50m Gurtretterstaffel",       excelKey: "4*50m gurtretterstaffel" },
      { id: "M1718_4x50_RETT",  label: "4×50m Rettungsstaffel",         excelKey: "4*50m rettungsstaffel" }
    ],
    "Offen": [
      { id: "MO_4x50_HIND",     label: "4×50m Hindernisstaffel",        excelKey: "4*50m hindernisstaffel" },
      { id: "MO_4x25_PUPPE",    label: "4×25m Puppenstaffel",           excelKey: "4*25m puppenstaffel" },
      { id: "MO_4x50_GURT",     label: "4×50m Gurtretterstaffel",       excelKey: "4*50m gurtretterstaffel" },
      { id: "MO_4x50_RETT",     label: "4×50m Rettungsstaffel",         excelKey: "4*50m rettungsstaffel" }
    ]
  }
};

// -------------------------
// Utility-Funktionen
// -------------------------

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

function prParseTimeString(str) {
  let s = String(str || "").trim();
  if (!s) return NaN;
  s = s.replace(",", "."); // , als Dezimaltrenner zulassen

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
    // Excel: Tage -> Sekunden
    return cell.v * 24 * 60 * 60;
  }
  const raw = String(cell.w || cell.v || "").trim();
  if (!raw) return null;
  const sec = prParseTimeString(raw);
  return isNaN(sec) ? null : sec;
}

function prFindHeaderLeft(sheet, rowIndex, colIndex) {
  if (!sheet || !sheet["!ref"]) return "";
  for (let c = colIndex; c >= 0; c--) {
    const addr = XLSX.utils.encode_cell({ c, r: rowIndex });
    const cell = sheet[addr];
    if (cell && cell.v != null && String(cell.v).trim() !== "") {
      return String(cell.v).trim();
    }
  }
  return "";
}

// Punkte national nach deutscher Rekordzeit
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

// Rekordzeit aus einem Sheet suchen (robuster Header-Abgleich)
function prFindGermanRecordTime(sheet, mode, ak, gender, discipline) {
  if (!sheet || !sheet["!ref"]) return null;

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const targetKey = prNormalizeKey(discipline.excelKey || discipline.label);

  const genderLower = String(gender || "").toLowerCase();
  const isTargetFemale = genderLower.startsWith("w"); // "weiblich"

  const femaleTokens = ["weiblich", "wbl"];
  const maleTokens   = ["männlich", "maennlich", "männl", "maennl"];

  const targetAkFull   = ("ak " + ak).toLowerCase();           // "ak 12", "ak 13/14", "ak offen"
  const targetAkSimple = String(ak || "").toLowerCase().replace(/\s+/g, "");

  let bestSeconds = null;
  let bestScore   = -1;

  for (let c = 2; c <= range.e.c; c++) { // ab Spalte C
    const colLetter = XLSX.utils.encode_col(c);
    const discCell  = sheet[`${colLetter}3`];
    const timeCell  = sheet[`${colLetter}4`];
    if (!discCell || !timeCell) continue;

    // Disziplin-Text prüfen
    const discNorm = prNormalizeKey(discCell.v || discCell.w || "");
    if (!discNorm.includes(targetKey)) continue;

    // Header aus Zeile 1 und 2 einsammeln
    const h1 = prFindHeaderLeft(sheet, 0, c);
    const h2 = prFindHeaderLeft(sheet, 1, c);
    const header = (h1 + " " + h2).toLowerCase();

    const hasFemale = femaleTokens.some(t => header.includes(t));
    const hasMale   = maleTokens.some(t => header.includes(t));

    // Spalten, die explizit das jeweils andere Geschlecht tragen, ignorieren
    if (isTargetFemale) {
      if (hasMale && !hasFemale) continue;
    } else {
      if (hasFemale && !hasMale) continue;
    }

    let score = 0;

    // Geschlecht: stark gewichten, wenn explizit erwähnt
    if (isTargetFemale && hasFemale) score += 6;
    if (!isTargetFemale && hasMale)  score += 6;

    // Altersklasse
    if (header.includes(targetAkFull))   score += 4;             // z.B. "AK 12"
    if (!header.includes("ak") && header.includes(targetAkSimple)) score += 2; // z.B. nur "12" / "15/16"
    if (ak === "Offen" && header.includes("offen")) score += 3;
    if (ak === "17/18" && header.includes("17/18")) score += 2;

    // Jugend-Hinweis
    if (header.includes("jugend") && ak !== "Offen") score += 1;

    const seconds = prExcelTimeCellToSeconds(timeCell);
    if (seconds == null) continue;

    // Falls gar kein Header-Hinweis existiert, landen wir bei score = 0
    // → wird nur genommen, wenn es keine besser passende Spalte gibt.
    if (score > bestScore) {
      bestScore   = score;
      bestSeconds = seconds;
    }
  }

  return bestSeconds;
}

function prGetRule() {
  const el = document.getElementById("pr-rule");
  return el ? el.value : "National";
}

function prUpdateSummaryLabel() {
  const modeEl = document.getElementById("pr-mode");
  const ruleEl = document.getElementById("pr-rule");
  const mode = modeEl ? modeEl.value : "Einzel";
  const rule = ruleEl ? ruleEl.value : "National";
  const isTeam = mode === "Mannschaft";
  const cell = document.querySelector(".pr-summary-row td:first-child");
  if (!cell) return;

  const ruleLower = rule.toLowerCase();

  if (isTeam) {
    cell.textContent = `Gesamt (${ruleLower}, alle 4 Disziplinen)`;
  } else {
    if (rule === "International") {
      cell.textContent = `Gesamt (${ruleLower}, beste 4 Disziplinen)`;
    } else {
      cell.textContent = `Gesamt (${ruleLower}, beste 3 Disziplinen)`;
    }
  }

  const pointsHeader = document.getElementById("pr-points-header");
  if (pointsHeader) {
    pointsHeader.textContent = rule === "International" ? "Punkte (WR)" : "Punkte (DE)";
  }
}



// -------------------------
// State
// -------------------------

const prState = {
  workbook: null,
  sheets: {},   // {Einzel: Sheet, Mannschaft: Sheet}
  yearTried: null,
  yearEffective: null,
  yearWorkbooks: {}, // Jahr -> Workbook
  chart: null,
  chartRequestId: 0,
  chartRowRequests: {},  // disciplineId -> letzte Request-ID
  chartSeries: {},       // disciplineId -> { label, years:[], data:[] }
  chartYears: null       // gemeinsame X-Achse (Jahre)
};


// genau diese Jahresdatei laden, anhand der bekannten Endung
async function prFetchWorkbookExact(year) {
  // wenn wir das Jahr schon (auch als null) kennen → nichts mehr laden
  if (Object.prototype.hasOwnProperty.call(prState.yearWorkbooks, year)) {
    return prState.yearWorkbooks[year];
  }

  const ext = prGetExtForYear(year);   // "xls", "xlsx" oder null

  // Jahr, für das es bewusst keine Datei gibt (z.B. 2017, 2024)
  if (!ext) {
    prState.yearWorkbooks[year] = null;
    return null;
  }

  const fileName = `Punktetabelle ${year}.${ext}`;
  const url = PR_BASE_URL + encodeURIComponent(fileName);

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`Punktetabelle ${year}.${ext} nicht gefunden (HTTP ${resp.status}).`);
      prState.yearWorkbooks[year] = null;
      return null;
    }

    const buf = await resp.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    prState.yearWorkbooks[year] = wb;
    return wb;
  } catch (e) {
    console.warn(`Laden Punktetabelle ${year}.${ext} fehlgeschlagen:`, e);
    prState.yearWorkbooks[year] = null;
    return null;
  }
}



// -------------------------
// Initialisierung
// -------------------------

document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Punkterechner</h1>
    </section>

    <section class="pr-controls-wrapper">
      <div class="pr-controls-grid">
        <div class="pr-control">
          <label for="pr-mode">Wertung</label>
          <select id="pr-mode">
            <option value="Einzel">Einzel</option>
            <option value="Mannschaft">Mannschaft</option>
          </select>
        </div>

        <div class="pr-control">
          <label for="pr-age">Altersklasse</label>
          <select id="pr-age">
            <option value="12">AK 12</option>
            <option value="13/14">AK 13/14</option>
            <option value="15/16">AK 15/16</option>
            <option value="17/18">AK 17/18</option>
            <option value="Offen">AK Offen</option>
          </select>
        </div>

        <div class="pr-control">
          <label for="pr-gender">Geschlecht</label>
          <select id="pr-gender">
            <option value="weiblich">Weiblich</option>
            <option value="männlich">Männlich</option>
          </select>
        </div>

        <div class="pr-control">
          <label for="pr-rule">Regelwerk</label>
          <select id="pr-rule">
            <option value="National">National</option>
            <option value="International">International</option>
          </select>
        </div>
      </div>
      <div id="pr-info" class="pr-info"></div>
    </section>


    <section class="pr-table-wrapper">
      <div id="pr-loading" class="pr-loading">Punktetabelle wird initialisiert …</div>
        <table id="discipline-table" class="pr-table" hidden>
          <thead>
            <tr>
              <th>Disziplin</th>
              <th>Zeit</th>
              <th>Deutscher Rekord</th>
              <th id="pr-points-header">Punkte (DE)</th>
            </tr>
          </thead>
        <tbody></tbody>
        <tfoot>
          <tr class="pr-summary-row">
            <td colspan="3">Gesamt (national, beste 3 Disziplinen)</td>
            <td id="pr-total-de"></td>
            <td id="pr-total-intl">–</td>
          </tr>
        </tfoot>
      </table>
    </section>

    <section class="pr-chart-wrapper">
      <h2>Punkteentwicklung (national)</h2>
      <p class="pr-chart-hint">
        Die Kurve zeigt die Punkte für die eingegebene Zeit in der aktuell ausgewählten Disziplin
        in Abhängigkeit von den Rekordzeiten der Jahre 2007 bis heute. Angaben können fehlerhaft sein.
      </p>
      <div class="pr-chart-inner">
        <canvas id="pr-points-chart"></canvas>
        <div id="pr-chart-placeholder" class="pr-chart-placeholder">
          Bitte eine Zeit in einer Disziplin eintragen, um die Punkteentwicklung über die Jahre zu sehen.
        </div>
      </div>
    </section>
    
    <section class="pr-year-table-wrapper">
      <h2>Punkte pro Jahr (national)</h2>
      <p class="pr-chart-hint">
        Die Tabelle zeigt die Punkte der gewählten Disziplinen je Jahr sowie die Summe
        der besten drei Disziplinen (3-Kampf).
      </p>
      <div class="pr-year-table-inner">
        <table id="pr-year-table" class="pr-year-table"></table>
      </div>
    </section>
  `;


  prInitChart();

  const info = document.getElementById("pr-info");

  if (typeof XLSX === "undefined") {
    if (info) {
      info.textContent = "XLSX-Bibliothek nicht gefunden – Rekordzeiten können nicht geladen werden.";
    }
    prInitEvents();
    prRenderCurrentSelection();
    return;
  }

  prLoadWorkbookForYear()
    .then(() => {
      if (info) {
        if (prState.yearEffective) {
          info.textContent = `Punktetabelle ${prState.yearEffective} geladen.`;
        } else {
          info.textContent = "Punktetabelle konnte nicht geladen werden.";
        }
      }
      prInitEvents();
      prRenderCurrentSelection();
    })
    .catch(err => {
      console.error(err);
      if (info) {
        info.textContent = "Fehler beim Laden der Punktetabelle – Rekordzeiten werden nicht angezeigt.";
      }
      prInitEvents();
      prRenderCurrentSelection();
    });
});

// Workbook fürs aktuelle Jahr (oder Jahr-1) laden
async function prLoadWorkbookForYear() {
  const currentYear = new Date().getFullYear();
  prState.yearTried = currentYear;

  const candidates = [currentYear, currentYear - 1];

  for (const year of candidates) {
    const wb = await prFetchWorkbookExact(year);
    if (!wb) continue;

    prState.workbook = wb;
    prState.yearEffective = year;
    prState.yearWorkbooks[year] = wb;
    prState.sheets.Einzel = wb.Sheets["Einzel"];
    prState.sheets.Mannschaft = wb.Sheets["Mannschaft"];
    return;
  }
}


// Für beliebiges Jahr das Workbook sicherstellen (ohne Jahres-Fallback)
async function prEnsureYearWorkbook(year) {
  return prFetchWorkbookExact(year);   // nutzt Cache + .xlsx/.xls
}


// Event Handler für Selects
function prInitEvents() {
  const modeSel = document.getElementById("pr-mode");
  const ageSel = document.getElementById("pr-age");
  const genderSel = document.getElementById("pr-gender");
  const ruleSel = document.getElementById("pr-rule");

  [modeSel, ageSel, genderSel].forEach(sel => {
    if (!sel) return;
    sel.addEventListener("change", () => prRenderCurrentSelection());
  });

  if (ruleSel) {
    ruleSel.addEventListener("change", () => {
      prUpdateSummaryLabel();
      prUpdateTotalPointsDe();
      prRebuildChartFromState();
    });
  }
}


// aktuelle Auswahl anzeigen
function prGetDisciplines(mode, ak) {
  const m = PR_DISCIPLINES[mode];
  if (!m) return [];
  return m[ak] || [];
}

function prRenderCurrentSelection() {
  const loading = document.getElementById("pr-loading");
  const table = document.getElementById("discipline-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const totalDe = document.getElementById("pr-total-de");
  const totalIntl = document.getElementById("pr-total-intl");

  if (tbody) tbody.innerHTML = "";
  if (totalDe) totalDe.textContent = "";
  if (totalIntl) totalIntl.textContent = "–";

  // Chart-State für neue Auswahl zurücksetzen
  prState.chartSeries = {};
  prState.chartYears = null;
  prState.chartRowRequests = {};
  if (prState.chart) {
    prState.chart.data.labels = [];
    prState.chart.data.datasets = [];
    prState.chart.update();
  }
  prShowChartPlaceholder(true);

  const yearTable = document.getElementById("pr-year-table");
    if (yearTable) {
      yearTable.innerHTML = "";
    }


  const modeElem = document.getElementById("pr-mode");
  const ageElem = document.getElementById("pr-age");
  const genderElem = document.getElementById("pr-gender");
  if (!modeElem || !ageElem || !genderElem) return;

  const mode = modeElem.value;
  const ak = ageElem.value;
  const gender = genderElem.value;

  const summaryLabelCell = document.querySelector(".pr-summary-row td:first-child");
  if (summaryLabelCell) {
    summaryLabelCell.textContent =
      mode === "Mannschaft"
        ? "Gesamt (national, alle 4 Disziplinen)"
        : "Gesamt (national, beste 3 Disziplinen)";
  }


  const list = prGetDisciplines(mode, ak);

  if (!list.length) {
    if (tbody) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "Für diese Kombination sind keine Disziplinen definiert.";
      row.appendChild(cell);
      tbody.appendChild(row);
    }
  } else {
    const sheet = prState.sheets[mode];

    list.forEach(disc => {
      const tr = document.createElement("tr");
      tr.dataset.disciplineId = disc.id;
      tr.dataset.pointsDe = "0";

      const tdName = document.createElement("td");
      tdName.className = "pr-disc-name";
      tdName.textContent = disc.label;
      tr.appendChild(tdName);

      const tdInput = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "pr-time-input";
      input.placeholder = "m:ss,cc";
      input.autocomplete = "off";
      tdInput.appendChild(input);
      tr.appendChild(tdInput);

      const tdRec = document.createElement("td");
      tdRec.className = "pr-rec-time";
      let recSeconds = null;
      if (sheet && typeof XLSX !== "undefined") {
        recSeconds = prFindGermanRecordTime(sheet, mode, ak, gender, disc);
      }
      if (recSeconds != null) {
        tdRec.textContent = prFormatSeconds(recSeconds);
        tdRec.dataset.seconds = String(recSeconds);
      } else {
        tdRec.textContent = "–";
        tdRec.dataset.seconds = "";
      }
      tr.appendChild(tdRec);

      const tdPointsDe = document.createElement("td");
      tdPointsDe.className = "pr-points-de";
      tr.appendChild(tdPointsDe);


      if (tbody) tbody.appendChild(tr);

      input.addEventListener("input", () => {
        prRecalcRowPoints(tr);
        prUpdateTotalPointsDe();
        prUpdateChartForRow(tr);
      });

      input.addEventListener("focus", () => {
        prUpdateChartForRow(tr);
      });
    });
  }

  table.hidden = false;
  if (loading) loading.style.display = "none";
  prUpdateSummaryLabel();
  prUpdateTotalPointsDe();
  prShowChartPlaceholder(true);
}

// Punkte je Zeile berechnen
function prRecalcRowPoints(tr) {
  const input = tr.querySelector(".pr-time-input");
  const recCell = tr.querySelector(".pr-rec-time");
  const pointsCell = tr.querySelector(".pr-points-de");

  if (!input || !recCell || !pointsCell) return;

  const recSeconds = parseFloat(recCell.dataset.seconds || "");
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

  // Klassen zurücksetzen
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
    // Mannschaft: immer alle Disziplinen
    total = vals.reduce((a, b) => a + b, 0);
  } else {
    // Einzel: national = Top3, international = Top4
    const valsSorted = vals.slice().sort((a, b) => b - a);
    const k = isIntl ? 4 : 3;
    total = valsSorted.slice(0, k).reduce((a, b) => a + b, 0);
  }

  totalCell.textContent = total.toFixed(2) + " P";

  // Hervorhebungen
  if (isTeam) {
    // Mannschaft: alle gewerteten Disziplinen einfärben
    entries.forEach(e => {
      if (e.cell && e.val > 0) e.cell.classList.add("pr-points-de-top3");
    });
  } else {
    // Einzel: Top3 bzw. Top4 einfärben
    const entriesSorted = entries.slice().sort((a, b) => b.val - a.val);
    const k = isIntl ? 4 : 3;
    entriesSorted.slice(0, k).forEach(e => {
      if (e.cell && e.val > 0) e.cell.classList.add("pr-points-de-top3");
    });
    if (!isIntl && entriesSorted.length > 3 && entriesSorted[3].val > 0 && entriesSorted[3].cell) {
      entriesSorted[3].cell.classList.add("pr-points-de-top4");
    }
  }
}



// -------------------------
// Chart
// -------------------------

function prInitChart() {
  const canvas = document.getElementById("pr-points-chart");
  if (!canvas || typeof Chart === "undefined") {
    console.warn("Chart.js nicht verfügbar – Chart wird nicht initialisiert.");
    return;
  }

  prState.chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: []   // wird dynamisch aufgebaut
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: "Jahr" }
        },
        y: {                               // Punkte einzelner Disziplinen
          title: { display: true, text: "Punkte" },
          min: 0,
          max: 1100
        },
        sum: {                             // Summe (Top 3)
          position: "right",
          title: { display: true, text: "Summe (Top 3)" },
          min: 0,
          max: 3200,
          reverse: false,                  // 3200 oben, 0 unten
          grid: { drawOnChartArea: false },
          display: false                  // wird dynamisch aktiviert
        }
      },
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              let label = ctx.dataset.label || "";
              if (label) label += ": ";
              const v = ctx.parsed.y;
              if (v == null || !isFinite(v)) return label + "-";
              return label + v.toFixed(2).replace(".", ",") + " P";
            }
          }
        }
      }
    }
  });
}


function prShowChartPlaceholder(show) {
  const placeholder = document.getElementById("pr-chart-placeholder");
  if (!placeholder) return;
  placeholder.style.display = show ? "block" : "none";
}


function prRebuildChartFromState() {
  const chart = prState.chart;
  if (!chart) return;

  const seriesEntries = Object.values(prState.chartSeries);
  const years = prState.chartYears;

  const modeElem = document.getElementById("pr-mode");
  const mode = modeElem ? modeElem.value : "Einzel";
  const isTeam = mode === "Mannschaft";

  const rule = prGetRule();
  const isIntl = rule === "International";

  if (!seriesEntries.length || !years || !years.length) {
    chart.data.labels = [];
    chart.data.datasets = [];
    if (chart.options && chart.options.scales && chart.options.scales.sum) {
      chart.options.scales.sum.display = false;
    }
    chart.update();
    prShowChartPlaceholder(true);
    prRebuildYearTableFromState();
    return;
  }

  chart.data.labels = years.slice();

  // einzelne Disziplinen auf linker Achse
  const datasets = seriesEntries.map(s => ({
    label: s.label,
    data: s.data,
    yAxisID: "y",
    borderWidth: 2,
    pointRadius: 3,
    fill: false,
    cubicInterpolationMode: "monotone"
  }));

  // Summenlinie nur, wenn mind. 2 Disziplinen aktiv
  let hasSum = false;
  let sumLabel = "";

  if (seriesEntries.length >= 2) {
    const sumData = [];

    for (let i = 0; i < years.length; i++) {
      const values = seriesEntries
        .map(s => (typeof s.data[i] === "number" ? s.data[i] : 0))
        .filter(v => v > 0);

      let sumVal = 0;
      if (isTeam) {
        // Mannschaft: alle Disziplinen
        sumVal = values.reduce((a, b) => a + b, 0);
      } else {
        // Einzel: national = Top3, international = Top4
        const sorted = values.slice().sort((a, b) => b - a);
        const k = isIntl ? 4 : 3;
        sumVal = sorted.slice(0, k).reduce((a, b) => a + b, 0);
      }

      if (sumVal > 0) {
        const max = isTeam ? 4200 : (isIntl ? 4200 : 3200);
        const clamped = Math.min(max, sumVal);
        sumData.push(parseFloat(clamped.toFixed(2)));
      } else {
        sumData.push(0);
      }
    }

    sumLabel = isTeam
      ? "Summe (alle 4)"
      : (isIntl ? "Summe (Top 4)" : "Summe (Top 3)");

    datasets.push({
      label: sumLabel,
      data: sumData,
      yAxisID: "sum",
      borderWidth: 2,
      pointRadius: 3,
      borderDash: [5, 4],
      fill: false,
      cubicInterpolationMode: "monotone"
    });

    hasSum = true;
  }

  chart.data.datasets = datasets;

  // rechte Achse konfigurieren
  if (chart.options && chart.options.scales && chart.options.scales.sum) {
    const sumScale = chart.options.scales.sum;
    sumScale.display = hasSum;
    if (isTeam) {
      sumScale.max = 4200;
    } else {
      sumScale.max = isIntl ? 4200 : 3200;
    }
    if (sumLabel) {
      sumScale.title.text = sumLabel;
    }
  }

  chart.update();
  prShowChartPlaceholder(false);
  prRebuildYearTableFromState();
}
function prRebuildChartFromState() {
  const chart = prState.chart;
  if (!chart) return;

  const seriesEntries = Object.values(prState.chartSeries);
  const years = prState.chartYears;

  const modeElem = document.getElementById("pr-mode");
  const mode = modeElem ? modeElem.value : "Einzel";
  const isTeam = mode === "Mannschaft";

  const rule = prGetRule();
  const isIntl = rule === "International";

  if (!seriesEntries.length || !years || !years.length) {
    chart.data.labels = [];
    chart.data.datasets = [];
    if (chart.options && chart.options.scales && chart.options.scales.sum) {
      chart.options.scales.sum.display = false;
    }
    chart.update();
    prShowChartPlaceholder(true);
    prRebuildYearTableFromState();
    return;
  }

  chart.data.labels = years.slice();

  // einzelne Disziplinen auf linker Achse
  const datasets = seriesEntries.map(s => ({
    label: s.label,
    data: s.data,
    yAxisID: "y",
    borderWidth: 2,
    pointRadius: 3,
    fill: false,
    cubicInterpolationMode: "monotone"
  }));

  // Summenlinie nur, wenn mind. 2 Disziplinen aktiv
  let hasSum = false;
  let sumLabel = "";

  if (seriesEntries.length >= 2) {
    const sumData = [];

    for (let i = 0; i < years.length; i++) {
      const values = seriesEntries
        .map(s => (typeof s.data[i] === "number" ? s.data[i] : 0))
        .filter(v => v > 0);

      let sumVal = 0;
      if (isTeam) {
        // Mannschaft: alle Disziplinen
        sumVal = values.reduce((a, b) => a + b, 0);
      } else {
        // Einzel: national = Top3, international = Top4
        const sorted = values.slice().sort((a, b) => b - a);
        const k = isIntl ? 4 : 3;
        sumVal = sorted.slice(0, k).reduce((a, b) => a + b, 0);
      }

      if (sumVal > 0) {
        const max = isTeam ? 4200 : (isIntl ? 4200 : 3200);
        const clamped = Math.min(max, sumVal);
        sumData.push(parseFloat(clamped.toFixed(2)));
      } else {
        sumData.push(0);
      }
    }

    sumLabel = isTeam
      ? "Summe (alle 4)"
      : (isIntl ? "Summe (Top 4)" : "Summe (Top 3)");

    datasets.push({
      label: sumLabel,
      data: sumData,
      yAxisID: "sum",
      borderWidth: 2,
      pointRadius: 3,
      borderDash: [5, 4],
      fill: false,
      cubicInterpolationMode: "monotone"
    });

    hasSum = true;
  }

  chart.data.datasets = datasets;

  // rechte Achse konfigurieren
  if (chart.options && chart.options.scales && chart.options.scales.sum) {
    const sumScale = chart.options.scales.sum;
    sumScale.display = hasSum;
    if (isTeam) {
      sumScale.max = 4200;
    } else {
      sumScale.max = isIntl ? 4200 : 3200;
    }
    if (sumLabel) {
      sumScale.title.text = sumLabel;
    }
  }

  chart.update();
  prShowChartPlaceholder(false);
  prRebuildYearTableFromState();
}




function prRebuildYearTableFromState() {
  const table = document.getElementById("pr-year-table");
  if (!table) return;

  table.innerHTML = "";

  const years = prState.chartYears;
  const seriesList = Object.values(prState.chartSeries);

  const modeElem = document.getElementById("pr-mode");
  const mode = modeElem ? modeElem.value : "Einzel";
  const isTeam = mode === "Mannschaft";

  const rule = prGetRule();
  const isIntl = rule === "International";

  if (!years || !years.length || !seriesList.length) {
    const tbody = document.createElement("tbody");
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = "Noch keine Daten – bitte Zeiten eingeben.";
    td.colSpan = 2;
    tr.appendChild(td);
    tbody.appendChild(tr);
    table.appendChild(tbody);
    return;
  }

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const thYear = document.createElement("th");
  thYear.textContent = "Jahr";
  headRow.appendChild(thYear);

  seriesList.forEach(s => {
    const th = document.createElement("th");
    th.textContent = s.label;
    headRow.appendChild(th);
  });

  const thSum = document.createElement("th");
  thSum.textContent = isTeam
    ? "Summe (alle 4)"
    : (isIntl ? "Summe (Top 4)" : "Summe (Top 3)");
  headRow.appendChild(thSum);

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const tr = document.createElement("tr");

    const tdYear = document.createElement("td");
    tdYear.textContent = year;
    tr.appendChild(tdYear);

    const valuesThisYear = [];

    seriesList.forEach(s => {
      const vRaw = typeof s.data[i] === "number" && isFinite(s.data[i]) ? s.data[i] : 0;
      const v = Math.max(0, vRaw);
      valuesThisYear.push(v);

      const td = document.createElement("td");
      td.textContent = v > 0 ? v.toFixed(2).replace(".", ",") : "0,00";
      tr.appendChild(td);
    });

    let sum;
    if (isTeam) {
      sum = valuesThisYear.filter(x => x > 0).reduce((a, b) => a + b, 0);
    } else {
      const positives = valuesThisYear.filter(x => x > 0).sort((a, b) => b - a);
      const k = isIntl ? 4 : 3;
      sum = positives.slice(0, k).reduce((a, b) => a + b, 0);
    }

    const tdSum = document.createElement("td");
    tdSum.textContent = sum > 0 ? sum.toFixed(2).replace(".", ",") : "0,00";
    tr.appendChild(tdSum);

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
}





// Punkteverlauf über die Jahre: 2007–heute
// - Jahre ohne eigene Datei (z.B. 2017, 2024) nutzen die Tabelle des letzten vorhandenen Jahres
// - Wenn für eine Disziplin in einem Jahr kein Rekord gefunden wird,
//   wird der Rekord des letzten Jahres verwendet (falls vorhanden).
// - Wenn es in frühen Jahren noch keinen Rekord gibt, werden diese Jahre
//   nachträglich mit dem ersten bekannten Rekordwert aufgefüllt.
async function prGetPointsOverYears(mode, ak, gender, discipline, timeSec) {
  const startYear = 2007;
  const endYear   = new Date().getFullYear();

  const years = [];
  const data  = [];

  let lastWorkbookYear = null;   // letztes Jahr, für das wir ein Workbook hatten
  let lastWorkbook     = null;   // das dazugehörige Workbook
  let lastRecSec       = null;   // letzte gefundene Rekordzeit für genau diese Disziplin
  let anyRec           = false;  // mindestens ein Jahr mit sinnvoller Rekordzeit gefunden?

  for (let year = startYear; year <= endYear; year++) {
    let sourceYear = year;
    const ext = prGetExtForYear(year);

    if (!ext) {
      // kein eigenes File (z.B. 2017, 2024) → auf letztes vorhandenes Jahr zurückfallen
      if (lastWorkbookYear == null) {
        // noch keine Datei vorhanden → Jahr erstmal mit 0 aufnehmen
        years.push(year);
        data.push(0);
        continue;
      }
      sourceYear = lastWorkbookYear;
    }

    // Workbook holen, ggf. aus Cache
    let wb;
    if (sourceYear === lastWorkbookYear && lastWorkbook) {
      wb = lastWorkbook;
    } else {
      wb = await prEnsureYearWorkbook(sourceYear);
      if (!wb) {
        years.push(year);
        data.push(0);
        continue;
      }
      lastWorkbook     = wb;
      lastWorkbookYear = sourceYear;
    }

    const sheet = wb.Sheets[mode];
    if (!sheet) {
      years.push(year);
      data.push(0);
      continue;
    }

    // Rekordzeit in genau diesem Jahr suchen
    let recSec = prFindGermanRecordTime(sheet, mode, ak, gender, discipline);

    if (recSec == null) {
      // keine spezifische Rekordzeit für dieses Jahr → letzte bekannte verwenden
      if (lastRecSec == null) {
        years.push(year);
        data.push(0);
        continue;
      }
      recSec = lastRecSec;
    } else {
      lastRecSec = recSec;
      anyRec = true;
    }

    const pts = prCalcNationalPoints(timeSec, recSec);
    years.push(year);
    data.push(pts);
  }

  // Wenn es gar keinen Rekord für diese Disziplin gibt → Serie weglassen
  if (!anyRec) return [];

  // *** NEU: führende Jahre ohne Rekord (0 Punkte) mit erstem positiven Wert auffüllen ***
  const firstPosIndex = data.findIndex(v => v > 0);
  if (firstPosIndex > 0) {
    const firstValue = data[firstPosIndex];
    for (let i = 0; i < firstPosIndex; i++) {
      data[i] = firstValue;
    }
  }

  return years.map((year, idx) => ({
    year,
    points: data[idx]
  }));
}






async function prUpdateChartForRow(tr) {
  const canvas = document.getElementById("pr-points-chart");
  if (!canvas || !prState.chart) return;

  const input = tr.querySelector(".pr-time-input");
  if (!input) return;

  const modeElem = document.getElementById("pr-mode");
  const ageElem = document.getElementById("pr-age");
  const genderElem = document.getElementById("pr-gender");
  if (!modeElem || !ageElem || !genderElem) return;

  const mode = modeElem.value;
  const ak = ageElem.value;
  const gender = genderElem.value;

  const disciplineId = tr.dataset.disciplineId;
  const discList = prGetDisciplines(mode, ak);
  const discipline = discList.find(d => d.id === disciplineId);
  if (!discipline) return;

  const timeSec = prParseTimeString(input.value);

  // Eingabe leer/ungültig → Serie dieser Disziplin entfernen
  if (!input.value || !isFinite(timeSec) || timeSec <= 0) {
    delete prState.chartSeries[disciplineId];
    delete prState.chartRowRequests[disciplineId];
    prRebuildChartFromState();
    return;
  }

  // Async-Request-ID für diese Disziplin
  const reqId = ++prState.chartRequestId;
  prState.chartRowRequests[disciplineId] = reqId;

  const series = await prGetPointsOverYears(mode, ak, gender, discipline, timeSec);

  // Zwischenzeitlich neuere Anfrage für diese Disziplin?
  if (prState.chartRowRequests[disciplineId] !== reqId) {
    return;
  }

  if (!series.length) {
    delete prState.chartSeries[disciplineId];
    prRebuildChartFromState();
    return;
  }

  const years = series.map(d => d.year);
  const data = series.map(d => {
    if (!isFinite(d.points)) return null;
    const clamped = Math.max(0, Math.min(1100, d.points));
    return parseFloat(clamped.toFixed(2));   // 2 Nachkommastellen
  });



  // gemeinsame X-Achse festlegen – alle Serien nutzen dieselbe Year-Liste
  prState.chartYears = years;


  // Beschriftung der Legende: Disziplin + AK + Geschlecht (kurz)
  const label = `${discipline.label} (${ak} ${gender.startsWith("w") ? "w" : "m"})`;

  prState.chartSeries[disciplineId] = {
    label,
    years,
    data
  };

  prRebuildChartFromState();
}

