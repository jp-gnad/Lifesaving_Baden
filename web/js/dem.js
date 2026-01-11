// ================================
// Konfiguration
// ================================
const EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test%20(1).xlsx";
const SHEET_NAME = "Tabelle2";

// 0-basierte Indizes (A=0, B=1, ...)
const COLS = {
  gender: 0, // A
  name: 1, // B
  zeit_100_lifesaver: 3, // D
  zeit_50_retten: 4, // E
  zeit_200_super: 5, // F
  zeit_100_kombi: 6, // G
  zeit_100_retten_flossen: 7, // H
  zeit_200_hindernis: 8, // I
  excelDatum: 9, // J
  meet_name: 10, // K
  yy2: 11, // L
  ortsgruppe: 12, // M
  landesverband: 13, // N
  poollaenge: 21, // V
  regelwerk: 25, // Z
};

// Qualifikationszeitraum inkl. Enddatum
const QUALI_START = new Date(2025, 0, 1); // 2025-01-01
const QUALI_END = new Date(2026, 3, 1); // 2026-04-01 (inkl.)

// Disziplinen (Reihenfolge wie bisher)
const DISCIPLINES = [
  { key: "tow", label: "100m Lifesaver", col: COLS.zeit_100_lifesaver },
  { key: "carry50", label: "50m Retten", col: COLS.zeit_50_retten },
  { key: "super", label: "200m Super-Lifesaver", col: COLS.zeit_200_super },
  { key: "kombi", label: "100m Kombi", col: COLS.zeit_100_kombi },
  { key: "carry100", label: "100m Retten mit Flossen", col: COLS.zeit_100_retten_flossen },
  { key: "obstacle", label: "200m Hindernis", col: COLS.zeit_200_hindernis },
];

// Tabellen-Sets
const TABLES = [
  { gender: "w", ak: "U17",  title: "U17 – Weiblich" },
  { gender: "m", ak: "U17",  title: "U17 – Männlich" },

  { gender: "w", ak: "U19",  title: "U19 – Weiblich" },
  { gender: "m", ak: "U19",  title: "U19 – Männlich" },

  { gender: "w", ak: "Offen", title: "Offen – Weiblich" },
  { gender: "m", ak: "Offen", title: "Offen – Männlich" },
];


