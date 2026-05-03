(function () {
  const MIN_QUERY_LEN = 1;
  const FLAG_BASE_URL = "./assets/svg";
  const CAP_FALLBACK_FILE = "Cap-Baden_light.svg";
  const CAP_FALLBACK_URL = `${FLAG_BASE_URL}/${encodeURIComponent(CAP_FALLBACK_FILE)}`;
  const KNOWN_CAP_KEYS = new Set([
    "AUS", "BA", "Baden", "Baden_light", "BB", "BE", "BEL", "Bietigheim-Bissingen", "BRA", "BUL", "Bühl-Bühlertal", "BY",
    "CAN", "CZE", "DEN", "Deutschland", "Durlach", "EGY", "ESP", "Ettlingen", "FRA", "GBR", "GER", "HE",
    "HH", "HKG", "ITA", "JPN", "Karlsruhe", "Luckenwalde", "Malsch", "MV", "Neckargemünd", "NED", "NI", "Nieder-Olm/Wörrstadt",
    "none", "NOR", "NR", "NZL", "Pankow", "POL", "RP", "SH", "SIN", "SL", "SN", "ST", "SUI", "SWE", "TH",
    "USA", "Wadgassen", "Waghäusel", "Weil am Rhein", "Wettersbach", "WF", "WÜ"
  ]);
  const IS_COARSE_POINTER = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const TAP_MAX_MOVE = 10;
  const TAP_MAX_DURATION = 500;
  const OverlayStateByHost = new WeakMap();

  const $ = (selector, root = document) => root.querySelector(selector);

  const h = (tag, props = {}, ...children) => {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(props || {})) {
      if (key === "class") el.className = value;
      else if (key === "dataset") Object.assign(el.dataset, value);
      else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
      else if (value !== false && value != null) el.setAttribute(key, value === true ? "" : value);
    }

    for (const child of children.flat()) {
      if (child == null) continue;
      el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }

    return el;
  };

  const state = {
    query: "",
    suggestions: [],
    activeIndex: -1,
    groups: []
  };

  const refs = {
    mount: null,
    searchWrap: null,
    input: null,
    suggest: null,
    openProfile: null,
    clearBtn: null
  };

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[-/]+/g, " ")
      .replace(/ß/g, "ss")
      .replace(/\s+/g, " ")
      .trim();

  function highlight(text, query) {
    const source = String(text || "");
    const nq = normalize(query);
    if (!nq) return source;

    const idx = normalize(source).indexOf(nq);
    if (idx < 0) return source;

    return (
      source.slice(0, idx) +
      "<mark>" +
      source.slice(idx, idx + query.length) +
      "</mark>" +
      source.slice(idx + query.length)
    );
  }

  function setSearchOpen(isOpen) {
    refs.searchWrap?.classList.toggle("is-open", !!isOpen);
  }

  function hideSuggestions() {
    state.suggestions = [];
    state.activeIndex = -1;
    setSearchOpen(false);

    if (!refs.suggest) return;
    refs.suggest.classList.add("hidden");
    refs.suggest.innerHTML = "";
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

  function buildIconUrlCandidates(key) {
    const value = String(key || "").trim();
    if (!value || !KNOWN_CAP_KEYS.has(value)) return [];

    const encoded = encodeURIComponent(value);
    return [`${FLAG_BASE_URL}/Cap-${encoded}.svg`, `${FLAG_BASE_URL}/CAP-${encoded}.svg`];
  }

  function buildSourceSteps(keys) {
    const out = [];
    const seen = new Set();

    for (let index = 0; index < (Array.isArray(keys) ? keys.length : 0); index++) {
      const key = String(keys[index] || "").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const urls = buildIconUrlCandidates(key);
      if (!urls.length) continue;

      out.push({
        urls,
        overlay: index > 0
      });
    }

    return out;
  }

  function setHostOverlayState(hostEl, overlayClass, imgEl, enabled) {
    if (!hostEl) return;

    let state = OverlayStateByHost.get(hostEl);
    if (!state) {
      state = new Map();
      OverlayStateByHost.set(hostEl, state);
    }

    if (imgEl) {
      state.set(imgEl, !!enabled);
    }

    const hasOverlay = Array.from(state.values()).some(Boolean);
    hostEl.classList.toggle(overlayClass, hasOverlay);
  }

  function applyCapFallback(img, hostEl, keys, overlayClass = "search-cap-overlay") {
    const steps = buildSourceSteps(keys);

    if (!steps.length) {
      setHostOverlayState(hostEl, overlayClass, img, true);
      img.onerror = null;
      img.onload = null;
      img.style.visibility = "visible";
      img.src = CAP_FALLBACK_URL;
      return;
    }

    let stepIndex = 0;
    let urlIndex = 0;

    const load = () => {
      const step = steps[stepIndex];
      setHostOverlayState(hostEl, overlayClass, img, step.overlay);
      img.src = step.urls[urlIndex];
    };

    img.onload = () => {
      img.style.visibility = "visible";
      setHostOverlayState(hostEl, overlayClass, img, steps[stepIndex]?.overlay);
    };

    img.onerror = () => {
      const step = steps[stepIndex];

      if (urlIndex + 1 < step.urls.length) {
        urlIndex++;
        load();
      } else if (stepIndex + 1 < steps.length) {
        stepIndex++;
        urlIndex = 0;
        load();
      } else {
        setHostOverlayState(hostEl, overlayClass, img, true);
        img.onerror = null;
        img.onload = null;
        img.style.visibility = "visible";
        img.src = CAP_FALLBACK_URL;
      }
    };

    img.style.visibility = "visible";
    load();
  }

  function createCapImg(alt, keys, hostClass = "") {
    const img = h("img", {
      class: hostClass || "avatar-img",
      alt,
      loading: "eager",
      decoding: "sync",
      draggable: "false"
    });

    return { img, keys };
  }

  function renderCapAvatar(group, size = "sm", extraClass = "") {
    const avatar = group?.avatar || {};
    const alt = `${String(group?.label || "Gliederung")} ${String(group?.name || "").trim()}`;

    if (avatar.mode === "dual") {
      const wrap = h("div", { class: `rek-avatar-dual ${size} ${extraClass}` });
      const left = createCapImg(alt, avatar.leftKeys || [], "rek-avatar-dual-cap left");
      const right = createCapImg(alt, avatar.rightKeys || [], "rek-avatar-dual-cap right");
      wrap.appendChild(left.img);
      wrap.appendChild(right.img);
      applyCapFallback(left.img, wrap, left.keys, "search-cap-overlay");
      applyCapFallback(right.img, wrap, right.keys, "search-cap-overlay");
      return wrap;
    }

    if (avatar.mode === "flip") {
      const wrap = h("div", { class: `rek-avatar-flip ${size} ${extraClass}` });
      const inner = h("div", { class: "rek-avatar-flip-inner" });
      const front = createCapImg(alt, avatar.frontKeys || [], "rek-avatar-flip-cap front");
      const back = createCapImg(alt, avatar.backKeys || [], "rek-avatar-flip-cap back");
      inner.appendChild(front.img);
      inner.appendChild(back.img);
      wrap.appendChild(inner);
      applyCapFallback(front.img, inner, front.keys, "search-cap-overlay");
      applyCapFallback(back.img, inner, back.keys, "search-cap-overlay");
      return wrap;
    }

    const wrap = h("div", { class: `ath-avatar ${size} ${extraClass}` });
    const single = createCapImg(alt, avatar.iconKeys || group?.iconKeys || [], "avatar-img");
    wrap.appendChild(single.img);
    applyCapFallback(single.img, wrap, single.keys, "search-cap-overlay");
    return wrap;
  }

  function defaultOpenProfile(group) {
    if (!group) return;
    const url = `./clubs_profil.html?gliederung=${encodeURIComponent(String(group.id || ""))}`;
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

  function openGroup(group) {
    if (!group) return;
    resetSearchUi();
    (refs.openProfile || defaultOpenProfile)(group);
  }

  function updateSuggestions() {
    const query = state.query.trim();
    if (query.length < MIN_QUERY_LEN) {
      state.suggestions = [];
      state.activeIndex = -1;
      hideSuggestions();
      return;
    }

    const nq = normalize(query);

    const ranked = state.groups
      .map((group) => {
        const haystack = [group.name, ...(group.searchKeys || [])].map(normalize);
        const matchIndex = haystack.findIndex((entry) => entry.includes(nq));
        const startsWith = haystack.some((entry) => entry.startsWith(nq));
        const isExact = haystack.some((entry) => entry === nq);
        return { group, matchIndex, startsWith, isExact };
      })
      .filter((entry) => entry.matchIndex >= 0);

    const visible = ranked.some((entry) => entry.isExact)
      ? ranked.filter((entry) => entry.isExact)
      : ranked;

    visible.sort((left, right) => {
      const exactCompare = Number(right.isExact) - Number(left.isExact);
      if (exactCompare !== 0) return exactCompare;

      const startCompare = Number(right.startsWith) - Number(left.startsWith);
      if (startCompare !== 0) return startCompare;

      return normalize(left.group.name).localeCompare(normalize(right.group.name), "de");
    });

    state.suggestions = visible.map((entry) => entry.group).slice(0, 10);
    state.activeIndex = state.suggestions.length ? 0 : -1;
    paintSuggestions();
  }

  function paintSuggestions() {
    const box = refs.suggest;
    if (!box) return;

    const query = state.query.trim();
    box.innerHTML = "";

    if (!query || !state.suggestions.length) {
      box.appendChild(
        h(
          "div",
          { class: "ath-suggest-empty" },
          query.length < MIN_QUERY_LEN ? `Mind. ${MIN_QUERY_LEN} Zeichen eingeben` : "Keine Treffer"
        )
      );
      box.classList.remove("hidden");
      setSearchOpen(true);
      return;
    }

    state.suggestions.forEach((group, index) => {
      let pointerId = null;
      let startX = 0;
      let startY = 0;
      let startTime = 0;
      let moved = false;

      const item = h("div", {
        class: "ath-suggest-item" + (index === state.activeIndex ? " active" : ""),
        role: "option",
        "aria-selected": index === state.activeIndex ? "true" : "false",

        onpointerdown: (event) => {
          if (event.pointerType === "mouse") {
            const isSecondary = event.button !== 0 || event.ctrlKey || event.metaKey;
            if (isSecondary) {
              event.stopPropagation();
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            openGroup(group);
            return;
          }

          pointerId = event.pointerId;
          startX = event.clientX;
          startY = event.clientY;
          startTime = performance.now();
          moved = false;
        },

        onpointermove: (event) => {
          if (event.pointerType === "mouse") return;
          if (pointerId == null || event.pointerId !== pointerId) return;

          const dx = event.clientX - startX;
          const dy = event.clientY - startY;
          if (Math.abs(dx) > TAP_MAX_MOVE || Math.abs(dy) > TAP_MAX_MOVE) {
            moved = true;
          }
        },

        onpointerup: (event) => {
          if (event.pointerType === "mouse") return;
          if (pointerId == null || event.pointerId !== pointerId) return;

          const duration = performance.now() - startTime;
          const isTap = !moved && duration <= TAP_MAX_DURATION;
          pointerId = null;

          if (!isTap) return;

          event.preventDefault();
          event.stopPropagation();
          openGroup(group);
        },

        onpointercancel: () => {
          pointerId = null;
          moved = false;
        },

        onpointerenter: () => {
          if (state.activeIndex === index) return;
          box.querySelector(".ath-suggest-item.active")?.classList.remove("active");
          item.classList.add("active");
          state.activeIndex = index;
        },

        onmouseenter: () => {
          if (state.activeIndex === index) return;
          box.querySelector(".ath-suggest-item.active")?.classList.remove("active");
          item.classList.add("active");
          state.activeIndex = index;
        }
      });

      item.appendChild(renderCapAvatar(group, "sm", "ath-suggest-avatar"));

      const nameEl = h("div", { class: "ath-suggest-name" });
      nameEl.innerHTML = highlight(group.name, query);

      const sub = h("div", { class: "ath-suggest-sub" }, group.subtitle || group.label || "");
      const text = h("div", { class: "ath-suggest-text" }, nameEl, sub);

      item.appendChild(text);
      box.appendChild(item);
    });

    box.classList.remove("hidden");
    setSearchOpen(true);
  }

  function onQueryChange(event) {
    state.query = event.target.value || "";
    updateClearButton();
    updateSuggestions();
  }

  function onSearchFocus(event) {
    state.query = event.target.value || "";
    updateClearButton();
    updateSuggestions();
  }

  function onSearchKeyDown(event) {
    const { suggestions, activeIndex } = state;

    if (event.key === "ArrowDown") {
      if (!suggestions.length) return;
      event.preventDefault();
      state.activeIndex = (activeIndex + 1) % suggestions.length;
      paintSuggestions();
    } else if (event.key === "ArrowUp") {
      if (!suggestions.length) return;
      event.preventDefault();
      state.activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
      paintSuggestions();
    } else if (event.key === "Enter") {
      if (!suggestions.length) return;
      event.preventDefault();
      openGroup(suggestions[activeIndex >= 0 ? activeIndex : 0]);
    } else if (event.key === "Escape") {
      hideSuggestions();
    }
  }

  function renderSearch() {
    const wrap = h("div", { class: "ath-search-wrap" });
    refs.searchWrap = wrap;

    wrap.addEventListener("focusout", () => {
      if (IS_COARSE_POINTER) return;

      setTimeout(() => {
        if (!wrap.matches(":focus-within")) hideSuggestions();
      }, 120);
    });

    const input = h("input", {
      class: "ath-input",
      type: "text",
      placeholder: "Suche nach Clubs ...",
      role: "searchbox",
      "aria-label": "Gliederungen suchen",
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
        onpointerdown: (event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          clearSearch();
        }
      },
      "×"
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

    const suggest = h("div", { class: "ath-suggest hidden", role: "listbox", id: "rek-suggest" });
    refs.suggest = suggest;
    wrap.appendChild(suggest);

    wrap.addEventListener("pointerdown", (event) => {
      if (event.target !== wrap) return;
      event.stopPropagation();
    });

    wrap.addEventListener("pointerup", (event) => {
      if (event.target !== wrap) return;
      event.preventDefault();
      event.stopPropagation();
      hideSuggestions();
    });

    return wrap;
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

  function setGroups(groups) {
    state.groups = Array.isArray(groups) ? groups : [];
    hideSuggestions();
  }

  function showError(message) {
    if (!refs.suggest) return;
    refs.suggest.classList.remove("hidden");
    refs.suggest.innerHTML = `<div class="ath-suggest-empty">${String(message || "")}</div>`;
  }

  const api = {
    mount,
    setGroups,
    showError,
    renderAvatar: renderCapAvatar
  };

  window.ClubsSearch = api;
  window.RekordeSearch = api;
})();
