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

  // ---- Altersklassen (aus Jahrgang) ---------------------------------
  const REF_YEAR = new Date().getFullYear(); // ggf. auf fixes Wettkampfjahr setzen

  function ageFromJahrgang(jahrgang, refYear = REF_YEAR) {
    const age = refYear - Number(jahrgang);
    return isNaN(age) ? null : age;
  }

  // Deutsche AK (primär)
  function akDE(age) {
    if (age == null) return "AK ?";
    if (age <= 10) return "AK 10";
    if (age <= 12) return "AK 12";
    if (age <= 14) return "AK 13/14";
    if (age <= 16) return "AK 15/16";
    if (age <= 18) return "AK 17/18";
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
        ortsgruppe: "OG Karlsruhe",
        geschlecht: "weiblich",
        jahrgang: 2007,
        disziplinen: ["100m Hindernis", "200m Superlifesaver"],
      },
      {
        id: "a2",
        name: "Noah Meier",
        ortsgruppe: "OG Mannheim",
        geschlecht: "männlich",
        jahrgang: 2006,
        disziplinen: ["50m Retten", "100m Lifesaver"],
      },
      {
        id: "a3",
        name: "Sofia Brandt",
        ortsgruppe: "OG Freiburg",
        geschlecht: "weiblich",
        jahrgang: 2004,
        disziplinen: ["100m Rettungsleinen", "200m Hindernis"],
      },
      {
        id: "a4",
        name: "Levi Schröder",
        ortsgruppe: "OG Heidelberg",
        geschlecht: "männlich",
        jahrgang: 2009,
        disziplinen: ["4x50m Hindernis (Team)", "100m Manikin Carry"],
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
        // WICHTIG: mousedown => Profil wird geöffnet, bevor das Input blurriert
        onmousedown: (ev) => { ev.preventDefault(); openProfile(a); },
        onmouseenter: () => { AppState.activeIndex = idx; paintSuggestions(); }
      });

      // Avatar
      item.appendChild(h("div", { class: "ath-suggest-avatar" }, initials(a.name)));

      // klickbarer NAME (auch hier mousedown für sofortige Reaktion)
      const nameBtn = h("button", {
        class: "ath-suggest-nameBtn",
        type: "button",
        title: `Profil öffnen: ${a.name}`,
        onmousedown: (ev) => { ev.preventDefault(); ev.stopPropagation(); openProfile(a); }
      });
      nameBtn.innerHTML = highlight(a.name, q);

      const sub = h("div", { class: "ath-suggest-sub" }, a.ortsgruppe);
      const text = h("div", { class: "ath-suggest-text" }, nameBtn, sub);
      item.appendChild(text);

      // Jahrgang / AK
      {
        const label = akLabelFromJahrgang(a.jahrgang);
        item.appendChild(
          h("div", { class: "ath-suggest-meta" }, `Jahrgang ${a.jahrgang} • Altersklasse: ${label}`)
        );
      }



      box.appendChild(item);
    });

    box.classList.remove("hidden");
  }



  // ---------------------------
  // Profile
  // ---------------------------
  function openProfile(a) {
    AppState.selectedAthleteId = a?.id || null;
    hideSuggestions();

    const mount = Refs.profileMount;
    if (!mount) return;

    if (!a) {
      mount.innerHTML = "";
      mount.classList.remove("ath-profile-wrap");
      return;
    }

    const chip = (t) => h("span", { class: "ath-badge" }, t);

    const profile = h(
      "article",
      { class: "ath-profile" },
      h(
        "div",
        { class: "ath-profile-head" },
        h("div", { class: "ath-avatar xl" }, initials(a.name)),
        h("div", { class: "ath-profile-title" },
          h("h2", {}, a.name),
          h("div", { class: "ath-profile-meta" },
            (() => {
              const label = akLabelFromJahrgang(a.jahrgang);
              return [
                kv("Ortsgruppe", a.ortsgruppe),
                kv("Jahrgang", String(a.jahrgang)),
                kv("Altersklasse", label),           // <-- neu: eine konsolidierte Zeile
                kv("Geschlecht", a.geschlecht),
              ];
            })()

          )
        ),
        h(
          "div",
          { class: "ath-profile-actions" },
          h(
            "button",
            {
              class: "ath-btn",
              type: "button",
              title: "Zurück zur Suche",
              onclick: () => closeProfile(),
            },
            "Zurück"
          )
        )
      ),
      h("div", { class: "ath-profile-section" },
        h("h3", {}, "Disziplinen"),
        h("div", { class: "ath-badges" }, ...(a.disziplinen || []).map(chip))
      ),
      h("div", { class: "ath-profile-section muted" },
        "Hier kommt später die Statistik (GUI) aus deiner Excel-Datenbank rein."
      )
    );

    mount.innerHTML = "";
    mount.classList.add("ath-profile-wrap");
    mount.appendChild(profile);
  }

  function closeProfile() {
    AppState.selectedAthleteId = null;
    const mount = Refs.profileMount;
    if (!mount) return;
    mount.classList.remove("ath-profile-wrap");
    mount.innerHTML = "";
    // Fokus zurück ins Suchfeld
    Refs.input?.focus();
  }

  function kv(k, v) {
    return h("span", { class: "kv" }, h("span", { class: "k" }, k + ":"), h("span", { class: "v" }, v));
  }

  // ---------------------------
  // Boot
  // ---------------------------
  document.addEventListener("DOMContentLoaded", renderApp);
})();
