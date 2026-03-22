(function () {
  const MIN_QUERY_LEN = 3;
  const FLAG_BASE_URL = "./assets/svg";
  const CAP_FALLBACK_FILE = "Cap-Baden_light.svg";
  const CAP_FALLBACK_URL = `${FLAG_BASE_URL}/${encodeURIComponent(CAP_FALLBACK_FILE)}`;
  const KNOWN_CAP_KEYS = new Set([
    "AUS", "BA", "Baden", "Baden_light", "BB", "BE", "BEL", "Bietigheim-Bissingen", "BRA", "BUL", "BY",
    "CAN", "CZE", "DEN", "Deutschland", "Durlach", "EGY", "ESP", "Ettlingen", "FRA", "GBR", "GER", "HE",
    "HH", "HKG", "ITA", "JPN", "Karlsruhe", "Luckenwalde", "Malsch", "MV", "NED", "NI", "Nieder-Olm/Wörrstadt",
    "none", "NOR", "NR", "NZL", "Pankow", "POL", "RP", "SH", "SIN", "SL", "SN", "ST", "SUI", "SWE", "TH",
    "USA", "Wadgassen", "Waghäusel", "Weil am Rhein", "Wettersbach", "WF", "WÜ"
  ]);

  const IS_COARSE_POINTER = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const TAP_MAX_MOVE = 10;
  const TAP_MAX_DURATION = 500;
  const OUTSIDE_TAP_MAX_MOVE = 14;
  const OUTSIDE_TAP_MAX_DURATION = 600;

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
    openProfile: null,
    clearBtn: null
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

  function forceDismissSearchFocus() {
  try {
    refs.input?.blur();

    const ae = document.activeElement;
    if (ae && typeof ae.blur === "function") ae.blur();

    let trap = document.getElementById("ath-search-blur-trap");
    if (!trap) {
      trap = document.createElement("input");
      trap.type = "text";
      trap.id = "ath-search-blur-trap";
      trap.tabIndex = -1;
      trap.autocomplete = "off";
      trap.setAttribute("aria-hidden", "true");
      trap.style.position = "fixed";
      trap.style.opacity = "0";
      trap.style.pointerEvents = "none";
      trap.style.height = "0";
      trap.style.width = "0";
      trap.style.left = "-9999px";
      trap.style.top = "0";
      document.body.appendChild(trap);
    }

    trap.focus({ preventScroll: true });
    trap.blur();
  } catch (e) {}
}

  function resetSearchUi() {
    state.query = "";
    state.suggestions = [];
    state.activeIndex = -1;

    if (refs.input) {
      refs.input.value = "";
    }

    updateClearButton();

    if (refs.suggest) {
      refs.suggest.classList.add("hidden");
      refs.suggest.innerHTML = "";
    }

    setSearchOpen(false);
    refs.searchWrap?.classList.add("is-closing");

    forceDismissSearchFocus();

    requestAnimationFrame(() => {
      forceDismissSearchFocus();
    });

    setTimeout(() => {
      refs.searchWrap?.classList.remove("is-closing");
    }, 250);
  }

  function openProfile(a) {
    if (!a) return;

    resetSearchUi();

    requestAnimationFrame(() => {
      (refs.openProfile || defaultOpenProfile)(a);
    });
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
    return { ogKey, lvCode, bvCode };
  }

  function capCandidatesAvatar(aff) {
    const out = [];
    const seen = new Set();

    const push = (key, overlay) => {
      const k = String(key || "").trim();
      if (!k || seen.has(k)) return;
      seen.add(k);
      out.push({ key: k, overlay: !!overlay });
    };

    push(aff?.ogKey, false);
    push(aff?.lvCode, true);
    push(aff?.bvCode, true);

    return out;
  }

  function applyCapFallback(img, hostEl, seq, overlayClass = "search-cap-overlay") {
    const filteredSeq = (Array.isArray(seq) ? seq : []).filter((entry) =>
      KNOWN_CAP_KEYS.has(String(entry?.key || "").trim())
    );

    if (!filteredSeq.length) {
      hostEl.classList.add(overlayClass);
      img.onerror = null;
      img.onload = null;
      img.style.visibility = "visible";
      img.src = CAP_FALLBACK_URL;
      return;
    }

    let i = 0;

    const load = () => {
      const entry = filteredSeq[i];
      hostEl.classList.toggle(overlayClass, !!entry.overlay);
      img.src = `${FLAG_BASE_URL}/Cap-${encodeURIComponent(entry.key)}.svg`;
    };

    img.onload = () => {
      img.style.visibility = "visible";
    };

    img.onerror = () => {
      if (i + 1 < filteredSeq.length) {
        i++;
        load();
      } else {
        hostEl.classList.add(overlayClass);
        img.onerror = null;
        img.onload = null;
        img.style.visibility = "visible";
        img.src = CAP_FALLBACK_URL;
      }
    };

    img.style.visibility = "visible";
    load();
  }

  function formatOrtsgruppe(raw) {
    let s = (raw || "").toString().trim();
    s = s.replace(/^(og|dlrg)\s+/i, "");
    s = s
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return s ? "DLRG " + s : "DLRG";
  }

  function formatYearShort(yearRaw) {
    const s = String(yearRaw ?? "").trim();
    if (!s) return "";
    const digits = s.replace(/\D/g, "");
    if (!digits) return s;
    return digits.slice(-2).padStart(2, "0");
  }

  function renderCapAvatar(a, size = "xl", extraClass = "") {
    const wrap = h("div", { class: `ath-avatar ${size} ${extraClass}` });

    const aff = deriveAffiliation(a);
    const ogNow = aff.ogKey || "";

    const img = h("img", {
      class: "avatar-img",
      alt: ogNow ? `Vereinskappe ${formatOrtsgruppe(ogNow)}` : "Vereinskappe",
      loading: "eager",
      decoding: "sync"
    });

    wrap.appendChild(img);
    applyCapFallback(img, wrap, capCandidatesAvatar(aff));

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

  function resetSearchUi() {
    if (refs.input) {
      refs.input.value = "";
      refs.input.blur();
    }

    state.query = "";
    state.suggestions = [];
    state.activeIndex = -1;

    updateClearButton();
    hideSuggestions();
  }

  function openProfile(a) {
    if (!a) return;
    resetSearchUi();
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

  function updateClearButton() {
    if (!refs.clearBtn || !refs.input) return;
    const hasValue = String(refs.input.value || "").trim().length > 0;
    refs.clearBtn.classList.toggle("hidden", !hasValue);
  }

  function clearSearch() {
    if (!refs.input) return;
    refs.input.value = "";
    state.query = "";
    hideSuggestions();
    updateClearButton();
    refs.input.focus();
  }

  function setSearchOpen(isOpen) {
    refs.searchWrap?.classList.toggle("is-open", !!isOpen);
  }

  function renderSearch() {
    const wrap = h("div", { class: "ath-search-wrap" });
    refs.searchWrap = wrap;

    let suppressBlurHideUntil = 0;

    wrap.addEventListener(
      "pointerdown",
      (e) => {
        const isSecondaryMouseAction =
          e.pointerType === "mouse" &&
          (e.button !== 0 || e.ctrlKey || e.metaKey);

        if (!isSecondaryMouseAction) return;
        if (!wrap.contains(e.target)) return;

        suppressBlurHideUntil = performance.now() + 700;
      },
      true
    );

    wrap.addEventListener("focusout", () => {
      if (IS_COARSE_POINTER) return;

      setTimeout(() => {
        if (performance.now() < suppressBlurHideUntil) return;
        if (!wrap.matches(":focus-within")) {
          hideSuggestions();
        }
      }, 120);
    });

    const input = h("input", {
      class: "ath-input",
      type: "text",
      placeholder: "Suche nach Athleten …",
      role: "searchbox",
      "aria-label": "Athleten suchen",
      autocomplete: "off",
      oninput: onQueryChange,
      onkeydown: onSearchKeyDown,
      onfocus: onSearchFocus,
      onclick: onSearchFocus
    });
    refs.input = input;

    const clearBtn = h(
      "button",
      {
        class: "ath-clear-btn hidden",
        type: "button",
        "aria-label": "Suche löschen",
        title: "Löschen",
        onpointerdown: (ev) => {
          if (ev.pointerType === "mouse" && ev.button !== 0) return;
          ev.preventDefault();
          ev.stopPropagation();
          clearSearch();
        },
      },
      "✕"
    );
    refs.clearBtn = clearBtn;

    const searchIcon = h("img", {
      class: "ath-search-deco-icon",
      src: "./assets/svg/icon_lupe.svg",
      alt: "",
      "aria-hidden": "true",
      draggable: "false"
    });

    const inputWrap = h("div", { class: "ath-input-wrap" }, searchIcon, input, clearBtn);

    const searchRow = h("div", { class: "ath-ui-search", role: "search" }, inputWrap);
    const searchPanel = h("div", { class: "ath-search-panel" }, searchRow);

    wrap.appendChild(searchPanel);

    const suggest = h("div", { class: "ath-suggest hidden", role: "listbox", id: "ath-suggest" });
    refs.suggest = suggest;
    wrap.appendChild(suggest);

    let backdropPointerId = null;
    let backdropStartX = 0;
    let backdropStartY = 0;
    let backdropStartTime = 0;
    let backdropMoved = false;

    const BACKDROP_TAP_MAX_MOVE = 14;
    const BACKDROP_TAP_MAX_DURATION = 600;

    wrap.addEventListener("pointerdown", (e) => {
      if (e.target !== wrap) return;

      backdropPointerId = e.pointerId;
      backdropStartX = e.clientX;
      backdropStartY = e.clientY;
      backdropStartTime = performance.now();
      backdropMoved = false;

      e.stopPropagation();
    });

    wrap.addEventListener("pointermove", (e) => {
      if (e.target !== wrap) return;
      if (backdropPointerId == null || e.pointerId !== backdropPointerId) return;

      const dx = e.clientX - backdropStartX;
      const dy = e.clientY - backdropStartY;

      if (Math.abs(dx) > BACKDROP_TAP_MAX_MOVE || Math.abs(dy) > BACKDROP_TAP_MAX_MOVE) {
        backdropMoved = true;
      }
    });

    wrap.addEventListener("pointerup", (e) => {
      if (e.target !== wrap) return;
      if (backdropPointerId == null || e.pointerId !== backdropPointerId) return;

      const duration = performance.now() - backdropStartTime;
      const isTap = !backdropMoved && duration <= BACKDROP_TAP_MAX_DURATION;

      backdropPointerId = null;

      e.preventDefault();
      e.stopPropagation();

      if (!isTap) return;

      hideSuggestions();
    });

    wrap.addEventListener("pointercancel", (e) => {
      if (backdropPointerId == null || e.pointerId !== backdropPointerId) return;
      backdropPointerId = null;
      backdropMoved = false;
    });

    return wrap;
  }

  function onQueryChange(e) {
    state.query = e.target.value || "";
    updateClearButton();
    updateSuggestions();
  }

  function onSearchFocus(e) {
    state.query = e.target.value || "";
    updateClearButton();
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

    state.suggestions = list.map((x) => x.a).slice(0, 10);
    state.activeIndex = state.suggestions.length ? 0 : -1;
    paintSuggestions();
  }

  function hideSuggestions() {
    state.suggestions = [];
    state.activeIndex = -1;

    setSearchOpen(false);

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
      setSearchOpen(true);
      return;
    }

    state.suggestions.forEach((a, idx) => {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let touchPointerId = null;
      let touchMoved = false;

      const item = h("div", {
        class: "ath-suggest-item" + (idx === state.activeIndex ? " active" : ""),
        role: "option",
        "aria-selected": idx === state.activeIndex ? "true" : "false",

        onpointerdown: (ev) => {
          if (ev.pointerType === "mouse") {
            const isSecondaryLikeClick = ev.button !== 0 || ev.ctrlKey || ev.metaKey;

            if (isSecondaryLikeClick) {
              ev.stopPropagation();
              return;
            }

            ev.preventDefault();
            ev.stopPropagation();
            openProfile(a);
            return;
          }

          touchPointerId = ev.pointerId;
          touchStartX = ev.clientX;
          touchStartY = ev.clientY;
          touchStartTime = performance.now();
          touchMoved = false;
        },

        onpointermove: (ev) => {
          if (ev.pointerType === "mouse") return;
          if (touchPointerId == null || ev.pointerId !== touchPointerId) return;

          const dx = ev.clientX - touchStartX;
          const dy = ev.clientY - touchStartY;

          if (Math.abs(dx) > TAP_MAX_MOVE || Math.abs(dy) > TAP_MAX_MOVE) {
            touchMoved = true;
          }
        },

        onpointerup: (ev) => {
          if (ev.pointerType === "mouse") return;
          if (touchPointerId == null || ev.pointerId !== touchPointerId) return;

          const duration = performance.now() - touchStartTime;
          const isTap = !touchMoved && duration <= TAP_MAX_DURATION;

          touchPointerId = null;

          if (!isTap) return;

          ev.preventDefault();
          ev.stopPropagation();
          openProfile(a);
        },

        onpointercancel: () => {
          touchPointerId = null;
          touchMoved = false;
        },

        onauxclick: (ev) => {
          ev.stopPropagation();
        },

        oncontextmenu: (ev) => {
          ev.stopPropagation();
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
      nameEl.innerHTML = `${highlight(a.name, q)} <span class="ath-year">(${formatYearShort(a.jahrgang)})</span>`;

      const sub = h("div", { class: "ath-suggest-sub" }, formatOrtsgruppe(a.ortsgruppe || ""));

      const text = h("div", { class: "ath-suggest-text" }, nameEl, sub);
      item.appendChild(text);

      box.appendChild(item);
    });

    box.classList.remove("hidden");
    setSearchOpen(true);
  }

  function mount(mountEl, options = {}) {
    const el = typeof mountEl === "string" ? $(mountEl) : mountEl;
    if (!el) return;
    refs.mount = el;
    refs.openProfile = typeof options.openProfile === "function" ? options.openProfile : defaultOpenProfile;
    el.innerHTML = "";
    el.appendChild(renderSearch());
    updateClearButton();
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
