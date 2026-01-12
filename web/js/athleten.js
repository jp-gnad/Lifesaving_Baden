
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
  const PAGE_MODE = "athleten";

  
    function openAthleteProfileByName(rawName) {
      if (!rawName) return;
      if (!Array.isArray(AppState.athletes) || !AppState.athletes.length) {
        console.warn("Top10: AppState.athletes ist noch leer.");
        return;
      }

      const name = String(rawName).trim();
      if (!name) return;

      const targetNorm = normalize(name);

      let hit = AppState.athletes.find(a => normalize(a.name) === targetNorm);

      if (!hit) {
        const stripped = name.replace(/\s*\(.*?\)\s*$/, "").trim();
        if (stripped && stripped !== name) {
          const n2 = normalize(stripped);
          hit = AppState.athletes.find(a => normalize(a.name) === n2);
        }
      }

      if (!hit) {
        console.warn("Top10: kein Athlet für Namen gefunden:", name);
        return;
      }

      openProfile(hit);

      const prof = document.getElementById("ath-profile");
      if (prof) {
        prof.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    window.openAthleteProfileByName = openAthleteProfileByName;


    function openProfileFromTop10Row(tr) {
      if (!tr) return;

      let name = "";
      if (tr.dataset && tr.dataset.name) {
        name = tr.dataset.name.trim();
      }

      if (!name) {
        const nameEl = tr.querySelector(".ath-top10-name");
        if (nameEl) {
          name = nameEl.textContent.trim();
        }
      }

      if (!name) return;

      if (typeof window.openAthleteProfileByName === "function") {
        window.openAthleteProfileByName(name);
        return;
      }

      const slug = name
        .normalize("NFD")                
        .replace(/\p{Diacritic}/gu, "")  
        .replace(/[^a-zA-Z0-9]+/g, "-") 
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

      window.location.href = `./profil.html#${slug}`;
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
  const TOP10_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/top10.json";

  let AllMeetsByAthleteId = new Map();

  const TOP10_GROUPS = [
    { key: "starts",             label: "Starts",               startCol: 0 },
    { key: "wettkaempfe",        label: "Wettkämpfe",          startCol: 3 },
    { key: "lsc_aktuell",        label: "LSC aktuell",         startCol: 6 },
    { key: "aktive_jahre",       label: "Aktive Jahre",        startCol: 9 },
    { key: "hoechster_lsc",      label: "Höchster LSC",        startCol: 12 },
    { key: "auslandswettkaempfe",label: "Auslandswettkämpfe",  startCol: 15 }
  ];


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

    for (const [id, min] of minimalById.entries()){
      const list = meetsById.get(id) || [];
      let latest = null;
      let lastOG = (min.ortsgruppe || "").trim();

      for (const m of list){
        const dStr = String(m?.date || "").slice(0,10);
        const d = new Date(dStr);
        if (isNaN(d)) continue;
        if (!latest || d > latest){
          latest = d;
          if (m?.Ortsgruppe) lastOG = String(m.Ortsgruppe).trim();
        }
      }
      minimalById.set(id, { ...min, ortsgruppe: lastOG });
    }

    AllMeetsByAthleteId = meetsById;

    const athletesLight = Array.from(minimalById.values());
    athletesLight.sort((l,r) => l.name.localeCompare(r.name, "de"));
    return athletesLight;
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

  function nonEmpty(v){ return v != null && String(v).trim() !== ""; }

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

  function fmtInt(n){ return Number.isFinite(n) ? n.toLocaleString("de-DE") : "—"; }
  function fmtDate(dStr){
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("de-DE");
  }

  function getOrtsgruppe(a) {
    return a.aktuelleOrtsgruppe || a.AktuelleOrtsgruppe || a.ortsgruppe || "";
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

    const ogNow = currentOrtsgruppeFromMeets(a) || a.ortsgruppe || "";
    const file  = capFileFromOrtsgruppe(ogNow);

    const img = h("img", {
      class: "avatar-img",
      alt: `Vereinskappe ${formatOrtsgruppe(ogNow)}`,
      loading: size === "xl" ? "eager" : "lazy",
      decoding: "async",
      fetchpriority: size === "xl" ? "high" : "low"
    });

    // NEU: sofort Fallback, Custom nur bei Erfolg (mit Cache)
    setCapWithCache(img, file);

    wrap.appendChild(img);
    return wrap;
  }


  function deriveCapKeysForAthlete(a) {
    let ogKey = String(
      a?.Ortsgruppe ??
      a?.ortsgruppe ??
      a?.OG ??
      a?.og ??
      ""
    ).trim();

    let lvCode = String(
      a?.LV_state ??
      a?.lv_state ??
      ""
    ).trim().toUpperCase();

    let bvRaw = String(
      a?.BV_natio ??
      a?.BV_nation ??
      ""
    ).trim();

    if (Array.isArray(a?.meets)) {
      for (const m of a.meets) {
        if (!ogKey) {
          const ogM = m.Ortsgruppe ?? m.ortsgruppe ?? m.OG ?? m.og;
          if (ogM) ogKey = String(ogM).trim();
        }
        if (!lvCode) {
          const lvM = m.LV_state ?? m.lv_state;
          if (lvM) lvCode = String(lvM).trim().toUpperCase();
        }
        if (!bvRaw) {
          const bvM = m.BV_natio ?? m.BV_nation;
          if (bvM) bvRaw = String(bvM).trim();
        }
        if (ogKey && lvCode && bvRaw) break;
      }
    }


    return { ogKey, lvCode, bvCode };
  }

  function applyCapFallbackToImg(img, frontEl, ogKey, lvCode, bvCode) {
    let seq = [
      { key: ogKey,  overlay: false },
      { key: lvCode, overlay: true  },
      { key: bvCode, overlay: true  },
    ].filter(e => e.key && String(e.key).trim() !== "");

    if (!seq.length) {
      frontEl.classList.remove("cap-overlay");
      img.src = "svg/Cap-None.svg";
      return;
    }

    let index = 0;
    let noneUsed = false;

    function setOverlay(entry) {
      if (entry.overlay) {
        frontEl.classList.add("cap-overlay");
      } else {
        frontEl.classList.remove("cap-overlay");
      }
    }

    function loadCurrent() {
      const entry = seq[index];
      setOverlay(entry);
      img.src = `svg/Cap-${encodeURIComponent(entry.key)}.svg`;
    }

    img.addEventListener("error", function onErr() {
      if (index + 1 < seq.length) {
        index++;
        loadCurrent();
      } else if (!noneUsed) {
        noneUsed = true;
        frontEl.classList.remove("cap-overlay");
        img.src = "svg/Cap-None.svg";
      } else {
        img.removeEventListener("error", onErr);
      }
    });

    loadCurrent();
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

    const { ogKey, lvCode, bvCode } = deriveCapKeysForAthlete(a);

    const frontImg = front.querySelector("img");
    if (frontImg) {
      applyCapFallbackToImg(frontImg, front, ogKey, lvCode, bvCode);
    }

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

        const backImg = backCap.querySelector("img");
        if (backImg) {
          applyCapFallbackToImg(backImg, back, ogKey, lvCode, bvCode);
        }
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

  function hasStartVal(v){
    return v != null && String(v).trim() !== "";
  }


  function currentOrtsgruppeFromMeets(a){
    const meets = Array.isArray(a?.meets)
      ? a.meets.filter(m => m && m.date && m.Ortsgruppe)
      : [];
    if (meets.length === 0) return a?.ortsgruppe || "";

    const rows = meets.map(m => {
      const d = new Date(m.date);
      if (isNaN(d)) return null;
      const rw = String(m.Regelwerk || "").toLowerCase();
      return {
        ...m,
        _d: d,
        _y: d.getFullYear(),
        _isNational: rw.startsWith("national")
      };
    }).filter(Boolean);

    if (rows.length === 0) return a?.ortsgruppe || "";

    const latestYear = rows.reduce((y, r) => (r._y > y ? r._y : y), rows[0]._y);

    const inYear = rows
      .filter(r => r._y === latestYear)
      .sort((x, y) => x._d - y._d);

    const nationals = inYear.filter(r => r._isNational);
    if (nationals.length > 0) return nationals[0].Ortsgruppe || a?.ortsgruppe || "";

    const lastMeet = inYear[inYear.length - 1];
    return lastMeet?.Ortsgruppe || a?.ortsgruppe || "";
  }

  function collectOrtsgruppenFromMeets(ax) {
    const set = new Set();

    if (Array.isArray(ax?.meets)) {
      for (const m of ax.meets) {
        const og = m?.ortsgruppe || m?.og || "";
        if (!og) continue;
        const norm = String(og).trim();
        if (norm) set.add(norm);
      }
    }

    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "de-DE")
    );
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

  function yearTicksForWidth(xMin, xMax, widthPx){
    const span = xMax - xMin;
    let step = 1;
    if ((widthPx < 720 && span > 15) || (widthPx >= 720 && span > 30)) {
      step = 5;
    }
    let start = Math.ceil(xMin / step) * step;
    if (start > xMax) start = Math.floor(xMin);

    const ticks = [];
    for (let v = start; v <= Math.floor(xMax + 1e-9); v += step) ticks.push(v);

    if (!ticks.length) {
      ticks.push(Math.floor(xMin), Math.ceil(xMax));
    }
    return ticks;
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

  const Top10State = {
    groups: null, 
    currentKey: "starts"
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
    Refs.top10Mount = top10;

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


  async function loadTop10Json() {
    const resp = await fetch(encodeURI(TOP10_URL), { mode: "cors" });
    if (!resp.ok) throw new Error(`Top10 HTTP ${resp.status}`);
    const data = await resp.json();
    return data;
  }

  function buildTop10GroupsFromJson(top10) {
    const out = {};
    const g = top10?.groups || {};

    const map = {
      starts: "disciplines",
      wettkaempfe: "competitions",
      lsc_aktuell: "lscRecent2y",
      aktive_jahre: "activeYears",
      hoechster_lsc: "lscAlltimeHigh",
      auslandswettkaempfe: "foreignStarts"
    };

    for (const def of TOP10_GROUPS) {
      const jsonKey = map[def.key];
      const arr = Array.isArray(g[jsonKey]) ? g[jsonKey] : [];

      out[def.key] = {
        key: def.key,
        label: def.label,
        header: ["", "", def.label],
        rows: arr
          .slice()
          .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
          .map(it => [it.name ?? "", it.og ?? "", it.value ?? ""])
      };
    }
    return out;
  }


  async function initTop10() {
    const mount = Refs.top10Mount;
    if (!mount) return;

    try {
      const top10 = await loadTop10Json();
      Top10State.groups = buildTop10GroupsFromJson(top10);
      renderTop10();
    } catch (err) {
      console.error("Top10 Laden:", err);
      mount.innerHTML = '<div class="ath-top10-error">Top&nbsp;10 konnten nicht geladen werden.</div>';
    }
  }


  function renderTop10CapCell(ortsgruppeRaw) {
    const ogNow = String(ortsgruppeRaw || "").trim();
    const td = h("td", { class: "ath-top10-cap-cell" });

    if (!ogNow) {
      return td;
    }

    const file = capFileFromOrtsgruppe(ogNow);

    const img = h("img", {
      class: "avatar-img",
      alt: `Vereinskappe ${formatOrtsgruppe(ogNow)}`,
      loading: "lazy",
      decoding: "async",
      fetchpriority: "low"
    });

    setCapWithCache(img, file);

    const wrap = h("div", { class: "ath-avatar sm ath-top10-cap" }, img);
    td.appendChild(wrap);
    return td;
  }


  function renderTop10() {
    const mount = Refs.top10Mount;
    if (!mount) return;

    const groups = Top10State.groups || {};
    const available = TOP10_GROUPS.filter(def =>
      groups[def.key] && groups[def.key].rows.length
    );

    if (!available.length) {
      mount.innerHTML = '<div class="ath-top10-empty">Keine Top&nbsp;10 Daten vorhanden.</div>';
      return;
    }

    if (!available.some(g => g.key === Top10State.currentKey)) {
      Top10State.currentKey = available[0].key;
    }

    const current = groups[Top10State.currentKey];

    const select = h("select", { class: "ath-top10-select", "aria-label": "Top-10-Auswahl" },
      available.map(def =>
        h("option", {
          value: def.key,
          selected: def.key === Top10State.currentKey
        }, def.label)
      )
    );

    const head = h("div", { class: "ath-top10-head" },
      h("div", { class: "ath-top10-label" }, "Top-10")
    );

    select.addEventListener("change", (e) => {
      Top10State.currentKey = e.target.value;
      renderTop10();
    });

    let infoNode = null;
    if (current && typeof current.label === "string") {
      const labelLower = current.label.toLowerCase();
      if (labelLower.includes("höchster") && labelLower.includes("lsc")) {
        infoNode = h(
          "div",
          { class: "ath-top10-info" },
          [
            "Hinweis:",
            h("br"),
            "In dieser Auswertung werden nur LifesavingScore-Werte ab dem Jahr 2001 berücksichtigt."
          ]
        );
      }
      if (labelLower.includes("starts")) {
        infoNode = h(
          "div",
          { class: "ath-top10-info" },
          [
            "Hinweis:",
            h("br"),
            "Es werden nur 50m Retten, 100m Retten mit Flossen, 100m Kombi, 100m Lifesaver, 200m Super Lifesaver und 200m Hindernis gezählt."
          ]
        );
      }
      if (labelLower.includes("wettkämpfe")) {
        infoNode = h(
          "div",
          { class: "ath-top10-info" },
          [
            "Hinweis:",
            h("br"),
            "Es werden nur Pool-Einzel Wettkämpfe gezählt."
          ]
        );
      }
      if (labelLower.includes("lsc") && labelLower.includes("aktuell")) {
        infoNode = h(
          "div",
          { class: "ath-top10-info" },
          [
            "Hinweis:",
            h("br"),
            "Es werden nur Sportler berücksichtigt, die in den letzten 2 Jahren an Pool-Einzel Wettkämpfen teilgenommen haben."
          ]
        );
      }
      if (labelLower.includes("aktive") && labelLower.includes("jahre")) {
        infoNode = h(
          "div",
          { class: "ath-top10-info" },
          [
            "Hinweis:",
            h("br"),
            "Es werden nur Jahre gezählt, inden man Pool-Einzel Wettkämpfe geschwommen ist."
          ]
        );
      }
    }

    const tableWrap = h("div", { class: "ath-top10-table-wrap" },
      renderTop10Table(current, select)
    );

    mount.innerHTML = "";
    mount.appendChild(head);
    mount.appendChild(tableWrap);
    if (infoNode) mount.appendChild(infoNode);
  }


  function renderTop10Table(group, headerRightNode) {
    if (!group) return h("div", {}, "Keine Daten.");

    const rows = group.rows || [];

    const headTable = h("table", { class: "ath-top10-table ath-top10-table-head" },
      h("tbody", {},
        h("tr", { class: "ath-top10-header-row" },
          h("th", { class: "ath-top10-header-cell ath-top10-header-nameog" },
            "Name / Ortsgruppe"
          ),
          h("th", { class: "ath-top10-header-cell ath-top10-header-select" },
            h("div", { class: "ath-top10-header-select-wrap" }, headerRightNode || "Wert")
          )
        )
      )
    );

    const bodyRows = rows.map(cells => {
      const name  = String(cells[0] ?? "").trim();
      const og    = String(cells[1] ?? "").trim();
      const value = cells[2] ?? "";

      const capTd = renderTop10CapCell(og);

      const nameOgTd = h("td", { class: "ath-top10-name-cell" },
        h("div", { class: "ath-top10-name" }, name),
        og ? h("div", { class: "ath-top10-og" }, og) : null
      );

      const valueTd = h("td", { class: "ath-top10-value-cell" }, String(value ?? ""));

      return h("tr", {
        class: "ath-top10-row",
        role: "button",
        tabindex: "0",
        dataset: { name },
        onclick: (e) => openProfileFromTop10Row(e.currentTarget),
        onkeydown: (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openProfileFromTop10Row(e.currentTarget);
          }
        },
        onpointerdown: function () { this.classList.add("active"); },
        onpointerup: function () { this.classList.remove("active"); },
        onpointercancel: function () { this.classList.remove("active"); },
        onpointerleave: function () { this.classList.remove("active"); }
      }, capTd, nameOgTd, valueTd);
    });

    const bodyTable = h("table", { class: "ath-top10-table ath-top10-table-body" },
      h("tbody", {}, ...bodyRows)
    );

    return h("div", { class: "ath-top10-table-combo" }, headTable, bodyTable);
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

      item.appendChild(renderCapAvatar(a, "sm", "ath-suggest-avatar"));

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
    function infoTileDist(label, m){
      return h("div", { class: "info-tile dist" },
        h("div", { class: "info-label" }, label),
        h("div", { class: "info-progress" }, h("div", { class: "p50", style: `width:${m.pct50 || 0}%` })),
        h("div", { class: "info-legend" }, h("span", { class: "l50" }, `50m ${m.pct50 || 0}%`))
      );
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
      );

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "⌀ Meter / Wettkampf"),
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

    if (Refs.top10Mount) {
      Refs.top10Mount.style.display = "none";
    }

    if (!Array.isArray(a.meets) || a.meets.length === 0) {
      const list = AllMeetsByAthleteId.get(a.id) || [];
      a = { ...a, meets: list };
    }

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

    if (PAGE_MODE === "athleten") {
      await initTop10();
    }
    await new Promise(requestAnimationFrame); // 1 Frame zum Rendern

    try {
      const rows = await loadWorkbookArray("Tabelle2");
      const light = buildIndicesFromRows(rows);
      AppState.athletes = light;
      hideSuggestions();
    } catch (err) {
      if (Refs.suggest) {
        Refs.suggest.classList.remove("hidden");
        Refs.suggest.innerHTML = '<div class="ath-suggest-empty">Fehler beim Laden der Daten.</div>';
      }
    }
  });



})();