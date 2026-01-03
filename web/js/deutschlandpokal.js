// =====================
// Nominierungsliste aus Excel (Ranking wie Screenshot)
// =====================

const EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test%20(1).xlsx";
const EXCEL_SHEET = "Tabelle2";

const COLS = {
  gender: 0, // A
  name: 1, // B
  zeit_100_lifesaver: 3, // D
  zeit_50_retten: 4, // E
  zeit_200_superlifesaver: 5, // F
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

const now = new Date();
const y = 2025
const m = now.getMonth() + 1; // 1..12

// Saisonjahr: Nov/Dez zählt schon zur Saison des nächsten Jahres
const SEASON_YEAR = (m >= 11) ? (y + 1) : y;

const CONFIG_DATES = {
  DATE_FROM: `${SEASON_YEAR - 1}-11-01`,
  DATE_TO: `${SEASON_YEAR}-10-31`,
  LAST_COMP_FROM: `${SEASON_YEAR}-01-01`,
};

// ---------------------
// Konfiguration
// ---------------------
const CONFIG = {
  PAGE_SIZE: 10, // Anzahl Zeilen pro Tabelle/Seite

  NOMINIERTEN_ANZAHL: 6,
  NACHRUECKER_ANZAHL: 2, // z.B. 5 Nachrücker
  KAMPF: 4, // 3 oder 4

  // optional (leer lassen = kein Filter)
  LANDESVERBAND: "BA", // z.B. "BA"
  OMS_ALLOWED: false,
  POOL: "", // "25" / "50" / ""
  REGELWERK: "", // z.B. "Mehrkampf" / "" (je nach Excel-Inhalt)

  // Referenzjahr für Alter/AK (typisch Quali-Jahr)
  REF_YEAR: 2025,

  DATE_FROM: CONFIG_DATES.DATE_FROM,
  DATE_TO: CONFIG_DATES.DATE_TO,
  LAST_COMP_FROM: CONFIG_DATES.LAST_COMP_FROM,


  AGE_MIN: 15,
  AGE_MAX: 50,

  DP_3KAMPF_RULE: true,

  ABSAGEN: [
    "Daniel Bittighofer",
    "Roland Konietzny",
    "Regina Blonski",
  ],


};

// ---------------------
// Weltrekorde (Open) – wie von dir gegeben
// Reihenfolge: 50 Retten, 100 Retten, 100 Kombi, 100 Lifesaver, 200 Super, 200 Hindernis
// ---------------------
const WR_OPEN = {
  w: {
    retten50: { text: "0:31,48", sec: timeToSeconds("0:31,48") },
    retten100: { text: "0:49,30", sec: timeToSeconds("0:49,30") },
    kombi100: { text: "1:03,69", sec: timeToSeconds("1:03,69") },
    lifesaver100: { text: "0:54,20", sec: timeToSeconds("0:54,20") },
    super200: { text: "2:16,07", sec: timeToSeconds("2:16,07") },
    hindernis200: { text: "2:01,88", sec: timeToSeconds("2:01,88") },
  },
  m: {
    retten50: { text: "0:27,20", sec: timeToSeconds("0:27,20") },
    retten100: { text: "0:43,29", sec: timeToSeconds("0:43,29") },
    kombi100: { text: "0:57,44", sec: timeToSeconds("0:57,44") },
    lifesaver100: { text: "0:47,68", sec: timeToSeconds("0:47,68") },
    super200: { text: "2:02,98", sec: timeToSeconds("2:02,98") },
    hindernis200: { text: "1:51,73", sec: timeToSeconds("1:51,73") },
  },
};

// Anzeige-Reihenfolge wie im Screenshot:
const DISCIPLINES = [
  {
    key: "lifesaver100",
    label: "100m Lifersver",
    wrKey: "lifesaver100",
    col: COLS.zeit_100_lifesaver,
  },
  { key: "retten50", label: "50m Retten", wrKey: "retten50", col: COLS.zeit_50_retten },
  {
    key: "super200",
    label: "200m Super-Lifesaver",
    wrKey: "super200",
    col: COLS.zeit_200_superlifesaver,
  },
  { key: "kombi100", label: "100m Kombi", wrKey: "kombi100", col: COLS.zeit_100_kombi },
  {
    key: "retten100",
    label: "100m Retten",
    wrKey: "retten100",
    col: COLS.zeit_100_retten_flossen, // Achtung: laut deiner Spaltenliste "100m Retten mit Flossen" in H
  },
  {
    key: "hindernis200",
    label: "200m Hindernis",
    wrKey: "hindernis200",
    col: COLS.zeit_200_hindernis,
  },
];

// ---------------------
// Public: Laden + Rendern
// ---------------------
async function loadNominierungslisteFromExcel() {
  const mount = document.getElementById("dp-list");
  if (!mount) return;

  mount.innerHTML = `<p class="info-status">Lade Nominierungsliste…</p>`;

  await ensureXlsxLoaded();

  const res = await fetch(EXCEL_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Excel konnte nicht geladen werden (${res.status})`);
  const buf = await res.arrayBuffer();

  const wb = window.XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[EXCEL_SHEET];
  if (!ws) throw new Error(`Arbeitsblatt "${EXCEL_SHEET}" nicht gefunden`);

  const rows = window.XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });

    const athletes = buildAthletes(rows);

    const females = athletes.filter((a) => a.gender === "w");
    const males = athletes.filter((a) => a.gender === "m");

    const femalesActive = females.filter(x => !x.absage).sort((a,b) => b.total - a.total);
    const femalesAbs = females.filter(x => x.absage).sort((a,b) => b.total - a.total);
    const malesActive = males.filter(x => !x.absage).sort((a,b) => b.total - a.total);
    const malesAbs = males.filter(x => x.absage).sort((a,b) => b.total - a.total);

    const femalesSorted = femalesActive.concat(femalesAbs);
    const malesSorted = malesActive.concat(malesAbs);

    // Rangnummern (nur für Nicht-Absagen) einmalig vergeben -> Top-N bleibt korrekt über alle Seiten
    assignActiveRanks(femalesSorted);
    assignActiveRanks(malesSorted);

    // Daten + State speichern
    NOM_DATA.w = femalesSorted;
    NOM_DATA.m = malesSorted;
    NOM_PAGE.w = 1;
    NOM_PAGE.m = 1;

    NOM_MOUNT = mount;

    renderNomTables();

    // Pager-Handler einmalig via Event-Delegation
    if (!NOM_PAGER_WIRED) {
      NOM_PAGER_WIRED = true;
      mount.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button[data-gender][data-action]");
        if (!btn) return;

        const g = btn.dataset.gender; // "w" oder "m"
        const action = btn.dataset.action; // "prev" / "next"
        const maxPage = getMaxPage(NOM_DATA[g], CONFIG.PAGE_SIZE);

        if (action === "prev") NOM_PAGE[g] = Math.max(1, NOM_PAGE[g] - 1);
        if (action === "next") NOM_PAGE[g] = Math.min(maxPage, NOM_PAGE[g] + 1);

        renderNomTables();
      });
    }


  mount.innerHTML = `
    <div class="nom-grid">
      <section class="nom-panel">
        <h3>Weiblich</h3>
        ${renderRankingTable(femalesSorted, "w")}
      </section>

      <section class="nom-panel">
        <h3>Männlich</h3>
        ${renderRankingTable(malesSorted, "m")}
      </section>
    </div>
  `;
}

// ---------------------
// Kernlogik: pro Person beste Zeiten sammeln, Punkte rechnen, Top3/Top4
// ---------------------
function buildAthletes(rows) {
  if (!rows || !rows.length) return [];

  // ggf. Headerzeile skippen (heuristisch)
  const r0 = rows[0] || [];
  const maybeHeader = String(r0[COLS.gender] ?? "").toLowerCase();
  const startIdx =
    maybeHeader.includes("gender") || maybeHeader.includes("geschlecht") ? 1 : 0;

  const byKey = new Map();

  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const gender = normalizeGender(r[COLS.gender]);
    if (gender !== "m" && gender !== "w") continue;

    const nameRaw = String(r[COLS.name] ?? "").trim();
    if (!nameRaw) continue;

    const yy2 = fmtYY2(r[COLS.yy2]); // "00" etc.
    const birthYear = birthYearFromYY2(yy2, CONFIG.REF_YEAR);
    const age = CONFIG.REF_YEAR - birthYear;

    if (Number.isFinite(CONFIG.AGE_MIN) && age < CONFIG.AGE_MIN) continue;
    if (Number.isFinite(CONFIG.AGE_MAX) && age > CONFIG.AGE_MAX) continue;

    const key = `${nameRaw}__${yy2}__${gender}`;

    // Filter (optional)
    if (CONFIG.LANDESVERBAND) {
      const lv = String(r[COLS.landesverband] ?? "").trim();
      if (lv !== CONFIG.LANDESVERBAND) continue;
    }

    if (!CONFIG.OMS_ALLOWED) {
      const meet = String(r[COLS.meet_name] ?? "");
      if (meet.startsWith("OMS")) continue;
    }

    if (CONFIG.POOL) {
      const pool = String(r[COLS.poollaenge] ?? "").trim();
      if (pool !== CONFIG.POOL) continue;
    }

    if (CONFIG.REGELWERK) {
      const rw = String(r[COLS.regelwerk] ?? "").trim();
      if (rw !== CONFIG.REGELWERK) continue;
    }

    const ortsgruppe = String(r[COLS.ortsgruppe] ?? "").trim();
    const meetName = String(r[COLS.meet_name] ?? "").trim();
    const bestDate = parseExcelDate(r[COLS.excelDatum]);

    let a = byKey.get(key);
    if (!a) {
      const birthYear = birthYearFromYY2(yy2, CONFIG.REF_YEAR);
      const age = CONFIG.REF_YEAR - birthYear;
      const ak = determineAKFromAge(age);

      a = {
        gender,
        name: `${nameRaw}${yy2 ? ` (${yy2})` : ""}`,
        ak: `${ak} - ${age}`,
        og: "",           
        ogDate: null,
        ogRowIndex: -1,
        yy2,
        birthYear,
        age,
        best: {}, // disKey -> {sec, timeText, meetName}
        points: {}, // disKey -> number
        total: 0,
        topFlags: {}, // disKey -> true wenn in Top3/Top4
        lastCompOk: false,
        baseName: nameRaw,
        absage: false,
      };
      byKey.set(key, a);
    }

    const rowDate = parseExcelDate(r[COLS.excelDatum]);

    // Ortsgruppe: immer die des letzten Eintrags (neueste Zeile nach Datum; bei Gleichstand spätere Sheet-Zeile)
    const ogCandidate = String(r[COLS.ortsgruppe] ?? "").trim();
    if (ogCandidate) {
      const newerByDate =
        rowDate && (!a.ogDate || rowDate.getTime() > a.ogDate.getTime());

      const sameDateButLaterRow =
        rowDate && a.ogDate && rowDate.getTime() === a.ogDate.getTime() && i > a.ogRowIndex;

      const noDateFallback =
        !rowDate && !a.ogDate && i > a.ogRowIndex;

      if (newerByDate || sameDateButLaterRow || noDateFallback) {
        a.og = ogCandidate;
        if (rowDate) a.ogDate = rowDate;
        a.ogRowIndex = i;
      }
    }


    if (Array.isArray(CONFIG.ABSAGEN) && CONFIG.ABSAGEN.length) {
      const display = `${nameRaw}${yy2 ? ` (${yy2})` : ""}`;
      a.absage = CONFIG.ABSAGEN.includes(nameRaw) || CONFIG.ABSAGEN.includes(display);
    }


    // lastComp-Check (unabhängig vom Qualizeitraum)
    if (CONFIG.LAST_COMP_FROM && rowDate) {
      const fromLC = new Date(CONFIG.LAST_COMP_FROM + "T00:00:00");
      const toLC = CONFIG.DATE_TO ? new Date(CONFIG.DATE_TO + "T23:59:59") : null;

      const inLastCompWindow = rowDate >= fromLC && (!toLC || rowDate <= toLC);
      if (inLastCompWindow) {
        if (!CONFIG.DP_3KAMPF_RULE) {
          a.lastCompOk = true;
        } else {
          const cnt = countValidDisciplinesInRow(r);
          if (cnt >= 3) a.lastCompOk = true;
        }
      }
    }

    // Qualizeitraum nur für Bestzeiten
    let inQualiWindow = true;
    if (CONFIG.DATE_FROM || CONFIG.DATE_TO) {
      if (!rowDate) {
        inQualiWindow = false; // kein Datum => nicht für Bestzeiten
      } else {
        if (CONFIG.DATE_FROM) {
          const fromQ = new Date(CONFIG.DATE_FROM + "T00:00:00");
          if (rowDate < fromQ) inQualiWindow = false;
        }
        if (CONFIG.DATE_TO) {
          const toQ = new Date(CONFIG.DATE_TO + "T23:59:59");
          if (rowDate > toQ) inQualiWindow = false;
        }
      }
    }

    if (!inQualiWindow) continue; // wichtig: lastComp wurde oben ggf. schon gesetzt




    // pro Disziplin beste Zeit suchen
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
          meetName: meetName,
          date: bestDate,
        };
      }
    }
  }

  // Punkte + Top3/Top4 + total
  const out = [];

  for (const a of byKey.values()) {
    if (CONFIG.LAST_COMP_FROM && !a.lastCompOk) continue;
    // Punkte je Disziplin
    const wr = WR_OPEN[a.gender];
    let nonZeroCount = 0;

    for (const dis of DISCIPLINES) {
      const best = a.best[dis.key];
      if (!best) {
        a.points[dis.key] = 0;
        continue;
      }

      const wrSec = wr[dis.wrKey]?.sec ?? 0;
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

    // mind. 3 Disziplinen
    if (nonZeroCount < 3) continue;

    // Top3/Top4 ermitteln
    const ptsArr = DISCIPLINES.map((d) => ({ key: d.key, v: a.points[d.key] || 0 }));
    ptsArr.sort((x, y) => y.v - x.v);

    const topCount = CONFIG.KAMPF === 4 ? 4 : 3;
    a.total = round2(ptsArr.slice(0, topCount).reduce((s, x) => s + x.v, 0));

    a.topFlags = {};
    for (let i = 0; i < topCount; i++) {
      if (ptsArr[i] && ptsArr[i].v > 0) a.topFlags[ptsArr[i].key] = true;
    }

    out.push(a);
  }

  return out;
}

// =====================
// UI / Render: kompakte Tabelle + aufklappbare Disziplin-Details
// =====================

let NOM_DATA = { w: [], m: [] };
let NOM_PAGE = { w: 1, m: 1 };
let NOM_MOUNT = null;
let NOM_UI_WIRED = false;

async function loadNominierungslisteFromExcel() {
  const mount = document.getElementById("dp-list");
  if (!mount) return;

  NOM_MOUNT = mount;
  mount.innerHTML = `<p class="info-status">Lade Nominierungsliste…</p>`;

  await ensureXlsxLoaded();

  const res = await fetch(EXCEL_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Excel konnte nicht geladen werden (${res.status})`);
  const buf = await res.arrayBuffer();

  const wb = window.XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[EXCEL_SHEET];
  if (!ws) throw new Error(`Arbeitsblatt "${EXCEL_SHEET}" nicht gefunden`);

  const rows = window.XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });

  const athletes = buildAthletes(rows);

  const females = athletes.filter((a) => a.gender === "w");
  const males = athletes.filter((a) => a.gender === "m");

  // Absagen ans Ende, jeweils Punkte DESC
  const femalesSorted = sortWithAbsagenLast(females);
  const malesSorted = sortWithAbsagenLast(males);

  // Rangnummern für Top-N nur über aktive (nicht-Absagen)
  assignActiveRanks(femalesSorted);
  assignActiveRanks(malesSorted);

  NOM_DATA.w = femalesSorted;
  NOM_DATA.m = malesSorted;
  NOM_PAGE.w = 1;
  NOM_PAGE.m = 1;

  renderNomTablesCompact();

  // Ein Listener für Pager + Row-Toggle (stabil bei re-render)
  if (!NOM_UI_WIRED) {
    NOM_UI_WIRED = true;

    // Wichtig: error bubbelt nicht -> capture=true
    document.addEventListener(
      "error",
      (ev) => {
        const el = ev.target;
        if (!(el instanceof HTMLImageElement)) return;
        if (!el.classList.contains("og-cap")) return;

        // verhindert Endlosschleife, falls auch Fallback fehlt
        if (el.dataset.fallbackDone === "1") return;

        el.dataset.fallbackDone = "1";
        el.src = CAP_FALLBACK_SRC;
      },
      true
    );


    mount.addEventListener("click", (ev) => {
      // Pagination Buttons
      const btn = ev.target.closest("button[data-gender][data-action]");
      if (btn) {
        const g = btn.dataset.gender;         // "w" / "m"
        const action = btn.dataset.action;     // "prev" / "next"
        const maxPage = getMaxPage(NOM_DATA[g], CONFIG.PAGE_SIZE);

        if (action === "prev") NOM_PAGE[g] = Math.max(1, NOM_PAGE[g] - 1);
        if (action === "next") NOM_PAGE[g] = Math.min(maxPage, NOM_PAGE[g] + 1);

        renderNomTablesCompact();
        return;
      }

      // Row Toggle
      const row = ev.target.closest("tr.athlete-row");
      if (!row) return;

      const details = row.nextElementSibling;
      if (!details || !details.classList.contains("athlete-details")) return;

      const isHidden = details.hasAttribute("hidden");
      if (isHidden) {
        details.removeAttribute("hidden");
        row.setAttribute("aria-expanded", "true");
      } else {
        details.setAttribute("hidden", "");
        row.setAttribute("aria-expanded", "false");
      }
    });
  }
}

