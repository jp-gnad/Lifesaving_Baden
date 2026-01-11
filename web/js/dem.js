const DATA_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test%20(1).xlsx";
const DATA_SHEET = "Tabelle2";

const CONFIG_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx";
const CONFIG_SHEET = "DEM";
const CONFIG_TABLE_NAME = "DEM_konfig";

const DATA_COLS = {
  gender: 0,
  name: 1,
  zeit_100_lifesaver: 3,
  zeit_50_retten: 4,
  zeit_200_super: 5,
  zeit_100_kombi: 6,
  zeit_100_retten_flossen: 7,
  zeit_200_hindernis: 8,
  excelDatum: 9,
  meet_name: 10,
  yy2: 11,
  ortsgruppe: 12,
  landesverband: 13,
  poollaenge: 21,
  regelwerk: 22,
};

const DISCIPLINES = [
  { key: "ret50", label: "50m Retten", dataCol: DATA_COLS.zeit_50_retten },
  { key: "ret100", label: "100m Retten", dataCol: DATA_COLS.zeit_100_retten_flossen },
  { key: "kombi100", label: "100m Kombi", dataCol: DATA_COLS.zeit_100_kombi },
  { key: "life100", label: "100m Lifesaver", dataCol: DATA_COLS.zeit_100_lifesaver },
  { key: "super200", label: "200m Super-Lifesaver", dataCol: DATA_COLS.zeit_200_super },
  { key: "hind200", label: "200m Hindernis", dataCol: DATA_COLS.zeit_200_hindernis },
];

const PZ_COLS = {
  pz1: {
    ret50: "PZ1 - 50m Retten",
    ret100: "PZ1 - 100m Retten",
    kombi100: "PZ1 - 100m Kombi",
    life100: "PZ1 - 100m Lifesaver",
    super200: "PZ1 - 200m Super-Lifesaver",
    hind200: "PZ1 - 200m Hindernis",
  },
  pz2: {
    ret50: "PZ2 - 50m Retten",
    ret100: "PZ2 - 100m Retten",
    kombi100: "PZ2 - 100m Kombi",
    life100: "PZ2 - 100m Lifesaver",
    super200: "PZ2 - 200m Super-Lifesaver",
    hind200: "PZ2 - 200m Hindernis",
  },
};

let PZ_CONFIGS = [];
let PZ_DATA_ROWS = [];
let PZ_MOUNT = null;

let PZ_PAGER_WIRED = false;
const PZ_TABLE_STATE = new Map();

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

  PZ_MOUNT = document.getElementById("pflichtzeiten-root");

  renderAllFromExcel().catch((err) => {
    console.error(err);
    const status = document.getElementById("pflichtzeiten-status");
    if (status) status.textContent = "Fehler beim Laden/Verarbeiten der Excel-Dateien.";
  });
});

