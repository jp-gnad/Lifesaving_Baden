// athleten_gui.js
// Funktionale Suche mit Dropdown + Profilansicht (Placeholder-Daten).
// Zeigt initial keine Athletenkarten; Profil öffnet nach Auswahl.

(function () {
  // ---------------------------
  // Helpers
  // ---------------------------
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

  // ---- Vereins-Cap im Avatar laden -------------------------------------
  function capNameVariantsFromOrtsgruppe(rawOG){
    // Wir versuchen mehrere plausible Namensvarianten, damit Dateinamen robust gefunden werden
    const formatted = formatOrtsgruppe(rawOG || "");           // z.B. "DLRG Karlsruhe"
    const noPrefix  = formatted.replace(/^DLRG\s+/i, "").trim(); // "Karlsruhe"

    const baseList = [formatted, rawOG || "", noPrefix].filter(Boolean);

    const umlautSwap = (s) => s
      .replaceAll("Ä","Ae").replaceAll("ä","ae")
      .replaceAll("Ö","Oe").replaceAll("ö","oe")
      .replaceAll("Ü","Ue").replaceAll("ü","ue")
      .replaceAll("ß","ss");

    const noDiacritics = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

    const set = new Set();
    for (const s of baseList){
      const t = String(s).trim();
      if (!t) continue;
      set.add(t);
      set.add(t.replace(/\s+/g, "_"));
      set.add(umlautSwap(t));
      set.add(umlautSwap(t).replace(/\s+/g, "_"));
      set.add(noDiacritics(t));
      set.add(noDiacritics(t).replace(/\s+/g, "_"));
    }
    return Array.from(set);
  }

  function renderCapAvatar(a, size = "xl", extraClass = ""){
    const wrap = h("div", { class: `ath-avatar ${size} ${extraClass}` });

    const variants = capNameVariantsFromOrtsgruppe(a.ortsgruppe)
      .map(name => `Cap-${name}.svg`);

    const img = h("img", {
      class: "avatar-img",
      alt: `Vereinskappe ${formatOrtsgruppe(a.ortsgruppe)}`,
      decoding: "async",
      loading: "lazy"
    });

    let idx = 0;
    const FALLBACK = "Cap-Baden_light.svg";

    function tryNext(){
      if (idx < variants.length){
        img.src = `${FLAG_BASE_URL}/${encodeURIComponent(variants[idx++])}`;
      } else {
        img.src = `${FLAG_BASE_URL}/${FALLBACK}`;
        img.onerror = null; // Fallback nicht weiter loopen
      }
    }

    img.onerror = tryNext;
    tryNext();

    wrap.appendChild(img);
    return wrap;
  }


  // ---- Länder-Flags (SVG-only) -----------------------------------------
  const FLAG_BASE_URL =
    "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg";

  // Exakte deutschen Dateinamen ohne ".svg"
  const SUPPORTED_FLAGS_DE = new Set([
    "Spanien","Australien","Deutschland","Belgien","Italien","Frankreich",
    "Schweiz","Polen","Japan","Dänemark","Ägypten","Niederlande","Großbritannien"
  ]);

  // Nutzt a.countriesDE: ["Deutschland","Frankreich", ...]
  function renderCountryFlagsSectionSVG(a){
    const names = Array.isArray(a.countriesDE) ? a.countriesDE.filter(Boolean) : [];
    const list  = names
      .map(n => String(n).trim())
      .filter(n => SUPPORTED_FLAGS_DE.has(n));

    if (list.length === 0) return null;

    const header = h("div", { class: "ath-flags-header" }, "");

    const row = h("div", { class: "ath-flags" },
      ...list.map(name => {
        const wrap = h("span", {
          class: "ath-flag",
          title: name,
          "aria-label": name
        });
        const img = h("img", {
          class: "flag-img",
          src: `${FLAG_BASE_URL}/${encodeURIComponent(name)}.svg`,
          alt: name,
          loading: "lazy",
          decoding: "async",
          onerror: () => wrap.remove() // kein Fallback: bei Fehler entfernen
        });
        wrap.appendChild(img);
        return wrap;
      })
    );

    return h("div", { class: "ath-profile-section flags" }, header, row);
  }


  function activityStatusFromLast(lastISO){
    // Kein Datum -> als Inaktiv werten
    if (!lastISO) return { key: "inactive", label: "Inaktiv" };

    const last = new Date(lastISO);
    if (isNaN(last)) return { key: "inactive", label: "Inaktiv" };

    const now  = new Date();
    const days = Math.floor((now - last) / (1000*60*60*24));

    if (days < 365)      return { key: "active",  label: "Aktiv" };
    if (days < 365*2)    return { key: "pause",   label: "Pause" };
    return { key: "inactive", label: "Inaktiv" };
}


  // ---- Format-Helfer ----
  function fmtInt(n){ return Number.isFinite(n) ? n.toLocaleString("de-DE") : "—"; }
  function fmtDate(dStr){
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("de-DE");
  }

  // Summe aller DQs (50 + 25) aus stats
  function sumAllDQ(a){
    let total = 0;
    const both = [ (a.stats && a.stats["50"]) || {}, (a.stats && a.stats["25"]) || {} ];
    for (const lane of both){
      for (const d of DISCIPLINES){
        const s = lane[d.key];
        if (s && Number.isFinite(+s.dq)) total += +s.dq;
      }
    }
    return total;
  }

  // Wettkampf-Infos (aus a.meets)
  function computeMeetInfo(a){
    const meets = Array.isArray(a.meets) ? a.meets.slice() : [];
    const total = meets.length;

    let c50 = 0, c25 = 0;
    let first = null, last = null;

    for (const m of meets){
      if (m.pool === "50") c50++;
      else if (m.pool === "25") c25++;

      const d = new Date(m.date);
      if (!isNaN(d)){
        if (!first || d < first) first = d;
        if (!last  || d > last ) last  = d;
      }
    }

    const pct50 = total ? Math.round((c50/total)*100) : 0;
    const pct25 = total ? Math.round((c25/total)*100) : 0;

    return {
      total,
      c50, c25, pct50, pct25,
      first: first ? first.toISOString().slice(0,10) : null,
      last:  last  ? last.toISOString().slice(0,10)  : null
    };
  }

  // ---- Überblick-Section ----
  function renderOverviewSection(a){
    const header = h("div", { class: "ath-info-header" },
      h("h3", {}, "Überblick")
    );

    const grid = h("div", { class: "ath-info-grid" });

    // Metriken berechnen
    const lsc = Number.isFinite(+a.lsc) ? +a.lsc : null;
    const meets = computeMeetInfo(a);
    const totalDisc = Number.isFinite(+a.totalDisciplines) ? +a.totalDisciplines : null;
    const totalDQ = sumAllDQ(a);

    // Kacheln
    grid.appendChild(infoTileBig("LSC", lsc != null ? fmtInt(lsc) : "—"));

    const act = activityStatusFromLast(meets.last);
    grid.appendChild(infoTileStatus("Aktivitätsstatus", act));

    grid.appendChild(infoTile("Wettkämpfe", fmtInt(meets.total)));
    grid.appendChild(infoTile("Total Starts", fmtInt(totalDisc)));
    grid.appendChild(infoTile("Disqualifikationen", fmtInt(totalDQ)));

    grid.appendChild(infoTileDist("Bahnverteilung", meets));

    grid.appendChild(infoTile("Erster Wettkampf", fmtDate(meets.first)));
    

    return h("div", { class: "ath-profile-section info" }, header, grid);

    // --- lokale UI-Bausteine ---
    function infoTile(label, value){
      return h("div", { class: "info-tile" },
        h("div", { class: "info-label" }, label),
        h("div", { class: "info-value" }, value)
      );
    }
    function infoTileBig(label, value){
      return h("div", { class: "info-tile accent" },
        h("div", { class: "info-label" }, label),
        h("div", { class: "info-value big" }, value)
      );
    }
    function infoTileDist(label, m){
      const wrap = h("div", { class: "info-tile dist" },
        h("div", { class: "info-label" }, label),
        // Progress-Balken 50/25
        (() => {
          const bar = h("div", { class: "info-progress" },
            h("div", { class: "p50", style: `width:${m.pct50 || 0}%` }),
          );
          return bar;
        })(),
        // Legende
        h("div", { class: "info-legend" },
          h("span", { class: "l50" }, `50m ${m.pct50 || 0}%`),
        )
      );
      return wrap;
    }
    function infoTileStatus(label, act){
      return h("div", { class: `info-tile status ${act.key}` },
        h("div", { class: "info-label" }, label),
        h("div", { class: "status-line" },
          h("span", { class: "status-dot" }),
          h("span", { class: "status-text" }, act.label)
        )
      );
    }

  }


  // ---- Medaillen-Widget ------------------------------------------------
  function renderMedalStats(a) {
    const m = (a && a.medals) || {};
    const g = Number(m.gold || 0);
    const s = Number(m.silver || 0);
    const b = Number(m.bronze || 0);
    const total = g + s + b;

    const max = Math.max(g, s, b, 1);   // nie 0, damit Balken-Höhen berechenbar sind
    const H = 72;                        // max Balkenhöhe in px

    const bar = (cls, label, value) => {
      const h = Math.round((value / max) * H);
      return hDiv("div", { class: `med-col ${cls}` },
        hDiv("div", { class: "med-count" }, String(value)),
        hDiv("div", { class: "med-barWrap" },
          hDiv("div", { class: "med-bar", style: `height:${h}px` })
        ),
        hDiv("div", { class: "med-label" }, label)
      );
    };

    const card = hDiv("aside", { class: "med-card", "aria-label": "Medaillen" },
      hDiv("div", { class: "med-head" },
        hDiv("div", { class: "med-title" }, m.title || "Medaillen"),
        hDiv("div", { class: "med-total" }, String(total))
      ),
      hDiv("div", { class: "med-grid" },
        bar("gold", "GOLD", g),
        bar("silver", "SILVER", s),
        bar("bronze", "BRONZE", b),
      )
    );

    return card;
  }

  // kleine Helfer für kürzere Schreibweise
  function hDiv(tag, props = {}, ...children){
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return el;
  }


  // ---- Altersklassen (aus Jahrgang) ---------------------------------
  const REF_YEAR = new Date().getFullYear(); // ggf. auf fixes Wettkampfjahr setzen

  function ageFromJahrgang(jahrgang, refYear = REF_YEAR) {
    const age = refYear - Number(jahrgang);
    return isNaN(age) ? null : age;
  }

  // Deutsche AK (primär)
  function akDE(age) {
    if (age == null) return " ?";
    if (age <= 10) return "10";
    if (age <= 12) return "12";
    if (age <= 14) return "13/14";
    if (age <= 16) return "15/16";
    if (age <= 18) return "17/18";
    return "AK Offen"; // >=19
  }

  // Internationale AK (sekundär: nur Youth/Open/Master)
  function akINT(age) {
    if (age == null) return "?";
    if (age < 19) return "Youth";
    if (age > 40) return "Master";
    return "Open"; // 19–40
  }

  // Für GUI: "AK DE (INT)"
  function akLabelFromJahrgang(jahrgang) {
    const age = ageFromJahrgang(jahrgang);
    return `${akDE(age)} (${akINT(age)})`;
  }

  // ---- Ortsgruppe formatieren (DLRG + Korrekturen) -------------------
  function formatOrtsgruppe(raw) {
    let s = (raw || "").toString().trim();

    // verbreitete Präfixe entfernen
    s = s.replace(/^(og|dlrg)\s+/i, "");

    // einfache Tippfehler-Korrekturen (erweiterbar)
    const fixes = {
      "karlsuhe": "Karlsruhe",
      "karlsruhe": "Karlsruhe",
      "mannhein": "Mannheim",
      "mannheim": "Mannheim",
      "heidelbrg": "Heidelberg",
      "heidelberg": "Heidelberg",
      "freiburg": "Freiburg",
    };
    const key = s.toLowerCase();
    if (fixes[key]) {
      s = fixes[key];
    } else {
      // Title-Case
      s = s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }

    return "DLRG " + s;
  }

  // ---- Geschlecht -> runder Kreis mit "w" / "m" ----------------------
  function genderTag(g) {
    const w = (g || "").toLowerCase().startsWith("w");
    return { short: w ? "w" : "m", cls: w ? "w" : "m" };
  }

  // ——— Disziplinen (Fixe Reihenfolge & interne Keys) ———
  const DISCIPLINES = [
    { key: "50_retten",           label: "50m Retten" },
    { key: "100_retten_flosse",   label: "100m Retten mit Flossen" },
    { key: "100_kombi",           label: "100 Kombi" },
    { key: "100_lifesaver",       label: "100m Lifesaver" },
    { key: "200_super",           label: "200m Super Lifesaver" },
    { key: "200_hindernis",       label: "200m Hindernis" },
  ];

  // ——— Zeitformat: Sekunden (float) -> m:ss.hh ———
  function formatSeconds(sec) {
    if (sec == null || isNaN(sec)) return "—";
    const tot = Math.round(Math.max(0, Number(sec)) * 100); // auf Hundertstel
    const m = Math.floor(tot / 6000);
    const s = Math.floor((tot % 6000) / 100);
    const cs = tot % 100;
    const sPart = (m ? String(s).padStart(2, "0") : String(s));
    return (m ? `${m}:${sPart}` : sPart) + "." + String(cs).padStart(2, "0");
  }




  const normalize = (s) =>
    (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  const initials = (name) =>
    (name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => (s[0] || "").toUpperCase())
      .join("");

  const highlight = (text, query) => {
    // einfache Substring-Hervorhebung (case/diacritic-insensitive)
    const nText = normalize(text);
    const nQuery = normalize(query);
    const idx = nText.indexOf(nQuery);
    if (idx < 0 || !query) return text;

    // Rekonstruiere Markup anhand echter Indizes (vereinfachte Variante)
    const start = idx;
    const end = idx + nQuery.length;
    // finde die echten Positionen im Originaltext (naiv, aber ok fürs UI)
    let realStart = start, realEnd = end;
    return (
      text.slice(0, realStart) +
      "<mark>" +
      text.slice(realStart, realEnd) +
      "</mark>" +
      text.slice(realEnd)
    );
  };

  // ---------------------------
  // State
  // ---------------------------
  const AppState = {
    athletes: [
      {
        id: "a1",
        name: "Lena Hoffmann",
        ortsgruppe: "Karlsruhe",
        geschlecht: "weiblich",
        jahrgang: 2007,
        poolLen: "50", // "50" | "25"
        medals: { gold: 18, silver: 6, bronze: 7, title: "Medaillen" },
        lsc: 742, // oder beliebiger Score
        totalDisciplines: 20,
        countriesDE: ["Deutschland","Schweiz","Italien"],
        meets: [
          { date: "2023-03-16", pool: "50" },
          { date: "2023-05-11", pool: "25" },
          { date: "2023-06-29", pool: "50" },
          { date: "2025-02-01", pool: "50" }
        ],
        pbs: {
          "50": {
            "50_retten": 32.18,
            "100_retten_flosse": 55.42,
            "100_kombi": 70.31,
            "100_lifesaver": 63.05,
            "200_super": 146.22,
            "200_hindernis": 139.88
          },
          "25": {
            "50_retten": 31.50,
            "100_lifesaver": 54.10
            // Rest kann fehlen -> "—"
          }
        },
        // im Athletenobjekt
        stats: {
          "50": {
            "50_retten":        { starts: 12, dq: 1 },
            "100_retten_flosse":{ starts: 8,  dq: 0 },
            "100_kombi":        { starts: 6,  dq: 0 },
            "100_lifesaver":    { starts: 10, dq: 2 },
            "200_super":        { starts: 4,  dq: 0 },
            "200_hindernis":    { starts: 7,  dq: 1 }
          },
          "25": {
            "50_retten":        { starts: 9,  dq: 0 },
            "100_lifesaver":    { starts: 5,  dq: 1 }
          }
        }
      },
      {
        id: "a2",
        name: "Noah Meier",
        ortsgruppe: "Mannheim",
        geschlecht: "männlich",
        jahrgang: 2006,
        poolLen: "50", // "50" | "25"
      },
      {
        id: "a3",
        name: "Sofia Brandt",
        ortsgruppe: "Freiburg",
        geschlecht: "weiblich",
        jahrgang: 2004,
        poolLen: "50", // "50" | "25"
      },
      {
        id: "a4",
        name: "Levi Schröder",
        ortsgruppe: "Heidelberg",
        geschlecht: "männlich",
        jahrgang: 2009,
        poolLen: "50", // "50" | "25"
        medals: { gold: 1, silver: 0, bronze: 1, title: "Medaillen" },
      },
      {
        id: "a1",
        name: "Jan-Philipp Gnad",
        ortsgruppe: "Ettlingen",
        geschlecht: "männlich",
        jahrgang: 2001,
        poolLen: "50", // "50" | "25"
        medals: { gold: 4, silver: 7, bronze: 5, title: "Medaillen" },
        lsc: 823, // oder beliebiger Score
        totalDisciplines: 96,
        countriesDE: ["Deutschland","Niederlande","Australien","Spanien","Belgien"],
        meets: [
          { date: "2023-03-16", pool: "25" },
          { date: "2023-05-11", pool: "25" },
          { date: "2023-06-29", pool: "50" },
          { date: "2024-06-29", pool: "50" },
          { date: "2025-07-27", pool: "50" }
        ],
        pbs: {
          "50": {
            "50_retten": 34.46,
            "100_retten_flosse": 52.00,
            "100_kombi": 73.69,
            "100_lifesaver": 59.42,
            "200_super": 145.55,
            "200_hindernis": 232.85
          },
          "25": {
            "50_retten": 31.50,
            "100_retten_flosse": 56.20,
            "100_kombi": 72.69,
            "100_lifesaver": 58.69,
            "200_super": 141.55,
            "200_hindernis": 231.00
            // Rest kann fehlen -> "—"
          }
        },
        // im Athletenobjekt
        stats: {
          "50": {
            "50_retten":        { starts: 12, dq: 0 },
            "100_retten_flosse":{ starts: 12, dq: 0 },
            "100_kombi":        { starts: 3,  dq: 0 },
            "100_lifesaver":    { starts: 16, dq: 0 },
            "200_super":        { starts: 18, dq: 1 },
            "200_hindernis":    { starts: 17, dq: 0 }
          },
          "25": {
            "50_retten":        { starts: 7,  dq: 0 },
            "100_retten_flosse":{ starts: 2,  dq: 0 },
            "100_kombi":        { starts: 2,  dq: 0 },
            "100_lifesaver":    { starts: 6,  dq: 0 },
            "200_super":        { starts: 6,  dq: 0 },
            "200_hindernis":    { starts: 8,  dq: 0 }
          }
        }
      },

    ],
    query: "",
    suggestions: [],
    activeIndex: -1,
    selectedAthleteId: null,
  };

  const Refs = {
    input: null,
    suggest: null,
    profileMount: null,
    searchWrap: null,
  };

  // ---------------------------
  // Render Root
  // ---------------------------
  function renderApp() {
    const mount = $("#athleten-container");
    if (!mount) return console.error("[athleten_gui] #athleten-container nicht gefunden");

    mount.innerHTML = "";
    const ui = h("section", { class: "ath-ui", role: "region", "aria-label": "Athletenbereich" });

    // Hinweis
    ui.appendChild(
      h(
        "p",
        { class: "ath-ui-note" },
        "Suche nach Name (ab 2 Zeichen). Treffer erscheinen im Dropdown. Auswahl öffnet das Profil."
      )
    );

    // Suche + Dropdown
    ui.appendChild(renderSearch());

    // Profilbereich (zunächst leer/verborgen)
    const profile = h("div", { id: "ath-profile" });
    Refs.profileMount = profile;
    ui.appendChild(profile);

    mount.appendChild(ui);
  }

  // ---------------------------
  // Search
  // ---------------------------
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
      onkeydown: onSearchKeyDown,
    });
    Refs.input = input;

    const clearBtn = h(
      "button",
      {
        class: "ath-btn clear",
        type: "button",
        title: "Suche leeren",
        onclick: () => {
          input.value = "";
          AppState.query = "";
          AppState.suggestions = [];
          AppState.activeIndex = -1;
          hideSuggestions();
        },
      },
      "Leeren"
    );

    const searchBtn = h(
      "button",
      {
        class: "ath-btn primary",
        type: "button",
        title: "Ersten Treffer öffnen",
        onclick: () => {
          if (AppState.suggestions.length > 0) {
            openProfile(AppState.suggestions[0]);
          }
        },
      },
      "Öffnen"
    );

    const bar = h("div", { class: "ath-ui-search", role: "search" }, input, clearBtn, searchBtn);
    wrap.appendChild(bar);

    // Suggestion-Dropdown (leer, wird dynamisch gefüllt)
    const suggest = h("div", { class: "ath-suggest hidden", role: "listbox", id: "ath-suggest" });
    Refs.suggest = suggest;
    wrap.appendChild(suggest);

    // Klick außerhalb => Dropdown schließen
    document.addEventListener("click", (e) => {
      if (!Refs.searchWrap.contains(e.target)) hideSuggestions();
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
      if (suggestions.length === 0) return;
      e.preventDefault();
      AppState.activeIndex = (activeIndex + 1) % suggestions.length;
      paintSuggestions();
    } else if (e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      AppState.activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
      paintSuggestions();
    } else if (e.key === "Enter") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      openProfile(suggestions[idx]);
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  }

  function updateSuggestions() {
    const q = AppState.query.trim();
    if (q.length < 2) {
      AppState.suggestions = [];
      AppState.activeIndex = -1;
      hideSuggestions();
      return;
    }

    const nq = normalize(q);

    // Filter nach Name (später können wir OG/Jahrgang hinzunehmen)
    let list = AppState.athletes
      .map((a) => ({ a, nName: normalize(a.name) }))
      .filter(({ nName }) => nName.includes(nq));

    // Sortierung: startsWith > includes
    list.sort((l, r) => {
      const aStart = l.nName.startsWith(nq) ? 0 : 1;
      const bStart = r.nName.startsWith(nq) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
      return l.nName.localeCompare(r.nName);
    });

    AppState.suggestions = list.map((x) => x.a).slice(0, 8);
    AppState.activeIndex = AppState.suggestions.length ? 0 : -1;
    paintSuggestions();
  }

  function hideSuggestions() {
      if (Refs.suggest) {
        Refs.suggest.classList.add("hidden");
        Refs.suggest.innerHTML = "";
      }
    }

    function paintSuggestions() {
    const box = Refs.suggest;
    if (!box) return;
    const q = AppState.query.trim();
    box.innerHTML = "";

    if (!q || AppState.suggestions.length === 0) {
      const empty = h("div", { class: "ath-suggest-empty" }, q.length < 2 ? "Mind. 2 Zeichen eingeben" : "Keine Treffer");
      box.appendChild(empty);
      box.classList.remove("hidden");
      return;
    }

    AppState.suggestions.forEach((a, idx) => {
      const item = h("div", {
        class: "ath-suggest-item" + (idx === AppState.activeIndex ? " active" : ""),
        role: "option",
        "aria-selected": idx === AppState.activeIndex ? "true" : "false",

        // ★ iOS-fest: zuerst pointerdown (deckt Touch + Maus ab)
        onpointerdown: (ev) => { ev.preventDefault(); ev.stopPropagation(); openProfile(a); },

        // ★ Fallback für sehr alte iOS-Versionen
        ontouchstart: (ev) => { ev.preventDefault(); ev.stopPropagation(); openProfile(a); },

        // ★ Desktop-Fallback
        onclick: (ev) => { ev.preventDefault(); ev.stopPropagation(); openProfile(a); },

        onmouseenter: () => {
          if (AppState.activeIndex === idx) return;                 // nichts tun, wenn schon aktiv
          const prev = box.querySelector('.ath-suggest-item.active');
          prev?.classList.remove('active');                         // alte Markierung weg
          item.classList.add('active');                             // diese Zeile markieren
          AppState.activeIndex = idx;                               // State updaten (für Enter)
        }
      });

      // Avatar (Cap-SVG, kleine Größe)
      item.appendChild(renderCapAvatar(a, "sm", "ath-suggest-avatar"));

      // Name (mit Jahrgang) + OG darunter
      const nameEl = h("div", { class: "ath-suggest-name" });
      nameEl.innerHTML = `${highlight(a.name, q)} <span class="ath-year">(${a.jahrgang})</span>`;
      const sub = h("div", { class: "ath-suggest-sub" }, formatOrtsgruppe(a.ortsgruppe));
      const text = h("div", { class: "ath-suggest-text" }, nameEl, sub);
      item.appendChild(text);

      box.appendChild(item);
    });

    box.classList.remove("hidden");
  }



  // Refs für Bestzeiten
  Refs.bestGrid = null;
  Refs.bestBtn50 = null;
  Refs.bestBtn25 = null;

  // Section erzeugen
  function renderBestzeitenSection(athlete) {
    const header = h("div", { class: "ath-bests-header" },
      h("h3", {}, "Bestzeiten / Info"),
      renderBahnSwitch(athlete)
    );

    const grid = h("div", { class: "ath-bests-grid" });
    Refs.bestGrid = grid;

    const section = h("div", { class: "ath-profile-section bests" }, header, grid);
    paintBestzeitenGrid(athlete);
    return section;
  }

  // Toggle 50m / 25m
  function renderBahnSwitch(athlete) {
    const wrap = h("div", { class: "ath-bests-switch", role: "group", "aria-label": "Bahnlänge" });

    const b50 = h("button", {
      class: "seg-btn" + (AppState.poolLen === "50" ? " active" : ""),
      type: "button",
      onclick: () => {
        if (AppState.poolLen !== "50") {
          AppState.poolLen = "50";
          b50.classList.add("active");
          b25.classList.remove("active");
          paintBestzeitenGrid(athlete);
        }
      }
    }, "50 m");

    const b25 = h("button", {
      class: "seg-btn" + (AppState.poolLen === "25" ? " active" : ""),
      type: "button",
      onclick: () => {
        if (AppState.poolLen !== "25") {
          AppState.poolLen = "25";
          b25.classList.add("active");
          b50.classList.remove("active");
          paintBestzeitenGrid(athlete);
        }
      }
    }, "25 m");

    Refs.bestBtn50 = b50;
    Refs.bestBtn25 = b25;

    return h("div", { class: "seg" }, b50, b25);
  }

  // Grid der 6 Disziplinen befüllen
  function paintBestzeitenGrid(athlete) {
    if (!Refs.bestGrid) return;

    const lane = AppState.poolLen || "50";
    const times = (athlete.pbs && athlete.pbs[lane]) || {};
    const statsMap = (athlete.stats && athlete.stats[lane]) || {};

    Refs.bestGrid.innerHTML = "";

    const toSec = (v) => {
      if (v == null) return NaN;
      const n = parseFloat(String(v).replace(",", "."));
      return Number.isFinite(n) ? n : NaN;
    };

    // Nur Disziplinen mit Zeit anzeigen (wie bisher)
    const showList = DISCIPLINES.filter(d => Number.isFinite(toSec(times[d.key])));

    if (showList.length === 0) {
      Refs.bestGrid.appendChild(
        h("div", { class: "best-empty" },
          lane === "50" ? "Keine Bestzeiten auf 50 m vorhanden." : "Keine Bestzeiten auf 25 m vorhanden."
        )
      );
      return;
    }

    showList.forEach(d => {
        const sec = toSec(times[d.key]);
        const st  = statsMap[d.key] || {};
        const starts = Number(st.starts || 0);
        const dq     = Number(st.dq || 0);

        const tile = h("article", {
        class: "best-tile",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": `${d.label} – Bestzeit ${formatSeconds(sec)}`
      });

      const inner = h("div", { class: "tile-inner" });
      // ... front/back anhängen ...
      tile.appendChild(inner);
      Refs.bestGrid.appendChild(tile);

      /* Klick/Tap = Lock/Unlock */
      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };

      /* Pointer deckt Maus + Touch ab; fallback für alte Browser */
      if ("onpointerdown" in window) {
        // Maus, Touch, Stift – alles über einen Kanal
        tile.addEventListener("pointerdown", toggleLock);
      } else {
        // Fallback (sehr alte Browser)
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, { passive: true });
      }

      // Tastatur-Bedienung (Enter/Space)
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLock(); }
      });


      // FRONT (Bestzeit)
      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "best-label" }, d.label),
        h("div", { class: "best-time"  }, formatSeconds(sec))
      );

      // BACK (Starts + DQ)
      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "best-label" }, d.label),
        h("div", { class: "tile-stats" },
          statRow("Starts", starts),
          statRow("DQ", dq)
        )
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);
      Refs.bestGrid.appendChild(tile);

      function toggle(){
        const flipped = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", flipped ? "true" : "false");
      }
    });

    function statRow(k, v){
      return h("div", { class: "stat" },
        h("span", { class: "k" }, k),
        h("span", { class: "v" }, String(v))
      );
    }
  }







  // ---------------------------
  // Profile
  // ---------------------------
  function openProfile(a) {
    AppState.poolLen = (a && a.poolLen) ? String(a.poolLen) : (AppState.poolLen || "50");
    AppState.selectedAthleteId = a?.id || null;
    hideSuggestions();

    const mount = Refs.profileMount;
    if (!mount) return;

    if (!a) {
      mount.innerHTML = "";
      mount.classList.remove("ath-profile-wrap");
      return;
    }

    // lokale KV-Hilfe (falls noch nicht oben global vorhanden)
    const KV = (k, v) =>
      h("span", { class: "kv" },
        h("span", { class: "k" }, k + ":"),
        h("span", { class: "v" }, v)
      );

    const profile = h(
      "article",
      { class: "ath-profile" },

      // HEAD (Avatar | Titel/Meta | Medaillen rechts)
      h(
        "div",
        { class: "ath-profile-head" },

        // Vereinscap
        renderCapAvatar(a),


        // Titel + Meta
        h(
          "div",
          { class: "ath-profile-title" },
          (() => {
            const gt = genderTag(a.geschlecht);
            return h("h2", {}, a.name, " ", h("span", { class: `gender-tag ${gt.cls}` }, gt.short));
          })(),
          h("div", { class: "ath-profile-meta" },
            KV("Ortsgruppe", formatOrtsgruppe(a.ortsgruppe)),
            KV("Jahrgang", String(a.jahrgang)),
            KV("Altersklasse", akLabelFromJahrgang(a.jahrgang))
          )
        ),

        // Medaillen-Widget (rechts)
        renderMedalStats(a)
      ),

      // ★ NEU: Länder-Flaggen direkt unter dem Kopf
      renderCountryFlagsSectionSVG(a),

      // ÜBERBLICK (neu)
      renderOverviewSection(a),

      // BESTZEITEN
      renderBestzeitenSection(a),

      // Platzhalter Statistik
      h("div", { class: "ath-profile-section muted" },
        "Hier kommt später die Statistik (GUI) aus deiner Excel-Datenbank rein."
      )
    );

    mount.innerHTML = "";
    mount.classList.add("ath-profile-wrap");
    mount.appendChild(profile);
    mount.scrollIntoView({ behavior: "smooth", block: "start" });
  }



  // ---------------------------
  // Boot
  // ---------------------------
  document.addEventListener("DOMContentLoaded", renderApp);
})();