// ================================
// Page init
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Deutsche Einzelstrecken Meisterschaften</h1>
    </section>

    <section class="updates">
      <h2>Aktuelles</h2>
      <div id="pflichtzeiten-root" class="pz-root">
        <p id="pflichtzeiten-status" class="pz-statusline">Lade Pflichtzeiten aus Excel …</p>
      </div>
    </section>
  `;

  renderPflichtzeitenTables6().catch((err) => {
    console.error(err);
    const status = document.getElementById("pflichtzeiten-status");
    if (status) status.textContent = "Fehler beim Laden/Verarbeiten der Excel-Datei.";
  });
});

// ================================
// Hauptlogik
// ================================
async function renderPflichtzeitenTables6() {
  if (typeof XLSX === "undefined") {
    throw new Error("XLSX ist nicht geladen. Bitte XLSX CDN Script einbinden.");
  }

  const root = document.getElementById("pflichtzeiten-root");
  const status = document.getElementById("pflichtzeiten-status");
  if (!root) return;

  const people = await loadAndProcessPeople();

  if (status) status.remove();
  root.innerHTML = "";
  root.classList.add("pz-grid");

  for (const t of TABLES) {
    const list = people
      .filter((p) => p.gender === t.gender && p.altersklasse === t.ak)
      .sort(personSort);

    root.appendChild(buildTableBlock(t.title, list));
  }
}

// ================================
// Excel -> Personen aggregieren (Bestzeiten + Pflichtzeiten-Filter)
// ================================
async function loadAndProcessPeople() {
  const res = await fetch(EXCEL_URL, { mode: "cors" });
  if (!res.ok) throw new Error(`Excel Download fehlgeschlagen: ${res.status}`);

  const ab = await res.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Arbeitsblatt "${SHEET_NAME}" nicht gefunden.`);

  let rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  rows = rows.filter((r) => Array.isArray(r) && r.some((v) => String(v ?? "").trim() !== ""));

  // Header ggf. entfernen
  const g0 = normalizeGender(rows[0]?.[COLS.gender]);
  if (g0 !== "m" && g0 !== "w") rows = rows.slice(1);

  // Key -> personRec
  const dict = new Map();

  for (const row of rows) {
    const lv = String(row[COLS.landesverband] ?? "").trim().toUpperCase();
    if (lv !== "BA") continue;

    const nm = String(row[COLS.name] ?? "").trim();
    if (!nm) continue;

    const g = normalizeGender(row[COLS.gender]);
    if (g !== "m" && g !== "w") continue;

    const og = String(row[COLS.ortsgruppe] ?? "").trim();
    const birthYear = normalizeBirthYear(String(row[COLS.yy2] ?? "").trim());
    if (!birthYear) continue;

    const wkDate = tryParseExcelDate(row[COLS.excelDatum]);
    if (!wkDate) continue;
    if (wkDate < QUALI_START || wkDate > endOfDay(QUALI_END)) continue;

    const compName = String(row[COLS.meet_name] ?? "").trim();
    const key = `${nm}|${g}|${og}|${birthYear}`;

    const rec = dict.get(key) ?? initPersonRec({ name: nm, gender: g, ortsgruppe: og, birthYear });

    // Bestzeiten aktualisieren
    for (let i = 0; i < DISCIPLINES.length; i++) {
      const colIdx = DISCIPLINES[i].col;
      updateBest(rec, i, row[colIdx], compName);
    }

    dict.set(key, rec);
  }

  // Nur Personen mit mind. 1 erreichter Pflichtzeit (<= PZ2)
  const people = [];
  for (const rec of dict.values()) {
    rec.altersklasse = altersklasseText(rec.birthYear);

    const pz = getPflichtzeiten(rec.birthYear, rec.gender);
    if (!pz) continue;

    const { pz1Count, pz2Count, qualifies } = computePZCounts(rec, pz);
    if (!qualifies) continue;

    rec.pz1Count = pz1Count;
    rec.pz2Count = pz2Count;
    rec._pz = pz; // cache für Rendering
    people.push(rec);
  }

  return people;
}