function sortWithAbsagenLast(list) {
  const active = list.filter(x => !x.absage).sort((a, b) => b.total - a.total);
  const abs = list.filter(x => x.absage).sort((a, b) => b.total - a.total);
  return active.concat(abs);
}

function renderNomTablesCompact() {
  if (!NOM_MOUNT) return;

  const wMax = getMaxPage(NOM_DATA.w, CONFIG.PAGE_SIZE);
  const mMax = getMaxPage(NOM_DATA.m, CONFIG.PAGE_SIZE);

  NOM_PAGE.w = Math.min(NOM_PAGE.w, wMax);
  NOM_PAGE.m = Math.min(NOM_PAGE.m, mMax);

  NOM_MOUNT.innerHTML = `
    <div class="nom-grid">
      <section class="nom-panel">
        <h3>Weiblich</h3>
        ${renderCompactTablePaged(NOM_DATA.w, "w", NOM_PAGE.w, CONFIG.PAGE_SIZE)}
        ${renderPager("w", NOM_PAGE.w, wMax)}
      </section>

      <section class="nom-panel">
        <h3>Männlich</h3>
        ${renderCompactTablePaged(NOM_DATA.m, "m", NOM_PAGE.m, CONFIG.PAGE_SIZE)}
        ${renderPager("m", NOM_PAGE.m, mMax)}
      </section>
    </div>
  `;
}

