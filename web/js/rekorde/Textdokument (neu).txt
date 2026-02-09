(function () {
  const STATE_MAP = {
    "BA": "Baden",
    "BAY": "Bayern",
    "BY": "Bayern",
    "BB": "Brandenburg",
    "BE": "Berlin",
    "HB": "Bremen",
    "HH": "Hamburg",
    "HE": "Hessen",
    "MV": "Mecklenburg-Vorpommern",
    "NI": "Niedersachsen",
    "RP": "Rheinland-Pfalz",
    "SL": "Saarland",
    "SN": "Sachsen",
    "ST": "Sachsen-Anhalt",
    "SH": "Schleswig-Holstein",
    "TH": "Thüringen",
    "WÜ": "Württemberg",
    "WU": "Württemberg",
    "WUE": "Württemberg",
    "NR": "Nordrhein",
    "NRH": "Nordrhein",
    "NO": "Nordrhein",
    "NW": "Nordrhein",
    "WF": "Westfalen",
    "WE": "Westfalen",
    "WL": "Westfalen",
    "NRW": "Nordrhein-Westfalen"
  };

  const NATIO_MAP = {
    "GER": "Deutschland",
    "DEU": "Deutschland"
  };

  const ICON_PLACEHOLDER =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="6" fill="#d9d9d9"/></svg>`);

  const normalize = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

  const foldGerman = (s) =>
    normalize(s)
      .toLocaleLowerCase("de")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss");

  const safeFilePart = (s) => normalize(s).replace(/[\/\\?%*:|"<>]/g, "-");

  const absUrl = (u) => {
    if (!u) return "";
    if (u.startsWith("data:")) return u;
    try {
      return new URL(u, document.baseURI).href;
    } catch {
      return u;
    }
  };

  const iconRel = (key) => {
    const k = safeFilePart(key);
    if (!k) return "";
    return encodeURI(`./svg/Cap-${k}.svg`);
  };

  const ensureXLSX = () => {
    if (window.XLSX) return Promise.resolve(true);
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.onload = () => resolve(!!window.XLSX);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const chooseSrc = (srcs, failedIcons, startIndex = 0) => {
    for (let i = startIndex; i < srcs.length; i++) {
      const s = srcs[i];
      if (s && !failedIcons.has(s)) return { src: s, idx: i };
    }
    return { src: "", idx: -1 };
  };

  const setImgSmart = (img, wrap, srcsRaw, overlayOnFallback, failedIcons) => {
    const srcs = srcsRaw.map(absUrl).filter(Boolean);
    const first = chooseSrc(srcs, failedIcons, 0);

    img.dataset.s0 = srcs[0] || "";
    img.dataset.s1 = srcs[1] || "";
    img.dataset.s2 = srcs[2] || "";
    img.dataset.overlay = overlayOnFallback ? "1" : "0";

    if (wrap) wrap.classList.toggle("is-fallback", overlayOnFallback && first.idx > 0);

    img.onerror = null;
    img.src = first.src || ICON_PLACEHOLDER;

    img.onerror = () => {
      failedIcons.add(img.src);

      const list = [img.dataset.s0, img.dataset.s1, img.dataset.s2].filter(Boolean);
      const ci = list.indexOf(img.src);
      const nextPick = chooseSrc(list, failedIcons, ci >= 0 ? ci + 1 : 0);

      if (nextPick.src) {
        img.src = nextPick.src;
        if (wrap) wrap.classList.toggle("is-fallback", img.dataset.overlay === "1" && nextPick.idx > 0);
      } else {
        img.src = ICON_PLACEHOLDER;
        if (wrap) wrap.classList.remove("is-fallback");
      }
    };
  };

  const modeOf = (m) => {
    let bestK = "";
    let bestV = -1;
    for (const [k, v] of m.entries()) {
      if (v > bestV) {
        bestV = v;
        bestK = k;
      }
    }
    return bestK;
  };

  const bump = (m, k) => {
    if (!k) return;
    m.set(k, (m.get(k) || 0) + 1);
  };

  const sumValues = (m) => {
    if (!m) return 0;
    let s = 0;
    for (const v of m.values()) s += Number(v) || 0;
    return s;
  };

  const variantsForName = (name) => {
    const s = normalize(name);
    if (!s) return [];
    const a = s.replace(/-/g, " ");
    const b = s.replace(/[-\s]/g, "");
    const c = s.replace(/-/g, "");
    return Array.from(new Set([s, a, b, c])).filter(Boolean);
  };

  const mapOGName = (raw) => {
    const v = normalize(raw);
    if (!v) return "";
    const stripped = v.replace(/^og\s+/i, "").trim();
    const f = foldGerman(stripped);
    if (f === foldGerman("Ettlingen") || f === foldGerman("Wettersbach")) return "Ettlingen/Wettersbach";
    return stripped;
  };

  const transformLV = (raw) => {
    const v = normalize(raw);
    if (!v) return { code: "", name: "" };
    const code = v.toUpperCase().replace(/\s+/g, "");
    const name = STATE_MAP[code] || "";
    return { code, name };
  };

  const transformBV = (raw) => {
    const v = normalize(raw);
    if (!v) return { code: "", name: "" };
    const code = v.toUpperCase().replace(/\s+/g, "");
    const name = NATIO_MAP[code] || "";
    return { code, name };
  };

  const lvCodeVariants = (code) => {
    const c = normalize(code);
    if (!c) return [];
    const up = c.toUpperCase();
    if (up === "WÜ" || up === "WU" || up === "WUE") return ["WU", "WUE", "WÜ"];
    if (up === "NR") return ["NR", "NW", "NO", "NRH"];
    if (up === "WF") return ["WF", "WL", "WE"];
    return [up];
  };

  const isComboLV = (lvName) => lvName === "Baden-Württemberg" || lvName === "Nordrhein-Westfalen";

  const addItem = (arr, it) => {
    it.keysFolded = Array.from(new Set((it.keysFolded || []).map(foldGerman).filter(Boolean)));
    arr.push(it);
  };

  const buildItemsFromExcel = (rows, cols) => {
    const iOrts = cols.ortsgruppe - 1;
    const iState = cols.LV_state - 1;
    const iNatio = cols.BV_natio - 1;

    let start = 0;
    const r0 = rows[0] || [];
    const h = [foldGerman(r0[iOrts] ?? ""), foldGerman(r0[iState] ?? ""), foldGerman(r0[iNatio] ?? "")].join(" ");
    if (h.includes("orts") || h.includes("lv") || h.includes("bv") || h.includes("natio") || h.includes("bund")) start = 1;

    const ogMap = new Map();
    const lvMap = new Map();
    const bvMap = new Map();

    for (let i = start; i < rows.length; i++) {
      const row = rows[i] || [];

      const ogRaw = normalize(row[iOrts]);
      const og = mapOGName(ogRaw);
      const lv = transformLV(row[iState]);
      const bv = transformBV(row[iNatio]);

      if (og) {
        if (!ogMap.has(og)) ogMap.set(og, { lvNameCounts: new Map(), lvCodeCounts: new Map(), bvCodeCounts: new Map(), rawOG: new Set() });
        const o = ogMap.get(og);
        bump(o.lvNameCounts, lv.name);
        bump(o.lvCodeCounts, lv.code);
        bump(o.bvCodeCounts, bv.code);
        o.rawOG.add(ogRaw);
        if (og === "Ettlingen/Wettersbach") {
          o.rawOG.add("Ettlingen");
          o.rawOG.add("Wettersbach");
        }
      }

      if (lv.name) {
        if (!lvMap.has(lv.name)) lvMap.set(lv.name, { codeCounts: new Map(), bvCodeCounts: new Map() });
        const l = lvMap.get(lv.name);
        bump(l.codeCounts, lv.code);
        bump(l.bvCodeCounts, bv.code);
      }

      if (bv.code) {
        if (!bvMap.has(bv.code)) bvMap.set(bv.code, { name: NATIO_MAP[bv.code] || bv.code });
      }
    }

    const lvHas = (name) => lvMap.has(name);

    if (lvHas("Baden") || lvHas("Württemberg")) {
      if (!lvMap.has("Baden-Württemberg")) lvMap.set("Baden-Württemberg", { codeCounts: new Map([["BW", 1]]), bvCodeCounts: new Map() });
      bump(lvMap.get("Baden-Württemberg").bvCodeCounts, "GER");
    }

    if (lvHas("Nordrhein") || lvHas("Westfalen")) {
      if (!lvMap.has("Nordrhein-Westfalen")) lvMap.set("Nordrhein-Westfalen", { codeCounts: new Map([["NRW", 1]]), bvCodeCounts: new Map() });
      bump(lvMap.get("Nordrhein-Westfalen").bvCodeCounts, "GER");
    }

    const badenCount = sumValues(lvMap.get("Baden")?.codeCounts);
    const wueCount = sumValues(lvMap.get("Württemberg")?.codeCounts);
    const nrCount = sumValues(lvMap.get("Nordrhein")?.codeCounts);
    const wfCount = sumValues(lvMap.get("Westfalen")?.codeCounts);

    const items = [];

    for (const [ogName, o] of ogMap.entries()) {
      const lvName = modeOf(o.lvNameCounts) || "";
      const lvCode = modeOf(o.lvCodeCounts) || "";
      const bvCode = modeOf(o.bvCodeCounts) || "";

      const line1 = ogName;
      const line2 = lvName ? `${lvName}${bvCode ? ` (${bvCode})` : ""}` : (bvCode ? `(${bvCode})` : "");
      const value = ogName;

      const ogKeys = [ogName, ...Array.from(o.rawOG)];

      if (ogName === "Ettlingen/Wettersbach") {
        addItem(items, {
          kind: "og",
          value,
          line1,
          line2,
          flip: true,
          dual: false,
          top: "",
          iconFrontSources: [iconRel("Ettlingen")],
          iconBackSources: [iconRel("Wettersbach")],
          iconLeftSources: [],
          iconRightSources: [],
          iconSources: [],
          overlayOnFallback: false,
          keysFolded: ogKeys
        });
      } else {
        const ogIcon = iconRel(ogName);

        const lvIconsCodes = lvCodeVariants(lvCode).map(iconRel).filter(Boolean);
        const lvTryName = lvName && !isComboLV(lvName) ? [iconRel(lvName)] : [];
        const lvIcons = [...lvIconsCodes, ...lvTryName].filter(Boolean);

        addItem(items, {
          kind: "og",
          value,
          line1,
          line2,
          flip: false,
          dual: false,
          top: "",
          iconFrontSources: [],
          iconBackSources: [],
          iconLeftSources: [],
          iconRightSources: [],
          iconSources: [ogIcon, ...lvIcons],
          overlayOnFallback: true,
          keysFolded: ogKeys
        });
      }
    }

    for (const [lvName, l] of lvMap.entries()) {
      const bvCode = modeOf(l.bvCodeCounts) || "";

      const line1 = lvName;
      const line2 = bvCode ? `(${bvCode})` : "";
      const value = lvName;

      const extraVariants =
        lvName === "Baden-Württemberg"
          ? ["Badenwuerttemberg", "Badenwurttemberg", "Badenwürttemberg", "Badenwürtemberg", "Badenwürtmberg"]
          : lvName === "Nordrhein-Westfalen"
          ? ["Nordrheinwestfalen", "Nordrhein-Westfahlen", "Nordrheinwestfahlen", "Nordrhein Westfahlen"]
          : [];

      if (lvName === "Baden-Württemberg") {
        addItem(items, {
          kind: "lv",
          value,
          line1,
          line2,
          flip: false,
          dual: true,
          top: badenCount >= wueCount ? "left" : "right",
          iconFrontSources: [],
          iconBackSources: [],
          iconLeftSources: [iconRel("BA")].filter(Boolean),
          iconRightSources: [iconRel("WU"), iconRel("WUE"), iconRel("WÜ")].filter(Boolean),
          iconSources: [],
          overlayOnFallback: false,
          keysFolded: [...variantsForName(lvName), ...extraVariants]
        });
        continue;
      }

      if (lvName === "Nordrhein-Westfalen") {
        addItem(items, {
          kind: "lv",
          value,
          line1,
          line2,
          flip: false,
          dual: true,
          top: nrCount >= wfCount ? "left" : "right",
          iconFrontSources: [],
          iconBackSources: [],
          iconLeftSources: [iconRel("NR"), iconRel("NW"), iconRel("NO"), iconRel("NRH")].filter(Boolean),
          iconRightSources: [iconRel("WF"), iconRel("WL"), iconRel("WE")].filter(Boolean),
          iconSources: [],
          overlayOnFallback: false,
          keysFolded: [...variantsForName(lvName), ...extraVariants]
        });
        continue;
      }

      const lvCode = modeOf(l.codeCounts) || "";
      const lvIconsCodes = lvCodeVariants(lvCode).map(iconRel).filter(Boolean);
      const lvIcons = [...lvIconsCodes, iconRel(lvName)].filter(Boolean);

      addItem(items, {
        kind: "lv",
        value,
        line1,
        line2,
        flip: false,
        dual: false,
        top: "",
        iconFrontSources: [],
        iconBackSources: [],
        iconLeftSources: [],
        iconRightSources: [],
        iconSources: lvIcons,
        overlayOnFallback: false,
        keysFolded: [...variantsForName(lvName), ...extraVariants]
      });
    }

    for (const [bvCode] of bvMap.entries()) {
      const name = NATIO_MAP[bvCode] || bvCode;

      addItem(items, {
        kind: "bv",
        value: name,
        line1: name,
        line2: "",
        flip: false,
        dual: false,
        top: "",
        iconFrontSources: [],
        iconBackSources: [],
        iconLeftSources: [],
        iconRightSources: [],
        iconSources: [iconRel(bvCode)],
        overlayOnFallback: false,
        keysFolded: [...variantsForName(name)]
      });
    }

    const kindRank = (k) => (k === "og" ? 0 : k === "lv" ? 1 : 2);

    items.sort((a, b) => {
      const c = a.line1.localeCompare(b.line1, "de", { sensitivity: "base" });
      if (c !== 0) return c;
      return kindRank(a.kind) - kindRank(b.kind);
    });

    return items;
  };

  const getFilteredItems = (items, q) => {
    const query = foldGerman(q);
    if (!query) return items.slice(0, 10);

    const starts = [];
    const contains = [];

    for (const it of items) {
      let matchedStart = false;
      let matchedAny = false;

      for (const k of it.keysFolded) {
        if (k.startsWith(query)) {
          matchedStart = true;
          matchedAny = true;
          break;
        }
        if (!matchedAny && k.includes(query)) matchedAny = true;
      }

      if (matchedStart) starts.push(it);
      else if (matchedAny) contains.push(it);

      if (starts.length >= 10) break;
    }

    if (starts.length >= 10) return starts.slice(0, 10);

    for (const it of contains) {
      starts.push(it);
      if (starts.length >= 10) break;
    }

    return starts.slice(0, 10);
  };

  const bestItemForInput = (items, raw) => {
    const v = normalize(raw);
    if (!v) return null;
    const fv = foldGerman(v);

    for (const it of items) {
      if (foldGerman(it.value) === fv) return it;
      if (foldGerman(it.line1) === fv) return it;
    }

    for (const it of items) {
      for (const k of it.keysFolded) {
        if (k === fv) return it;
      }
    }

    const filtered = getFilteredItems(items, v);
    if (filtered.length === 1) return filtered[0];

    return null;
  };

  window.initRekordeSuche = async function initRekordeSuche(opts) {
    const root = document.getElementById(opts?.rootId || "");
    if (!root) return;

    const combo = root.querySelector("#searchCombo");
    const input = root.querySelector("#recordSearch");
    const button = root.querySelector("#openBtn");
    const dropdown = root.querySelector("#searchDropdown");

    if (!combo || !input || !button || !dropdown) return;

    const failedIcons = new Set();
    const localState = { loaded: false, items: [] };

    let isOpen = false;
    let activeIndex = -1;

    const openDropdown = () => {
      if (!localState.loaded) return;
      if (isOpen) return;
      isOpen = true;
      combo.setAttribute("aria-expanded", "true");
      dropdown.classList.add("open");
    };

    const closeDropdown = () => {
      if (!isOpen) return;
      isOpen = false;
      activeIndex = -1;
      combo.setAttribute("aria-expanded", "false");
      dropdown.classList.remove("open");
      [...dropdown.querySelectorAll("li")].forEach((li) => li.classList.remove("active"));
    };

    const renderDropdown = (itemsToShow) => {
      dropdown.innerHTML = "";
      activeIndex = -1;

      if (!localState.loaded) {
        const li = document.createElement("li");
        li.className = "muted";
        li.textContent = "Lade Daten...";
        dropdown.appendChild(li);
        return;
      }

      if (!itemsToShow.length) {
        const li = document.createElement("li");
        li.className = "muted";
        li.textContent = "Keine Treffer";
        dropdown.appendChild(li);
        return;
      }

      itemsToShow.forEach((it, idx) => {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        li.dataset.index = String(idx);

        if (it.flip) {
          const wrap = document.createElement("div");
          wrap.className = "dd-flip";

          const inner = document.createElement("div");
          inner.className = "dd-flip-inner";

          const front = document.createElement("img");
          front.className = "dd-icon front";
          front.alt = "";
          front.loading = "lazy";
          front.decoding = "async";
          setImgSmart(front, null, it.iconFrontSources, false, failedIcons);

          const back = document.createElement("img");
          back.className = "dd-icon back";
          back.alt = "";
          back.loading = "lazy";
          back.decoding = "async";
          setImgSmart(back, null, it.iconBackSources, false, failedIcons);

          inner.appendChild(front);
          inner.appendChild(back);
          wrap.appendChild(inner);
          li.appendChild(wrap);
        } else if (it.dual) {
          const wrap = document.createElement("div");
          wrap.className = "dd-dual-wrap";

          const left = document.createElement("img");
          left.className = "dd-icon dual left";
          left.alt = "";
          left.loading = "lazy";
          left.decoding = "async";
          setImgSmart(left, null, it.iconLeftSources, false, failedIcons);

          const right = document.createElement("img");
          right.className = "dd-icon dual right";
          right.alt = "";
          right.loading = "lazy";
          right.decoding = "async";
          setImgSmart(right, null, it.iconRightSources, false, failedIcons);

          if (it.top === "left") left.classList.add("is-top");
          if (it.top === "right") right.classList.add("is-top");

          wrap.appendChild(left);
          wrap.appendChild(right);
          li.appendChild(wrap);
        } else {
          const wrap = document.createElement("div");
          wrap.className = "dd-icon-wrap";

          const img = document.createElement("img");
          img.className = "dd-icon";
          img.alt = "";
          img.loading = "lazy";
          img.decoding = "async";

          const overlay = document.createElement("div");
          overlay.className = "dd-icon-overlay";

          wrap.appendChild(img);
          wrap.appendChild(overlay);
          li.appendChild(wrap);

          setImgSmart(img, wrap, it.iconSources, it.overlayOnFallback, failedIcons);
        }

        const lines = document.createElement("div");
        lines.className = "dd-lines";

        const l1 = document.createElement("div");
        l1.className = "dd-line1";
        l1.textContent = it.line1;

        const l2 = document.createElement("div");
        l2.className = "dd-line2";
        l2.textContent = it.line2 || "";

        lines.appendChild(l1);
        lines.appendChild(l2);
        li.appendChild(lines);

        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          input.value = it.value;
          button.disabled = !normalize(input.value);
          closeDropdown();
        });

        dropdown.appendChild(li);
      });
    };

    const highlightActive = () => {
      const els = [...dropdown.querySelectorAll('li[role="option"]')];
      els.forEach((li) => li.classList.remove("active"));
      if (activeIndex < 0 || activeIndex >= els.length) return;
      els[activeIndex].classList.add("active");
      els[activeIndex].scrollIntoView({ block: "nearest" });
    };

    const refresh = () => {
      button.disabled = !normalize(input.value);
      const itemsToShow = getFilteredItems(localState.items, input.value);
      renderDropdown(itemsToShow);
      if (normalize(input.value) || document.activeElement === input) openDropdown();
    };

    input.addEventListener("focus", () => refresh());
    input.addEventListener("input", () => refresh());

    input.addEventListener("keydown", (e) => {
      if (!localState.loaded) return;

      const optionsEls = [...dropdown.querySelectorAll('li[role="option"]')];
      if (!optionsEls.length) {
        if (e.key === "Escape") closeDropdown();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        openDropdown();
        activeIndex = Math.min(activeIndex + 1, optionsEls.length - 1);
        highlightActive();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        openDropdown();
        activeIndex = Math.max(activeIndex - 1, 0);
        highlightActive();
        return;
      }

      if (e.key === "Enter") {
        const visible = getFilteredItems(localState.items, input.value);
        if (isOpen && activeIndex >= 0 && activeIndex < visible.length) {
          e.preventDefault();
          input.value = visible[activeIndex].value;
          button.disabled = !normalize(input.value);
          closeDropdown();
          return;
        }
        const best = bestItemForInput(localState.items, input.value);
        if (best) input.value = best.value;
        button.disabled = !normalize(input.value);
        closeDropdown();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        closeDropdown();
        return;
      }
    });

    button.addEventListener("click", () => {
      if (!localState.loaded) return;
      const best = bestItemForInput(localState.items, input.value);
      if (best) input.value = best.value;
      button.disabled = !normalize(input.value);
      closeDropdown();
    });

    document.addEventListener("pointerdown", (e) => {
      if (!combo.contains(e.target) && !dropdown.contains(e.target)) closeDropdown();
    });

    input.disabled = true;
    button.disabled = true;
    dropdown.innerHTML = `<li class="muted">Lade Daten...</li>`;

    const ok = await ensureXLSX();
    if (!ok) {
      dropdown.innerHTML = `<li class="muted">Fehler beim Laden</li>`;
      return;
    }

    try {
      const res = await fetch(encodeURI(opts.excelUrl), { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const buf = await res.arrayBuffer();

      const wb = window.XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[opts.sheetName] || wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("no_sheet");

      const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const items = buildItemsFromExcel(rows, opts.cols);

      localState.items = items;
      localState.loaded = true;

      input.disabled = false;
      button.disabled = !normalize(input.value);

      renderDropdown(getFilteredItems(localState.items, input.value));
    } catch {
      localState.loaded = false;
      input.disabled = true;
      button.disabled = true;
      dropdown.innerHTML = `<li class="muted">Fehler beim Laden</li>`;
    }
  };
})();
