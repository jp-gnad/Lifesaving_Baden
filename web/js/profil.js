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

  const PAGE_MODE = "profil";
  const MIN_QUERY_LEN = 3;

  const EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test (1).xlsx";

  let AllMeetsByAthleteId = new Map();

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

  function dismissKeyboard() {
    try {
      Refs.input?.blur();

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
    return (String(v).trim() === "25" || String(v).trim() === "50") ? String(v).trim() : "";
  }

  function normalizeStartrecht(s) {
    const t = String(s || "").trim().toUpperCase();
    return (t === "OG" || t === "LV" || t === "BV" || t === "BZ") ? t : "";
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
    const g = (String(gender || "").toLowerCase().startsWith("w")) ? "w" : "m";
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
      ortsgruppe: og
    };
  }

  function mapRowToMeet(row) {
    const iso = excelSerialToISO(row[COLS.excelDate]);
    const meet = {
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
    return meet;
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
          if (og) { lastOG = og; break; }
        }
      }
      minimalById.set(id, { ...min, ortsgruppe: lastOG });
    }

    AllMeetsByAthleteId = meetsById;

    const athletesLight = Array.from(minimalById.values());
    athletesLight.sort((l, r) => l.name.localeCompare(r.name, "de"));
    return athletesLight;
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
    const wrap = h("div", { class: "ath-search-wrap" });
    Refs.searchWrap = wrap;

    const input = h("input", {
      class: "ath-input",
      type: "search",
      placeholder: "Name suchen …",
      role: "searchbox",
      "aria-label": "Athleten suchen",
      autocomplete: "off",
      oninput: onQueryChange,
      onkeydown: onSearchKeyDown
    });
    Refs.input = input;

    const searchBtn = h("button", {
      class: "ath-btn primary",
      type: "button",
      title: "Ersten Treffer öffnen",
      onclick: () => { if (AppState.suggestions.length > 0) openProfile(AppState.suggestions[0]); }
    }, "Öffnen");

    wrap.appendChild(h("div", { class: "ath-ui-search", role: "search" }, input, searchBtn));

    const suggest = h("div", { class: "ath-suggest hidden", role: "listbox", id: "ath-suggest" });
    Refs.suggest = suggest;
    wrap.appendChild(suggest);

    document.addEventListener("click", (e) => {
      if (!Refs.searchWrap.contains(e.target) && !suggest.contains(e.target)) {
        hideSuggestions();
      }
    });

    return wrap;
  }

  function onQueryChange(e) {
    AppState.query = e.target.value || "";
    updateSuggestions();
  }

  function onSearchKeyDown(e) {
    const { suggestions, activeIndex } = AppState;
    if (e.key === "ArrowDown") {
      if (!suggestions.length) return;
      e.preventDefault();
      AppState.activeIndex = (activeIndex + 1) % suggestions.length;
      paintSuggestions();
    } else if (e.key === "ArrowUp") {
      if (!suggestions.length) return;
      e.preventDefault();
      AppState.activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
      paintSuggestions();
    } else if (e.key === "Enter") {
      if (!suggestions.length) return;
      e.preventDefault();
      openProfile(suggestions[activeIndex >= 0 ? activeIndex : 0]);
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  }

  function updateSuggestions() {
    const q = AppState.query.trim();
    if (q.length < MIN_QUERY_LEN) {
      AppState.suggestions = [];
      AppState.activeIndex = -1;
      hideSuggestions();
      return;
    }
    const nq = normalize(q);
    let list = AppState.athletes
      .map(a => ({ a, nName: normalize(a.name) }))
      .filter(({ nName }) => nName.includes(nq));

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

  function hideSuggestions() {
    if (Refs.suggest) {
      Refs.suggest.classList.add("hidden");
      Refs.suggest.innerHTML = "";
    }
  }

  function renderSuggestAvatar(a) {
    const wrap = h("div", { class: "ath-avatar sm ath-suggest-avatar" });
    const img = h("img", {
      class: "avatar-img",
      alt: "Vereinskappe",
      loading: "lazy",
      decoding: "async"
    });

    const og = String(a?.ortsgruppe || "").trim();
    const fallback = "svg/Cap-Baden_light.svg";
    let triedFallback = false;

    img.onerror = () => {
      if (!triedFallback) {
        triedFallback = true;
        img.src = fallback;
      } else {
        img.remove();
      }
    };

    if (og) img.src = `svg/Cap-${encodeURIComponent(og)}.svg`;
    else img.src = fallback;

    wrap.appendChild(img);
    return wrap;
  }

  function paintSuggestions() {
    const box = Refs.suggest;
    if (!box) return;

    const q = AppState.query.trim();
    box.innerHTML = "";

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

      const av = renderSuggestAvatar(a);
      item.appendChild(av);

      const nameEl = h("div", { class: "ath-suggest-name" });
      nameEl.innerHTML = `${highlight(a.name, q)} <span class="ath-year">(${a.jahrgang})</span>`;

      const og = String(a.ortsgruppe || "").trim();
      const sub = h("div", { class: "ath-suggest-sub" }, og ? ("DLRG " + og) : "DLRG —");

      const text = h("div", { class: "ath-suggest-text" }, nameEl, sub);
      item.appendChild(text);

      box.appendChild(item);
    });

    box.classList.remove("hidden");
    requestAnimationFrame(() => {});
  }

  function openProfile(a) {
    if (!a) return;

    if (PAGE_MODE === "athleten") {
      const id = a.id ? String(a.id) : "";
      const url = id ? `./profil.html?ath=${encodeURIComponent(id)}` : `./profil.html?name=${encodeURIComponent(String(a.name || "").trim())}`;
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

    const ax = (window.ProfileTabs && typeof window.ProfileTabs.hydrateAthleteForTabs === "function")
      ? window.ProfileTabs.hydrateAthleteForTabs(a)
      : a;

    AppState.selectedAthleteId = ax?.id || null;

    dismissKeyboard();
    hideSuggestions();

    const mount = Refs.profileMount;
    if (!mount) return;

    mount.innerHTML = "";

    const head = (window.ProfileHead && typeof window.ProfileHead.createAthProfileHead === "function")
      ? window.ProfileHead.createAthProfileHead(ax)
      : h("div", { class: "ath-profile-head" });

    const tabsWrap = (window.ProfileTabs && typeof window.ProfileTabs.createAthTabsWrap === "function")
      ? window.ProfileTabs.createAthTabsWrap(ax)
      : h("div", { class: "ath-tabs-wrap" });

    const note = (window.ProfileNote && typeof window.ProfileNote.createAthProfileNote === "function")
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

    if (Refs.input) Refs.input.value = "";
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

  document.addEventListener("DOMContentLoaded", async () => {
    renderApp();

    await new Promise(requestAnimationFrame);

    try {
      const rows = await loadWorkbookArray("Tabelle2");
      const light = buildIndicesFromRows(rows);
      AppState.athletes = light;

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