// ================================
// Rendering
// ================================
function buildTableBlock(title, list) {
  const wrap = document.createElement("section");
  wrap.className = "pz-block";

  const h3 = document.createElement("h3");
  h3.className = "pz-title";
  h3.textContent = title;
  wrap.appendChild(h3);

  const table = document.createElement("table");
  table.className = "pz-table";

  // HEAD
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  const th1 = document.createElement("th");
  th1.textContent = "Name / Gliederung";
  const th2 = document.createElement("th");
  th2.textContent = "Status";
  th2.className = "pz-th-status";
  trh.appendChild(th1);
  trh.appendChild(th2);
  thead.appendChild(trh);
  table.appendChild(thead);

  // BODY
  const tbody = document.createElement("tbody");

  if (list.length === 0) {
    const trEmpty = document.createElement("tr");
    const tdEmpty = document.createElement("td");
    tdEmpty.colSpan = 2;
    tdEmpty.className = "pz-empty";
    tdEmpty.textContent = "Keine Einträge.";
    trEmpty.appendChild(tdEmpty);
    tbody.appendChild(trEmpty);
  } else {
    list.forEach((rec, idx) => {
      const mainRow = document.createElement("tr");
      mainRow.className = "pz-row";
      mainRow.tabIndex = 0;
      mainRow.setAttribute("aria-expanded", "false");

      // Name/Gliederung cell
      const tdLeft = document.createElement("td");
      const person = document.createElement("div");
      person.className = "pz-person";


      const cap = document.createElement("img");
      cap.className = "pz-cap";
      cap.alt = "";
      cap.loading = "lazy";
      cap.src = capSrcFromOrtsgruppe(rec.ortsgruppe);
      cap.addEventListener("error", () => {
        cap.src = "./svg/Cap-Baden_light.svg";
      });

      const text = document.createElement("div");
      text.className = "pz-person-text";

      const nameLine = document.createElement("div");
      nameLine.className = "pz-name";
      nameLine.textContent = `${rec.name} (${yearLabel2(rec.birthYear)})`;

      const ogLine = document.createElement("div");
      ogLine.className = "pz-og";
      ogLine.textContent = rec.ortsgruppe || "";

      text.appendChild(nameLine);
      text.appendChild(ogLine);

      person.appendChild(cap);
      person.appendChild(text);

      tdLeft.appendChild(person);

      // Status cell: 6 Punkte (PZ1=grün, danach PZ2=gelb, Rest grau)
      const tdRight = document.createElement("td");
      tdRight.className = "pz-status";

      const dots = document.createElement("div");
      dots.className = "pz-dots";
      dots.setAttribute(
        "aria-label",
        `Status: ${rec.pz1Count}x PZ1, ${rec.pz2Count}x PZ2`
      );

      const total = 6;
      const pz1 = Math.max(0, Math.min(rec.pz1Count || 0, total));
      const pz2 = Math.max(0, Math.min(rec.pz2Count || 0, total - pz1));

      for (let i = 0; i < total; i++) {
        const dot = document.createElement("span");
        dot.className = "pz-dot";

        if (i < pz1) dot.classList.add("is-pz1");
        else if (i < pz1 + pz2) dot.classList.add("is-pz2");
        else dot.classList.add("is-none");

        dots.appendChild(dot);
      }

      tdRight.appendChild(dots);


      mainRow.appendChild(tdLeft);
      mainRow.appendChild(tdRight);

      // Detail row (collapsed)
      const detailRow = document.createElement("tr");
      // Zeilenfärbung nach Status:
      // mind. 1x PZ1 => grün, sonst (nur PZ2) => gelb
      if (rec.pz1Count > 0) {
        mainRow.classList.add("has-pz1");
        detailRow.classList.add("has-pz1");
      } else if (rec.pz2Count > 0) {
        mainRow.classList.add("has-pz2");
        detailRow.classList.add("has-pz2");
      }

      detailRow.className = "pz-detail";
      const detailTd = document.createElement("td");
      detailTd.colSpan = 2;

      const detailWrap = document.createElement("div");
      detailWrap.className = "pz-detail-wrap";

      // Detail lines: nur Disziplinen anzeigen, die PZ1 oder PZ2 sind
      let shown = 0;

      // 1) Sammeln (nur PZ1/PZ2)
      const reached = [];
      for (let i = 0; i < DISCIPLINES.length; i++) {
        const best = rec.best[i];
        const level = disciplineLevel(best, rec._pz, i); // "PZ1" | "PZ2" | "—"
        if (level === "PZ1" || level === "PZ2") {
          reached.push({ i, level, best });
        }
      }

      // 2) Sortieren: PZ1 oben, PZ2 unten (Disziplin-Reihenfolge bleibt)
      const prio = { PZ1: 0, PZ2: 1 };
      reached.sort((a, b) => {
        const pa = prio[a.level] ?? 9;
        const pb = prio[b.level] ?? 9;
        if (pa !== pb) return pa - pb;
        return a.i - b.i; // innerhalb gleicher Stufe: Original-Reihenfolge
      });

      // 3) Rendern
      for (const item of reached) {
        const i = item.i;
        const best = item.best;
        const level = item.level;

        const line = document.createElement("div");
        line.className = "pz-detail-line";

        const left = document.createElement("div");
        left.className = "pz-detail-left";

        const disc = document.createElement("div");
        disc.className = "pz-detail-discipline";
        disc.textContent = DISCIPLINES[i].label;

        const meta = document.createElement("div");
        meta.className = "pz-detail-meta";
        meta.textContent = `${best.text}  |  ${best.comp || "—"}`;

        left.appendChild(disc);
        left.appendChild(meta);

        const right = document.createElement("div");
        right.className = "pz-detail-right";

        const badge = document.createElement("span");
        badge.className = "pz-badge";
        badge.textContent = level;
        badge.classList.add(level === "PZ1" ? "is-pz1" : "is-pz2");

        right.appendChild(badge);

        line.appendChild(left);
        line.appendChild(right);

        detailWrap.appendChild(line);
      }


      detailTd.appendChild(detailWrap);
      detailRow.appendChild(detailTd);

      // Click/Key toggle
      const toggle = () => {
        const isOpen = mainRow.classList.toggle("is-open");
        detailRow.classList.toggle("is-open", isOpen);
        mainRow.setAttribute("aria-expanded", String(isOpen));
      };

      mainRow.addEventListener("click", toggle);
      mainRow.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });

      tbody.appendChild(mainRow);
      tbody.appendChild(detailRow);
    });
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function capSrcFromOrtsgruppe(ortsgruppe) {
  const og = String(ortsgruppe ?? "").trim();
  if (!og) return "./svg/Cap-Baden_light.svg";
  // Ortsgruppe kann Leerzeichen enthalten -> URL-Encode
  return `./svg/Cap-${encodeURIComponent(og)}.svg`;
}