async function renderAllFromExcel() {
  if (typeof XLSX === "undefined") {
    throw new Error("XLSX ist nicht geladen. Bitte XLSX CDN Script einbinden.");
  }
  if (!PZ_MOUNT) return;

  const status = document.getElementById("pflichtzeiten-status");
  if (status) status.textContent = "Lade Konfiguration …";

  const cfgWb = XLSX.read(await (await fetch(CONFIG_EXCEL_URL, { cache: "no-store" })).arrayBuffer(), {
    type: "array",
    cellDates: true,
  });

  const wsCfg = cfgWb.Sheets[CONFIG_SHEET];
  if (!wsCfg) throw new Error(`Arbeitsblatt "${CONFIG_SHEET}" nicht gefunden.`);

  const cfgRows = XLSX.utils.sheet_to_json(wsCfg, { header: 1, raw: true, defval: "", blankrows: false });
  console.log("cfgRows[0..15]:", cfgRows.slice(0, 15));
  const hi = findHeaderRowIndex(cfgRows);
  console.log("headerIdx:", hi);
  if (hi >= 0) console.log("headerRow:", cfgRows[hi]);

  PZ_CONFIGS = parseConfigsFromRows(cfgRows);

  if (!PZ_CONFIGS.length) {
    if (status) status.textContent = "Keine Konfigurationen gefunden.";
    return;
  }

  if (status) status.textContent = "Lade Daten …";

  const dataWb = XLSX.read(await (await fetch(DATA_EXCEL_URL, { cache: "no-store" })).arrayBuffer(), {
    type: "array",
    cellDates: true,
  });

  const wsData = dataWb.Sheets[DATA_SHEET];
  if (!wsData) throw new Error(`Arbeitsblatt "${DATA_SHEET}" nicht gefunden.`);

  let rows = XLSX.utils.sheet_to_json(wsData, { header: 1, raw: true, defval: "", blankrows: false });
  rows = rows.filter((r) => Array.isArray(r) && r.some((v) => String(v ?? "").trim() !== ""));

  const g0 = normalizeGender(rows[0]?.[DATA_COLS.gender]);
  const d0 = String(rows[0]?.[DATA_COLS.excelDatum] ?? "").toLowerCase();
  const startIdx =
    g0.includes("gender") || g0.includes("geschlecht") || d0.includes("datum") ? 1 : 0;

  PZ_DATA_ROWS = rows.slice(startIdx);

  if (status) status.remove();

  PZ_MOUNT.classList.add("pz-grid");
  renderTablesIntoMount();

  if (!PZ_PAGER_WIRED) {
    PZ_PAGER_WIRED = true;

    PZ_MOUNT.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-table]");
      if (!btn) return;

      const tableId = btn.dataset.table;
      const action = btn.dataset.action;
      const pageAttr = btn.dataset.page;

      const cfg = PZ_CONFIGS.find((x) => x.id === tableId);
      if (!cfg) return;

      const fullList = buildPeopleForConfig(PZ_DATA_ROWS, cfg).sort(personSort);

      const pageSize = Math.max(1, Number(cfg.pageSize || 5));
      const maxPage = getMaxPage(fullList, pageSize);

      let page = PZ_TABLE_STATE.get(tableId) || 1;

      if (action === "prev") page = clamp(page - 1, 1, maxPage);
      else if (action === "next") page = clamp(page + 1, 1, maxPage);
      else if (pageAttr) {
        const p = Number(pageAttr);
        if (Number.isFinite(p)) page = clamp(p, 1, maxPage);
      }

      PZ_TABLE_STATE.set(tableId, page);
      renderTablesIntoMount();
    });
  }
}

function renderTablesIntoMount() {
  if (!PZ_MOUNT) return;

  PZ_MOUNT.innerHTML = "";

  const colW = document.createElement("div");
  const colM = document.createElement("div");

  for (const cfg of PZ_CONFIGS) {
    const fullList = buildPeopleForConfig(PZ_DATA_ROWS, cfg).sort(personSort);
    const block = buildTableBlock(cfg, fullList);
    if (cfg.gender === "w") colW.appendChild(block);
    else colM.appendChild(block);
  }

  if (colW.childElementCount) PZ_MOUNT.appendChild(colW);
  if (colM.childElementCount) PZ_MOUNT.appendChild(colM);

  if (!colW.childElementCount && !colM.childElementCount) {
    const p = document.createElement("p");
    p.className = "pz-empty";
    p.textContent = "Keine Einträge.";
    PZ_MOUNT.appendChild(p);
  }
}

