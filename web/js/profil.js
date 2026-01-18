
document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Athleten</h1>
    </section>

    <section id="athleten-container-section">
      <div id="athleten-container"></div>
    </section>
  `;
});



(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, props = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  };
  const hDiv = h;
  const PAGE_MODE = "profil";


  function renderAthleteName(name) {
    const full = (name || "").toString().trim();
    const idx = full.indexOf(" ");
    if (idx === -1) {
      return [full];
    }

    const first = full.slice(0, idx);   
    const rest  = full.slice(idx + 1); 

    return [
      h("span", { class: "name-first" }, first),
      " ",
      h("span", { class: "name-rest" }, rest)
    ];
  }

  function fitProfileName() {
    const h2 = document.querySelector(".ath-profile-title h2");
    if (!h2) {
      alignCapToName();
      return;
    }

    const rest = h2.querySelector(".name-rest");
    const vw   = window.innerWidth;

    h2.style.fontSize   = "";
    h2.style.whiteSpace = "";
    if (rest) rest.style.fontSize = "";

    if (vw > 720) {
      h2.style.whiteSpace = "nowrap";

      const computed = getComputedStyle(h2);
      let sizePx     = parseFloat(computed.fontSize) || 24;

      const rootComputed = getComputedStyle(document.documentElement);
      const rootPx       = parseFloat(rootComputed.fontSize) || 16;
      const minPx        = rootPx * 1.4;  

      const step = 0.5; 

      while (sizePx > minPx) {
        h2.style.fontSize = sizePx + "px";

        if (h2.scrollWidth <= h2.clientWidth + 0.5) {
          break;
        }
        sizePx -= step;
      }

      alignCapToName();
      return;
    }

    if (vw > 720) {
      alignCapToName();
      return;
    }

    if (!rest) {
      alignCapToName();
      return;
    }

    const computedRest = getComputedStyle(rest);
    let maxSizePx = parseFloat(computedRest.fontSize) || 20;
    const minSizePx = maxSizePx * 0.7;  
    let size = maxSizePx;
    const step = 0.5;

    while (size > minSizePx) {
      rest.style.fontSize = size + "px";

      const needWidth = rest.scrollWidth;
      const avail     = h2.clientWidth;

      if (needWidth <= avail) {
        break;
      }
      size -= step;
    }

    alignCapToName();
  }

  const HISTORIE_ICON_BASE = "png/historie";

  const HISTORIE_TOOLTIP = {
    DP: "Internationaler Deutschland-Pokal",
    JRP: "Junioren Rettungspokal",
    WM: "Weltmeisterschaft",
    EM: "Europameisterschaft",
    WG: "World Games",
  };

  function classifyHistorie(meet) {
    const raw = (meet.meet_name || meet.name || "");
    if (!raw) return null;

    const name = raw.toLowerCase();

    const hasWord = (token) => {
      const re = new RegExp(`\\b${token}\\b`, "i");
      return re.test(raw);
    };

    if (hasWord("wg") || name.includes("world-games")) {
      return "WG";
    }

    if (hasWord("wm") || name.includes("weltmeisterschaft")) {
      return "WM";
    }

    if (hasWord("em") || name.includes("europameisterschaft")) {
      return "EM";
    }

    if (hasWord("jrp")) {
      return "JRP";
    }

    if (hasWord("dp") || name.includes("deutsche meisterschaft")) {
      return "DP";
    }

    return null;
  }

  function getMeetYear(meet) {
    const dRaw = meet.date || meet.datum || meet.datum_raw;

    if (dRaw instanceof Date) {
      return dRaw.getFullYear();
    }
    if (typeof dRaw === "string" && dRaw.trim()) {
      const d = new Date(dRaw);
      if (!Number.isNaN(d.getTime())) return d.getFullYear();

      const m = dRaw.match(/\b(19|20)\d{2}\b/);
      if (m) return Number(m[0]);
    }
    if (typeof meet.jahr === "number") return meet.jahr;
    return null;
  }

  function renderhistorieInline(ax) {
    const meets = Array.isArray(ax.meets) ? ax.meets : [];
    if (!meets.length) return null;

    const buckets = {
      DP: new Set(),
      JRP: new Set(),
      WM: new Set(),
      EM: new Set(),
      WG: new Set(),
    };

    for (const meet of meets) {
      const cat = classifyHistorie(meet);
      if (!cat) continue;

      const year = getMeetYear(meet);
      if (!year) continue;

      const name = (meet.meet_name || meet.name || "").toLowerCase();

      let key;
      if (cat === "WM" || cat === "EM") {
        let kind = "other";
        if (name.includes("interclub")) kind = "interclub";
        else if (name.includes("national")) kind = "national";
        key = `${year}-${kind}`;
      } else {
        key = String(year);
      }

      buckets[cat].add(key);
    }

    const order = [
      { code: "WM", label: "Weltmeisterschaften" },
      { code: "EM", label: "Europameisterschaften" },
      { code: "WG", label: "World Games" },
      { code: "DP", label: "Deutschland-Pokale" },
      { code: "JRP", label: "Jugend-Rettungspokale" },
    ];

    const frag = document.createDocumentFragment();
    let any = false;

    for (const { code, label } of order) {
      const count = buckets[code].size;
      if (!count) continue;
      any = true;

      const wrap = h("span", { class: "historie-badge" });

      wrap.appendChild(
        h("span", { class: "historie-count" }, `${count}×`)
      );

      const info = HISTORIE_TOOLTIP[code] || label;

      wrap.appendChild(
        h("img", {
          class: `historie-icon historie-${code.toLowerCase()}`,
          src: `${HISTORIE_ICON_BASE}/${code}.png`,
          alt: `${info} (${count}×)`,
          title: info,
        })
      );

      frag.appendChild(wrap);
    }

    if (!any) return null;
    return frag;
  }

    function getAthleteIdFromUrl() {
  const sp = new URLSearchParams(window.location.search);
  const id = sp.get("ath");
  if (id) return String(id).trim();
  return "";
}

function openFromUrlIfPossible() {
  const id = getAthleteIdFromUrl();
  if (!id) return;

  if (!Array.isArray(AppState.athletes) || !AppState.athletes.length) return;

  const hit = AppState.athletes.find(a => String(a.id) === id);
  if (!hit) return;

  openProfile(hit);
}

  function alignCapToName() {
    const head = document.querySelector(".ath-profile-head");
    if (!head) return;

    const cap = head.querySelector(".cap-flip");
    const h2  = head.querySelector(".ath-profile-title h2");
    if (!cap || !h2) return;

    cap.style.setProperty("--cap-offset-y", "0px");

    const capRect  = cap.getBoundingClientRect();
    const nameRect = h2.getBoundingClientRect();

    const capCenter  = capRect.top  + capRect.height  / 2;
    const nameCenter = nameRect.top + nameRect.height / 2;

    const delta = nameCenter - capCenter;

    cap.style.setProperty("--cap-offset-y", `${delta}px`);
  }



  let nameFitHandlerInstalled = false;

  function installNameFitHandlerOnce() {
    if (nameFitHandlerInstalled) return;
    nameFitHandlerInstalled = true;
    window.addEventListener("resize", fitProfileName);
  }

  const FLAG_BASE_URL = "./svg";
  const CAP_FALLBACK_FILE = "Cap-Baden_light.svg";
  const CAP_FALLBACK_URL  = `${FLAG_BASE_URL}/${encodeURIComponent(CAP_FALLBACK_FILE)}`;

  const CapProbe = new Map();

  function probeCapFileExists(capFile){
    if (!capFile) return Promise.resolve(false);
    if (CapProbe.has(capFile)) return CapProbe.get(capFile);

    const url = `${FLAG_BASE_URL}/${encodeURIComponent(capFile)}`;
    const p = new Promise((resolve) => {
      const img = new Image();
      img.onload  = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

    CapProbe.set(capFile, p);
    return p;
  }

  function setCapWithCache(imgEl, capFile){
    imgEl.src = CAP_FALLBACK_URL;

    probeCapFileExists(capFile).then((ok) => {
      if (!ok) return;
      imgEl.src = `${FLAG_BASE_URL}/${encodeURIComponent(capFile)}`;
    });
  }

  const MIN_QUERY_LEN = 3;
  const EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test (1).xlsx";

  let AllMeetsByAthleteId = new Map();


  let xlsxScriptPromise = null;

  async function ensureXLSX() {
    if (window.XLSX) return;

    if (!xlsxScriptPromise) {
      xlsxScriptPromise = new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    await xlsxScriptPromise;
  }

  let workbookPromise = null;

  async function getWorkbook() {
    if (!workbookPromise) {
      workbookPromise = (async () => {
        await ensureXLSX();

        const url  = encodeURI(EXCEL_URL);
        const resp = await fetch(url, { mode: "cors" /*, cache: "no-store" */ });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const buf = await resp.arrayBuffer();
        const wb  = XLSX.read(buf, { type: "array" });
        return wb;
      })();
    }
    return workbookPromise;
  }


async function loadWorkbookArray(sheetName = "Tabelle2") {
  const wb = await getWorkbook();
  const ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
}

  const COLS = {
    gender: 0,              // A:
    name: 1,                // B
    lsc: 2,                 // C:
    z_100l: 3,              // D:
    z_50r: 4,               // E:
    z_200s: 5,              // F:
    z_100k: 6,              // G:
    z_100r: 7,              // H:
    z_200h: 8,              // I:
    excelDate: 9,           // J:
    meet_name: 10,          // K:
    yy2: 11,                // L:
    ortsgruppe: 12,         // M:
    LV_state: 13,           // N:
    p_mehrkampf: 14,        // O:
    p_100l: 15,             // P:
    p_50r: 16,              // Q:
    p_200s: 17,             // R:
    p_100k: 18,             // S:
    p_100r: 19,             // T:
    p_200h: 20,             // U:
    pool: 21,               // V:
    regelwerk: 22,          // W:
    land: 23,               // X:
    startrecht: 24,         // Y:
    wertung: 25,            // Z:
    vorlaeufe: 26,          // AA:
    BV_natio: 27,           // AB:
  };

  function excelSerialToISO(n){
    const num = Number(n);
    if (!Number.isFinite(num)) return "";
    const base = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(base.getTime() + num * 86400000);
    return d.toISOString().slice(0,10);
  }
  function normalizeRegelwerk(s){
    const t = String(s||"").toLowerCase();
    if (t.startsWith("nat")) return "National";
    if (t.startsWith("int")) return "International";
    return s || "";
  }
  function normalizeLand(x){
    const t = String(x||"").trim();
    if (!t) return "";
    if (t.toUpperCase() === "GER") return "Deutschland";
    return t;
  }
  function normalizePool(v){
    return (String(v).trim() === "25" || String(v).trim() === "50") ? String(v).trim() : "";
  }
  function normalizeStartrecht(s){
    const t = String(s||"").trim().toUpperCase();
    return (t==="OG"||t==="LV"||t==="BV"||t==="BZ") ? t : "";
  }
  function toNumOrBlank(v){
    const n = parseInt(String(v).replace(/[^\d\-]/g,""), 10);
    return Number.isFinite(n) ? String(n) : String(v||"").trim();
  }
  function parseTwoDigitYearWithMeetYear(twoDigit, meetISO){
    const yy = Number(twoDigit);
    const meetYear = Number((meetISO||"").slice(0,4));
    if (!Number.isFinite(yy) || !Number.isFinite(meetYear)) return null;
    let y = 1900 + yy;
    while (meetYear - y > 100) y += 100;
    return y;
  }
  function makeAthleteId(name, gender, birthYear){
    const base = (name||"").toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g,"-").replace(/[^a-z0-9\-]/g,"");
    const g = (String(gender||"").toLowerCase().startsWith("w")) ? "w" : "m";
    return `ath_${base}_${birthYear||"x"}_${g}`;
  }

  function mapRowToAthleteMinimal(row){
    const name   = String(row[COLS.name]||"").trim();
    const gender = String(row[COLS.gender]||"").trim();
    const iso    = excelSerialToISO(row[COLS.excelDate]);
    const yy2    = row[COLS.yy2];
    const by     = parseTwoDigitYearWithMeetYear(yy2, iso);
    const og     = String(row[COLS.ortsgruppe]||"").trim();

    return {
      id: makeAthleteId(name, gender, by),
      name,
      jahrgang: by,
      geschlecht: gender,
      ortsgruppe: og
    };
  }

  function mapRowToMeet(row){
    const iso  = excelSerialToISO(row[COLS.excelDate]);
    const meet = {
      meet_name: String(row[COLS.meet_name]||"").trim(),
      date: iso,
      pool: normalizePool(row[COLS.pool]),
      Ortsgruppe: String(row[COLS.ortsgruppe]||"").trim(),

      LV_state: String(row[COLS.LV_state] ?? "").trim(),

      BV_natio: String(row[COLS.BV_natio] ?? "").trim(),

      Regelwerk: normalizeRegelwerk(row[COLS.regelwerk]),
      Land: normalizeLand(row[COLS.land]),
      Startrecht: normalizeStartrecht(row[COLS.startrecht]),
      Wertung: String(row[COLS.wertung]||"").trim(),
      Vorläufe: String(row[COLS.vorlaeufe] ?? "").trim(),
      LSC: String(row[COLS.lsc] ?? "").toString().trim(),
      Mehrkampf_Platz: toNumOrBlank(row[COLS.p_mehrkampf]),
      "50m_Retten_Zeit": String(row[COLS.z_50r] ?? "").trim(),
      "50m_Retten_Platz": toNumOrBlank(row[COLS.p_50r]),
      "100m_Retten_Zeit": String(row[COLS.z_100r] ?? "").trim(),
      "100m_Retten_Platz": toNumOrBlank(row[COLS.p_100r]),
      "100m_Kombi_Zeit": String(row[COLS.z_100k] ?? "").trim(),
      "100m_Kombi_Platz": toNumOrBlank(row[COLS.p_100k]),
      "100m_Lifesaver_Zeit": String(row[COLS.z_100l] ?? "").trim(),
      "100m_Lifesaver_Platz": toNumOrBlank(row[COLS.p_100l]),
      "200m_SuperLifesaver_Zeit": String(row[COLS.z_200s] ?? "").trim(),
      "200m_SuperLifesaver_Platz": toNumOrBlank(row[COLS.p_200s]),
      "200m_Hindernis_Zeit": String(row[COLS.z_200h] ?? "").trim(),
      "200m_Hindernis_Platz": toNumOrBlank(row[COLS.p_200h])
    };
    return meet;
  }

    function pickBasisMeetPreferNat(meets, { staleNationalDays = 365 } = {}) {
      const list = Array.isArray(meets) ? meets : [];

      let bestNat = null;
      let bestInt = null;
      let bestAny = null;

      const isNewer = (d, idx, best) =>
        !best || d > best.d || (d.getTime() === best.d.getTime() && idx > best.idx);

      for (let i = 0; i < list.length; i++) {
        const m = list[i];
        if (!m) continue;

        const dStr = String(m.date || "").slice(0, 10);
        const d = new Date(dStr);
        if (isNaN(d.getTime())) continue;

        const rw = String(m.Regelwerk || "").toLowerCase().trim();
        const isNat = rw.startsWith("nat") || rw.startsWith("national");
        const isInt = rw.startsWith("int") || rw.startsWith("international");
        const kind  = isNat ? "nat" : (isInt ? "int" : "other");

        if (isNewer(d, i, bestAny)) bestAny = { d, idx: i, kind, m };

        const og = String(m.Ortsgruppe ?? m.ortsgruppe ?? "").trim();
        const lv = String(m.LV_state ?? m.lv_state ?? "").trim().toUpperCase();
        const bv = String(m.BV_natio ?? m.BV_nation ?? "").trim();

        const hasAff = !!(og || lv || bv);
        if (!hasAff) continue;

        if (isNat) {
          if (isNewer(d, i, bestNat)) bestNat = { d, idx: i, m };
        } else if (isInt) {
          if (isNewer(d, i, bestInt)) bestInt = { d, idx: i, m };
        }
      }

      if (!bestNat && !bestInt) return null;
      if (!bestNat) return bestInt.m;
      if (!bestInt) return bestNat.m;

      if (bestAny?.kind === "int") {
        const staleMs = staleNationalDays * 24 * 60 * 60 * 1000;
        const diffMs = bestAny.d.getTime() - bestNat.d.getTime(); // WICHTIG: relativ zum letzten internationalen Datum
        if (diffMs >= staleMs) {
          return bestInt.m;
        }
      }

      return bestNat.m;
    }


  function buildIndicesFromRows(rows){
    const minimalById = new Map();  
    const meetsById   = new Map(); 

    for (let i=0; i<rows.length; i++){
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const aMin = mapRowToAthleteMinimal(row);
      if (!aMin.name || aMin.jahrgang) {/* ok */}
      else continue;

      if (!minimalById.has(aMin.id)) {
        minimalById.set(aMin.id, aMin);
      }

      const meet = mapRowToMeet(row);
      if (!meetsById.has(aMin.id)) meetsById.set(aMin.id, []);
      meetsById.get(aMin.id).push(meet);
    }

    for (const [id, min] of minimalById.entries()) {
      const list = meetsById.get(id) || [];

      const basis = pickBasisMeetPreferNat(list);

      const lastOG = String(
        basis?.Ortsgruppe ??
        basis?.ortsgruppe ??
        min.ortsgruppe ??
        ""
      ).trim();

      const lv = String(basis?.LV_state ?? "").trim().toUpperCase();
      const bv = String(basis?.BV_natio ?? "").trim(); // bleibt roh, normalizeBVCode kommt später

      minimalById.set(id, {
        ...min,
        ortsgruppe: lastOG,
        LV_state: lv,
        BV_natio: bv
      });
    }


    AllMeetsByAthleteId = meetsById;

    const athletesLight = Array.from(minimalById.values());
    athletesLight.sort((l,r) => l.name.localeCompare(r.name, "de"));
    return athletesLight;
  }

  function countStartrechte(a){
    const c = { OG:0, BZ:0, LV:0, BV:0 };
    if (!Array.isArray(a?.meets)) return c;
    for (const m of a.meets){
      const sr = String(m?.Startrecht || "").toUpperCase();
      if (sr in c) c[sr] += 1;
    }
    return c;
  }

  function dismissKeyboard(){
    try{
      Refs.input?.blur();

      const ae = document.activeElement;
      if (ae && typeof ae.blur === "function") ae.blur();

      let trap = document.getElementById("kb-blur-trap");
      if (!trap){
        trap = document.createElement("input");
        trap.type = "text";
        trap.id = "kb-blur-trap";
        trap.tabIndex = -1;
        trap.autocomplete = "off";
        trap.style.position = "fixed";
        trap.style.opacity = "0";
        trap.style.pointerEvents = "none";
        trap.style.height = "0";
        trap.style.width  = "0";
        document.body.appendChild(trap);
      }
      trap.focus({ preventScroll: true });
      trap.blur();
    }catch(e){ /* no-op */ }
  }


  function buildTimeSeriesForDiscipline(a, discKey, opts = {}) {
    const dMeta = DISCIPLINES.find(d => d.key === discKey);
    if (!dMeta) return [];
    const jahrgang = Number(a?.jahrgang);
    if (!Number.isFinite(jahrgang)) return [];

    const lanesWanted = new Set(
      Array.isArray(opts.lanes) || (opts.lanes instanceof Set)
        ? Array.from(opts.lanes)
        : ["25","50"]
    );

    const meets = Array.isArray(a.meets) ? a.meets : [];
    const birth = new Date(`${jahrgang}-07-01T00:00:00Z`);
    const rows = [];

    for (const m of meets) {
      const dateISO = String(m?.date || "").slice(0,10);
      if (!dateISO) continue;
      const d = new Date(dateISO);
      if (isNaN(d)) continue;

      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      const laufMax = Number.isFinite(m?._lauf_max) ? m._lauf_max
                    : runs.reduce((mx,r)=>Math.max(mx, parseInt(r?._lauf || r?.Vorläufe || 1,10)||1), 1);

      for (const r of runs) {
        const lauf = parseInt((r?._lauf ?? r?.Vorläufe ?? 1), 10);
        const raw  = r?.[dMeta.meetZeit] ?? m?.[dMeta.meetZeit] ?? "";
        const sec  = parseTimeToSec(raw);
        if (!Number.isFinite(lauf) || !Number.isFinite(sec)) continue;

        const pool = String(r?.pool || m?.pool || "").trim();
        if (!lanesWanted.has(pool)) continue;

        const ageYears = (d - birth) / (365.2425*24*3600*1000);
        const age = Math.round(ageYears * 100) / 100;
        const meetName = String(m.meet_name || m.meet || "").replace(/\s+-\s+.*$/, "").trim();

        const rl = roundLabelFromLauf(lauf, laufMax);
        const showRound = (rl === "Vorlauf" || rl === "Finale") ? rl : "";

        rows.push({
          age,
          sec,
          date: dateISO,
          meet_name: meetName,
          lauf,
          lauf_max: laufMax,
          round: showRound,
          pool 
        });
      }
    }

    rows.sort((a,b) => (new Date(a.date) - new Date(b.date)) || (a.lauf - b.lauf));
    return rows;
  }

  function countStartsPerDisciplineAll(a){
    const meets = Array.isArray(a?.meets) ? a.meets : [];
    const out = {};
    for (const d of DISCIPLINES){ out[d.key] = 0; }

    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs){
        for (const d of DISCIPLINES){
          const v = run[d.meetZeit];
          if (v != null && String(v).trim() !== "") out[d.key] += 1;
        }
      }
    }
    return out;
  }

  function renderDisciplinePieCard(a){
    const counts = countStartsPerDisciplineAll(a);

    const ordered = DISCIPLINES.map(d => ({
      key: d.key,
      label: d.label,
      count: Number(counts[d.key] || 0)
    })).filter(x => x.count > 0);

    const total = ordered.reduce((s,x)=>s + x.count, 0);

    const card  = document.createElement("div");
    card.className = "ath-pie-card";

    const head = document.createElement("div");
    head.className = "pie-head";
    head.innerHTML = "<h4>Disziplin-Verteilung</h4>";
    card.appendChild(head);

    if (total === 0){
      const empty = document.createElement("div");
      empty.className = "best-empty";
      empty.textContent = "Noch keine Starts erfasst.";
      card.appendChild(empty);
      return card;
    }

    ordered.forEach(it => { it.pct = Math.round((it.count/total)*100); });

    const wrap = document.createElement("div");
    wrap.className = "pie-wrap";
    card.appendChild(wrap);

    const W = 360, H = 360, cx = W/2, cy = H/2;
    const R  = 140, r = 80;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class","pie-svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);

    function segPath(cx, cy, R, r, start, end){
      const large = end - start > Math.PI ? 1 : 0;
      const x0 = cx + R*Math.cos(start), y0 = cy + R*Math.sin(start);
      const x1 = cx + R*Math.cos(end),   y1 = cy + R*Math.sin(end);
      const x2 = cx + r*Math.cos(end),   y2 = cy + r*Math.sin(end);
      const x3 = cx + r*Math.cos(start), y3 = cy + r*Math.sin(start);
      return `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
    }

    const CLASS_MAP = {
      "50_retten":         "pie-c-200h",   
      "100_retten_flosse": "pie-c-100k", 
      "100_kombi":         "pie-c-100l",  
      "100_lifesaver":     "pie-c-200s",  
      "200_super":         "pie-c-50r",  
      "200_hindernis":     "pie-c-100rf"  
    };

    let angle = -Math.PI/2;
    ordered.forEach(it => {
      const sweep = (it.count/total) * Math.PI*2;
      if (sweep <= 0) return;
      const path  = document.createElementNS(svgNS, "path");
      path.setAttribute("d", segPath(cx,cy,R,r, angle, angle + sweep));
      path.setAttribute("class", `pie-slice ${CLASS_MAP[it.key] || ""}`);
      const title = document.createElementNS(svgNS, "title");
      title.textContent = `${it.label}: ${it.pct}% (${it.count})`;
      path.appendChild(title);
      svg.appendChild(path);
      angle += sweep;
    });

    const center = document.createElementNS(svgNS, "g");
    center.setAttribute("class", "pie-center");
    const t1 = document.createElementNS(svgNS, "text");
    t1.setAttribute("x", cx); t1.setAttribute("y", cy - 6);
    t1.setAttribute("text-anchor","middle"); t1.setAttribute("class","c1");
    t1.textContent = `${total}`;
    const t2 = document.createElementNS(svgNS, "text");
    t2.setAttribute("x", cx); t2.setAttribute("y", cy + 16);
    t2.setAttribute("text-anchor","middle"); t2.setAttribute("class","c2");
    t2.textContent = "Starts";
    center.append(t1,t2);
    svg.appendChild(center);

    const legend = document.createElement("div");
    legend.className = "pie-legend";
    ordered.forEach(it => {
      const row = document.createElement("div");
      row.className = "pie-leg-row";

      const dot = document.createElement("span");
      dot.className = `pie-dot ${CLASS_MAP[it.key] || ""}`;

      const label = document.createElement("span");
      label.className = "pie-leg-label";
      label.textContent = it.label;

      const val = document.createElement("span");
      val.className = "pie-leg-val";
      val.textContent = `${it.pct}%  •  ${it.count}`;

      row.append(dot, label, val);
      legend.appendChild(row);
    });

    wrap.appendChild(svg);
    wrap.appendChild(legend);
    return card;
  }



  function poolLabel(pool){
    return pool === "25" ? "25m" : (pool === "50" ? "50m" : "—");
  }

  function meetKey(m){
    const name = String(m?.meet_name || "").trim().toLowerCase();
    const date = String(m?.date || "").trim();
    return name + "||" + date;
  }

  function nonEmpty(v){ return v != null && String(v).trim() !== ""; }
    
  function mergeDuplicateMeets(meets){
    const list = Array.isArray(meets) ? meets.slice() : [];
    const groups = new Map();

    list.forEach((m, idx) => {
      if (!m || !m.meet_name) return;
      const k = meetKey(m);
      if (!groups.has(k)) groups.set(k, []);

      const raw = (m.Vorläufe ?? m._lauf ?? "").toString().trim();
      const parsed = parseInt(raw, 10);
      const runNo = Number.isFinite(parsed) && parsed > 0
        ? parsed
        : (groups.get(k).length + 1);

      groups.get(k).push({
        ...m,
        _lauf: runNo,
        _lauf_raw: raw,
        _srcIndex: idx
      });
    });

    const merged = [];

    for (const runs0 of groups.values()){
      const runs = runs0.sort((a, b) => (a._lauf - b._lauf) || (a._srcIndex - b._srcIndex));

      const highest = runs[runs.length - 1];
      const out = { ...highest };
      out._runs = runs.map(r => ({ ...r }));
      out._lauf_max = runs.reduce((m, r) => Math.max(m, Number(r._lauf)||0), 0) || runs.length;

      const ALL_TIME_FIELDS = MEET_DISC_TIME_FIELDS.slice();
      const PLACE_FIELDS = MEET_DISC_TIME_FIELDS.map(f => f.replace(/_Zeit$/i, "_Platz"));

      function pickFromHighest(field){
        for (let i = runs.length - 1; i >= 0; i--){
          const v = runs[i][field];
          if (v != null && String(v).trim() !== "") return v;
        }
        return "";
      }

      ALL_TIME_FIELDS.forEach(f => { out[f] = pickFromHighest(f); });
      PLACE_FIELDS.forEach(f => { out[f] = pickFromHighest(f); });

      out.Mehrkampf_Platz = pickFromHighest("Mehrkampf_Platz");
      out.LSC             = pickFromHighest("LSC");
      out.Wertung         = highest.Wertung || out.Wertung || "";
      out.Startrecht      = highest.Startrecht || out.Startrecht || "";
      out.Regelwerk       = highest.Regelwerk || out.Regelwerk || "";
      out.Ortsgruppe      = highest.Ortsgruppe || out.Ortsgruppe || "";
      out.pool            = highest.pool || out.pool;
      out.Land            = highest.Land || out.Land;

      merged.push(out);
    }

    merged.sort((l, r) => new Date(r.date) - new Date(l.date));
    return merged;
  }



  function fmtDateShort(dStr){
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d)) return "—";
    const months = ["Jan.","Feb.","März","Apr.","Mai","Jun.","Jul.","Aug.","Sep.","Okt.","Nov.","Dez."];
    return `${d.getDate()}. ${months[d.getMonth()]}`;
  }

  const LAND_TO_ISO3 = {
    "Deutschland":"GER",
    "Schweiz":"SUI",
    "Italien":"ITA",
    "Frankreich":"FRA",
    "Belgien":"BEL",
    "Niederlande":"NED",
    "Spanien":"ESP",
    "Polen":"POL",
    "Japan":"JPN",
    "Dänemark":"DEN",
    "Ägypten":"EGY",
    "Großbritannien":"GBR",
    "Australien":"AUS",
  };

  const LV_STATE_LABEL = {
    BA: "LV Baden",
    BY: "LV Bayern",
    BE: "LV Berlin",
    BB: "LV Brandenburg",
    HB: "LV Bremen",
    HH: "LV Hamburg",
    HE: "LV Hessen",
    MV: "LV Mecklenburg-Vorp.",
    NI: "LV Niedersachsen",
    NR: "LV Nordrhein",
    WF: "LV Westfahlen",
    RP: "LV Rheinland-Pfalz",
    SL: "LV Saarland",
    SN: "LV Sachsen",
    ST: "LV Sachsen-Anhalt",
    SH: "LV Schleswig-Holstein",
    TH: "LV Thüringen",
  };

  const ISO3_TO_EN = {
    GER: "GERMANY",
    POL: "POLAND",
    FRA: "FRANCE",
    BEL: "BELGIUM",
    NED: "NETHERLANDS",
    ESP: "SPAIN",
    ITA: "ITALY",
    SUI: "SWITZERLAND",
    JPN: "JAPAN",
    DEN: "DENMARK",
    EGY: "EGYPT",
    GBR: "GREAT BRITAIN",
    AUS: "AUSTRALIA",
  };


  function iso3FromLand(landName){
    return LAND_TO_ISO3[String(landName||"").trim()] || "—";
  }

  function normalizeBVCode(bvRaw) {
    const s = String(bvRaw ?? "").trim();
    if (!s) {
      return "";
    }

    if (/^[A-Z]{3}$/.test(s)) {
      return s;
    }

    const iso = iso3FromLand(s);
    if (iso && iso !== "—") {
      return iso;
    }

    const upper = s.toUpperCase();
    return upper;
  }

  function deriveAffiliation(a) {
    const meets =
      Array.isArray(a?.meets) && a.meets.length
        ? a.meets
        : (AllMeetsByAthleteId.get(a?.id) || []);

    const basis = pickBasisMeetPreferNat(meets);

    const ogKey = String(
      basis?.Ortsgruppe ?? basis?.ortsgruppe ?? a?.ortsgruppe ?? ""
    ).trim();

    const lvCode = String(
      basis?.LV_state ?? a?.LV_state ?? a?.lv_state ?? ""
    ).trim().toUpperCase();

    const bvCode = normalizeBVCode(
      basis?.BV_natio ?? a?.BV_natio ?? a?.BV_nation ?? ""
    );

    const startrecht = String(
      basis?.Startrecht ?? ""
    ).trim().toUpperCase();

    let label = ogKey;

    if (startrecht === "LV" && lvCode) {
      label = LV_STATE_LABEL[lvCode] || lvCode;
    } else if (startrecht === "BV" && bvCode) {
      label = ISO3_TO_EN[bvCode] || bvCode;
    }

    return { ogKey, lvCode, bvCode, startrecht, label };
  }

  function capCandidates({ ogKey, lvCode, bvCode, startrecht }) {
    let seq;

    if (startrecht === "OG") {
      seq = [
        { key: ogKey,  overlay: false },
        { key: lvCode, overlay: true  },
        { key: bvCode, overlay: true  },
      ];
    } else if (startrecht === "LV") {
      seq = [
        { key: lvCode, overlay: false },
        { key: ogKey,  overlay: true  },
        { key: bvCode, overlay: true  },
      ];
    } else if (startrecht === "BV") {
      seq = [
        { key: bvCode, overlay: false },
        { key: ogKey,  overlay: true  },
        { key: lvCode, overlay: true  },
      ];
    } else {
      seq = [
        { key: ogKey,  overlay: false },
        { key: lvCode, overlay: true  },
        { key: bvCode, overlay: true  },
      ];
    }

    return seq.filter(x => x.key && String(x.key).trim() !== "");
  }

  function capCandidatesAvatar(aff){
    const ogKey = String(aff?.ogKey  || "").trim();
    const lvCode= String(aff?.lvCode|| "").trim();
    const bvCode= String(aff?.bvCode|| "").trim();
    const sr    = String(aff?.startrecht || "").trim().toUpperCase();

    const out = [];

    if (ogKey) out.push({ key: ogKey, overlay: false });

    const pushOverlay = (key) => {
      const k = String(key || "").trim();
      if (k) out.push({ key: k, overlay: true });
    };

    if (sr === "BV") {
      pushOverlay(bvCode);
      pushOverlay(lvCode);
    } else {
      pushOverlay(lvCode);
      pushOverlay(bvCode);
    }

    return out;
  }



  function ogInfoFromMeet(m) {
    const ogRaw    = m.Ortsgruppe ?? m.ortsgruppe ?? "";
    const lvRaw    = m.LV_state  ?? m.lv_state  ?? "";
    const startRaw = String(m.Startrecht ?? m.startrecht ?? "").trim().toUpperCase();
    const bvRaw    = m.BV_natio ?? m.BV_nation ?? "";

    const ogKey  = String(ogRaw || "").trim();
    const lvCode = String(lvRaw || "").trim().toUpperCase();
    const bvCode = normalizeBVCode(bvRaw);

    let label;

    if (startRaw === "LV" && lvCode) {
      label = LV_STATE_LABEL[lvCode] || lvCode;
    } else if (startRaw === "BV" && bvCode) {
      label =
        ISO3_TO_EN[bvCode] ||
        bvCode ||
        String(bvRaw || "").trim();
    } else {
      label = ogKey;
    }

    return {
      label,
      ogKey,
      lvCode,
      bvCode,
      startrecht: startRaw
    };
  }


  function buildOgCapCell(ogInfo) {
    const cell = h("span", { class: "m-ogcap-cell" });

    const { ogKey, lvCode, bvCode, startrecht, label } = ogInfo;

    /** @type {{key:string, overlay:boolean}[]} */
    let seq = [];

    if (startrecht === "OG") {
      seq = [
        { key: ogKey,  overlay: false },
        { key: lvCode, overlay: true  },
        { key: bvCode, overlay: true  },
      ];
    } else if (startrecht === "LV") {
      seq = [
        { key: lvCode, overlay: false },
        { key: ogKey,  overlay: true  },
        { key: bvCode, overlay: true  },
      ];
    } else if (startrecht === "BV") {
      seq = [
        { key: bvCode, overlay: false },
        { key: ogKey,  overlay: true  },
        { key: lvCode, overlay: true  },
      ];
    } else {
      seq = [
        { key: ogKey,  overlay: false },
        { key: lvCode, overlay: true  },
        { key: bvCode, overlay: true  },
      ];
    }

    seq = seq.filter(entry => entry.key && String(entry.key).trim() !== "");

    let currentIndex = 0;
    let noneUsed = false;

    if (!seq.length) {
      const imgNone = h("img", {
        class: "m-ogcap-icon",
        src: "svg/Cap-None.svg",
        alt: "no cap",
        loading: "lazy",
        decoding: "async",
        onerror: (e) => e.currentTarget.remove()
      });
      cell.appendChild(imgNone);
      return cell;
    }

    const img = h("img", {
      class: "m-ogcap-icon",
      src: "", 
      alt: label || seq[0].key,
      loading: "lazy",
      decoding: "async",
      onerror: (e) => {
        if (currentIndex + 1 < seq.length) {
          currentIndex++;
          applyCandidate();
        } else if (!noneUsed) {
          noneUsed = true;
          cell.classList.remove("ogcap-overlay");
          img.src = "svg/Cap-None.svg";
        } else {
          img.remove();
        }
      }
    });

    function applyCandidate() {
      const entry = seq[currentIndex];
      if (entry.overlay) {
        cell.classList.add("ogcap-overlay");
      } else {
        cell.classList.remove("ogcap-overlay");
      }
      img.src = `svg/Cap-${encodeURIComponent(entry.key)}.svg`;
    }
    applyCandidate();

    cell.appendChild(img);
    return cell;
  }

  function medalForPlace(placeStr){
    const p = parseInt(placeStr, 10);
    if (!Number.isFinite(p)) return null;
    if (p === 1) return { file:"medal_gold.svg",   alt:"Gold"   };
    if (p === 2) return { file:"medal_silver.svg", alt:"Silber" };
    if (p === 3) return { file:"medal_bronze.svg", alt:"Bronze" };
    return null;
  }

  function roundLabelFromLauf(laufNummer, maxLauf){
    const ln = Number(laufNummer);
    const mx = Number(maxLauf);
    if (!Number.isFinite(ln) || !Number.isFinite(mx) || mx <= 1) return null;

    if (mx === 2) return ln === 1 ? "Vorlauf" : (ln === 2 ? "Finale" : null);
    if (mx === 3) return ln === 1 ? "Vorlauf" : (ln === 2 ? "Halbfinale" : (ln === 3 ? "Finale" : null));
    if (mx === 4) return ln === 1 ? "Vorlauf" : (ln === 2 ? "Viertelfinale" : (ln === 3 ? "Halbfinale" : (ln === 4 ? "Finale" : null)));

    if (ln === mx) return "Finale";
    if (ln === mx - 1) return "Halbfinale";
    if (ln === mx - 2) return "Viertelfinale";
    return "Vorlauf";
  }


  function shortMeetName(name){
    if (!name) return "—";
    const s = String(name);
    const i = s.indexOf(" - ");
    return (i >= 0 ? s.slice(0, i) : s).trim();
  }

  function renderAthTabsAndPanels(ax){
    const panels = h("div", { class: "ath-tab-panels" },
      h("div", { class: "ath-tab-panel", "data-key": "bests" }, renderBestzeitenSection(ax)),
      h("div", { class: "ath-tab-panel", "data-key": "info"  }, renderOverviewSection(ax)),
      h("div", { class: "ath-tab-panel", "data-key": "meets" }, renderMeetsSection(ax))
    );

    const tabs = renderAthTabs(["Bestzeiten","Info","Wettkämpfe"], "Bestzeiten", (key) => {
      panels.querySelectorAll(".ath-tab-panel").forEach(p => {
        p.classList.toggle("active", p.dataset.key === key);
      });
    });

    const wrap = h("div", { class: "ath-tabs-wrap" }, tabs, panels);

    requestAnimationFrame(() => {
      panels.querySelectorAll(".ath-tab-panel").forEach(p =>
        p.classList.toggle("active", p.dataset.key === "bests")
      );
      const activeBtn = wrap.querySelector(".ath-tab.active") || wrap.querySelector(".ath-tab");
      if (activeBtn) {
        const ul  = wrap.querySelector(".ath-tabs-underline");
        const lst = wrap.querySelector(".ath-tabs-list");
        const pr  = lst.getBoundingClientRect();
        const tr  = activeBtn.getBoundingClientRect();
        ul.style.width = tr.width + "px";
        ul.style.left  = (tr.left - pr.left) + "px";
      }
    });

    return wrap;
  }


  function renderAthTabs(labels, activeLabel, onChange){
    const map = { "Bestzeiten":"bests", "Info":"info", "Wettkämpfe":"meets" };
    const bar  = h("div", { class: "ath-tabs full-bleed" });
    const list = h("div", { class: "ath-tabs-list" });
    const ul   = h("div", { class: "ath-tabs-underline" });

    let activeBtn = null;

    labels.forEach(lbl => {
      const key = map[lbl] || lbl.toLowerCase();
      const btn = h("button", {
        class: "ath-tab" + (lbl === activeLabel ? " active" : ""),
        type: "button",
        onclick: () => setActive(btn, key)
      }, lbl.toUpperCase());
      list.appendChild(btn);
      if (lbl === activeLabel) activeBtn = btn;
    });

    bar.appendChild(list);
    bar.appendChild(ul);

    function positionUnderline(btn){
      const r = btn.getBoundingClientRect();
      const p = list.getBoundingClientRect();
      ul.style.width = r.width + "px";
      ul.style.left  = (r.left - p.left) + "px";
    }
    function setActive(btn, key){
      list.querySelectorAll(".ath-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      positionUnderline(btn);
      onChange?.(key);
    }

    requestAnimationFrame(() => activeBtn && positionUnderline(activeBtn));
    window.addEventListener("resize", () => {
      const cur = list.querySelector(".ath-tab.active");
      cur && positionUnderline(cur);
    });

    return bar;
  }

  function renderMeetsSection(a){
    const allMeets = Array.isArray(a.meets) ? a.meets.slice() : [];
    const jahrgang = Number(a?.jahrgang);
    if (!allMeets.length){
      const emptyBox = h("div", { class: "ath-profile-section meets" },
        h("div", { class: "ath-info-header" }, h("h3", {}, "Wettkämpfe (—)")),
        h("div", { class: "best-empty" }, "Keine Wettkämpfe erfasst.")
      );
      return emptyBox;
    }

    const years = Array.from(new Set(
      allMeets
        .map(m => (new Date(m.date)).getFullYear())
        .filter(y => Number.isFinite(y))
    )).sort((a,b) => b - a);

    let idx = 0; 

    let meetDebugId = 0;

    const box   = h("div", { class: "ath-profile-section meets" });

    const title = h("h3", {}, "");
    const head  = h("div", { class: "ath-info-header meets-head" },
      h("button", { class: "nav-btn", type: "button", onclick: () => changeYear(+1) }, "‹"),
      title,
      h("button", { class: "nav-btn", type: "button", onclick: () => changeYear(-1) }, "›")
    );


    const listWrap = h("div", { class: "meets-list" });
    box.appendChild(head);
    box.appendChild(listWrap);

    paint(years[idx]);

    return box;

    function changeYear(delta){
      const next = idx + delta;
      if (next < 0 || next >= years.length) return;
      idx = next;
      paint(years[idx]);
    }

    function paint(year){
      title.textContent = year;

      const items = allMeets
        .filter(m => (new Date(m.date)).getFullYear() === year)
        .sort((l, r) => new Date(r.date) - new Date(l.date));

      listWrap.innerHTML = "";
      if (!items.length){
        listWrap.appendChild(h("div", { class: "best-empty" }, "Keine Wettkämpfe in diesem Jahr."));
        return;
      }

      items.forEach(m => {

        const debugId = ++meetDebugId;

        const placeStr = (m.Mehrkampf_Platz || "").toString().trim();
        const medal    = medalForPlace(placeStr);

        const placeEl = h("span", { class: "m-place" },
          placeStr || "",
          medal ? h("img", {
            class: "m-medal",
            src: `${FLAG_BASE_URL}/${medal.file}`,
            alt: medal.alt,
            loading: "lazy",
            decoding: "async",
            onerror: (e)=>e.currentTarget.remove()
          }) : null
        );

        const poolEl = h("span", { class: "m-pool" }, poolLabel(m.pool));

        const landName = (m.Land || "").toString().trim();
        const iso3 = iso3FromLand(landName);
        const landEl = h("span", { class: "m-country" },
          h("img", {
            class: "m-flag",
            src: `${FLAG_BASE_URL}/${encodeURIComponent(landName)}.svg`,
            alt: landName || "Land",
            loading: "lazy",
            decoding: "async",
            onerror: (e)=>e.currentTarget.remove()
          }),
          h("span", { class: "m-iso" }, ` ${iso3}`)
        );

        const dateEl = buildDateEl(m.date);

        const meetRawName  = (m.meet_name || "").toString().trim();
        const meetShortName = (meetRawName || "—").replace(/\s+-\s+.*$/, "");
        const nameEl = h("span", { class: "m-name" },
          h("span", { class: "m-name-main" }, meetShortName)
        );

        const eventIconCell = h("span", { class: "m-event-cell" },
          meetRawName
            ? h("img", {
                class: "m-event-icon",
                src: `png/events/${encodeURIComponent(meetRawName)}.png`,
                alt: meetShortName,
                loading: "lazy",
                decoding: "async",
                onerror: (e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = "1";
                    img.src = "png/events/DLRG.png";
                  } else {
                    img.remove();
                  }
                }
              })
            : null
        );

        const ageLabel = ageLabelAtMeet(m.date);
        const ageEl = h("span", { class: "m-age" }, ageLabel || "");

        const ogInfo = ogInfoFromMeet(m);
        const ogLabel = ogInfo.label;

        const ogCapCell = buildOgCapCell(ogInfo);

        const ogEl = h("span", { class: "m-og" }, ogLabel || "");

        const row = h("div", {
          class: "meet-row",
          role: "button",
          tabindex: "0",
          "aria-expanded": "false",
          onkeydown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          },
          onclick: toggle
        },
          dateEl,
          placeEl,
          eventIconCell,
          nameEl,
          ageEl,
          ogCapCell,
          ogEl,
          landEl,
          poolEl
        );

        const details = h("div", {
          class: "meet-details",
          "aria-hidden": "true",
          style: "height:0"
        }, ...buildResultRows(m));


        listWrap.appendChild(row);
        listWrap.appendChild(details);

        function toggle(){
          const isOpen = row.classList.toggle("open");
          row.setAttribute("aria-expanded", isOpen ? "true" : "false");
          if (isOpen) expand(details); else collapse(details);
        }

        function expand(el){
          el.setAttribute("aria-hidden", "false");
          el.style.height = el.scrollHeight + "px";
          el.addEventListener("transitionend", () => {
            if (row.classList.contains("open")) el.style.height = "auto";
          }, { once: true });
        }

        function collapse(el){
          el.setAttribute("aria-hidden", "true");
          if (el.style.height === "" || el.style.height === "auto"){
            el.style.height = el.scrollHeight + "px";
          }
          requestAnimationFrame(() => {
            el.style.height = "0px";
          });
        }
      });
    }

    function ageLabelAtMeet(dateStr){
      if (!Number.isFinite(jahrgang)) return "";
      const v = ageAt(dateStr, jahrgang);
      if (!Number.isFinite(v)) return "";
      const years = Math.floor(v + 1e-6);
      return years + " J.";
    }


    function buildDateEl(dateStr){
      const d = new Date(dateStr);
      if (isNaN(d)) {
        return h("span", { class: "m-date" }, fmtDateShort(dateStr));
      }
      const day   = d.getDate();
      const month = monthShortDE(d.getMonth());

      return h("span", { class: "m-date" },
        h("span", { class: "m-date-day" }, day + "."),
        h("span", { class: "m-date-month" }, month)
      );
    }

    function monthShortDE(idx){
      const names = ["Jan.", "Feb.", "Mär.", "Apr.", "Mai", "Jun.", "Jul.", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
      return names[idx] ?? "";
    }

    function buildResultRows(m){
      const F = [
        { base:"50m_Retten",            label:"50m Retten" },
        { base:"100m_Retten",           label:"100m Retten mit Flossen" },
        { base:"100m_Kombi",            label:"100m Kombi" },
        { base:"100m_Lifesaver",        label:"100m Lifesaver" },
        { base:"200m_SuperLifesaver",   label:"200m Super Lifesaver" },
        { base:"200m_Hindernis",        label:"200m Hindernis" },
      ];

      const runs = Array.isArray(m._runs) && m._runs.length
        ? [...m._runs].sort((a,b) => (a._lauf || 1) - (b._lauf || 1))
        : [ m ];
      const total = runs.length;

      const rows = [];

      for (const f of F){
        for (let i = 0; i < runs.length; i++){
          const run = runs[i];
          const t = run[`${f.base}_Zeit`];
          const p = run[`${f.base}_Platz`];

          const hasAny = (t && String(t).trim() !== "") || (p && String(p).trim() !== "");
          if (!hasAny) continue;

          const wRaw = String(run.Wertung ?? m.Wertung ?? "").toLowerCase();
          const isEinzel = wRaw.replace(/[\s\-]+/g, "").includes("einzel");

          const placeStr = (p || "").toString().trim();
          const medal = isEinzel ? medalForPlace(placeStr) : null;

          const placeEl = h("span", { class: "pl" },
            placeStr || "",
            medal ? h("img", {
              class: "res-medal",
              src: `${FLAG_BASE_URL}/${medal.file}`,
              alt: medal.alt,
              loading: "lazy",
              decoding: "async",
              onerror: (e)=>e.currentTarget.remove()
            }) : null
          );

          const total = Number.isFinite(m._lauf_max) ? m._lauf_max : runs.length;
          const rLabel = roundLabelFromLauf(run._lauf, total);
          const discWrap = h("span", { class: "d-wrap" },
            h("span", { class: "d" }, f.label),
            (rLabel ? h("span", { class: "d-sub" }, rLabel) : null)
          );

          rows.push(
            h("div", { class: "meet-res" },
              discWrap,
              placeEl,
              h("span", { class: "t" }, (t && String(t).trim() !== "") ? String(t) : "—")
            )
          );
        }
      }


      return rows.length ? rows : [ h("div", { class: "best-empty" }, "Keine Einzelergebnisse erfasst.") ];
    }

  }

  function computeLaneDQProb(ax){
    const out = { "25": { starts: 0, dq: 0 }, "50": { starts: 0, dq: 0 } };
    const stats = (ax && ax.stats) || {};

    for (const lane of ["25","50"]){
      const laneStats = stats[lane] || {};
      for (const d of DISCIPLINES){
        const s = laneStats[d.key];
        if (!s) continue;
        out[lane].starts += Number(s.starts || 0);
        out[lane].dq     += Number(s.dq     || 0);
      }
    }

    const pct = (dq, starts) => (starts > 0 ? Math.round((dq/starts)*1000)/10 : 0);
    return {
      "25": { ...out["25"], pct: pct(out["25"].dq, out["25"].starts) },
      "50": { ...out["50"], pct: pct(out["50"].dq, out["50"].starts) }
    };
  }

  function hasStartrecht(a, code){
    const meets = Array.isArray(a?.meets) ? a.meets : [];
    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      if (runs.some(r => String(r?.Startrecht || "").toUpperCase() === String(code).toUpperCase()))
        return true;
    }
    return false;
  }

  function sumWettkampfMeter(a){
    const meets = Array.isArray(a.meets) ? a.meets : [];
    let total = 0;
    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs){
        for (const [key, val] of Object.entries(run)){
          if (!/_Zeit$/i.test(key)) continue;
          const v = (val ?? "").toString().trim();
          if (!v) continue;
          let dist = NaN;
          let mm = key.match(/^(\d+)m[_ ]/i) || key.match(/(\d+)m/i);
          if (mm) dist = parseInt(mm[1], 10);
          if (Number.isFinite(dist)) total += dist;
        }
      }
    }
    return total;
  }


  function fmtMeters(m){
    if (!Number.isFinite(m) || m <= 0) return "—";
    return `${m.toLocaleString("de-DE")} m`;
  }


  function renderStartrechtIcons(a){
    const meets = Array.isArray(a?.meets) ? a.meets : [];

    const lvMap = new Map();
    const bvMap = new Map();

    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];

      for (const r of runs){
        const sr = String(r?.Startrecht || m?.Startrecht || "").trim().toUpperCase();
        const dStr = String(r?.date || m?.date || "").slice(0,10);
        const d = new Date(dStr);
        const t = isNaN(d.getTime()) ? -Infinity : d.getTime();

        if (sr === "LV"){
          const code = String(r?.LV_state ?? m?.LV_state ?? "").trim().toUpperCase();
          if (!code) continue;
          const prev = lvMap.get(code);
          if (prev == null || t > prev) lvMap.set(code, t);
        }

        if (sr === "BV"){
          const raw = (r?.BV_natio ?? m?.BV_natio ?? r?.BV_nation ?? m?.BV_nation ?? "");
          const code = normalizeBVCode(raw);
          if (!code) continue;
          const prev = bvMap.get(code);
          if (prev == null || t > prev) bvMap.set(code, t);
        }
      }
    }

    const lvList = Array.from(lvMap.entries())
      .map(([code, t]) => ({ code, t }))
      .sort((a,b) => a.t - b.t);  

    const bvList = Array.from(bvMap.entries())
      .map(([code, t]) => ({ code, t }))
      .sort((a,b) => a.t - b.t);

    if (!lvList.length && !bvList.length) return null;

    const wrap = h("div", { class: "sr-icons", "aria-label": "Startrechte" });

    const makeImg = (code, srLabel) => h("img", {
      class: "sr-icon",
      src: `${FLAG_BASE_URL}/Cap-${encodeURIComponent(code)}.svg`,
      alt: `${srLabel} ${code}`,
      title: `${srLabel} ${code}`,
      loading: "lazy",
      decoding: "async",
      onerror: (e) => e.currentTarget.remove()
    });

    if (lvList.length){
      const gLv = h("span", { class: "sr-group sr-group--lv", "aria-label": "LV Startrechte" });
      lvList.forEach(x => gLv.appendChild(makeImg(x.code, "LV")));
      wrap.appendChild(gLv);
    }

    if (bvList.length){
      const gBv = h("span", { class: "sr-group sr-group--bv", "aria-label": "BV Startrechte" });
      bvList.forEach(x => gBv.appendChild(makeImg(x.code, "BV")));
      wrap.appendChild(gBv);
    }

    return wrap;
  }



  function countRegelwerk(meets){
    let intl = 0, nat = 0;
    (meets || []).forEach(m => {
      const r = String(m.Regelwerk || "").toLowerCase();
      if (r.startsWith("int")) intl++;
      else if (r.startsWith("nat")) nat++;
    });
    const total   = intl + nat;
    const pctIntl = total ? Math.round((intl / total) * 100) : 0;
    const pctNat  = total ? 100 - pctIntl : 0;
    return { intl, nat, pctIntl, pctNat, total };
  }

  const DISCIPLINES = [
    { key: "50_retten",         label: "50m Retten",                 meetZeit: "50m_Retten_Zeit",         meetPlatz: "50m_Retten_Platz" },
    { key: "100_retten_flosse", label: "100m Retten mit Flossen",    meetZeit: "100m_Retten_Zeit",        meetPlatz: "100m_Retten_Platz" },
    { key: "100_kombi",         label: "100m Kombi",                   meetZeit: "100m_Kombi_Zeit",         meetPlatz: "100m_Kombi_Platz" },
    { key: "100_lifesaver",     label: "100m Lifesaver",              meetZeit: "100m_Lifesaver_Zeit",     meetPlatz: "100m_Lifesaver_Platz" },
    { key: "200_super",         label: "200m Super Lifesaver",        meetZeit: "200m_SuperLifesaver_Zeit",meetPlatz: "200m_SuperLifesaver_Platz" },
    { key: "200_hindernis",     label: "200m Hindernis",              meetZeit: "200m_Hindernis_Zeit",     meetPlatz: "200m_Hindernis_Platz" },
  ];

  function parseTimeToSec(raw) {
    if (raw == null) return NaN;
    const s = String(raw).trim();
    if (/^dq$/i.test(s)) return NaN;
    const norm = s.replace(",", ".");
    const parts = norm.split(":");
    if (parts.length === 1) {
      const sec = parseFloat(parts[0]);
      return Number.isFinite(sec) ? sec : NaN;
    } else if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const sec = parseFloat(parts[1]);
      if (!Number.isFinite(m) || !Number.isFinite(sec)) return NaN;
      return m * 60 + sec;
    }
    return NaN;
  }

  function avgTimeForDiscipline(athlete, lane, disc) {
    const meets = Array.isArray(athlete.meets) ? athlete.meets : [];
    let sum = 0, cnt = 0;
    for (const m of meets) {
      if (!m || (lane && m.pool !== lane)) continue;
      const z = m[disc.meetZeit];
      if (!z || /^dq$/i.test(String(z).trim())) continue;
      const sec = parseTimeToSec(z);
      if (Number.isFinite(sec)) { sum += sec; cnt++; }
    }
    return cnt > 0 ? (sum / cnt) : NaN;
  }

  const REF_YEAR = new Date().getFullYear();
  const normalize = (s) =>
    (s || "").toString().toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();

  const highlight = (text, query) => {
    const nText = normalize(text);
    const nQuery = normalize(query);
    const idx = nText.indexOf(nQuery);
    if (idx < 0 || !query) return text;
    return text.slice(0, idx) + "<mark>" + text.slice(idx, idx + nQuery.length) + "</mark>" + text.slice(idx + nQuery.length);
  };

  function withHydratedMeets(ax){
    const meets = AllMeetsByAthleteId.get(ax.id) || ax.meets || [];
    return { ...ax, meets };
  }


  function formatSeconds(sec) {
    if (sec == null || isNaN(sec)) return "—";
    const tot = Math.round(Math.max(0, Number(sec)) * 100);
    const m = Math.floor(tot / 6000);
    const s = Math.floor((tot % 6000) / 100);
    const cs = tot % 100;
    const sPart = (m ? String(s).padStart(2, "0") : String(s));
    return (m ? `${m}:${sPart}` : sPart) + "." + String(cs).padStart(2, "0");
  }

  function fmtInt(n){ return Number.isFinite(n) ? n.toLocaleString("de-DE") : "—"; }
  function fmtDate(dStr){
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("de-DE");
  }

  function countriesFromAthlete(a) {
    const fromMeets = new Set();
    (a.meets || []).forEach(m => {
      const land = (m && m.Land) ? String(m.Land).trim() : null;
      if (land) fromMeets.add(land);
    });
    const arr = Array.from(fromMeets);
    if (arr.length) return arr;
    return Array.isArray(a.countriesDE) ? a.countriesDE : [];
  }

  function computeOverallLSC(meets) {
    const list = Array.isArray(meets) ? [...meets] : [];
    list.sort((a,b) => new Date(b.date) - new Date(a.date));
    for (const m of list) {
      if (m && m.LSC != null && m.LSC !== "") {
        const x = parseFloat(String(m.LSC).replace(",", "."));
        if (Number.isFinite(x)) return x;
      }
    }
    return null;
  }


  function deriveFromMeets(a) {
    const meets = Array.isArray(a.meets) ? a.meets : [];

    const pbs   = { "25": {}, "50": {} };
    const stats = { "25": {}, "50": {} };
    for (const lane of ["25", "50"]) {
      for (const d of DISCIPLINES) stats[lane][d.key] = { starts: 0, dq: 0 };
    }

    const medals = { gold: 0, silver: 0, bronze: 0, title: "Lifesaving Medaillen" };
    let totalStarts = 0;

    const addMedal = (place) => {
      const p = parseInt(place, 10);
      if (!Number.isFinite(p)) return;
      if (p === 1) medals.gold++;
      else if (p === 2) medals.silver++;
      else if (p === 3) medals.bronze++;
    };

    for (const meet of meets) {
      const lane = meet?.pool === "25" ? "25" : (meet?.pool === "50" ? "50" : null);

      const runs = Array.isArray(meet._runs) && meet._runs.length
        ? meet._runs
        : [ meet ];

      for (const run of runs) {
        for (const d of DISCIPLINES) {
          const z = run[d.meetZeit];
          const tSec = parseTimeToSec(z);
          const isDQ = z != null && /^dq$/i.test(String(z).trim());
          const hasStart = isDQ || Number.isFinite(tSec);

          if (lane && hasStart) {
            stats[lane][d.key].starts++;
            if (isDQ) stats[lane][d.key].dq++;
            totalStarts++;
            if (Number.isFinite(tSec)) {
              const cur = pbs[lane][d.key];
              if (cur == null || tSec < cur) pbs[lane][d.key] = tSec;
            }
          }
        }
      }

      for (const run of runs) {
        const wRaw = (run.Wertung || "").toLowerCase();
        const w = wRaw.replace(/[\s\-]+/g, "");
        const isEinzel = w.includes("einzel");
        if (!isEinzel) continue;

        for (const d of DISCIPLINES) addMedal(run[d.meetPlatz]);
      }

      const maxRun = runs.reduce((acc, r) => (acc == null || (r._lauf || 0) > (acc._lauf || 0)) ? r : acc, null);
      if (maxRun && nonEmpty(maxRun.Mehrkampf_Platz)) addMedal(maxRun.Mehrkampf_Platz);
    }

    return {
      pbs,
      stats,
      medals,
      totalDisciplines: totalStarts,
      countriesDE: countriesFromAthlete(a),
      lsc: computeOverallLSC(meets) ?? a.lsc ?? null
    };
  }


  function ageFromJahrgang(jahrgang, refYear = REF_YEAR) {
    const age = refYear - Number(jahrgang);
    return isNaN(age) ? null : age;
  }
  function akDE(age){
    if (age == null) return "?";
    if (age <= 10) return "10";
    if (age <= 12) return "12";
    if (age === 13 || age === 14) return "13/14";
    if (age === 15 || age === 16) return "15/16";
    if (age === 17 || age === 18) return "17/18";
    return "Offen";
  }
  function akLabelFromJahrgang(jahrgang){ return akDE(ageFromJahrgang(jahrgang)); }

  function formatOrtsgruppe(raw) {
    let s = (raw || "").toString().trim();
    s = s.replace(/^(og|dlrg)\s+/i, "");
    s = s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return "DLRG " + s;
  }

  function genderTag(g) {
    const isW = (g || "").toLowerCase().startsWith("w");
    return { short: isW ? "w" : "m", full: isW ? "weiblich" : "männlich", cls: isW ? "w" : "m" };
  }

  function capFileFromOrtsgruppe(rawOG) {
    const og = String(rawOG || "").trim();
    if (!og) return "Cap-Baden_light.svg";

    if (og === "Nieder-Olm/Wörrstadt") {
      return "Cap-Nieder-OlmWörrstadt.svg";
    }

    return `Cap-${og}.svg`;
  }

  function renderCapAvatar(a, size = "xl", extraClass = "") {
    const wrap = h("div", { class: `ath-avatar ${size} ${extraClass}` });

    const aff = deriveAffiliation(a);
    const ogNow = aff.ogKey || String(a?.ortsgruppe || "").trim();

    const img = h("img", {
      class: "avatar-img",
      alt: ogNow ? `Vereinskappe ${formatOrtsgruppe(ogNow)}` : "Vereinskappe",
      loading: size === "xl" ? "eager" : "lazy",
      decoding: "async",
      fetchpriority: size === "xl" ? "high" : "low"
    });

    applyCapFallback(img, wrap, capCandidatesAvatar(aff), { overlayClass: "cap-overlay" });

    wrap.appendChild(img);
    return wrap;
  }

  function applyCapFallback(img, hostEl, seq, { overlayClass = "cap-overlay", noneSrc = "svg/Cap-None.svg" } = {}) {
    if (!seq || !seq.length) {
      hostEl.classList.remove(overlayClass);
      img.onerror = null;
      img.src = noneSrc;
      return;
    }

    let i = 0;
    let noneUsed = false;

    const load = () => {
      const entry = seq[i];
      hostEl.classList.toggle(overlayClass, !!entry.overlay);
      img.src = `svg/Cap-${encodeURIComponent(entry.key)}.svg`;
    };

    img.onerror = () => {
      if (i + 1 < seq.length) {
        i++;
        load();
      } else {
        hostEl.classList.remove(overlayClass);
        img.onerror = null;
        img.remove();
      }
    };

    load();
  }


  function renderCapAvatarProfile(a) {
    const frontCap = renderCapAvatar(a);
    if (!frontCap) return null;

    const name = String(a?.name || "").trim();

    const wrap = h("div", {
      class: "cap-flip",
      role: "button",
      tabindex: "0",
      "aria-pressed": "false",
      "aria-label": name
        ? `Profilansicht für ${name} umdrehen`
        : "Profilansicht umdrehen"
    });

    const inner = h("div", { class: "cap-inner" });
    const front = h("div", { class: "cap-face cap-front" }, frontCap);
    const back  = h("div", { class: "cap-face cap-back" });

    inner.appendChild(front);
    inner.appendChild(back);
    wrap.appendChild(inner);

    const aff = deriveAffiliation(a);
    const seq = capCandidates(aff);

    const toggle = () => {
      const locked = wrap.classList.toggle("is-flipped");
      wrap.setAttribute("aria-pressed", locked ? "true" : "false");
    };

    if ("onpointerdown" in window) {
      wrap.addEventListener("pointerdown", toggle);
    } else {
      wrap.addEventListener("click", toggle);
      wrap.addEventListener("touchstart", toggle, { passive: true });
    }

    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });

    let introDone = false;
    function runIntroFlip() {
      if (introDone) return;
      introDone = true;
      if (window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
      requestAnimationFrame(() => {
        setTimeout(() => {
          toggle();
          setTimeout(() => { toggle(); }, 550);
        }, 200);
      });
    }

    function attachFallbackSvg() {
      back.innerHTML = "";

      const backCap = renderCapAvatar(a);
      if (backCap) {
        back.appendChild(backCap);
      }

      wrap.dataset.hasBack = "1";
      wrap.classList.add("has-back", "fallback-back");
      wrap.classList.remove("no-back");
      runIntroFlip();
    }

    if (!name) {
      attachFallbackSvg();
      return wrap;
    }

    const baseName = name.replace(/\s+/g, "");
    const fileName = baseName + ".png";
    const imgPath  = "png/pp/" + fileName;

    const img = document.createElement("img");
    img.alt = `Portrait von ${name}`;
    img.loading = "lazy";

    back.appendChild(img);
    img.src = imgPath;

    img.addEventListener("load", () => {
      wrap.dataset.hasBack = "1";
      wrap.classList.add("has-back");
      wrap.classList.remove("no-back");
      runIntroFlip();
    });

    img.addEventListener("error", () => {
      if (img.parentNode === back) {
        back.removeChild(img);
      }
      attachFallbackSvg();
    });

    return wrap;
  }



  const SUPPORTED_FLAGS_DE = new Set([
    "Spanien","Australien","Deutschland","Belgien","Italien","Frankreich",
    "Schweiz","Polen","Japan","Dänemark","Ägypten","Niederlande","Großbritannien"
  ]);

  function renderCountryFlagsInline(a){
    const names = (typeof countriesFromAthlete === "function"
      ? countriesFromAthlete(a)
      : (Array.isArray(a.countriesDE) ? a.countriesDE : []))
      .map(n => String(n).trim())
      .filter(n => SUPPORTED_FLAGS_DE.has(n));

    if (!names.length) return null;

    return h("div", { class: "kv-flags" },
      ...names.map(name => {
        const wrap = h("span", { class: "ath-flag", title: name, "aria-label": name });
        const img  = h("img", {
          class: "flag-img",
          src: `${FLAG_BASE_URL}/${encodeURIComponent(name)}.svg`,
          alt: name, loading: "lazy", decoding: "async",
          onerror: () => wrap.remove()
        });
        wrap.appendChild(img);
        return wrap;
      })
    );
  }


  function activityStatusFromLast(lastISO){
    if (!lastISO) return { key: "inactive", label: "Inaktiv" };
    const last = new Date(lastISO);
    if (isNaN(last)) return { key: "inactive", label: "Inaktiv" };
    const now  = new Date();
    const days = Math.floor((now - last) / (1000*60*60*24));
    if (days < 365)   return { key: "active",  label: "Aktiv" };
    if (days < 730)   return { key: "pause",   label: "Pause" };
    return { key: "inactive", label: "Inaktiv" };
  }

  function computeMeetInfo(a){
    const meets = Array.isArray(a.meets) ? a.meets : [];
    const total = meets.length;

    let c50 = 0, c25 = 0;
    let first = null, last = null, firstName = null;
    const years = new Set();

    let cNat = 0, cIntl = 0;

    for (const m of meets){
      if (m.pool === "50") c50++; else if (m.pool === "25") c25++;

      const reg = String(m.Regelwerk || "").toLowerCase().trim();
      if (reg.startsWith("int")) cIntl++;
      else if (reg.startsWith("nat")) cNat++;

      const d = new Date(m.date);
      if (!isNaN(d)){
        years.add(d.getFullYear());
        if (!first || d < first){
          first = d;
          firstName = shortMeetName?.(m.meet_name || m.meet || "") || (m.meet_name || m.meet || null);
        }        
        if (!last  || d > last ){ last  = d; }
      }
    }

    const pct50  = total ? Math.round((c50/total)*100) : 0;
    const pctIntl = total ? Math.round((cIntl/total)*100) : 0;

    return {
      total, c50, c25, pct50, pct25: total ? 100 - pct50 : 0,
      first: first ? first.toISOString().slice(0,10) : null,
      last:  last  ? last.toISOString().slice(0,10)  : null,
      firstName,
      activeYears: years.size,
      cNat, cIntl, pctIntl
    };
  }

  const MEET_DISC_TIME_FIELDS = [
    "50m_Retten_Zeit",
    "100m_Retten_Zeit",
    "100m_Kombi_Zeit",
    "100m_Lifesaver_Zeit",
    "200m_SuperLifesaver_Zeit",
    "200m_Hindernis_Zeit"
  ];

  function hasStartVal(v){
    return v != null && String(v).trim() !== "";
  }

  function totalStartsFromMeets(a){
    const meets = Array.isArray(a.meets) ? a.meets : [];
    let total = 0;
    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs){
        for (const f of MEET_DISC_TIME_FIELDS){
          if (hasStartVal(run[f])) total++;
        }
      }
    }
    return total;
  }

  function computeStartsPerStartrecht(a){
    const meets = Array.isArray(a.meets) ? a.meets : [];
    const out = { OG:0, BZ:0, LV:0, BV:0 };
    for (const m of meets){
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs){
        const sr = (run.Startrecht || "").toUpperCase();
        if (!out.hasOwnProperty(sr)) continue;
        let cnt = 0;
        for (const f of MEET_DISC_TIME_FIELDS){
          if (hasStartVal(run[f])) cnt++;
        }
        out[sr] += cnt;
      }
    }
    return out;
  }


  function currentOrtsgruppeFromMeets(a) {
    const aff = deriveAffiliation(a);
    return aff.ogKey || String(a?.ortsgruppe || "").trim();
  }

  function renderOrtsgruppeMeta(ax) {
    const { curr, others } = collectOrtsgruppenForAthlete(ax);
    const currentLabel = curr || "—";
    const hasOthers = others.length > 0;

    const kv = h(
      "span",
      { class: "kv kv-og", "data-key": "Ortsgruppe" },
      h("span", { class: "k" }, "Ortsgruppe:")
    );

    const v = h("span", { class: "v og-v" });

    const mainRow = h(
      "span",
      { class: "og-main-row" },
      h("span", { class: "og-main" }, currentLabel)
    );
    v.appendChild(mainRow);

    if (hasOthers) {
      const moreBox = h("div", { class: "og-more" });

      others.forEach((og) => {
        const ogName = String(og || "").trim();
        if (!ogName) return;

        const capFile = capFileFromOrtsgruppe(ogName);
        const capUrl  = `${FLAG_BASE_URL}/${encodeURIComponent(capFile)}`;

        const capImg = h("img", {
          class: "og-cap-img",
          alt: `Cap ${ogName}`,
          loading: "lazy",
          decoding: "async"
        });

        setCapWithCache(capImg, capFile);


        const row = h(
          "div",
          { class: "og-item" },
          h("span", { class: "og-cap" }, capImg),
          h("span", { class: "og-item-label" }, ogName)
        );

        moreBox.appendChild(row);
      });

      const btn = h(
        "button",
        {
          class: "og-toggle",
          type: "button",
          "aria-expanded": "false",
          "aria-label": "Weitere Ortsgruppen anzeigen",
          onclick: () => {
            const open = moreBox.classList.toggle("open");
            btn.setAttribute("aria-expanded", open ? "true" : "false");
          }
        },
        "▾"
      );

      mainRow.appendChild(btn);

      v.appendChild(moreBox);
    }

    kv.appendChild(v);
    return kv;
  }

  function collectOrtsgruppenForAthlete(ax) {
    const set = new Set();

    const curr = currentOrtsgruppeFromMeets(ax) || ax.ortsgruppe || "";
    if (curr) set.add(String(curr).trim());

    const meets = Array.isArray(ax.meets) ? ax.meets : [];
    for (const m of meets) {
      const raw =
        m.Ortsgruppe ?? 
        m.ortsgruppe ??
        m.og ??
        m.OG ??
        m.og_name ??
        "";

      const norm = String(raw).trim();
      if (!norm) continue;
      set.add(norm);
    }

    const all = Array.from(set);

    const others = all
      .filter((og) => og !== curr)
      .sort((a, b) => a.localeCompare(b, "de-DE"));
    return { curr, others };
  }

  function sumAllDQ(obj){
    const s50 = (obj.stats && obj.stats["50"]) || {};
    const s25 = (obj.stats && obj.stats["25"]) || {};
    let total = 0;
    for (const d of DISCIPLINES){
      total += Number(s50[d.key]?.dq || 0);
      total += Number(s25[d.key]?.dq || 0);
    }
    return total;
  }

  function assumedBirthDate(jahrgang){
    const y = Number(jahrgang);
    if (!Number.isFinite(y)) return null;
    return new Date(y, 6, 1);
  }

  function ageAt(dateStr, jahrgang){
    const birth = assumedBirthDate(jahrgang);
    if (!birth) return NaN;
    const d = new Date(dateStr);
    if (isNaN(d)) return NaN;
    const msPerYear = 365.2425 * 24 * 60 * 60 * 1000;
    return (d - birth) / msPerYear;
  }

  function s(tag, attrs = {}, ...children){
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k,v] of Object.entries(attrs || {})){
      if (v == null) continue;
      el.setAttribute(k, String(v));
    }
    for (const c of children.flat()){
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }

  function renderLSCChart(a){
    const sLocal = (tag, attrs = {}, ...children) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [k,v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
      children.flat().forEach(c => c != null && el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
      return el;
    };
    const hEl = (tag, attrs = {}, ...children) => {
      const el = document.createElement(tag);
      for (const [k,v] of Object.entries(attrs)){
        if (k === "class") el.className = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
      }
      children.flat().forEach(c => el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
      return el;
    };

    const basePts = buildLSCSeries(a);
    const card = hEl("div", { class:"ath-lsc-card" },
      hEl("div", { class:"lsc-head" }, hEl("h4", {}, "LSC Verlauf"))
    );
    if (!basePts.length){
      card.appendChild(hEl("div", { class:"best-empty" }, "Keine LSC-Daten vorhanden."));
      return card;
    }

    const vp  = hEl("div", { class:"lsc-viewport" });
    const svg = sLocal("svg", { class:"lsc-svg", role:"img", "aria-label":"LSC Verlauf" });
    vp.appendChild(svg);
    card.appendChild(vp);

    const tip = hEl("div", { class:"lsc-tooltip", "aria-hidden":"true" },
      hEl("div", { class:"tt-l1" }),
      hEl("div", { class:"tt-l2" })
    );
    card.appendChild(tip);

    const legend = hEl("div", { class:"lsc-legend" },
      hEl("span", { class:"lsc-key lsc-key--base" },
        hEl("span", { class:"lsc-key-dot blue" }),
        hEl("span", { class:"lsc-key-label" }, a?.name || "Athlet A")
      )
    );
    card.appendChild(legend);

    let cmpAth  = null;
    let cmpPts  = null;

    const cmpWrap   = hEl("div", { class:"lsc-compare-wrap" });
    const cmpInput  = hEl("input", {
      class:"lsc-input",
      type:"search",
      placeholder:"Athlet zum Vergleich suchen …",
      autocomplete:"off",
      role:"searchbox",
      "aria-label":"Athlet zum Vergleich suchen"
    });
    const clearBtn  = hEl("button", { class:"lsc-clear hidden", type:"button", title:"Vergleich entfernen" }, "Entfernen");
    const suggest   = hEl("div", { class:"lsc-suggest hidden", role:"listbox" });

    cmpWrap.appendChild(hEl("div", { class:"lsc-search-row" }, cmpInput, clearBtn));
    cmpWrap.appendChild(suggest);
    card.appendChild(cmpWrap);

    let cmpQuery = "", cmpResults = [], cmpActive = -1;
    const normalizeLocal = (s) => (s||"").toString().toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g," ").trim();

    function updateCmpSuggest(){
      const q = cmpQuery.trim();
      if (q.length < MIN_QUERY_LEN){ cmpResults = []; cmpActive = -1; paintCmpSuggest(); return; }

      const nq = normalizeLocal(q);
      const pool = (AppState?.athletes || []).filter(x => x?.id !== a?.id);
      const list = pool.map(ax => ({ ax, nName: normalizeLocal(ax.name) }))
        .filter(x => x.nName.includes(nq))
        .sort((l,r) => {
          const la = l.nName.startsWith(nq) ? 0 : 1;
          const ra = r.nName.startsWith(nq) ? 0 : 1;
          if (la !== ra) return la - ra;
          return l.nName.localeCompare(r.nName);
        })
        .slice(0,8);

      cmpResults = list.map(x => x.ax);
      cmpActive  = cmpResults.length ? 0 : -1;
      paintCmpSuggest();
    }

    function paintCmpSuggest(){
      suggest.innerHTML = "";
      if (!cmpQuery || cmpResults.length === 0){
        const msg = cmpQuery.length < MIN_QUERY_LEN ? `Mind. ${MIN_QUERY_LEN} Zeichen eingeben` : "Keine Treffer";        
        suggest.appendChild(hEl("div", { class:"lsc-suggest-empty" }, msg));
        suggest.classList.remove("hidden");
        return;
      }
      cmpResults.forEach((ax, idx) => {
        const item = hEl("div", {
          class:"lsc-suggest-item" + (idx===cmpActive ? " active" : ""),
          role:"option", "aria-selected": idx===cmpActive ? "true" : "false"
        });
        item.appendChild(renderCapAvatar(ax, "sm", "lsc-suggest-avatar"));
        const name = hEl("div", { class:"lsc-suggest-name" }, ax.name, " ",
          hEl("span", { class:"lsc-year" }, `(${ax.jahrgang})`));
        const og = currentOrtsgruppeFromMeets(ax) || ax.ortsgruppe || "";
        const sub = hEl("div", { class:"lsc-suggest-sub" }, "DLRG ", og);
        item.appendChild(hEl("div", { class:"lsc-suggest-text" }, name, sub));
        item.addEventListener("click", () => { chooseCmp(ax); });
        item.addEventListener("mouseenter", ()=>{ suggest.querySelector(".active")?.classList.remove("active"); item.classList.add("active"); cmpActive = idx; });

        suggest.appendChild(item);
      });
      suggest.classList.remove("hidden");
    }

    function hideCmpSuggest(){ suggest.classList.add("hidden"); }

    function chooseCmp(ax){
      const full = withHydratedMeets(ax);
      const merged = mergeDuplicateMeets(full.meets);

      cmpAth = { ...full, meets: merged };
      cmpPts = buildLSCSeries(cmpAth);

      legend.querySelector(".lsc-key--cmp")?.remove();
      legend.appendChild(
        hEl("span", { class:"lsc-key lsc-key--cmp" },
          hEl("span", { class:"lsc-key-dot green" }),
          hEl("span", { class:"lsc-key-label" }, cmpAth.name)
        )
      );

      clearBtn.classList.remove("hidden");
      hideCmpSuggest();
      dismissKeyboard();
      cmpInput.value = cmpQuery = "";
      paint();
    }


    cmpInput.addEventListener("input", e => { cmpQuery = e.target.value || ""; updateCmpSuggest(); });
    cmpInput.addEventListener("keydown", e => {
      if (!cmpResults.length) return;
      if (e.key === "ArrowDown"){ e.preventDefault(); cmpActive = (cmpActive+1) % cmpResults.length; paintCmpSuggest(); }
      else if (e.key === "ArrowUp"){ e.preventDefault(); cmpActive = (cmpActive-1+cmpResults.length) % cmpResults.length; paintCmpSuggest(); }
      else if (e.key === "Enter"){ e.preventDefault(); chooseCmp(cmpResults[cmpActive>=0?cmpActive:0]); }
      else if (e.key === "Escape"){ hideCmpSuggest(); }
    });
    document.addEventListener("click", (e) => { if (!cmpWrap.contains(e.target)) hideCmpSuggest(); });

    clearBtn.addEventListener("click", () => {
      cmpAth = null; cmpPts = null;
      clearBtn.classList.add("hidden");
      legend.querySelector(".lsc-key--cmp")?.remove();
      paint();
    });

    const yMin = 0, yMax = 1000;
    let xMin, xMax;
    const updateXDomain = () => {
      const all = cmpPts && cmpPts.length ? basePts.concat(cmpPts) : basePts;
      xMin = Math.floor(Math.min(...all.map(p=>p.age)));
      xMax = Math.ceil (Math.max(...all.map(p=>p.age)));
      if (xMax === xMin) xMax = xMin + 1;
    };
    updateXDomain();

    let activeIdx = null, activeSeries = "blue";

        function paint(){
          updateXDomain();

          const rect = vp.getBoundingClientRect();
          const W = Math.max(320, Math.floor(rect.width));

          let H;
          if (window.innerWidth <= 480) {
            H = 450;
          } else if (window.innerWidth <= 720) {
            H = 500;
          } else {
            H = 560;
          }

          vp.style.minHeight = H + "px";

          svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
          svg.setAttribute("width", W);
          svg.setAttribute("height", H);

          while (svg.firstChild) svg.removeChild(svg.firstChild);

          const m  = { l: 8, r: 8, t: 10, b: 48 };
          const cw = W - m.l - m.r;
          const ch = H - m.t - m.b;

          function normLSC(v){
            const val = Math.max(0, Math.min(1000, Number(v) || 0));
            if (val <= 400){
              const frac = val / 400;
              return frac * 0.25;
            } else if (val <= 800){
              const frac = (val - 400) / 400;
              return 0.25 + frac * 0.5;
            } else {
              const frac = (val - 800) / 200;
              return 0.75 + frac * 0.25;
            }
          }

          const fy = (v) => {
            const u = normLSC(v);
            return m.t + ch - u * ch;
          };

          const fx = (v) => m.l + ((v - xMin) / (xMax - xMin)) * cw;

          const grid = sLocal("g", { class: "lsc-grid" });

          const y0 = fy(0);
          grid.appendChild(
            sLocal("line", {
              x1: m.l,
              y1: y0,
              x2: W - m.r,
              y2: y0,
              class: "hline0"
            })
          );

          [400, 600, 800].forEach(v => {
            const yy = fy(v);
            grid.appendChild(
              sLocal("line", {
                x1: m.l,
                y1: yy,
                x2: W - m.r,
                y2: yy,
                class: "hline"
              })
            );
          });

          svg.appendChild(grid);

          const yAxis = sLocal("g", { class: "lsc-yaxis" });
          const labelOffset = 6;

          [0, 400, 600, 800].forEach(v => {
            const yy = fy(v);
            yAxis.appendChild(
              sLocal("text", {
                x: m.l,
                y: yy - labelOffset,
                "text-anchor": "start"
              }, v === 0 ? "0" : `${v}P`)
            );
          });

          svg.appendChild(yAxis);

          const xAxis = sLocal("g", { class: "lsc-xaxis" });
          const tickLen = 8;

          const spanYears = xMax - xMin;
          let xStep = 1;
          if ((W < 720 && spanYears > 15) || (W >= 720 && spanYears > 30)) {
            xStep = 5;
          }
          const startTick = Math.ceil(xMin / xStep) * xStep;

          for (let v = startTick; v <= Math.floor(xMax); v += xStep) {
            const xx = fx(v);
            grid.appendChild(
              sLocal("line", {
                x1: xx,
                y1: m.t + ch,
                x2: xx,
                y2: m.t + ch + tickLen,
                class: "xtick"
              })
            );
            xAxis.appendChild(
              sLocal("text", {
                x: xx,
                y: m.t + ch + tickLen + 6,
                "text-anchor": "middle"
              }, String(v))
            );
          }

          xAxis.appendChild(
            sLocal("text", {
              x: m.l + cw / 2,
              y: m.t + ch + tickLen + 26,
              "text-anchor": "middle"
            }, "Alter")
          );

          svg.appendChild(xAxis);

          const defs = sLocal("defs");
          const gradBlueId  = `lsc-grad-b-${Math.random().toString(36).slice(2)}`;
          const gradGreenId = `lsc-grad-g-${Math.random().toString(36).slice(2)}`;
          const mkGrad = (id, color) => {
            const g = sLocal("linearGradient", { id, x1:"0", y1:"0", x2:"0", y2:"1" });
            g.appendChild(sLocal("stop", { offset:"0%",   "stop-color":color, "stop-opacity":"0.22" }));
            g.appendChild(sLocal("stop", { offset:"100%", "stop-color":color, "stop-opacity":"0" }));
            return g;
          };
          defs.appendChild(mkGrad(gradBlueId,  "rgb(227,6,19)"));
          defs.appendChild(mkGrad(gradGreenId, "rgb(5,105,180)"));
          svg.appendChild(defs);

          const drawSeries = (pts, colorClass, withArea=false, fillId=null) => {
            if (!pts || !pts.length) return;

            const pathD = pts.map((p,i) => {
              const Y = Math.max(0, Math.min(1000, p.lsc));
              return `${i ? "L" : "M"}${fx(p.age)} ${fy(Y)}`;
            }).join(" ");

            if (withArea){
              const last  = pts[pts.length-1];
              const first = pts[0];
              const areaD = pathD + ` L${fx(last.age)} ${y0} L${fx(first.age)} ${y0} Z`;
              svg.appendChild(
                sLocal("path", {
                  d: areaD,
                  class: `lsc-area ${colorClass}`,
                  fill: `url(#${fillId})`
                })
              );
            }

            svg.appendChild(
              sLocal("path", {
                d: pathD,
                class: `lsc-line ${colorClass}`
              })
            );

            const dots = sLocal("g", { class: `lsc-dots ${colorClass}` });
            pts.forEach((p, idx) => {
              const Y = Math.max(0, Math.min(1000, p.lsc));
              const c = sLocal("circle", {
                cx: fx(p.age),
                cy: fy(Y),
                r: 4.5,
                class: "lsc-dot",
                tabindex: 0,
                "data-idx": idx,
                "data-series": colorClass,
                "data-name": (colorClass === "blue" ? (a?.name || "") : (cmpAth?.name || "")),
                "data-lsc": p.lsc.toLocaleString("de-DE", { minimumFractionDigits:2, maximumFractionDigits:2 }),
                "data-date": (new Date(p.date)).toLocaleDateString("de-DE"),
                "data-meet": p.meet_name || "—"
              });

              const show = () => {
                activeIdx = idx;
                activeSeries = colorClass;
                c.setAttribute("data-active","1");
                const name = c.dataset.name ? ` – ${c.dataset.name}` : "";
                tip.querySelector(".tt-l1").textContent = `${c.dataset.lsc} LSC${name}`;
                tip.querySelector(".tt-l2").textContent = `${c.dataset.date} — ${c.dataset.meet || "—"}`;
                positionTipNearCircle(c);
              };
              const hide = () => {
                if (activeIdx === idx && activeSeries === colorClass){
                  activeIdx = null;
                }
                c.removeAttribute("data-active");
                tip.style.opacity = "0";
                tip.style.transform = "translate(-9999px,-9999px)";
                tip.setAttribute("aria-hidden","true");
              };

              c.addEventListener("pointerenter", show);
              c.addEventListener("pointerleave", hide);
              c.addEventListener("focus",        show);
              c.addEventListener("blur",         hide);
              c.addEventListener("pointerdown", (e)=>{ e.stopPropagation(); show(); });

              dots.appendChild(c);
            });
            svg.appendChild(dots);
          };

          if (cmpPts && cmpPts.length){
            drawSeries(cmpPts, "green", true, gradGreenId);
          }
          drawSeries(basePts, "blue", true, gradBlueId);

          function positionTipNearCircle(circle){
            const pt = svg.createSVGPoint();
            pt.x = +circle.getAttribute("cx");
            pt.y = +circle.getAttribute("cy");
            const scr = pt.matrixTransform(svg.getScreenCTM());
            const cardRect = card.getBoundingClientRect();
            const px = scr.x - cardRect.left;
            const py = scr.y - cardRect.top;

            tip.style.opacity = "1";
            tip.style.transform = "translate(0,0)";
            tip.setAttribute("aria-hidden","false");
            tip.style.left = "0px";
            tip.style.top  = "0px";
            const tr = tip.getBoundingClientRect();

            const offX = 6, offY = 10;
            let L = Math.round(px + offX - tr.width*0.12);
            let T = Math.round(py - offY - tr.height - 6);
            const maxL = card.clientWidth  - tr.width  - 8;
            const maxT = card.clientHeight - tr.height - 8;
            L = Math.max(8, Math.min(L, maxL));
            T = Math.max(8, Math.min(T, maxT));
            tip.style.left = `${L}px`;
            tip.style.top  = `${T}px`;
          }

          if (activeIdx != null){
            const sel = `.lsc-dots.${activeSeries} .lsc-dot[data-idx="${activeIdx}"]`;
            const active = svg.querySelector(sel);
            if (active) positionTipNearCircle(active);
          }

          if (!card._lscOutsideHandlerAttached){
            card.addEventListener("pointerdown", (e) => {
              if (!svg.contains(e.target)){
                activeIdx = null;
                tip.style.opacity = "0";
                tip.style.transform = "translate(-9999px,-9999px)";
                tip.setAttribute("aria-hidden","true");
                svg.querySelectorAll('.lsc-dot[data-active="1"]').forEach(n => n.removeAttribute("data-active"));
              }
            }, { passive:true });
            card._lscOutsideHandlerAttached = true;
          }
        }


    const ro = new ResizeObserver(paint);
    ro.observe(vp);
    requestAnimationFrame(paint);

    return card;
  }

  function renderTimeChart(a){
    const sLocal = (tag, attrs = {}, ...children) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs||{}).forEach(([k,v]) => v!=null && el.setAttribute(k,String(v)));
      children.flat().forEach(c => c!=null && el.appendChild(typeof c==="string" ? document.createTextNode(c) : c));
      return el;
    };
    const el = (tag, attrs = {}, ...children) => {
      const node = document.createElement(tag);
      for (const [k,v] of Object.entries(attrs||{})){
        if (k === "class") node.className = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
        else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
      }
      children.flat().forEach(c => c!=null && node.appendChild(typeof c==="string" ? document.createTextNode(c) : c));
      return node;
    };

    const card = el("div", { class:"ath-time-card" });

    const firstWithData = DISCIPLINES.find(d => buildTimeSeriesForDiscipline(a, d.key).length > 0);
    let discKey = (firstWithData || DISCIPLINES[0]).key;

    const lanes = new Set(["25","50"]);

    let basePts = [], cmpAth = null, cmpPts = null;

    const btn50 = el("button", {
      class: "seg-btn active", type: "button", "aria-pressed": "true",
      onclick: () => toggleLane("50", btn50)
    }, "50m");

    const btn25 = el("button", {
      class: "seg-btn active", type: "button", "aria-pressed": "true",
      onclick: () => toggleLane("25", btn25)
    }, "25m");

    const laneSeg = el("div", { class: "seg time-lanes" }, btn50, btn25);

    const sel = el("select", { class:"time-disc" });
    DISCIPLINES.forEach(d => {
      sel.appendChild(el("option", { value:d.key, selected: d.key===discKey }, d.label));
    });
    sel.addEventListener("change", () => {
      discKey = sel.value;
      recomputeSeries();
      paint();
    });

    const head = el("div", { class:"time-head" },
      el("h4", {}, "Zeit-Verlauf"),
      sel,
      laneSeg
    );
    card.appendChild(head);
    recomputeSeries();


    function setBtnState(btn, on){
      btn.classList.toggle("active", !!on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }

    function toggleLane(code, btn){
      const isOn = lanes.has(code);
      if (isOn && lanes.size === 1) return;
      if (isOn) lanes.delete(code); else lanes.add(code);
      setBtnState(btn, lanes.has(code));
      recomputeSeries();
      paint();
    }

    function recomputeSeries(){
      basePts = buildTimeSeriesForDiscipline(a, discKey, { lanes });
      if (cmpAth){
        const full   = withHydratedMeets(cmpAth);
        const merged = mergeDuplicateMeets(full.meets);
        cmpPts = buildTimeSeriesForDiscipline({ ...full, meets: merged }, discKey, { lanes });
      } else {
        cmpPts = null;
      }
    }

    const Y_SPEC = {
      "50_retten":         { base:  25, step: 5 },
      "100_retten_flosse": { base:  40, step: 10 },
      "100_kombi":         { base:  50, step: 10 },
      "100_lifesaver":     { base:  40, step: 10 },
      "200_super":         { base: 120, step: 10 },
      "200_hindernis":     { base: 110, step: 10 },
    };

    function getYAxisBaseSecSpec(dKey){
      return (Y_SPEC[dKey]?.base ?? 0);
    }
    function getYAxisStepSec(dKey){
      return (Y_SPEC[dKey]?.step ?? 30);
    }

    const ceilToStep = (sec, step) => Math.ceil(sec / step) * step;

    const vp  = el("div", { class:"time-viewport" });
    const svg = sLocal("svg", { class:"time-svg", role:"img", "aria-label":"Zeit-Verlauf" });
    vp.appendChild(svg);
    card.appendChild(vp);

    const tip = el("div", { class:"time-tooltip", "aria-hidden":"true" },
      el("div", { class:"tt-l1" }),
      el("div", { class:"tt-l2" })
    );
    card.appendChild(tip);

    const legend = el("div", { class:"time-legend" },
      el("span", { class:"time-key time-key--base" },
        el("span", { class:"time-key-dot blue"}), el("span", { class:"time-key-label" }, a?.name || "Athlet A")
      )
    );
    card.appendChild(legend);

    const cmpWrap  = el("div", { class:"time-compare-wrap" });
    const cmpInput = el("input", { class:"time-input", type:"search", placeholder:"Athlet zum Vergleich suchen …", autocomplete:"off", role:"searchbox" });
    const clearBtn = el("button", { class:"time-clear hidden", type:"button" }, "Entfernen");
    const suggest  = el("div", { class:"time-suggest hidden", role:"listbox" });
    cmpWrap.appendChild(el("div", { class:"time-search-row" }, cmpInput, clearBtn));
    cmpWrap.appendChild(suggest);
    card.appendChild(cmpWrap);

    let cmpQuery = "", cmpResults = [], cmpActive = -1;
    const normalizeLocal2 = (s) => (s||"").toString().toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g," ").trim();

    function updateCmpSuggest(){
      const q = cmpQuery.trim();
      suggest.innerHTML = "";
      if (q.length < MIN_QUERY_LEN){
        suggest.appendChild(el("div", { class:"time-suggest-empty" }, `Mind. ${MIN_QUERY_LEN} Zeichen eingeben`));
        suggest.classList.remove("hidden"); return;
      }
      const nq = normalizeLocal2(q);
      const pool = (AppState?.athletes || []).filter(x => x?.id !== a?.id);
      const list = pool.map(ax => ({ ax, n: normalizeLocal2(ax.name) }))
        .filter(x => x.n.includes(nq))
        .sort((l,r) => {
          const al = l.n.startsWith(nq) ? 0 : 1;
          const ar = r.n.startsWith(nq) ? 0 : 1;
          return (al-ar) || l.n.localeCompare(r.n);
        })
        .slice(0,8);
      cmpResults = list.map(x => x.ax);
      cmpActive = cmpResults.length ? 0 : -1;

      if (!cmpResults.length){
        suggest.appendChild(el("div", { class:"time-suggest-empty" }, "Keine Treffer"));
        suggest.classList.remove("hidden"); return;
      }

      cmpResults.forEach((ax, idx) => {
        const item = el("div", { class:"time-suggest-item"+(idx===cmpActive?" active":""), role:"option", "aria-selected": idx===cmpActive?"true":"false" });
        item.appendChild(renderCapAvatar(ax, "sm", "time-suggest-avatar"));
        const text = el("div", { class:"time-suggest-text" },
          el("div", { class:"time-suggest-name" }, ax.name, " ", el("span",{class:"time-year"},`(${ax.jahrgang})`)),
          el("div", { class:"time-suggest-sub" }, "DLRG ", currentOrtsgruppeFromMeets(ax) || ax.ortsgruppe || "")
        );
        item.appendChild(text);
        item.addEventListener("click", () => { chooseCmp(ax); });
        item.addEventListener("mouseenter", ()=>{ suggest.querySelector(".active")?.classList.remove("active"); item.classList.add("active"); cmpActive = idx; });
        suggest.appendChild(item);
      });
      suggest.classList.remove("hidden");
    }
    function hideCmpSuggest(){ suggest.classList.add("hidden"); }
    function chooseCmp(ax){
      const full   = withHydratedMeets(ax);
      const merged = mergeDuplicateMeets(full.meets);

      cmpAth = { ...full, meets: merged };
      recomputeSeries();
      paint();

      legend.querySelector(".time-key--cmp")?.remove();
      legend.appendChild(
        el("span", { class:"time-key time-key--cmp" },
          el("span", { class:"time-key-dot green"}),
          el("span", { class:"time-key-label" }, cmpAth.name)
        )
      );

      clearBtn.classList.remove("hidden");
      hideCmpSuggest();
      dismissKeyboard();
      cmpInput.value = cmpQuery = "";
      paint();
    }

    cmpInput.addEventListener("input", e => { cmpQuery = e.target.value || ""; updateCmpSuggest(); });
    cmpInput.addEventListener("keydown", e => {
      if (!cmpResults.length) return;
      if (e.key === "ArrowDown"){ e.preventDefault(); cmpActive = (cmpActive+1) % cmpResults.length; updateCmpSuggest(); }
      else if (e.key === "ArrowUp"){ e.preventDefault(); cmpActive = (cmpActive-1+cmpResults.length) % cmpResults.length; updateCmpSuggest(); }
      else if (e.key === "Enter"){ e.preventDefault(); chooseCmp(cmpResults[cmpActive>=0?cmpActive:0]); }
      else if (e.key === "Escape"){ hideCmpSuggest(); }
    });
    document.addEventListener("click", (e) => { if (!cmpWrap.contains(e.target)) hideCmpSuggest(); });
    clearBtn.addEventListener("click", () => {
      cmpAth = null; cmpPts = null;
      clearBtn.classList.add("hidden");
      legend.querySelector(".time-key--cmp")?.remove();
      recomputeSeries();
      paint();
    });

    const mmss = (sec) => {
      if (!Number.isFinite(sec)) return "—";
      const m = Math.floor(sec/60);
      const s = Math.floor(sec%60);
      const cs = Math.round((sec - Math.floor(sec)) * 100);
      const sPart = m ? String(s).padStart(2,"0") : String(s);
      return (m? `${m}:${sPart}`: sPart) + "." + String(cs).padStart(2,"0");
    };

    let xMin, xMax, yMin, yMax, activeIdx = null, activeSeries = "blue";
    const updateDomains = () => {
      const all = (cmpPts && cmpPts.length) ? basePts.concat(cmpPts) : basePts;

      if (!all.length){ xMin = 0; xMax = 1; }
      else {
        xMin = Math.floor(Math.min(...all.map(p => p.age)));
        xMax = Math.ceil (Math.max(...all.map(p => p.age)));
        if (xMax === xMin) xMax = xMin + 1;
      }

      const base = getYAxisBaseSecSpec(discKey);
      const step = getYAxisStepSec(discKey);
      const maxData = all.length ? Math.max(...all.map(p => p.sec)) : base + step * 3;

      yMin = base;
      const wanted = Math.max(maxData, base + step * 2);
      yMax = ceilToStep(wanted, step);
      if (yMax <= yMin) yMax = yMin + step;
    };

     function paint(){
      updateDomains();

      const rect = vp.getBoundingClientRect();
      const W = Math.max(320, Math.floor(rect.width));

      let H;
      if (window.innerWidth <= 480) {
        H = 450;
      } else if (window.innerWidth <= 720) {
        H = 500;
      } else {
        H = 560;
      }

      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("width", W);
      svg.setAttribute("height", H);

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const m = { l: 8, r: 8, t: 28, b: 48 };
      const cw = W - m.l - m.r;
      const ch = H - m.t - m.b;
      const fx = v => m.l + ((v - xMin) / (xMax - xMin)) * cw;
      const fy = v => m.t + ch - ((v - yMin) / (yMax - yMin)) * ch;

      const grid  = s("g", { class: "time-grid" });
      const yAxis = s("g", { class: "time-yaxis" });

      const yStep = getYAxisStepSec(discKey);
      for (let v = yMin, first=true; v <= yMax + 1e-9; v += yStep){
        const yy = fy(v);
        grid.appendChild(s("line", { x1:m.l, y1:yy, x2:W-m.r, y2:yy, class: first ? "hline0" : "hline" }));
        yAxis.appendChild(
          s("text", { x:m.l, y:yy, "text-anchor":"start", "dominant-baseline":"middle" }, mmss(v))
        );
        first = false;
      }

      const spanYears = xMax - xMin;
      let xStep = 1;
      if ((W < 720 && spanYears > 15) || (W >= 720 && spanYears > 30)) {
        xStep = 5;
      }
      const startTick = Math.ceil(xMin / xStep) * xStep;

      const xAxis = s("g", { class: "time-xaxis" });
      const tickLen = 8;

      for (let v = startTick; v <= Math.floor(xMax); v += xStep) {
        const xx = fx(v);
        grid.appendChild(s("line", { x1: xx, y1: m.t + ch, x2: xx, y2: m.t + ch + tickLen, class: "xtick" }));
        xAxis.appendChild(s("text", { x: xx, y: m.t + ch + tickLen + 6, "text-anchor": "middle" }, String(v)));
      }
      xAxis.appendChild(s("text", { x: m.l + cw/2, y: m.t + ch + tickLen + 26, "text-anchor": "middle" }, "Alter"));

      yAxis.appendChild(s("text", { x: m.l, y: m.t - 4, "text-anchor": "start" }, ""));

      svg.appendChild(grid);
      svg.appendChild(xAxis);
      svg.appendChild(yAxis);

      const defs = s("defs");
      const gidB = `time-grad-b-${Math.random().toString(36).slice(2)}`;
      const gidG = `time-grad-g-${Math.random().toString(36).slice(2)}`;
      const mkGrad = (id, color) => {
        const g = s("linearGradient", { id, x1:"0", y1:"0", x2:"0", y2:"1" });
        g.appendChild(s("stop", { offset:"0%",   "stop-color":color, "stop-opacity":"0.22" }));
        g.appendChild(s("stop", { offset:"100%", "stop-color":color, "stop-opacity":"0" }));
        return g;
      };
      defs.appendChild(mkGrad(gidB, "rgb(227,6,19)"));
      defs.appendChild(mkGrad(gidG, "rgb(5,105,180)"));
      svg.appendChild(defs);

      const drawSeries = (pts, colorClass, withArea=false, fillId=null) => {
        if (!pts || !pts.length) return;
        const pathD = pts.map((p,i)=> `${i?"L":"M"}${fx(p.age)} ${fy(p.sec)}`).join(" ");
        if (withArea){
          const areaD = `${pathD} L${fx(pts[pts.length-1].age)} ${fy(yMin)} L${fx(pts[0].age)} ${fy(yMin)} Z`;
          svg.appendChild(s("path", { d: areaD, class:`time-area ${colorClass}`, fill:`url(#${fillId})` }));
        }
        svg.appendChild(s("path", { d: pathD, class:`time-line ${colorClass}` }));

        const dots = s("g", { class:`time-dots ${colorClass}` });
        pts.forEach((p, idx) => {
          const c = s("circle", {
            cx: fx(p.age), cy: fy(p.sec), r:4.5, class:"time-dot", tabindex:0,
            "data-idx": idx, "data-series": colorClass,
            "data-name": (colorClass==="blue" ? (a?.name||"") : (cmpAth?.name||"")),
            "data-time": mmss(p.sec),
            "data-date": (new Date(p.date)).toLocaleDateString("de-DE"),
            "data-meet": p.meet_name || "—",
            "data-round": p.round || ""  
          });
          const show = () => {
            activeIdx = idx; activeSeries = colorClass;
            c.setAttribute("data-active","1");
            const name = c.dataset.name ? ` – ${c.dataset.name}` : "";
            tip.querySelector(".tt-l1").textContent = `${c.dataset.time}${name}`;
            const roundTxt = c.dataset.round ? ` (${c.dataset.round})` : "";
            tip.querySelector(".tt-l2").textContent = `${c.dataset.date} — ${c.dataset.meet}${roundTxt}`;
            positionTip(c);
          };
          const hide = () => {
            if (activeIdx === idx && activeSeries === colorClass){ activeIdx = null; }
            c.removeAttribute("data-active");
            tip.style.opacity = "0";
            tip.style.transform = "translate(-9999px,-9999px)";
            tip.setAttribute("aria-hidden","true");
          };
          c.addEventListener("pointerenter", show);
          c.addEventListener("pointerleave", hide);
          c.addEventListener("focus", show);
          c.addEventListener("blur", hide);
          c.addEventListener("pointerdown", (e)=>{ e.stopPropagation(); show(); });
          dots.appendChild(c);
        });
        svg.appendChild(dots);
      };

      if (cmpPts && cmpPts.length) {drawSeries(cmpPts, "green", true, gidG);}
      if (basePts.length) {drawSeries(basePts, "blue", true, gidB);}

      function positionTip(circle){
        const pt = svg.createSVGPoint();
        pt.x = +circle.getAttribute("cx");
        pt.y = +circle.getAttribute("cy");
        const scr = pt.matrixTransform(svg.getScreenCTM());
        const cardRect = card.getBoundingClientRect();
        const px = scr.x - cardRect.left;
        const py = scr.y - cardRect.top;

        tip.style.opacity = "1";
        tip.style.transform = "translate(0,0)";
        tip.setAttribute("aria-hidden","false");
        tip.style.left = "0px"; tip.style.top  = "0px";
        const tr = tip.getBoundingClientRect();

        const offX = 6, offY = 10;
        let L = Math.round(px + offX - tr.width*0.12);
        let T = Math.round(py - offY - tr.height - 6);
        const maxL = card.clientWidth  - tr.width  - 8;
        const maxT = card.clientHeight - tr.height - 8;
        L = Math.max(8, Math.min(L, maxL));
        T = Math.max(8, Math.min(T, maxT));
        tip.style.left = `${L}px`;
        tip.style.top  = `${T}px`;
      }

      if (activeIdx != null){
        const sel = `.time-dots.${activeSeries} .time-dot[data-idx="${activeIdx}"]`;
        const active = svg.querySelector(sel);
        if (active) positionTip(active);
      }

      if (!card._timeOutsideHandlerAttached){
        card.addEventListener("pointerdown", (e)=>{
          if (!svg.contains(e.target)){
            activeIdx = null;
            tip.style.opacity = "0";
            tip.style.transform = "translate(-9999px,-9999px)";
            tip.setAttribute("aria-hidden","true");
            svg.querySelectorAll('.time-dot[data-active="1"]').forEach(n => n.removeAttribute("data-active"));
          }
        }, { passive:true });
        card._timeOutsideHandlerAttached = true;
      }

      if (!basePts.length && !(cmpPts && cmpPts.length)){
        const empty = el("div", { class:"best-empty" },
          "Keine Zeiten für ", (DISCIPLINES.find(d=>d.key===discKey)?.label || "diese Disziplin"), "."
        );
        svg.appendChild(s("g"));
        if (!card.querySelector(".best-empty")) card.appendChild(empty);
      } else {
        card.querySelector(".best-empty")?.remove();
      }
    }

    const ro = new ResizeObserver(paint);
    ro.observe(vp);
    requestAnimationFrame(paint);

    return card;
  }

  function buildLSCSeries(a){
    const jahrgang = Number(a?.jahrgang);
    if (!Number.isFinite(jahrgang)) return [];
    const meets = Array.isArray(a?.meets) ? a.meets : [];
    const birth = new Date(`${jahrgang}-07-01T00:00:00Z`);

    const rows = [];
    for (const m of meets){
      const dateISO = String(m?.date || "").slice(0,10);
      if (!dateISO) continue;
      const d = new Date(dateISO);
      if (isNaN(d)) continue;

      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      let best = { lauf: -1, lsc: NaN };
      for (const r of runs){
        const lauf = Number(r?._lauf || r?.Vorläufe || 1);
        const lsc  = parseFloat(String(r?.LSC ?? m?.LSC ?? "").replace(",", "."));
        if (Number.isFinite(lauf) && Number.isFinite(lsc) && lauf >= best.lauf){
          best = { lauf, lsc };
        }
      }
      if (!Number.isFinite(best.lsc)) continue;

      const years = (d - birth) / (365.2425 * 24 * 3600 * 1000);
      const age = Math.round(years * 100) / 100;
      const meetName = String(m.meet_name || m.meet || "").replace(/\s+-\s+.*$/, "").trim();

      rows.push({ age, lsc: best.lsc, date: dateISO, meet_name: meetName });
    }

    rows.sort((l, r) => new Date(l.date) - new Date(r.date));
    return rows;
  }


 const AppState = {
    query: "",
    suggestions: [],
    activeIndex: -1,
    selectedAthleteId: null,
    poolLen: "50",
    top10Tables: [],
    currentTop10Index: 0
  };

  const Refs = {
    input: null,
    suggest: null,
    profileMount: null,
    searchWrap: null,
    bestGrid: null,
    bestBtn50: null,
    bestBtn25: null,
    top10Mount: null
  };

    function renderApp() {
        const mount = $("#athleten-container");
        if (!mount) return;

        mount.innerHTML = "";
        const ui = h("section", { class: "ath-ui", role: "region", "aria-label": "Athletenbereich" });

        ui.appendChild(renderSearch());

        const top10 = h("div", { id: "ath-top10", class: "ath-top10" });

        const profile = h("div", { id: "ath-profile" });
        Refs.profileMount = profile;

        if (PAGE_MODE === "athleten") {
            ui.appendChild(top10);
        } else {
            top10.style.display = "none";
        }

        if (PAGE_MODE === "profil") {
            ui.appendChild(profile);
        }

        mount.appendChild(ui);
    }


  function renderSearch() {
    const wrap = h("div", { class: "ath-search-wrap" }); Refs.searchWrap = wrap;
    const input = h("input", { class: "ath-input", type: "search", placeholder: "Name suchen …", role: "searchbox", "aria-label": "Athleten suchen", autocomplete: "off", oninput: onQueryChange, onkeydown: onSearchKeyDown });
    Refs.input = input;
    const searchBtn = h("button", { class: "ath-btn primary", type: "button", title: "Ersten Treffer öffnen",
      onclick: () => { if (AppState.suggestions.length > 0) openProfile(AppState.suggestions[0]); } }, "Öffnen");
    wrap.appendChild(h("div", { class: "ath-ui-search", role: "search" }, input, searchBtn));
    const suggest = h("div", { class: "ath-suggest hidden", role: "listbox", id: "ath-suggest" });
    Refs.suggest = suggest; wrap.appendChild(suggest);

    document.addEventListener("click", (e) => {
      if (!Refs.searchWrap.contains(e.target) && !suggest.contains(e.target)) {
        hideSuggestions();
      }
    });

    return wrap;
  }

  function onQueryChange(e){ AppState.query = e.target.value || ""; updateSuggestions(); }
  function onSearchKeyDown(e){
    const { suggestions, activeIndex } = AppState;
    if (e.key === "ArrowDown") { if (!suggestions.length) return; e.preventDefault(); AppState.activeIndex = (activeIndex + 1) % suggestions.length; paintSuggestions(); }
    else if (e.key === "ArrowUp") { if (!suggestions.length) return; e.preventDefault(); AppState.activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length; paintSuggestions(); }
    else if (e.key === "Enter") { if (!suggestions.length) return; e.preventDefault(); openProfile(suggestions[activeIndex >= 0 ? activeIndex : 0]); }
    else if (e.key === "Escape") { hideSuggestions(); }
  }

  function updateSuggestions() {
    const q = AppState.query.trim();
    if (q.length < MIN_QUERY_LEN) { AppState.suggestions = []; AppState.activeIndex = -1; hideSuggestions(); return; }
    const nq = normalize(q);
    let list = AppState.athletes.map(a => ({ a, nName: normalize(a.name) })).filter(({ nName }) => nName.includes(nq));
    list.sort((l, r) => {
      const aStart = l.nName.startsWith(nq) ? 0 : 1;
      const bStart = r.nName.startsWith(nq) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
      return l.nName.localeCompare(r.nName);
    });
    AppState.suggestions = list.map(x => x.a).slice(0, 8);
    AppState.activeIndex = AppState.suggestions.length ? 0 : -1;
    paintSuggestions();
  }

  function hideSuggestions(){ if (Refs.suggest) { Refs.suggest.classList.add("hidden"); Refs.suggest.innerHTML = "";} }

  function paintSuggestions(){
    const box = Refs.suggest; if (!box) return;
    const q = AppState.query.trim(); box.innerHTML = "";

    if (!q || !AppState.suggestions.length) {
      box.appendChild(
        h("div", { class: "ath-suggest-empty" },
          q.length < MIN_QUERY_LEN ? `Mind. ${MIN_QUERY_LEN} Zeichen eingeben` : "Keine Treffer"
        )
      );
      box.classList.remove("hidden");
      return;
    }

    AppState.suggestions.forEach((a, idx) => {
  const item = h("div", {
    class: "ath-suggest-item" + (idx === AppState.activeIndex ? " active" : ""),
    role: "option",
    "aria-selected": idx === AppState.activeIndex ? "true" : "false",

    onclick: (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openProfile(a);
    },

    onpointerenter: () => {
      if (AppState.activeIndex === idx) return;
      box.querySelector('.ath-suggest-item.active')?.classList.remove('active');
      item.classList.add('active');
      AppState.activeIndex = idx;
    },

    onmouseenter: () => {
      if (AppState.activeIndex === idx) return;
      box.querySelector('.ath-suggest-item.active')?.classList.remove('active');
      item.classList.add('active');
      AppState.activeIndex = idx;
    }
  });

      const av = renderCapAvatar(a, "sm", "ath-suggest-avatar");
      item.appendChild(av);

      const nameEl = h("div", { class: "ath-suggest-name" });
      nameEl.innerHTML = `${highlight(a.name, q)} <span class="ath-year">(${a.jahrgang})</span>`;

      const ogNow = currentOrtsgruppeFromMeets(a) || a.ortsgruppe || "";
      const sub = h("div", { class: "ath-suggest-sub" }, formatOrtsgruppe(ogNow));

      const text = h("div", { class: "ath-suggest-text" }, nameEl, sub);
      item.appendChild(text);

      box.appendChild(item);
    });

    box.classList.remove("hidden");
    Refs.placeSuggest && Refs.placeSuggest();

    requestAnimationFrame(() => { Refs.placeSuggest && Refs.placeSuggest(); });
  }

  function renderBahnSwitch(athlete) {
    const wrap = h("div", { class: "ath-bests-switch", role: "group", "aria-label": "Bahnlänge" });
    const b50 = h("button", { class: "seg-btn" + (AppState.poolLen === "50" ? " active" : ""), type: "button",
      onclick: () => { if (AppState.poolLen !== "50") { AppState.poolLen = "50"; b50.classList.add("active"); b25.classList.remove("active"); paintBestzeitenGrid(athlete); } } }, "50 m");
    const b25 = h("button", { class: "seg-btn" + (AppState.poolLen === "25" ? " active" : ""), type: "button",
      onclick: () => { if (AppState.poolLen !== "25") { AppState.poolLen = "25"; b25.classList.add("active"); b50.classList.remove("active"); paintBestzeitenGrid(athlete); } } }, "25 m");
    Refs.bestBtn50 = b50; Refs.bestBtn25 = b25;
    return h("div", { class: "seg" }, b50, b25);
  }

  function renderBestzeitenSection(athlete) {
    const header = h("div", { class: "ath-bests-header" }, h("h3", {}, ""), renderBahnSwitch(athlete));
    const grid = h("div", { class: "ath-bests-grid" }); Refs.bestGrid = grid;
    const section = h("div", { class: "ath-profile-section bests" }, header, grid);
    paintBestzeitenGrid(athlete);
    section.appendChild(renderTimeChart(athlete));
    return section;
  }

  function paintBestzeitenGrid(athlete) {
    if (!Refs.bestGrid) return;

    const lane    = AppState.poolLen || "50";
    const times   = (athlete.pbs   && athlete.pbs[lane])   || {};
    const statsMap= (athlete.stats && athlete.stats[lane]) || {};
    const meets   = Array.isArray(athlete.meets) ? athlete.meets : [];

    Refs.bestGrid.innerHTML = "";

    function findPbMeetNameForDisc(d, bestSec) {
      if (!Number.isFinite(bestSec)) return "";

      let bestName = "";
      let bestDate = null;

      for (const m of meets) {
        if (!m) continue;

        const mLane = (m.pool === "25" ? "25" : (m.pool === "50" ? "50" : null));
        if (mLane !== lane) continue;

        const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];

        for (const r of runs) {
          const raw = r[d.meetZeit];
          const sec = parseTimeToSec(raw);
          if (!Number.isFinite(sec)) continue;

          if (Math.abs(sec - bestSec) > 1e-9) continue;

          const rawName = String(m.meet_name || m.meet || "").trim();
          const nm      = rawName;

          const dStr    = String(m.date || "").slice(0, 10);
          const dObj    = new Date(dStr);

          if (!bestName) {
            bestName = nm;
            bestDate = Number.isNaN(dObj.getTime()) ? null : dObj;
          } else if (!Number.isNaN(dObj.getTime()) && bestDate && dObj < bestDate) {
            bestName = nm;
            bestDate = dObj;
          }
        }
      }
      return bestName;
    }


    const showList = DISCIPLINES.filter(d => {
      const hasTime = Number.isFinite(times[d.key]);
      const dqOnly  = Number(statsMap[d.key]?.dq || 0) > 0;
      return hasTime || dqOnly;
    });

    if (!showList.length) {
      Refs.bestGrid.appendChild(
        h("div", { class: "best-empty" },
          lane === "50" ? "Keine Bestzeiten auf 50 m vorhanden." : "Keine Bestzeiten auf 25 m vorhanden."
        )
      );
      return;
    }

    showList.forEach(d => {
      const sec    = times[d.key]; 
      const st     = statsMap[d.key] || {};
      const starts = Number(st.starts || 0);
      const dq     = Number(st.dq || 0);
      const hasTime= Number.isFinite(sec);

      const frontValue = hasTime ? formatSeconds(sec) : (dq > 0 ? "DQ" : "—");
      const aria = hasTime ? `Bestzeit ${formatSeconds(sec)}` : (dq > 0 ? "DQ" : "keine Zeit");

      const compName = hasTime ? findPbMeetNameForDisc(d, sec) : "";

      const tile = h("article", {
        class: "best-tile",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": `${d.label} – ${aria}${compName ? " – " + compName : ""}`
      });

      const inner = h("div", { class: "tile-inner" });

      const frontChildren = [
        h("div", { class: "best-label" }, d.label),
        h("div", { class: "best-time"  }, frontValue)
      ];
      if (compName) {
        frontChildren.push(
          h("div", { class: "best-meet" }, compName)
        );
      }

      const front = h("div", { class: "tile-face tile-front" }, ...frontChildren);

      const avgSec = avgTimeForDiscipline(athlete, lane, d);
      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "tile-stats" },
          statRow("Schnitt", Number.isFinite(avgSec) ? formatSeconds(avgSec) : "—"),
          statRow("Starts", starts),
          statRow("DQ / Strafen", dq)
        )
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);
      Refs.bestGrid.appendChild(tile);

      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) tile.addEventListener("pointerdown", toggleLock);
      else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, { passive: true });
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleLock();
        }
      });

      function statRow(k, v){
        return h("div", { class: "stat" },
          h("span", { class: "k" }, k),
          h("span", { class: "v" }, String(v))
        );
      }
    });

    function fitBestLabels() {
      const labels = document.querySelectorAll('.best-label');
      const MAX = 0.8;   
      const MIN = 0.55; 

      labels.forEach(label => {
        let size = MAX;
        label.style.fontSize = MAX + 'rem';
        label.style.whiteSpace = 'nowrap';

        while (label.scrollWidth > label.clientWidth && size > MIN) {
          size -= 0.02; 
          label.style.fontSize = size.toFixed(2) + 'rem';
        }
      });
    }

    window.addEventListener('load', fitBestLabels);
    window.addEventListener('resize', fitBestLabels);

  }

  function renderMedalStats(a) {
    const m = (a && a.medals) || {};
    const g = Number(m.gold || 0), s = Number(m.silver || 0), b = Number(m.bronze || 0);
    const total = g + s + b, max = Math.max(g, s, b, 1), H = 115;
    const bar = (cls, label, value) => {
      const hpx = Math.round((value / max) * H);
      return hDiv("div", { class: `med-col ${cls}` },
        hDiv("div", { class: "med-count" }, String(value)),
        hDiv("div", { class: "med-barWrap" }, hDiv("div", { class: "med-bar", style: `height:${hpx}px` })),
        hDiv("div", { class: "med-label" }, label)
      );
    };
    return hDiv("aside", { class: "med-card", "aria-label": "Medaillen" },
      hDiv("div", { class: "med-head" }, hDiv("div", { class: "med-title" }, m.title || "Medaillen"), hDiv("div", { class: "med-total" }, String(total))),
      hDiv("div", { class: "med-grid" }, bar("gold","GOLD",g), bar("silver","SILBER",s), bar("bronze","BRONZE",b))
    );
  }

  function renderOverviewSection(a){
    const header = h("div", { class: "ath-info-header" }, h("h3", {}, ""));
    const grid = h("div", { class: "ath-info-grid" });

    const meets = computeMeetInfo(a);
    const totalDisc = Number.isFinite(+a.totalDisciplines) ? +a.totalDisciplines : null;
    const totalDQ = sumAllDQ(a);
    const startsPer = computeStartsPerStartrecht(a);
    const totalStarts = totalStartsFromMeets(a);
    const dqLane = computeLaneDQProb(a);
    const totalMeters = sumWettkampfMeter(a);
    const chartCard = renderLSCChart(a);
    const pieCard = renderDisciplinePieCard(a);

    grid.appendChild(infoTileBig("LSC", a.lsc != null ? fmtInt(a.lsc) : "—"));
    grid.appendChild(infoTileWettkaempfeFlip(a, meets));
    grid.appendChild(infoTileStartsFlip(totalStarts, startsPer));
    grid.appendChild(infoTileDQFlip(totalDQ, dqLane));
    grid.appendChild(renderBahnverteilungTile(a));
    grid.appendChild(renderRegelwerkTile(a));
    grid.appendChild(infoTileYearsFlip(meets.activeYears, meets.first, meets.firstName));
    grid.appendChild(infoTileMetersFlip("Wettkampfmeter", totalMeters, meets.total));

    return h("div", { class: "ath-profile-section info" }, header, grid, chartCard, pieCard);


    function infoTile(label, value){
      return h("div", { class: "info-tile" }, h("div", { class: "info-label" }, label), h("div", { class: "info-value" }, value));
    }
    function infoTileBig(label, value){
      const title = h("div", { class: "info-label lsc-label", "data-state": "short" },
        h("span", { class: "label label-short", "aria-hidden": "false" }, "LSC"),
        h("span", { class: "label label-long",  "aria-hidden": "true"  }, "Lifesaving Score")
      );
      const valueEl = h("div", { class: "info-value big" }, value);
      const wrap = h("div", { class: "info-tile accent lsc-tile", role: "button", tabindex: "0", "aria-pressed": "false",
        onclick: toggle, onkeydown: (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); toggle(); } } }, title, valueEl);
      function toggle(){
        const toLong = title.dataset.state !== "long";
        title.dataset.state = toLong ? "long" : "short";
        title.classList.toggle("show-long", toLong);
        title.querySelector(".label-short")?.setAttribute("aria-hidden", toLong ? "true" : "false");
        title.querySelector(".label-long")?.setAttribute("aria-hidden",  toLong ? "false" : "true");
        wrap.setAttribute("aria-pressed", toLong ? "true" : "false");
      }
      return wrap;
    }


    function renderBahnverteilungTile(a){
      const m = computeMeetInfo(a); 

      const tile  = h("div", {
        class: "info-tile flip dist",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Bahnverteilung"
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Bahnverteilung"),
        (() => {
          const bar = h("div", { class: "info-progress" },
            h("div", { class: "p50", style: `width:${m.pct50 || 0}%` })
          );
          return bar;
        })(),
        h("div", { class: "info-legend" },
          h("span", { class: "l50" }, `50m ${m.pct50 || 0}%`)
        )
      );

      const rows = [];
      if (m.c25 > 0) rows.push(statRow("25m Bahn", m.c25));
      if (m.c50 > 0) rows.push(statRow("50m Bahn", m.c50));
      if (rows.length === 0) rows.push(statRow("—", "—")); 

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Wettkämpfe auf"),
        h("div", { class: "tile-stats" }, rows)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) {
        tile.addEventListener("pointerdown", toggleLock);
      } else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, { passive: true });
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLock(); }
      });

      return tile;

      function statRow(k, v){
        return h("div", { class: "stat" },
          h("span", { class: "k" }, k),
          h("span", { class: "v" }, String(v))
        );
      }
    }


    function infoTileWettkaempfeFlip(a, meets){
      const counts = countStartrechte(a); 
      const rows = Object.entries(counts).filter(([,v]) => v > 0);

      const tile = h("div", {
        class: "info-tile flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Wettkämpfe – Details nach Startrecht",
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Wettkämpfe"),
        h("div", { class: "info-value" }, fmtInt(meets.total))
      );

      const back = h("div", { class: "tile-face tile-back" },
        rows.length
          ? h("div", { class: "tile-stats" },
              ...rows.map(([k,v]) =>
                h("div", { class: "stat" },
                  h("span", { class: "k" }, k),
                  h("span", { class: "v" }, String(v))
                )
              )
            )
          : h("div", { class: "best-empty" }, "Keine Starts mit OG/BZ/LV/BV")
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window){
        tile.addEventListener("pointerdown", toggleLock);
      } else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, {passive:true});
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLock(); }
      });

      return tile;
    }

    function infoTileStartsFlip(total, per){
      const tile = h("div", {
        class: "info-tile flip starts-flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        onclick: toggle,
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Total Starts"),
        h("div", { class: "info-value" }, fmtInt(total))
      );

      const list = [];
      const labelMap = { OG: "Ortsgrppe", BZ: "Bezirk", LV: "Landesverband", BV: "Bundesverband" };
      (["OG","BZ","LV","BV"]).forEach(k => {
        const v = per[k] || 0;
        if (v > 0) {
          list.push(statRow(labelMap[k], v));
        }
      });

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "tile-stats" }, ...list)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      function toggle(){
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      }

      return tile;
    }

    function renderRegelwerkTile(a){
      const c = countRegelwerk(a.meets);

      const tile  = h("div", {
        class: "info-tile flip regelwerk",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Regelwerk"
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Regelwerk"),
        (() => {
          const bar = h("div", { class: "info-progress" },
            h("div", { class: "pIntl", style: `width:${c.pctIntl}%` })
          );
          return bar;
        })(),
        h("div", { class: "info-legend" },
          h("span", {
            class: "lintl"
          }, (c.pctIntl === 0 ? `National: 100%` : `International: ${c.pctIntl}%`))
        )
      );

      const backStats = [];
      if (c.nat > 0)  backStats.push(statRow("National",      c.nat));
      if (c.intl > 0) backStats.push(statRow("International", c.intl));
      if (backStats.length === 0) backStats.push(statRow("—", "—"));

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Regelwerk"),
        h("div", { class: "tile-stats" }, backStats)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) {
        tile.addEventListener("pointerdown", toggleLock);
      } else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, { passive: true });
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLock(); }
      });

      return tile;

      function statRow(k, v){
        return h("div", { class: "stat" },
          h("span", { class: "k" }, k),
          h("span", { class: "v" }, String(v))
        );
      }
    }

    function infoTileYearsFlip(activeYears, firstISO, firstName){
      const tile = h("div", {
        class: "info-tile flip years-flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        onclick: toggle,
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Aktive Jahre"),
        h("div", { class: "info-value" }, fmtInt(activeYears))
      );

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Erster Wettkampf"),
        h("div", { class: "info-value" }, fmtDate(firstISO)),
        firstName ? h("div", { class: "info-sub" }, firstName) : null
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      function toggle(){
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      }
      return tile;
    }

    function infoTileMetersFlip(label, totalMeters, totalMeets){
      const avg = totalMeets ? Math.round(totalMeters / totalMeets) : null;

      const tile  = h("div", {
        class: "info-tile flip meters",
        role: "button", tabindex: "0", "aria-pressed": "false"
      });
      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, label),
        h("div", { class: "info-value" }, fmtMeters(totalMeters)) 
      );

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "⌀ Meter / Wettkampf"),
        h("div", { class: "info-value" }, avg != null ? fmtMeters(avg) : "—")
      );

      inner.append(front, back);
      tile.appendChild(inner);

      const toggle = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) tile.addEventListener("pointerdown", toggle);
      else { tile.addEventListener("click", toggle); tile.addEventListener("touchstart", toggle, { passive: true }); }
      tile.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });

      return tile;
    }

    function infoTileDQFlip(totalDQ, dqLane){
      const tile = h("div", {
        class: "info-tile flip dq-flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        onclick: toggle,
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "DQ / Strafen"),
        h("div", { class: "info-value" }, fmtInt(totalDQ))
      );

      const rows = [];
      if (dqLane["25"].starts > 0){
        rows.push(
          h("div", { class: "dq-row" },
            h("span", { class: "lane" },  "25m"),
            h("span", { class: "pct"  },  `${dqLane["25"].pct.toLocaleString("de-DE",{ minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`),
            h("span", { class: "meta" },  `(${dqLane["25"].dq})`)
          )
        );
      }
      if (dqLane["50"].starts > 0){
        rows.push(
          h("div", { class: "dq-row" },
            h("span", { class: "lane" },  "50m"),
            h("span", { class: "pct"  },  `${dqLane["50"].pct.toLocaleString("de-DE",{ minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`),
            h("span", { class: "meta" },  `(${dqLane["50"].dq})`)
          )
        );
      }

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Wahrscheinlichkeit"),
        h("div", { class: "dq-rows" }, ...rows)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      function toggle(){
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      }
      return tile;
    }




    function statRow(k, v){
      return h("div", { class: "stat" },
        h("span", { class: "k" }, k),
        h("span", { class: "v" }, fmtInt(v))
      );
    }
  }

   function openProfile(a) {
    if (!a) return;

    if (PAGE_MODE === "athleten") {
        const id = a.id ? String(a.id) : "";
        const url = id ? `./profil.html?ath=${encodeURIComponent(id)}` : `./profil.html?name=${encodeURIComponent(String(a.name || "").trim())}`;
        window.location.href = url;
        return;
    }

    if (!Array.isArray(a.meets) || a.meets.length === 0) {
        const list = AllMeetsByAthleteId.get(a.id) || [];
        a = { ...a, meets: list };
    }

    const mergedMeets = mergeDuplicateMeets(a.meets);
    const derived = deriveFromMeets({ ...a, meets: mergedMeets });
    const ax = { ...a, ...derived, meets: mergedMeets };

    AppState.poolLen = (ax && ax.poolLen) ? String(ax.poolLen) : (AppState.poolLen || "50");
    AppState.selectedAthleteId = ax?.id || null;
    dismissKeyboard();
    hideSuggestions();

    const mount = Refs.profileMount;
    if (!mount) return;

    if (!ax) {
        mount.innerHTML = "";
        return;
    }

    const KV = (k, v) =>
        h("span", { class: "kv", "data-key": k },
        h("span", { class: "k" }, k + ":"),
        h("span", { class: "v" }, v)
        );

    const tabsWrap = renderAthTabsAndPanels(ax);

    const header = h("div", { class: "ath-profile-head" },
        renderCapAvatarProfile(ax),
        h("div", { class: "ath-profile-title" },
        h("h2", {}, ...renderAthleteName(ax.name)),
        (() => {
            const gt = genderTag(ax.geschlecht);
            const ak = akLabelFromJahrgang(ax.jahrgang);
            const meets = computeMeetInfo(ax);
            const act = activityStatusFromLast(meets.last);
            const lastStr = fmtDate(meets.last);
            const age = ageFromJahrgang(ax.jahrgang);
            const band = (age != null && age <= 18) ? "youth" : "open";
            const srIcons = renderStartrechtIcons(ax);

            return h("div", { class: "gender-row" },
            h("span", { class: `gender-chip ${gt.cls}`, title: gt.full, "aria-label": `Geschlecht: ${gt.full}` }, gt.full),
            h("span", { class: `ak-chip ${band}`, title: `Altersklasse ${ak}`, "aria-label": `Altersklasse ${ak}` }, ak),
            h("span", { class: `status-chip ${act.key}`, title: `Letzter Wettkampf: ${lastStr}`, "aria-label": `Aktivitätsstatus: ${act.label}. Letzter Wettkampf: ${lastStr}` },
                h("span", { class: "status-dot" }),
                act.label
            ),
            srIcons
            );
        })(),
        h("div", { class: "ath-profile-meta" },
            renderOrtsgruppeMeta(ax),
            KV("Jahrgang", String(ax.jahrgang)),
            KV("Länderpins", renderCountryFlagsInline(ax) || "—"),
            KV("Historie", renderhistorieInline(ax) || "—")
        )
        ),
        renderMedalStats(ax)
    );

    const disclaimer = h("div", { class: "ath-profile-section muted" },
        h("p", {}, "Die Datenbank erfasst nur Einzel-Pool-Wettkämpfe von Badischen Schwimmerinnen und Schwimmern im Rettungssport."),
        h("p", {}, "Staffeln und Freigewässer sind nicht enthalten."),
        h("p", {}, "Platzierungen sind noch nicht alle eingetragen."),
        h("p", {}, "Sollten Fehler oder neue Ergebnisse gefunden werden, wenden sie sich bitte an jan-philipp.gnad@dlrg.org")
    );

    mount.innerHTML = "";
    mount.append(header, tabsWrap, disclaimer);

    installNameFitHandlerOnce();
    requestAnimationFrame(() => { fitProfileName(); });

    if (Refs.input) {
        Refs.input.value = "";
    }
    AppState.query = "";
    AppState.suggestions = [];
    AppState.activeIndex = -1;
    hideSuggestions();

    if (ax?.id) {
        const u = new URL(window.location.href);
        u.searchParams.set("ath", String(ax.id));
        u.hash = "";
        history.replaceState(null, "", u.toString());
    }
   }


  // ---------- Boot ----------
  document.addEventListener("DOMContentLoaded", async () => {
    renderApp();

    await new Promise(requestAnimationFrame);

    try {
      const rows = await loadWorkbookArray("Tabelle2");
      const light = buildIndicesFromRows(rows);
      AppState.athletes = light;
    if (PAGE_MODE === "profil") {
        openFromUrlIfPossible();
    }
      hideSuggestions();
    } catch (err) {
      console.error("Boot-Fehler:", err);
      if (Refs.suggest) {
        Refs.suggest.classList.remove("hidden");
        Refs.suggest.innerHTML = '<div class="ath-suggest-empty">Fehler beim Laden der Daten.</div>';
      }
    }
  });



})();