function disciplineLevel(best, pz, idx) {
  if (!pz || !best || !(best.centi < 99999999)) return "—";
  if (best.centi <= pz.PZ1[idx]) return "PZ1";
  if (best.centi <= pz.PZ2[idx]) return "PZ2";
  return "—";
}

// ================================
// Sortierung
// ================================
function personSort(a, b) {
  // 1) Mehr PZ1 nach oben
  if ((b.pz1Count ?? 0) !== (a.pz1Count ?? 0)) {
    return (b.pz1Count ?? 0) - (a.pz1Count ?? 0);
  }

  // 2) Bei Gleichstand: mehr PZ2 nach oben
  if ((b.pz2Count ?? 0) !== (a.pz2Count ?? 0)) {
    return (b.pz2Count ?? 0) - (a.pz2Count ?? 0);
  }

  // 3) Tie-Breaker: Name, dann Ortsgruppe (damit Reihenfolge stabil bleibt)
  const nameCmp = (a.name || "").localeCompare(b.name || "", "de");
  if (nameCmp !== 0) return nameCmp;

  return (a.ortsgruppe || "").localeCompare(b.ortsgruppe || "", "de");
}


// ================================
// Datenmodell + Parsing
// ================================
function initPersonRec({ name, gender, ortsgruppe, birthYear }) {
  return {
    name,
    gender,
    ortsgruppe,
    birthYear,
    altersklasse: "",
    pz1Count: 0,
    pz2Count: 0,
    _pz: null,
    best: Array.from({ length: 6 }, () => ({
      centi: 99999999,
      text: "",
      comp: "",
    })),
  };
}

function updateBest(rec, dIdx, timeVal, compName) {
  const t = String(timeVal ?? "").trim();
  if (!t) return;

  const centi = timeTextToCenti(t);
  if (centi <= 0) return;

  if (centi < rec.best[dIdx].centi) {
    rec.best[dIdx] = { centi, text: t, comp: compName || "" };
  }
}

function computePZCounts(rec, pz) {
  let pz1Count = 0;
  let pz2Count = 0;
  let qualifies = false;

  for (let i = 0; i < 6; i++) {
    const best = rec.best[i];
    if (!(best.centi < 99999999)) continue;

    if (best.centi <= pz.PZ1[i]) {
      pz1Count += 1;
      qualifies = true;
    } else if (best.centi <= pz.PZ2[i]) {
      pz2Count += 1;
      qualifies = true;
    }
  }
  return { pz1Count, pz2Count, qualifies };
}