function renderCompactTablePaged(fullList, gender, page, pageSize) {
  if (!fullList.length) return `<p class="info-status">Keine Einträge.</p>`;

  const start = (page - 1) * pageSize;
  const slice = fullList.slice(start, start + pageSize);

  return renderCompactTableSlice(slice, gender);
}

function renderCompactTableSlice(list, gender) {
  if (!list.length) return `<p class="info-status">Keine Einträge.</p>`;

  const titleKampf = `${CONFIG.KAMPF}-Kampf`;

  return `
    <div class="nom-table-wrap">
      <table class="nom-compact-table" role="table">
        <thead>
          <tr>
            <th class="col-empty"></th>
            <th class="col-person">Name / Gliederung</th>
            <th class="col-total">${escapeHtml(titleKampf)}</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(a => renderAthleteRow(a, gender)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAthleteRow(a, gender) {
  const r = a.rankActive;

  const isNominiert =
    !a.absage && r !== null && r < CONFIG.NOMINIERTEN_ANZAHL;

  const isNachruecker =
    !a.absage && r !== null &&
    r >= CONFIG.NOMINIERTEN_ANZAHL &&
    r < (CONFIG.NOMINIERTEN_ANZAHL + (CONFIG.NACHRUECKER_ANZAHL || 0));

  const rowClass =
    "athlete-row " +
    (isNominiert ? "nominiert " : "") +
    (isNachruecker ? "nachruecker " : "") +
    (a.absage ? "absage-row " : "") +
    (gender === "w" ? "w-row" : "m-row");


  const totalText = a.absage ? "Abgesagt" : `${fmtNumDE(a.total)} P`;

  // Details: Disziplinen mit Punkten>0, nach Punkten DESC
  const details = getDisciplineDetailsSorted(a);

  // Falls jemand keine Details hat (sollte selten), trotzdem klickbar – dann bleibt Details leer.
  const detailsHtml = details.length
    ? `
      <table class="nom-details-table" role="presentation">
        <tbody>
          ${details.map(d => `
            <tr class="detail-row ${d.counted ? "counted" : "noncount"}">
              <td class="d-main">
                <div class="d-dis">${escapeHtml(d.label)}</div>
                <div class="d-time">${escapeHtml(d.time)}</div>
              </td>
              <td class="d-meet">${escapeHtml(d.meet)}</td>
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

    <tr class="athlete-details" hidden>
      <td colspan="3">
        ${detailsHtml}
      </td>
    </tr>
  `;
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
      counted: !!a.topFlags?.[dis.key], // zählt im 3/4-Kampf => NICHT hell
    });
  }

  out.sort((x, y) => y.points - x.points);
  return out;
}

