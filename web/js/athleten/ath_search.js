(function () {
  const MIN_QUERY_LEN = 3;

  const FLAG_BASE_URL = "./svg";
  const CAP_FALLBACK_FILE = "Cap-Baden_light.svg";
  const CAP_FALLBACK_URL = `${FLAG_BASE_URL}/${encodeURIComponent(CAP_FALLBACK_FILE)}`;

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

  const state = {
    query: "",
    suggestions: [],
    activeIndex: -1,
    athletes: []
  };

  const refs = {
    mount: null,
    searchWrap: null,
    input: null,
    suggest: null,
    openProfile: null
  };

  const normalize = (s) =>
    (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  const highlight = (text, query) => {
    const nText = normalize(text);
    const nQuery = normalize(query);
    const idx = nText.indexOf(nQuery);
    if (idx < 0 || !query) return text;
    return (
      text.slice(0, idx) +
      "<mark>" +
      text.slice(idx, idx + nQuery.length) +
      "</mark>" +
      text.slice(idx + nQuery.length)
    );
  };

  const LAND_TO_ISO3 = {
    Deutschland: "GER",
    Schweiz: "SUI",
    Italien: "ITA",
    Frankreich: "FRA",
    Belgien: "BEL",
    Niederlande: "NED",
    Spanien: "ESP",
    Polen: "POL",
    Japan: "JPN",
    Dänemark: "DEN",
    Ägypten: "EGY",
    Großbritannien: "GBR",
    Australien: "AUS"
  };

  function iso3FromLand(landName) {
    return LAND_TO_ISO3[String(landName || "").trim()] || "";
  }

  function normalizeBVCode(bvRaw) {
    const s = String(bvRaw ?? "").trim();
    if (!s) return "";
    if (/^[A-Z]{3}$/.test(s)) return s;
    const iso = iso3FromLand(s);
    if (iso) return iso;
    return s.toUpperCase();
  }

  function deriveAffiliation(a) {
    const ogKey = String(a?.ortsgruppe || "").trim();
    const lvCode = String(a?.LV_state ?? a?.lv_state ?? "").trim().toUpperCase();
    const bvCode = normalizeBVCode(a?.BV_natio ?? a?.BV_nation ?? "");
    const startrecht = String(a?.Startrecht ?? a?.startrecht ?? "").trim().toUpperCase();
    return { ogKey, lvCode, bvCode, startrecht, label: ogKey };
  }

  function capCandidatesAvatar(aff) {
    const ogKey = String(aff?.ogKey || "").trim();
    const lvCode = String(aff?.lvCode || "").trim();
    const bvCode = String(aff?.bvCode || "").trim();
    const sr = String(aff?.startrecht || "").trim().toUpperCase();

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

  function applyCapFallback(
    img,
    hostEl,
    seq,
    { overlayClass = "cap-overlay", noneSrc = `${FLAG_BASE_URL}/Cap-None.svg` } = {}
  ) {
    if (!seq || !seq.length) {
      hostEl.classList.remove(overlayClass);
      img.onerror = null;
      img.src = noneSrc;
      return;
    }

    let i = 0;

    const load = () => {
      const entry = seq[i];
      hostEl.classList.toggle(overlayClass, !!entry.overlay);
      img.src = `${FLAG_BASE_URL}/Cap-${encodeURIComponent(entry.key)}.svg`;
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

  function formatOrtsgruppe(raw) {
    let s = (raw || "").toString().trim();
    s = s.replace(/^(og|dlrg)\s+/i, "");
    s = s
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return "DLRG " + s;
  }

  function renderCapAvatar(a, size = "xl", extraClass = "") {
    const wrap = h("div", { class: `ath-avatar ${size} ${extraClass}` });

    const aff = deriveAffiliation(a);
    const ogNow = aff.ogKey || "";

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

  function defaultOpenProfile(a) {
    if (!a) return;
    const id = a.id ? String(a.id) : "";
    const url = id
      ? `./profil.html?ath=${encodeURIComponent(id)}`
      : `./profil.html?name=${encodeURIComponent(String(a.name || "").trim())}`;
    window.location.href = url;
  }

  function openProfile(a) {
    if (!a) return;
    (refs.openProfile || defaultOpenProfile)(a);
  }

  function openAthleteProfileByName(rawName) {
    if (!rawName) return;
    if (!Array.isArray(state.athletes) || !state.athletes.length) return;

    const name = String(rawName).trim();
    if (!name) return;

    const targetNorm = normalize(name);
    let hit = state.athletes.find((a) => normalize(a.name) === targetNorm);

    if (!hit) {
      const stripped = name.replace(/\s*\(.*?\)\s*$/, "").trim();
      if (stripped && stripped !== name) {
        const n2 = normalize(stripped);
        hit = state.athletes.find((a) => normalize(a.name) === n2);
      }
    }

    if (!hit) return;
    openProfile(hit);
  }

  function renderSearch() {
    const wrap = h("div", { class: "ath-search-wrap" });
    refs.searchWrap = wrap;

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
    refs.input = input;

    const searchBtn = h(
      "button",
      {
        class: "ath-btn primary",
        type: "button",
        title: "Ersten Treffer öffnen",
        onclick: () => {
          if (state.suggestions.length > 0) openProfile(state.suggestions[0]);
        }
      },
      "Öffnen"
    );

    wrap.appendChild(h("div", { class: "ath-ui-search", role: "search" }, input, searchBtn));

    const suggest = h("div", { class: "ath-suggest hidden", role: "listbox", id: "ath-suggest" });
    refs.suggest = suggest;
    wrap.appendChild(suggest);

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target) && !suggest.contains(e.target)) hideSuggestions();
    });

    return wrap;
  }

  function onQueryChange(e) {
    state.query = e.target.value || "";
    updateSuggestions();
  }

  function onSearchKeyDown(e) {
    const { suggestions, activeIndex } = state;

    if (e.key === "ArrowDown") {
      if (!suggestions.length) return;
      e.preventDefault();
      state.activeIndex = (activeIndex + 1) % suggestions.length;
      paintSuggestions();
    } else if (e.key === "ArrowUp") {
      if (!suggestions.length) return;
      e.preventDefault();
      state.activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
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
    const q = state.query.trim();
    if (q.length < MIN_QUERY_LEN) {
      state.suggestions = [];
      state.activeIndex = -1;
      hideSuggestions();
      return;
    }

    const nq = normalize(q);

    let list = state.athletes
      .map((a) => ({ a, nName: normalize(a.name) }))
      .filter(({ nName }) => nName.includes(nq));

    list.sort((l, r) => {
      const aStart = l.nName.startsWith(nq) ? 0 : 1;
      const bStart = r.nName.startsWith(nq) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
      return l.nName.localeCompare(r.nName);
    });

    state.suggestions = list.map((x) => x.a).slice(0, 8);
    state.activeIndex = state.suggestions.length ? 0 : -1;
    paintSuggestions();
  }

  function hideSuggestions() {
    if (!refs.suggest) return;
    refs.suggest.classList.add("hidden");
    refs.suggest.innerHTML = "";
  }

  function paintSuggestions() {
    const box = refs.suggest;
    if (!box) return;

    const q = state.query.trim();
    box.innerHTML = "";

    if (!q || !state.suggestions.length) {
      box.appendChild(
        h(
          "div",
          { class: "ath-suggest-empty" },
          q.length < MIN_QUERY_LEN ? `Mind. ${MIN_QUERY_LEN} Zeichen eingeben` : "Keine Treffer"
        )
      );
      box.classList.remove("hidden");
      return;
    }

    state.suggestions.forEach((a, idx) => {
      const item = h("div", {
        class: "ath-suggest-item" + (idx === state.activeIndex ? " active" : ""),
        role: "option",
        "aria-selected": idx === state.activeIndex ? "true" : "false",
        onclick: (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openProfile(a);
        },
        onpointerenter: () => {
          if (state.activeIndex === idx) return;
          box.querySelector(".ath-suggest-item.active")?.classList.remove("active");
          item.classList.add("active");
          state.activeIndex = idx;
        },
        onmouseenter: () => {
          if (state.activeIndex === idx) return;
          box.querySelector(".ath-suggest-item.active")?.classList.remove("active");
          item.classList.add("active");
          state.activeIndex = idx;
        }
      });

      item.appendChild(renderCapAvatar(a, "sm", "ath-suggest-avatar"));

      const nameEl = h("div", { class: "ath-suggest-name" });
      nameEl.innerHTML = `${highlight(a.name, q)} <span class="ath-year">(${a.jahrgang})</span>`;

      const sub = h("div", { class: "ath-suggest-sub" }, formatOrtsgruppe(a.ortsgruppe || ""));

      const text = h("div", { class: "ath-suggest-text" }, nameEl, sub);
      item.appendChild(text);

      box.appendChild(item);
    });

    box.classList.remove("hidden");
  }

  function mount(mountEl, options = {}) {
    const el = typeof mountEl === "string" ? $(mountEl) : mountEl;
    if (!el) return;
    refs.mount = el;
    refs.openProfile = typeof options.openProfile === "function" ? options.openProfile : defaultOpenProfile;
    el.innerHTML = "";
    el.appendChild(renderSearch());
  }

  function setAthletes(list) {
    state.athletes = Array.isArray(list) ? list : [];
    hideSuggestions();
  }

  function showError(message) {
    if (!refs.suggest) return;
    refs.suggest.classList.remove("hidden");
    refs.suggest.innerHTML = `<div class="ath-suggest-empty">${String(message || "")}</div>`;
  }

  window.AthSearch = { mount, setAthletes, openByName: openAthleteProfileByName, showError };
  window.openAthleteProfileByName = openAthleteProfileByName;
})();