function normalizeGender(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "m" || s.startsWith("m")) return "m";
  if (s === "w" || s.startsWith("w")) return "w";
  return "";
}

function normalizeBirthYear(yTxt) {
  const s = String(yTxt ?? "").trim();
  if (!s) return 0;
  if (!/^\d+$/.test(s)) return 0;

  const y = Number(s);
  if (y >= 1900 && y <= 2099) return y;

  if (y >= 0 && y <= 99) {
    const yyNow = new Date().getFullYear() % 100;
    return y <= yyNow ? 2000 + y : 1900 + y;
  }
  return 0;
}

function tryParseExcelDate(v) {
  if (v === null || v === undefined || v === "") return null;

  if (v instanceof Date && !isNaN(v.getTime())) return v;

  if (typeof v === "number" && isFinite(v) && v > 1) {
    const ms = Date.UTC(1899, 11, 30) + Math.round(v) * 86400 * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const s = String(v).trim();
  if (!s) return null;

  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yyyy = Number(m[3]);
    const d = new Date(yyyy, mm, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  const d2 = new Date(s);
  return isNaN(d2.getTime()) ? null : d2;
}

function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function timeTextToCenti(s) {
  try {
    let t = String(s ?? "").trim();
    if (!t) return -1;

    t = t.replace(".", ",");
    const parts = t.split(":");
    if (parts.length !== 2) return -1;

    const mm = Number(parts[0]);
    if (!isFinite(mm)) return -1;

    const secParts = parts[1].split(",");
    const ss = Number(secParts[0]);
    if (!isFinite(ss)) return -1;

    let cc = 0;
    if (secParts.length >= 2) {
      let cctxt = String(secParts[1]);
      if (cctxt.length === 1) cctxt = cctxt + "0";
      if (cctxt.length > 2) cctxt = cctxt.slice(0, 2);
      cc = Number(cctxt);
      if (!isFinite(cc)) cc = 0;
    }

    return (mm * 60 + ss) * 100 + cc;
  } catch {
    return -1;
  }
}

function yearLabel2(birthYear) {
  return String(birthYear % 100).padStart(2, "0");
}

function altersklasseText(birthYear) {
  if (birthYear <= 2007) return "Offen";
  if (birthYear === 2008 || birthYear === 2009) return "U19";
  if (birthYear === 2010 || birthYear === 2011) return "U17";
  return "Unbekannt";
}

// Pflichtzeiten wie VBA (PZ1/PZ2 in Hundertstel)
function getPflichtzeiten(birthYear, gender) {
  const grp = altersklasseText(birthYear);
  const g = String(gender).toLowerCase();
  if (grp !== "Offen" && grp !== "U19" && grp !== "U17") return null;
  if (g !== "m" && g !== "w") return null;

  const PZ1 = new Array(6);
  const PZ2 = new Array(6);

  // Offen (= AK)
  if (grp === "Offen" && g === "w") {
    PZ1[0] = timeTextToCenti("1:06,39"); PZ2[0] = timeTextToCenti("1:10,37");
    PZ1[1] = timeTextToCenti("0:39,01"); PZ2[1] = timeTextToCenti("0:41,35");
    PZ1[2] = timeTextToCenti("2:45,76"); PZ2[2] = timeTextToCenti("2:55,71");
    PZ1[3] = timeTextToCenti("1:26,91"); PZ2[3] = timeTextToCenti("1:32,12");
    PZ1[4] = timeTextToCenti("1:02,56"); PZ2[4] = timeTextToCenti("1:06,31");
    PZ1[5] = timeTextToCenti("2:34,86"); PZ2[5] = timeTextToCenti("2:44,15");
    return { PZ1, PZ2 };
  }
  if (grp === "Offen" && g === "m") {
    PZ1[0] = timeTextToCenti("0:55,14"); PZ2[0] = timeTextToCenti("0:58,45");
    PZ1[1] = timeTextToCenti("0:31,53"); PZ2[1] = timeTextToCenti("0:33,39");
    PZ1[2] = timeTextToCenti("2:18,92"); PZ2[2] = timeTextToCenti("2:27,26");
    PZ1[3] = timeTextToCenti("1:08,19"); PZ2[3] = timeTextToCenti("1:12,28");
    PZ1[4] = timeTextToCenti("0:50,08"); PZ2[4] = timeTextToCenti("0:53,08");
    PZ1[5] = timeTextToCenti("2:15,44"); PZ2[5] = timeTextToCenti("2:23,57");
    return { PZ1, PZ2 };
  }

  if (grp === "U19" && g === "w") {
    PZ1[0] = timeTextToCenti("1:11,15"); PZ2[0] = timeTextToCenti("1:15,42");
    PZ1[1] = timeTextToCenti("0:40,65"); PZ2[1] = timeTextToCenti("0:43,57");
    PZ1[2] = timeTextToCenti("2:51,87"); PZ2[2] = timeTextToCenti("3:02,18");
    PZ1[3] = timeTextToCenti("1:26,42"); PZ2[3] = timeTextToCenti("1:31,61");
    PZ1[4] = timeTextToCenti("1:07,50"); PZ2[4] = timeTextToCenti("1:11,55");
    PZ1[5] = timeTextToCenti("2:42,85"); PZ2[5] = timeTextToCenti("2:52,62");
    return { PZ1, PZ2 };
  }
  if (grp === "U19" && g === "m") {
    PZ1[0] = timeTextToCenti("1:02,93"); PZ2[0] = timeTextToCenti("1:06,71");
    PZ1[1] = timeTextToCenti("0:34,20"); PZ2[1] = timeTextToCenti("0:35,92");
    PZ1[2] = timeTextToCenti("2:33,88"); PZ2[2] = timeTextToCenti("2:43,72");
    PZ1[3] = timeTextToCenti("1:15,50"); PZ2[3] = timeTextToCenti("1:20,03");
    PZ1[4] = timeTextToCenti("0:56,99"); PZ2[4] = timeTextToCenti("1:00,41");
    PZ1[5] = timeTextToCenti("2:23,90"); PZ2[5] = timeTextToCenti("2:32,53");
    return { PZ1, PZ2 };
  }

  if (grp === "U17" && g === "w") {
    PZ1[0] = timeTextToCenti("1:13,87"); PZ2[0] = timeTextToCenti("1:17,25");
    PZ1[1] = timeTextToCenti("0:41,59"); PZ2[1] = timeTextToCenti("0:43,60");
    PZ1[2] = timeTextToCenti("3:00,51"); PZ2[2] = timeTextToCenti("3:12,71");
    PZ1[3] = timeTextToCenti("1:31,33"); PZ2[3] = timeTextToCenti("1:40,14");
    PZ1[4] = timeTextToCenti("1:09,55"); PZ2[4] = timeTextToCenti("1:13,85");
    PZ1[5] = timeTextToCenti("2:38,99"); PZ2[5] = timeTextToCenti("2:49,55");
    return { PZ1, PZ2 };
  }
  if (grp === "U17" && g === "m") {
    PZ1[0] = timeTextToCenti("1:06,47"); PZ2[0] = timeTextToCenti("1:10,59");
    PZ1[1] = timeTextToCenti("0:37,12"); PZ2[1] = timeTextToCenti("0:39,24");
    PZ1[2] = timeTextToCenti("2:43,70"); PZ2[2] = timeTextToCenti("2:58,98");
    PZ1[3] = timeTextToCenti("1:23,90"); PZ2[3] = timeTextToCenti("1:29,88");
    PZ1[4] = timeTextToCenti("1:01,72"); PZ2[4] = timeTextToCenti("1:05,67");
    PZ1[5] = timeTextToCenti("2:25,58"); PZ2[5] = timeTextToCenti("2:36,57");
    return { PZ1, PZ2 };
  }

  return null;
}