function renderPager(gender, page, maxPage) {
  const prevDisabled = page <= 1 ? "disabled" : "";
  const nextDisabled = page >= maxPage ? "disabled" : "";

  return `
    <div class="nom-pager" aria-label="Pagination ${gender}">
      <button type="button" data-gender="${gender}" data-action="prev" ${prevDisabled}>Zurück</button>
      <span>Seite ${page} / ${maxPage}</span>
      <button type="button" data-gender="${gender}" data-action="next" ${nextDisabled}>Weiter</button>
    </div>
  `;
}

// ranks + paging helpers (hast du im Prinzip schon – hier vollständig, damit es konsistent ist)
function assignActiveRanks(list) {
  let r = -1;
  for (const a of list) {
    if (!a.absage) {
      r++;
      a.rankActive = r;     // 0-basiert unter aktiven
    } else {
      a.rankActive = null;
    }
  }
}

function getMaxPage(list, pageSize) {
  const n = Array.isArray(list) ? list.length : 0;
  return Math.max(1, Math.ceil(n / pageSize));
}


// ---------------------
// Helfer
// ---------------------
const CAP_SVG_FOLDER = "./svg/";
const CAP_FALLBACK_SRC = CAP_SVG_FOLDER + "Cap-Baden_light.svg";

function capSrcForOrtsgruppe(og) {
  const raw = String(og ?? "").trim();

  // Schutz vor "/" "\" usw. (damit niemand Pfade „bauen“ kann)
  const safe = raw.replace(/[\/\\]/g, "-");

  // Dateiname: Cap-[Ortsgruppe].svg (URL-encoded, damit Leerzeichen/Umlaute funktionieren)
  return CAP_SVG_FOLDER + "Cap-" + encodeURIComponent(safe) + ".svg";
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

function assignActiveRanks(list) {
  let r = -1;
  for (const a of list) {
    if (!a.absage) {
      r++;
      a.rankActive = r;       // 0-basiert unter aktiven
    } else {
      a.rankActive = null;    // Absagen haben keinen aktiven Rang
    }
  }
}

function getMaxPage(list, pageSize) {
  const n = Array.isArray(list) ? list.length : 0;
  return Math.max(1, Math.ceil(n / pageSize));
}

function renderNomTables() {
  if (!NOM_MOUNT) return;

  const wMax = getMaxPage(NOM_DATA.w, CONFIG.PAGE_SIZE);
  const mMax = getMaxPage(NOM_DATA.m, CONFIG.PAGE_SIZE);

  // Clamp, falls Daten kleiner wurden
  NOM_PAGE.w = Math.min(NOM_PAGE.w, wMax);
  NOM_PAGE.m = Math.min(NOM_PAGE.m, mMax);

  NOM_MOUNT.innerHTML = `
    <div class="nom-grid">
      <section class="nom-panel">
        <h3>Weiblich</h3>
        ${renderRankingTablePaged(NOM_DATA.w, "w", NOM_PAGE.w, CONFIG.PAGE_SIZE)}
        ${renderPager("w", NOM_PAGE.w, wMax)}
      </section>

      <section class="nom-panel">
        <h3>Männlich</h3>
        ${renderRankingTablePaged(NOM_DATA.m, "m", NOM_PAGE.m, CONFIG.PAGE_SIZE)}
        ${renderPager("m", NOM_PAGE.m, mMax)}
      </section>
    </div>
  `;
}

function renderPager(gender, page, maxPage) {
  const prevDisabled = page <= 1 ? "disabled" : "";
  const nextDisabled = page >= maxPage ? "disabled" : "";

  return `
    <div class="nom-pager" aria-label="Pagination ${gender}">
      <button type="button" data-gender="${gender}" data-action="prev" ${prevDisabled}>Zurück</button>
      <span>Seite ${page} / ${maxPage}</span>
      <button type="button" data-gender="${gender}" data-action="next" ${nextDisabled}>Weiter</button>
    </div>
  `;
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

// Jahrhundert-Logik wie in deinem VBA: 00..99 + Referenzjahr
function birthYearFromYY2(yy2, refYear) {
  const yy = Number(yy2);
  if (!Number.isFinite(yy)) return refYear; // fallback
  let y = 2000 + yy;
  if (y > refYear) y -= 100; // Jahrhunderwechsel
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

function normalizeTimeCell(v) {
  if (v === null || v === undefined) return "";
  // Excel-Zeit als Zahl (Tagesanteil)
  if (typeof v === "number" && v > 0 && v < 1) {
    const sec = v * 24 * 3600;
    // zurück als String m:ss,cc (nur für Anzeige; für Bestzeit nutzen wir sec direkt unten)
    // hier geben wir lieber sec nicht als string zurück -> wir nutzen timeToSeconds auf string,
    // daher: formatieren:
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    const sTxt = s.toFixed(2).replace(".", ",").padStart(5, "0"); // "05,23"
    return `${m}:${sTxt}`;
  }
  return String(v).trim();
}

function timeToSeconds(text) {
  const t = String(text ?? "").trim();
  if (!t) return NaN;

  // "m:ss,cc" oder "ss,cc"
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
  // selten: "h:mm:ss" -> nicht erwartet, aber abfangen
  return NaN;
}

function calcPointsFromRatio(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  if (ratio >= 5) return 0;
  if (ratio >= 2) return 2000 / 3 - (400 / 3) * ratio;
  return 467 * ratio * ratio - 2001 * ratio + 2534;
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

function fmtNumDE(x) {
  return Number(x).toFixed(2).replace(".", ",");
}

function parseExcelDate(v) {
  if (!v) return null;

  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

  // Excel-Seriennummer
  const n = Number(v);
  if (Number.isFinite(n) && n > 20000 && n < 60000) {
    const ms = Math.round((n - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // deutsches Format: dd.mm.yyyy oder d.m.yyyy
  const s = String(v).trim();
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(s);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    let yy = Number(m[3]);
    if (yy < 100) yy += 2000; // falls mal 2-stellig
    const d = new Date(yy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Fallback (ISO o.ä.)
  const d2 = new Date(s);
  return Number.isNaN(d2.getTime()) ? null : d2;
}


function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// SheetJS Loader
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
              const justify =
                s.textPos === "top" ? "flex-start" : s.textPos === "center" ? "center" : "flex-end";
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

  document.querySelectorAll(".wide-carousel__badge").forEach((img) => {
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

  const goTo = (i) => {
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

  root.addEventListener("keydown", (e) => {
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
  return new Promise((resolve) => {
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
    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(
      dirPath
    )}?ref=${encodeURIComponent(cfg.branch)}`;

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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