function parseConfigsFromRows(rows) {
  const headerIdx = findHeaderRowIndex(rows);
  if (headerIdx < 0) return [];

  const header = rows[headerIdx].map((x) => String(x ?? "").trim());
  const col = buildHeaderMap(header);

  const out = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !Array.isArray(r)) continue;

    const tableName = getCell(r, col, "Tabellen Name");
    const gender = normalizeGender(getCell(r, col, "Geschlecht"));
    if (!tableName || (gender !== "m" && gender !== "w")) continue;

    const minAge = parseIntSafe(getCell(r, col, "Mindest Alter"));
    const maxAge = parseIntSafe(getCell(r, col, "Maximales Alter"));

    const qualiStart = tryParseExcelDate(getCellRaw(r, col, "Qualizeitraum anfang"));
    const qualiEnd = tryParseExcelDate(getCellRaw(r, col, "Qualizeitraum Ende"));
    if (!qualiStart || !qualiEnd) continue;

    const lastActive = tryParseExcelDate(getCellRaw(r, col, "Letzter Wettkampf am"));

    const lv = String(getCell(r, col, "Landesverband") ?? "").trim().toUpperCase();
    const omsRaw = String(getCell(r, col, "OMS") ?? "").trim().toLowerCase();
    const omsFilter = omsRaw === "ja" || omsRaw === "true" || omsRaw === "1";

    const poolLength = String(getCell(r, col, "Pool-Länge") ?? "").trim();
    const rulebook = normalizeRulebook(getCell(r, col, "Regelwerk"));

    const pageSize = parseIntSafe(getCell(r, col, "Seiten Anzahl"));
    const seasonYear = qualiEnd.getFullYear();

    const pz1 = {};
    const pz2 = {};
    for (const d of DISCIPLINES) {
      const h1 = PZ_COLS.pz1[d.key];
      const h2 = PZ_COLS.pz2[d.key];
      const v1 = getCellRaw(r, col, h1);
      const v2 = getCellRaw(r, col, h2);
      pz1[d.key] = parseExcelTimeToCentiOrNull(v1);
      pz2[d.key] = parseExcelTimeToCentiOrNull(v2);
    }

    const id = `cfg-${out.length + 1}-${slug(String(tableName))}-${gender}`;

    out.push({
      id,
      title: String(tableName).trim(),
      gender,
      minAge: Number.isFinite(minAge) ? minAge : null,
      maxAge: Number.isFinite(maxAge) ? maxAge : null,
      qualiStart,
      qualiEnd,
      lastActive: lastActive || null,
      lv: lv || "",
      omsFilter,
      poolLength,
      rulebook,
      pageSize: Number.isFinite(pageSize) ? pageSize : 5,
      seasonYear,
      pz1,
      pz2,
    });
  }

  return out;
}

function findHeaderRowIndex(rows) {
  const needed = ["Tabellen Name", "Geschlecht", "Qualizeitraum anfang", "Qualizeitraum Ende"];
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const r = rows[i];
    if (!Array.isArray(r)) continue;
    const set = new Set(r.map((x) => normHeader(x)));
    const ok = needed.every((h) => set.has(normHeader(h)));
    if (ok) return i;
  }
  return -1;
}

function buildHeaderMap(headerRow) {
  const m = new Map();
  for (let i = 0; i < headerRow.length; i++) {
    const key = normHeader(headerRow[i]);
    if (key) m.set(key, i);
  }
  return m;
}

function getCell(row, map, headerName) {
  const idx = map.get(normHeader(headerName));
  if (idx === undefined) return "";
  return row[idx] ?? "";
}

function getCellRaw(row, map, headerName) {
  const idx = map.get(normHeader(headerName));
  if (idx === undefined) return null;
  return row[idx];
}

