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

  const MIN_QUERY_LEN = 3;
  const EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test (1).xlsx";
  const TOP10_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/top10.json";

  const TOP10_GROUPS = [
    { key: "starts", label: "Starts" },
    { key: "wettkaempfe", label: "Wettkämpfe" },
    { key: "lsc_aktuell", label: "LSC aktuell" },
    { key: "aktive_jahre", label: "Aktive Jahre" },
    { key: "hoechster_lsc", label: "Höchster LSC" },
    { key: "auslandswettkaempfe", label: "Auslandswettkämpfe" }
  ];

  const COLS = {
    gender: 0,
    name: 1,
    excelDate: 9,
    meet_name: 10,
    yy2: 11,
    ortsgruppe: 12
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

  function excelSerialToISO(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "";
    const base = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(base.getTime() + num * 86400000);
    return d.toISOString().slice(0, 10);
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

  function buildIndicesFromRows(rows) {
    const byId = new Map();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const name = String(row[COLS.name] || "").trim();
      const gender = String(row[COLS.gender] || "").trim();
      const dNum = Number(row[COLS.excelDate]);
      const iso = excelSerialToISO(row[COLS.excelDate]);
      const yy2 = row[COLS.yy2];
      const jahrgang = parseTwoDigitYearWithMeetYear(yy2, iso);
      const og = String(row[COLS.ortsgruppe] || "").trim();

      if (!name || !jahrgang) continue;

      const id = makeAthleteId(name, gender, jahrgang);

      const prev = byId.get(id);
      if (!prev) {
        byId.set(id, {
          id,
          name,
          jahrgang,
          geschlecht: gender,
          ortsgruppe: og,
          _lastDateNum: Number.isFinite(dNum) ? dNum : -Infinity
        });
      } else {
        const prevNum = Number(prev._lastDateNum);
        const curNum = Number.isFinite(dNum) ? dNum : -Infinity;
        if (curNum >= prevNum && og) {
          prev.ortsgruppe = og;
          prev._lastDateNum = curNum;
        }
      }
    }

    const athletes = Array.from(byId.values()).map(a => {
      const { _lastDateNum, ...clean } = a;
      return clean;
    });

    athletes.sort((l, r) => l.name.localeCompare(r.name, "de"));
    return athletes;
  }

  const FLAG_BASE_URL = "./svg";
  const CAP_FALLBACK_FILE = "Cap-Baden_light.svg";
  const CAP_FALLBACK_URL = `${FLAG_BASE_URL}/${encodeURIComponent(CAP_FALLBACK_FILE)}`;

  const CapProbe = new Map();

  function probeCapFileExists(capFile) {
    if (!capFile) return Promise.resolve(false);
    if (CapProbe.has(capFile)) return CapProbe.get(capFile);

    const url = `${FLAG_BASE_URL}/${encodeURIComponent(capFile)}`;
    const p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

    CapProbe.set(capFile, p);
    return p;
  }

  function setCapWithCache(imgEl, capFile) {
    imgEl.src = CAP_FALLBACK_URL;
    probeCapFileExists(capFile).then((ok) => {
      if (!ok) return;
      imgEl.src = `${FLAG_BASE_URL}/${encodeURIComponent(capFile)}`;
    });
  }

  function formatOrtsgruppe(raw) {
    let s = (raw || "").toString().trim();
    s = s.replace(/^(og|dlrg)\s+/i, "");
    s = s
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return "DLRG " + s;
  }

  function capFileFromOrtsgruppe(rawOG) {
    const og = String(rawOG || "").trim();
    if (!og) return "Cap-Baden_light.svg";
    if (og === "Nieder-Olm/Wörrstadt") return "Cap-Nieder-OlmWörrstadt.svg";
    return `Cap-${og}.svg`;
  }

  function renderCapAvatar(a, size = "xl", extraClass = "") {
    const wrap = h("div", { class: `ath-avatar ${size} ${extraClass}` });

    const ogNow = String(a?.ortsgruppe || "").trim();
    const file = capFileFromOrtsgruppe(ogNow);

    const img = h("img", {
      class: "avatar-img",
      alt: `Vereinskappe ${formatOrtsgruppe(ogNow)}`,
      loading: size === "xl" ? "eager" : "lazy",
      decoding: "async",
      fetchpriority: size === "xl" ? "high" : "low"
    });

    setCapWithCache(img, file);

    wrap.appendChild(img);
    return wrap;
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
        return XLSX.read(buf, { type: "array" });
      })();
    }
    return workbookPromise;
  }

  async function loadWorkbookArray(sheetName = "Tabelle2") {
    const wb = await getWorkbook();
    const ws = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
  }

  const AppState = {
    query: "",
    suggestions: [],
    activeIndex: -1,
    athletes: []
  };

  const Top10State = {
    groups: null,
    currentKey: "starts"
  };

  const Refs = {
    input: null,
    suggest: null,
    searchWrap: null,
    top10Mount: null
  };

  function openProfile(a) {
    if (!a) return;
    const id = a.id ? String(a.id) : "";
    const url = id
      ? `./profil.html?ath=${encodeURIComponent(id)}`
      : `./profil.html?name=${encodeURIComponent(String(a.name || "").trim())}`;
    window.location.href = url;
  }

  function openAthleteProfileByName(rawName) {
    if (!rawName) return;
    if (!Array.isArray(AppState.athletes) || !AppState.athletes.length) return;

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

    if (!hit) return;
    openProfile(hit);
  }

  window.openAthleteProfileByName = openAthleteProfileByName;

  function openProfileFromTop10Row(tr) {
    if (!tr) return;
    const name = (tr.dataset?.name || "").trim();
    if (!name) return;
    openAthleteProfileByName(name);
  }

  function renderApp() {
    const mount = $("#athleten-container");
    if (!mount) return;

    mount.innerHTML = "";
    const ui = h("section", { class: "ath-ui", role: "region", "aria-label": "Athletenbereich" });

    ui.appendChild(renderSearch());

    const top10 = h("div", { id: "ath-top10", class: "ath-top10" });
    Refs.top10Mount = top10;
    ui.appendChild(top10);

    mount.appendChild(ui);
  }

  async function loadTop10Json() {
    const resp = await fetch(encodeURI(TOP10_URL), { mode: "cors" });
    if (!resp.ok) throw new Error(`Top10 HTTP ${resp.status}`);
    return resp.json();
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
      mount.innerHTML = '<div class="ath-top10-error">Top&nbsp;10 konnten nicht geladen werden.</div>';
    }
  }

  function renderTop10CapCell(ortsgruppeRaw) {
    const ogNow = String(ortsgruppeRaw || "").trim();
    const td = h("td", { class: "ath-top10-cap-cell" });

    if (!ogNow) return td;

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
    const available = TOP10_GROUPS.filter(def => groups[def.key] && groups[def.key].rows.length);

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
        h("option", { value: def.key, selected: def.key === Top10State.currentKey }, def.label)
      )
    );

    select.addEventListener("change", (e) => {
      Top10State.currentKey = e.target.value;
      renderTop10();
    });

    let infoNode = null;
    if (current && typeof current.label === "string") {
      const labelLower = current.label.toLowerCase();
      if (labelLower.includes("höchster") && labelLower.includes("lsc")) {
        infoNode = h("div", { class: "ath-top10-info" }, ["Hinweis:", h("br"), "In dieser Auswertung werden nur LifesavingScore-Werte ab dem Jahr 2001 berücksichtigt."]);
      }
      if (labelLower.includes("starts")) {
        infoNode = h("div", { class: "ath-top10-info" }, ["Hinweis:", h("br"), "Es werden nur 50m Retten, 100m Retten mit Flossen, 100m Kombi, 100m Lifesaver, 200m Super Lifesaver und 200m Hindernis gezählt."]);
      }
      if (labelLower.includes("wettkämpfe")) {
        infoNode = h("div", { class: "ath-top10-info" }, ["Hinweis:", h("br"), "Es werden nur Pool-Einzel Wettkämpfe gezählt."]);
      }
      if (labelLower.includes("lsc") && labelLower.includes("aktuell")) {
        infoNode = h("div", { class: "ath-top10-info" }, ["Hinweis:", h("br"), "Es werden nur Sportler berücksichtigt, die in den letzten 2 Jahren an Pool-Einzel Wettkämpfen teilgenommen haben."]);
      }
      if (labelLower.includes("aktive") && labelLower.includes("jahre")) {
        infoNode = h("div", { class: "ath-top10-info" }, ["Hinweis:", h("br"), "Es werden nur Jahre gezählt, inden man Pool-Einzel Wettkämpfe geschwommen ist."]);
      }
    }

    const head = h("div", { class: "ath-top10-head" }, h("div", { class: "ath-top10-label" }, "Top-10"));
    const tableWrap = h("div", { class: "ath-top10-table-wrap" }, renderTop10Table(current, select));

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
          h("th", { class: "ath-top10-header-cell ath-top10-header-nameog" }, "Name / Ortsgruppe"),
          h("th", { class: "ath-top10-header-cell ath-top10-header-select" },
            h("div", { class: "ath-top10-header-select-wrap" }, headerRightNode || "Wert")
          )
        )
      )
    );

    const bodyRows = rows.map(cells => {
      const name = String(cells[0] ?? "").trim();
      const og = String(cells[1] ?? "").trim();
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
      if (!wrap.contains(e.target) && !suggest.contains(e.target)) hideSuggestions();
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
    if (!Refs.suggest) return;
    Refs.suggest.classList.add("hidden");
    Refs.suggest.innerHTML = "";
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
          box.querySelector(".ath-suggest-item.active")?.classList.remove("active");
          item.classList.add("active");
          AppState.activeIndex = idx;
        },
        onmouseenter: () => {
          if (AppState.activeIndex === idx) return;
          box.querySelector(".ath-suggest-item.active")?.classList.remove("active");
          item.classList.add("active");
          AppState.activeIndex = idx;
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

  document.addEventListener("DOMContentLoaded", async () => {
    renderApp();
    await initTop10();
    await new Promise(requestAnimationFrame);

    try {
      const rows = await loadWorkbookArray("Tabelle2");
      AppState.athletes = buildIndicesFromRows(rows);
      hideSuggestions();
    } catch (err) {
      if (Refs.suggest) {
        Refs.suggest.classList.remove("hidden");
        Refs.suggest.innerHTML = '<div class="ath-suggest-empty">Fehler beim Laden der Daten.</div>';
      }
    }
  });
})();
