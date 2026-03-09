document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <div id="ath-search-layer"></div>

    <section class="hero">
      <div class="container hero-content">
        <div class="hero-search-spacer" aria-hidden="true"></div>
      </div>
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

  const PAGE_MODE = "profil";
  const EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test (1).xlsx";
  const HERO_DEFAULT_BG_URL = "./png/hintergrund4.JPG";
  const HERO_PORTRAIT_BASE_URL = "./png/pp";

  let AllMeetsByAthleteId = new Map();
  let heroBgRequestId = 0;

  function getHeroEl() {
    return document.querySelector(".hero");
  }

  function heroBaseNameFromAthlete(a) {
    const name = String(a?.name || "").trim();
    const year = String(a?.jahrgang || "").trim();
    if (!name || !year) return "";

    const compactName = name.replace(/\s+/g, "");
    return `${compactName}${year}`;
  }

  function probeImageExists(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  async function findHeroPortraitCandidate(a) {
    const baseName = heroBaseNameFromAthlete(a);
    if (!baseName) return null;

    const exts = ["png", "PNG", "jpg", "JPG"];

    for (let pos = 0; pos <= 100; pos++) {
      for (const ext of exts) {
        const fileName = `${baseName} - ${pos}.${ext}`;
        const url = `${HERO_PORTRAIT_BASE_URL}/${fileName}`;
        const exists = await probeImageExists(url);

        if (exists) {
          return {
            url,
            position: `center ${pos}%`
          };
        }
      }
    }

    for (const ext of exts) {
      const fileName = `${baseName}.${ext}`;
      const url = `${HERO_PORTRAIT_BASE_URL}/${fileName}`;
      const exists = await probeImageExists(url);

      if (exists) {
        return {
          url,
          position: "center 50%"
        };
      }
    }

    return null;
  }

  async function updateHeroBackgroundForAthlete(a) {
    const hero = getHeroEl();
    if (!hero) return;

    const reqId = ++heroBgRequestId;

    hero.style.backgroundImage = `url("${HERO_DEFAULT_BG_URL}")`;
    hero.style.backgroundPosition = "center 50%";

    const hit = await findHeroPortraitCandidate(a);

    if (reqId !== heroBgRequestId) return;
    if (!hit) return;

    hero.style.backgroundImage = `url("${hit.url}")`;
    hero.style.backgroundPosition = hit.position;
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

    const hit = AppState.athletes.find((a) => String(a.id) === id);
    if (!hit) return;

    openProfile(hit);
  }

  function dismissKeyboard() {
    try {
      const ae = document.activeElement;
      if (ae && typeof ae.blur === "function") ae.blur();

      let trap = document.getElementById("kb-blur-trap");
      if (!trap) {
        trap = document.createElement("input");
        trap.type = "text";
        trap.id = "kb-blur-trap";
        trap.tabIndex = -1;
        trap.autocomplete = "off";
        trap.style.position = "fixed";
        trap.style.opacity = "0";
        trap.style.pointerEvents = "none";
        trap.style.height = "0";
        trap.style.width = "0";
        document.body.appendChild(trap);
      }

      trap.focus({ preventScroll: true });
      trap.blur();
    } catch (e) {}
  }

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

        const url = encodeURI(EXCEL_URL);
        const resp = await fetch(url, { mode: "cors" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const buf = await resp.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
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
    gender: 0,
    name: 1,
    lsc: 2,
    z_100l: 3,
    z_50r: 4,
    z_200s: 5,
    z_100k: 6,
    z_100r: 7,
    z_200h: 8,
    excelDate: 9,
    meet_name: 10,
    yy2: 11,
    ortsgruppe: 12,
    LV_state: 13,
    p_mehrkampf: 14,
    p_100l: 15,
    p_50r: 16,
    p_200s: 17,
    p_100k: 18,
    p_100r: 19,
    p_200h: 20,
    pool: 21,
    regelwerk: 22,
    land: 23,
    startrecht: 24,
    wertung: 25,
    vorlaeufe: 26,
    BV_natio: 27,
  };

  function excelSerialToISO(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "";
    const base = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(base.getTime() + num * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function normalizeRegelwerk(s) {
    const t = String(s || "").toLowerCase();
    if (t.startsWith("nat")) return "National";
    if (t.startsWith("int")) return "International";
    return s || "";
  }

  function normalizeLand(x) {
    const t = String(x || "").trim();
    if (!t) return "";
    if (t.toUpperCase() === "GER") return "Deutschland";
    return t;
  }

  function normalizePool(v) {
    return String(v).trim() === "25" || String(v).trim() === "50" ? String(v).trim() : "";
  }

  function normalizeStartrecht(s) {
    const t = String(s || "").trim().toUpperCase();
    return t === "OG" || t === "LV" || t === "BV" || t === "BZ" ? t : "";
  }

  function toNumOrBlank(v) {
    const n = parseInt(String(v).replace(/[^\d\-]/g, ""), 10);
    return Number.isFinite(n) ? String(n) : String(v || "").trim();
  }

  function parseTwoDigitYearWithMeetYear(twoDigit, meetISO) {
    const yy = Number(twoDigit);
    const meetYear = Number((meetISO || "").slice(0, 4));
    if (!Number.isFinite(yy) || !Number.isFinite(meetYear)) return null;
    let y = 1900 + yy;
    while (meetYear - y > 100) y += 100;
    return y;
  }

  function makeAthleteId(name, gender, birthYear) {
    const base = (name || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
    const g = String(gender || "").toLowerCase().startsWith("w") ? "w" : "m";
    return `ath_${base}_${birthYear || "x"}_${g}`;
  }

  function mapRowToAthleteMinimal(row) {
    const name = String(row[COLS.name] || "").trim();
    const gender = String(row[COLS.gender] || "").trim();
    const iso = excelSerialToISO(row[COLS.excelDate]);
    const yy2 = row[COLS.yy2];
    const by = parseTwoDigitYearWithMeetYear(yy2, iso);
    const og = String(row[COLS.ortsgruppe] || "").trim();

    return {
      id: makeAthleteId(name, gender, by),
      name,
      jahrgang: by,
      geschlecht: gender,
      ortsgruppe: og,
      LV_state: String(row[COLS.LV_state] ?? "").trim().toUpperCase(),
      BV_natio: String(row[COLS.BV_natio] ?? "").trim()
    };
  }

  function mapRowToMeet(row) {
    const iso = excelSerialToISO(row[COLS.excelDate]);
    return {
      meet_name: String(row[COLS.meet_name] || "").trim(),
      date: iso,
      pool: normalizePool(row[COLS.pool]),
      Ortsgruppe: String(row[COLS.ortsgruppe] || "").trim(),
      LV_state: String(row[COLS.LV_state] ?? "").trim(),
      BV_natio: String(row[COLS.BV_natio] ?? "").trim(),
      Regelwerk: normalizeRegelwerk(row[COLS.regelwerk]),
      Land: normalizeLand(row[COLS.land]),
      Startrecht: normalizeStartrecht(row[COLS.startrecht]),
      Wertung: String(row[COLS.wertung] || "").trim(),
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
  }

  function buildIndicesFromRows(rows) {
    const minimalById = new Map();
    const meetsById = new Map();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const aMin = mapRowToAthleteMinimal(row);
      if (!aMin.name) continue;

      if (!minimalById.has(aMin.id)) {
        minimalById.set(aMin.id, aMin);
      }

      const meet = mapRowToMeet(row);
      if (!meetsById.has(aMin.id)) meetsById.set(aMin.id, []);
      meetsById.get(aMin.id).push(meet);
    }

    for (const [id, min] of minimalById.entries()) {
      const list = meetsById.get(id) || [];
      let lastOG = String(min.ortsgruppe || "").trim();

      if (list.length) {
        const sorted = list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        for (const m of sorted) {
          const og = String(m?.Ortsgruppe ?? "").trim();
          if (og) {
            lastOG = og;
            break;
          }
        }
      }

      minimalById.set(id, { ...min, ortsgruppe: lastOG });
    }

    AllMeetsByAthleteId = meetsById;

    const athletesLight = Array.from(minimalById.values());
    athletesLight.sort((l, r) => l.name.localeCompare(r.name, "de"));
    return athletesLight;
  }

  const AppState = {
    selectedAthleteId: null,
    poolLen: "50",
    top10Tables: [],
    currentTop10Index: 0,
    athletes: []
  };

  const Refs = {
    profileMount: null,
    bestGrid: null,
    bestBtn50: null,
    bestBtn25: null,
    top10Mount: null
  };

  function renderApp() {
    const mount = $("#athleten-container");
    if (!mount) return;

    mount.innerHTML = "";

    const ui = h("section", {
      class: "ath-ui",
      role: "region",
      "aria-label": "Athletenbereich"
    });

    const searchMount = $("#ath-search-layer");
    if (searchMount && window.AthSearch && typeof window.AthSearch.mount === "function") {
      searchMount.innerHTML = "";
      window.AthSearch.mount(searchMount, { openProfile });
    }

    const profile = h("div", { id: "ath-profile" });
    Refs.profileMount = profile;

    if (PAGE_MODE === "profil") {
      ui.appendChild(profile);
    }

    mount.appendChild(ui);
  }

  function openProfile(a) {
    if (!a) return;

    if (PAGE_MODE === "athleten") {
      const id = a.id ? String(a.id) : "";
      const url = id
        ? `./profil.html?ath=${encodeURIComponent(id)}`
        : `./profil.html?name=${encodeURIComponent(String(a.name || "").trim())}`;
      window.location.href = url;
      return;
    }

    if (window.ProfileHead && typeof window.ProfileHead.setAllMeetsByAthleteId === "function") {
      window.ProfileHead.setAllMeetsByAthleteId(AllMeetsByAthleteId);
    }

    if (window.ProfileTabs && typeof window.ProfileTabs.setAllMeetsByAthleteId === "function") {
      window.ProfileTabs.setAllMeetsByAthleteId(AllMeetsByAthleteId);
    }

    if (window.ProfileTabs && typeof window.ProfileTabs.setAthletes === "function") {
      window.ProfileTabs.setAthletes(AppState.athletes || []);
    }

    const ax = window.ProfileTabs && typeof window.ProfileTabs.hydrateAthleteForTabs === "function"
      ? window.ProfileTabs.hydrateAthleteForTabs(a)
      : a;

    AppState.selectedAthleteId = ax?.id || null;

    updateHeroBackgroundForAthlete(ax);
    dismissKeyboard();

    const mount = Refs.profileMount;
    if (!mount) return;

    mount.innerHTML = "";

    const head = window.ProfileHead && typeof window.ProfileHead.createAthProfileHead === "function"
      ? window.ProfileHead.createAthProfileHead(ax)
      : h("div", { class: "ath-profile-head" });

    const tabsWrap = window.ProfileTabs && typeof window.ProfileTabs.createAthTabsWrap === "function"
      ? window.ProfileTabs.createAthTabsWrap(ax)
      : h("div", { class: "ath-tabs-wrap" });

    const note = window.ProfileNote && typeof window.ProfileNote.createAthProfileNote === "function"
      ? window.ProfileNote.createAthProfileNote()
      : h("div", { class: "ath-profile-section muted" });

    mount.append(head, tabsWrap, note);

    if (window.ProfileHead && typeof window.ProfileHead.installNameFitHandlerOnce === "function") {
      window.ProfileHead.installNameFitHandlerOnce();
    }

    requestAnimationFrame(() => {
      if (window.ProfileHead && typeof window.ProfileHead.fitProfileName === "function") {
        window.ProfileHead.fitProfileName();
      }
    });

    if (ax?.id) {
      const u = new URL(window.location.href);
      u.searchParams.set("ath", String(ax.id));
      u.hash = "";
      history.replaceState(null, "", u.toString());
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    renderApp();
    await new Promise(requestAnimationFrame);

    try {
      const rows = await loadWorkbookArray("Tabelle2");
      const light = buildIndicesFromRows(rows);
      AppState.athletes = light;

      if (window.AthSearch && typeof window.AthSearch.setAthletes === "function") {
        window.AthSearch.setAthletes(light);
      }

      if (window.ProfileHead && typeof window.ProfileHead.setAllMeetsByAthleteId === "function") {
        window.ProfileHead.setAllMeetsByAthleteId(AllMeetsByAthleteId);
      }

      if (window.ProfileTabs && typeof window.ProfileTabs.setAllMeetsByAthleteId === "function") {
        window.ProfileTabs.setAllMeetsByAthleteId(AllMeetsByAthleteId);
      }

      if (window.ProfileTabs && typeof window.ProfileTabs.setAthletes === "function") {
        window.ProfileTabs.setAthletes(AppState.athletes || []);
      }

      if (PAGE_MODE === "profil") {
        openFromUrlIfPossible();
      }
    } catch (err) {
      console.error("Boot-Fehler:", err);

      if (window.AthSearch && typeof window.AthSearch.showError === "function") {
        window.AthSearch.showError("Fehler beim Laden der Daten.");
      }

      if (Refs.profileMount) {
        Refs.profileMount.innerHTML = '<div class="ath-profile-section muted">Fehler beim Laden der Daten.</div>';
      }
    }
  });
})();