function normHeader(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function slug(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function buildPeopleForConfig(rows, cfg) {
  const dict = new Map();

  const qualiStart = cfg.qualiStart;
  const qualiEnd = cfg.qualiEnd;
  const endInc = endOfDay(qualiEnd);

  for (const row of rows) {
    if (!row) continue;

    const lv = String(row[DATA_COLS.landesverband] ?? "").trim().toUpperCase();
    if (cfg.lv && lv !== cfg.lv) continue;

    const g = normalizeGender(row[DATA_COLS.gender]);
    if (g !== cfg.gender) continue;

    const nm = String(row[DATA_COLS.name] ?? "").trim();
    if (!nm) continue;

    const birthYear = normalizeBirthYear(String(row[DATA_COLS.yy2] ?? "").trim());
    if (!birthYear) continue;

    const wkDate = tryParseExcelDate(row[DATA_COLS.excelDatum]);
    if (!wkDate) continue;
    if (wkDate < qualiStart || wkDate > endInc) continue;

    const compName = String(row[DATA_COLS.meet_name] ?? "").trim();
    if (cfg.omsFilter && compName.toUpperCase().startsWith("OMS-")) continue;

    if (cfg.poolLength !== "") {
      const pl = normalizePoolLength(row[DATA_COLS.poollaenge]);
      if (pl !== Number(cfg.poolLength)) continue;
    }

    if (cfg.rulebook !== "") {
      const want = String(cfg.rulebook).trim().toLowerCase();
      const rw = normalizeRulebook(row[DATA_COLS.regelwerk]);
      if (rw !== want) continue;
    }

    const og = String(row[DATA_COLS.ortsgruppe] ?? "").trim();

    const key = `${nm}|${g}|${birthYear}`;
    const rec = dict.get(key) ?? initPersonRec({ name: nm, gender: g, ortsgruppe: og, birthYear });

    if (og) {
      if (!rec.lastStartDate || wkDate > rec.lastStartDate) {
        rec.ortsgruppe = og;
        rec.lastStartDate = wkDate;
        rec.lastStartComp = compName;
      }
    }

    for (let i = 0; i < DISCIPLINES.length; i++) {
      const colIdx = DISCIPLINES[i].dataCol;
      updateBest(rec, i, row[colIdx], compName);
    }

    dict.set(key, rec);
  }

  const people = [];
  for (const rec of dict.values()) {
    const age = cfg.seasonYear - rec.birthYear;
    if (cfg.minAge !== null && age < cfg.minAge) continue;
    if (cfg.maxAge !== null && age > cfg.maxAge) continue;

    if (cfg.lastActive) {
      if (!rec.lastStartDate || rec.lastStartDate.getTime() < cfg.lastActive.getTime()) continue;
    }

    const { pz1Count, pz2Count, qualifies } = computePZCountsFromConfig(rec, cfg);
    if (!qualifies) continue;

    rec.pz1Count = pz1Count;
    rec.pz2Count = pz2Count;
    rec._cfg = cfg;

    people.push(rec);
  }

  return people;
}

function buildTableBlock(cfg, fullList) {
  const wrap = document.createElement("section");
  wrap.className = "pz-block";

  const h3 = document.createElement("h3");
  h3.className = "pz-title";
  h3.textContent = cfg.title;
  wrap.appendChild(h3);

  const table = document.createElement("table");
  table.className = "pz-table";

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

  const tbody = document.createElement("tbody");

  const pageSize = Math.max(1, Number(cfg.pageSize || 5));
  const maxPage = getMaxPage(fullList, pageSize);
  const currentPage = clamp(PZ_TABLE_STATE.get(cfg.id) || 1, 1, maxPage);
  PZ_TABLE_STATE.set(cfg.id, currentPage);

  const start = (currentPage - 1) * pageSize;
  const list = fullList.slice(start, start + pageSize);

  if (list.length === 0) {
    const trEmpty = document.createElement("tr");
    const tdEmpty = document.createElement("td");
    tdEmpty.colSpan = 2;
    tdEmpty.className = "pz-empty";
    tdEmpty.textContent = "Keine Einträge.";
    trEmpty.appendChild(tdEmpty);
    tbody.appendChild(trEmpty);
  } else {
    list.forEach((rec) => {
      const mainRow = document.createElement("tr");
      mainRow.className = "pz-row";
      mainRow.tabIndex = 0;
      mainRow.setAttribute("aria-expanded", "false");

      const tdLeft = document.createElement("td");
      const person = document.createElement("div");
      person.className = "pz-person";

      const cap = document.createElement("img");
      cap.className = "pz-cap";
      cap.alt = "";
      cap.loading = "lazy";
      cap.decoding = "async";
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

      const tdRight = document.createElement("td");
      tdRight.className = "pz-status";

      const dots = document.createElement("div");
      dots.className = "pz-dots";
      dots.setAttribute("aria-label", `Status: ${rec.pz1Count}x PZ1, ${rec.pz2Count}x PZ2`);

      const total = DISCIPLINES.length;
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

      const detailRow = document.createElement("tr");
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

      const reached = [];
      for (let i = 0; i < DISCIPLINES.length; i++) {
        const best = rec.best[i];
        const level = disciplineLevelFromConfig(best, rec._cfg, DISCIPLINES[i].key);
        if (level === "PZ1" || level === "PZ2") {
          reached.push({ i, level, best });
        }
      }

      const prio = { PZ1: 0, PZ2: 1 };
      reached.sort((a, b) => {
        const pa = prio[a.level] ?? 9;
        const pb = prio[b.level] ?? 9;
        if (pa !== pb) return pa - pb;
        return a.i - b.i;
      });

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
  wrap.appendChild(renderPager(cfg.id, currentPage, maxPage));

  return wrap;
}

function renderPager(tableId, page, maxPage) {
  const nav = document.createElement("div");
  nav.className = "pz-pager";
  nav.setAttribute("role", "navigation");
  nav.setAttribute("aria-label", `Seitenwahl ${tableId}`);

  if (maxPage <= 1) return nav;

  const group = document.createElement("div");
  group.className = "pz-pager__group";

  const mkBtn = (txt, opts = {}) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pz-pager__btn" + (opts.active ? " is-active" : "");
    b.textContent = txt;
    b.dataset.table = tableId;

    if (opts.action) b.dataset.action = opts.action;
    if (opts.page) b.dataset.page = String(opts.page);
    if (opts.disabled) b.disabled = true;
    if (opts.ariaCurrent) b.setAttribute("aria-current", "page");
    if (opts.ariaLabel) b.setAttribute("aria-label", opts.ariaLabel);

    return b;
  };

  group.appendChild(mkBtn("‹", { action: "prev", disabled: page <= 1, ariaLabel: "Vorherige Seite" }));

  const items = getPagerItems(page, maxPage);
  for (const it of items) {
    if (it.type === "dots") {
      const sp = document.createElement("span");
      sp.className = "pz-pager__ellipsis";
      sp.textContent = "…";
      group.appendChild(sp);
      continue;
    }
    const isActive = it.page === page;
    group.appendChild(mkBtn(String(it.page), { page: it.page, active: isActive, ariaCurrent: isActive }));
  }

  group.appendChild(mkBtn("›", { action: "next", disabled: page >= maxPage, ariaLabel: "Nächste Seite" }));

  nav.appendChild(group);
  return nav;
}

function getMaxPage(list, pageSize) {
  const n = Array.isArray(list) ? list.length : 0;
  return Math.max(1, Math.ceil(n / pageSize));
}

function getPagerItems(current, max) {
  if (max <= 7) return Array.from({ length: max }, (_, i) => ({ type: "page", page: i + 1 }));
  const items = [];
  const addPage = (p) => items.push({ type: "page", page: p });
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

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function personSort(a, b) {
  if ((b.pz1Count ?? 0) !== (a.pz1Count ?? 0)) return (b.pz1Count ?? 0) - (a.pz1Count ?? 0);
  if ((b.pz2Count ?? 0) !== (a.pz2Count ?? 0)) return (b.pz2Count ?? 0) - (a.pz2Count ?? 0);

  const nameCmp = (a.name || "").localeCompare(b.name || "", "de");
  if (nameCmp !== 0) return nameCmp;
  return (a.ortsgruppe || "").localeCompare(b.ortsgruppe || "", "de");
}

function initPersonRec({ name, gender, ortsgruppe, birthYear }) {
  return {
    name,
    gender,
    ortsgruppe,
    birthYear,
    pz1Count: 0,
    pz2Count: 0,
    _cfg: null,
    lastStartDate: null,
    lastStartComp: "",
    best: Array.from({ length: DISCIPLINES.length }, () => ({
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

function computePZCountsFromConfig(rec, cfg) {
  let pz1Count = 0;
  let pz2Count = 0;
  let qualifies = false;

  for (let i = 0; i < DISCIPLINES.length; i++) {
    const dKey = DISCIPLINES[i].key;
    const best = rec.best[i];
    if (!(best.centi < 99999999)) continue;

    const t1 = cfg.pz1?.[dKey];
    const t2 = cfg.pz2?.[dKey];

    if (!Number.isFinite(t2)) continue;

    if (Number.isFinite(t1) && best.centi <= t1) {
      pz1Count += 1;
      qualifies = true;
    } else if (best.centi <= t2) {
      pz2Count += 1;
      qualifies = true;
    }
  }

  return { pz1Count, pz2Count, qualifies };
}

function disciplineLevelFromConfig(best, cfg, dKey) {
  if (!cfg || !best || !(best.centi < 99999999)) return "—";

  const t1 = cfg.pz1?.[dKey];
  const t2 = cfg.pz2?.[dKey];

  if (!Number.isFinite(t2)) return "—";
  if (Number.isFinite(t1) && best.centi <= t1) return "PZ1";
  if (best.centi <= t2) return "PZ2";
  return "—";
}

function capSrcFromOrtsgruppe(ortsgruppe) {
  const og = String(ortsgruppe ?? "").trim();
  if (!og) return "./svg/Cap-Baden_light.svg";
  const safe = og.replace(/[\/\\]/g, "-");
  return `./svg/Cap-${encodeURIComponent(safe)}.svg`;
}

function normalizePoolLength(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;

  const m = s.match(/(25|50)/);
  if (m) return Number(m[1]);

  if (typeof v === "number" && (v === 25 || v === 50)) return v;
  return null;
}

function normalizeRulebook(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "national") return "national";
  if (s === "international") return "international";
  if (s.startsWith("nat")) return "national";
  if (s.startsWith("inter")) return "international";
  return "";
}

function normalizeGender(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "m" || s.startsWith("m")) return "m";
  if (s === "w" || s.startsWith("w")) return "w";
  return "";
}

function parseIntSafe(v) {
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
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

function timeTextToCentiOrNull(s) {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const c = timeTextToCenti(t);
  return c > 0 ? c : null;
}

function parseExcelTimeToCentiOrNull(v) {
  if (v === null || v === undefined || v === "") return null;

  if (v instanceof Date && !isNaN(v.getTime())) {
    const h = v.getHours();
    const m = v.getMinutes();
    const s = v.getSeconds();
    const ms = v.getMilliseconds();
    return (h * 3600 + m * 60 + s) * 100 + Math.round(ms / 10);
  }

  if (typeof v === "number" && Number.isFinite(v)) {
    const frac = ((v % 1) + 1) % 1;
    return Math.round(frac * 86400 * 100);
  }

  const s = String(v).trim();
  if (!s) return null;
  const c = timeTextToCenti(s);
  return c > 0 ? c : null;
}

function timeTextToCenti(s) {
  try {
    let t = String(s ?? "").trim();
    if (!t) return -1;

    t = t.replace(".", ",");
    const parts = t.split(":");
    if (parts.length !== 2) return -1;

    const mm = Number(parts[0]);
    if (!Number.isFinite(mm)) return -1;

    const secParts = parts[1].split(",");
    const ss = Number(secParts[0]);
    if (!Number.isFinite(ss)) return -1;

    let cc = 0;
    if (secParts.length >= 2) {
      let cctxt = String(secParts[1]);
      if (cctxt.length === 1) cctxt = cctxt + "0";
      if (cctxt.length > 2) cctxt = cctxt.slice(0, 2);
      cc = Number(cctxt);
      if (!Number.isFinite(cc)) cc = 0;
    }

    return (mm * 60 + ss) * 100 + cc;
  } catch {
    return -1;
  }
}

function yearLabel2(birthYear) {
  return String(birthYear % 100).padStart(2, "0");
}
