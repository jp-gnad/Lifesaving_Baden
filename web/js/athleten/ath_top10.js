(function () {
  const DEFAULT_TOP10_URL =
    "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/top10.json";

  const TOP10_GROUPS = [
    { key: "starts", label: "Starts" },
    { key: "wettkaempfe", label: "Wettkämpfe" },
    { key: "lsc_aktuell", label: "LSC aktuell" },
    { key: "lsc_junioren_aktuell", label: "LSC Junioren aktuell" },
    { key: "aktive_jahre", label: "Aktive Jahre" },
    { key: "hoechster_lsc", label: "Höchster LSC" },
    { key: "auslandswettkaempfe", label: "Auslandswettkämpfe" }
  ];

  const JSON_GROUP_MAP = {
    starts: "disciplines",
    wettkaempfe: "competitions",
    lsc_aktuell: "lscRecent2y",
    lsc_junioren_aktuell: "juniorsCurrentLsc",
    aktive_jahre: "activeYears",
    hoechster_lsc: "lscAlltimeHigh",
    auslandswettkaempfe: "foreignStarts"
  };

  const GROUP_VALUE_LABEL = {
    starts: "Starts",
    wettkaempfe: "Wettkämpfe",
    lsc_aktuell: "LSC",
    lsc_junioren_aktuell: "LSC",
    aktive_jahre: "Jahre",
    hoechster_lsc: "LSC",
    auslandswettkaempfe: "Starts"
  };

  const GROUP_NOTES = {
    starts:
      "Es werden nur 50m Retten, 100m Retten mit Flossen, 100m Kombi, 100m Lifesaver, 200m Super Lifesaver und 200m Hindernis gezählt.",
    wettkaempfe:
      "Es werden nur Pool-Einzel Wettkämpfe gezählt.",
    lsc_aktuell:
      "Es werden nur Sportler berücksichtigt, die in den letzten 2 Jahren an Pool-Einzel Wettkämpfen teilgenommen haben.",
    lsc_junioren_aktuell:
      "Es werden nur Junioren berücksichtigt (jahrgangsbasiert < 19 Jahre) und nur der jeweils aktuellste LifesavingScore der letzten 2 Jahre.",
    aktive_jahre:
      "Es werden nur Jahre gezählt, in denen man Pool-Einzel Wettkämpfe geschwommen ist.",
    hoechster_lsc:
      "In dieser Auswertung werden nur LifesavingScore-Werte ab dem Jahr 2001 berücksichtigt."
  };

  const FLAG_BASE_URL = "./svg";
  const CAP_FALLBACK_FILE = "Cap-Baden_light.svg";
  const CAP_FALLBACK_URL = `${FLAG_BASE_URL}/${encodeURIComponent(CAP_FALLBACK_FILE)}`;

  const $ = (s, r = document) => r.querySelector(s);

  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);

    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }

    for (const c of children.flat()) {
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }

    return el;
  }

  const State = {
    mount: null,
    groups: null,
    currentKey: "starts",
    top10Url: DEFAULT_TOP10_URL,
    openByName: null
  };

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

  function capFileFromOrtsgruppe(rawOG) {
    const og = String(rawOG || "").trim();
    if (!og) return CAP_FALLBACK_FILE;
    if (og === "Nieder-Olm/Wörrstadt") return "Cap-Nieder-OlmWörrstadt.svg";
    return `Cap-${og}.svg`;
  }

  function formatOrtsgruppe(raw) {
    let s = String(raw || "").trim();
    if (!s) return "";
    s = s.replace(/^(og|dlrg)\s+/i, "");
    s = s
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return "DLRG " + s;
  }

  function getOpenByNameFn() {
    return (
      (typeof State.openByName === "function" && State.openByName) ||
      (typeof window.AthSearch?.openByName === "function" && window.AthSearch.openByName) ||
      (typeof window.openAthleteProfileByName === "function" && window.openAthleteProfileByName) ||
      null
    );
  }

  function openProfileByName(name) {
    const n = String(name || "").trim();
    if (!n) return;
    const fn = getOpenByNameFn();
    if (typeof fn === "function") fn(n);
  }

  function interactiveProps(name) {
    return {
      role: "button",
      tabindex: "0",
      dataset: { name: String(name || "").trim() },
      onclick: (e) => openProfileByName(e.currentTarget?.dataset?.name),
      onkeydown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProfileByName(e.currentTarget?.dataset?.name);
        }
      }
    };
  }

  async function loadTop10Json() {
    const resp = await fetch(encodeURI(State.top10Url), { mode: "cors" });
    if (!resp.ok) throw new Error(`Top10 HTTP ${resp.status}`);
    return resp.json();
  }

  function normalizeRank(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function tieKeyFromValue(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "s:";
    const numericCandidate = raw.replace(/\s+/g, "").replace(",", ".");
    const num = Number(numericCandidate);
    if (Number.isFinite(num)) return `n:${num}`;
    return `s:${raw.toLowerCase()}`;
  }

  function applyCompetitionRanks(rows) {
    let prevKey = null;
    let prevRank = 0;

    return rows.map((row, idx) => {
      const key = tieKeyFromValue(row.value);
      const displayRank = idx === 0 ? 1 : key === prevKey ? prevRank : idx + 1;
      prevKey = key;
      prevRank = displayRank;
      return { ...row, displayRank };
    });
  }

  function buildTop10GroupsFromJson(top10) {
    const out = {};
    const g = top10?.groups || {};

    for (const def of TOP10_GROUPS) {
      const jsonKey = JSON_GROUP_MAP[def.key];
      const rawArr = Array.isArray(g[jsonKey]) ? g[jsonKey] : [];

      const sorted = rawArr
        .map((it, idx) => ({
          _idx: idx,
          rank: it?.rank,
          name: String(it?.name ?? "").trim(),
          og: String(it?.og ?? "").trim(),
          value: it?.value ?? ""
        }))
        .sort((a, b) => {
          const ar = Number.isFinite(Number(a.rank)) ? Number(a.rank) : Number.POSITIVE_INFINITY;
          const br = Number.isFinite(Number(b.rank)) ? Number(b.rank) : Number.POSITIVE_INFINITY;
          if (ar !== br) return ar - br;
          return a._idx - b._idx;
        })
        .map((it, idx) => ({
          rank: normalizeRank(it.rank, idx + 1),
          name: it.name,
          og: it.og,
          value: it.value
        }));

      const rows = applyCompetitionRanks(sorted);

      out[def.key] = {
        key: def.key,
        label: def.label,
        valueLabel: GROUP_VALUE_LABEL[def.key] || "Wert",
        note: GROUP_NOTES[def.key] || "",
        rows
      };
    }

    return out;
  }

  function renderCap(rawOG, size = "md") {
    const og = String(rawOG || "").trim();

    const img = h("img", {
      class: "ath10-cap-img",
      alt: og ? `Vereinskappe ${formatOrtsgruppe(og)}` : "Vereinskappe Baden",
      loading: "lazy",
      decoding: "async"
    });

    setCapWithCache(img, capFileFromOrtsgruppe(og));

    return h(
      "span",
      { class: `ath10-cap ath10-cap--${size}`, "aria-hidden": "true" },
      img
    );
  }

  function renderMedalIcon(place) {
    let file = null;
    if (place === 1) file = "medal_gold.svg";
    else if (place === 2) file = "medal_silver.svg";
    else if (place === 3) file = "medal_bronze.svg";
    if (!file) return null;

    return h(
      "div",
      { class: "ath10-podium-medal-icon-wrap", "aria-hidden": "true" },
      h("img", {
        class: "ath10-podium-medal-icon",
        src: `${FLAG_BASE_URL}/${encodeURIComponent(file)}`,
        alt: "",
        loading: "lazy",
        decoding: "async",
        width: "16",
        height: "16"
      })
    );
  }

  function renderCategorySelect(available, currentKey) {
    const select = h(
      "select",
      { class: "ath10-select", "aria-label": "Top-10 Kategorie auswählen" },
      available.map((g) => h("option", { value: g.key, selected: g.key === currentKey }, g.label))
    );

    select.addEventListener("change", (e) => {
      State.currentKey = e.target.value;
      renderTop10();
    });

    return select;
  }

  function renderToolbar(available, currentKey) {
    const tabs = h(
      "div",
      { class: "ath10-tabs", role: "tablist", "aria-label": "Top-10 Kategorien" },
      available.map((g) =>
        h(
          "button",
          {
            class: `ath10-tab${g.key === currentKey ? " is-active" : ""}`,
            type: "button",
            role: "tab",
            "aria-selected": g.key === currentKey ? "true" : "false",
            dataset: { key: g.key },
            onclick: () => {
              State.currentKey = g.key;
              renderTop10();
            }
          },
          g.label
        )
      )
    );

    return h("div", { class: "ath10-toolbar" }, tabs);
  }

  function podiumPlaceClass(displayRank) {
    if (displayRank === 1) return "place1";
    if (displayRank === 2) return "place2";
    if (displayRank === 3) return "place3";
    return "placeX";
  }

  function renderPodiumCard(row, slotPos, valueLabel) {
    const slotClass = `ath10-podium-slot--pos${slotPos}`;

    if (!row) {
      return h(
        "div",
        { class: `ath10-podium-slot ${slotClass} is-empty`, "aria-hidden": "true" },
        h("div", { class: "ath10-podium-card ath10-podium-card--empty" }),
        h("div", { class: "ath10-podium-base ath10-podium-base--placeX" })
      );
    }

    const place = row.displayRank || row.rank || slotPos;
    const placeCls = podiumPlaceClass(place);

    return h(
      "div",
      { class: `ath10-podium-slot ${slotClass}` },
      h(
        "div",
        {
          class: `ath10-podium-card ath10-podium-card--${placeCls}`,
          ...interactiveProps(row.name)
        },
        renderMedalIcon(place),
        h(
          "div",
          { class: "ath10-podium-athlete" },
          renderCap(row.og, place === 1 ? "lg" : "md"),
          h(
            "div",
            { class: "ath10-podium-meta" },
            h("div", { class: "ath10-podium-name" }, row.name || "—"),
            h("div", { class: "ath10-podium-og" }, row.og || "—")
          )
        ),
        h(
          "div",
          { class: "ath10-podium-score" },
          h("span", { class: "ath10-podium-score-value" }, String(row.value ?? "")),
          h("span", { class: "ath10-podium-score-label" }, valueLabel || "Wert")
        )
      ),
      h(
        "div",
        { class: `ath10-podium-base ath10-podium-base--${placeCls}` },
        h("span", { class: "ath10-podium-base-rank" }, String(place) + " Platz")
      )
    );
  }

  function renderPodium(group) {
    const rows = Array.isArray(group?.rows) ? group.rows : [];
    if (!rows.length) return null;

    const topRows = rows.slice(0, 3);
    const left = topRows[1] || null;
    const center = topRows[0] || null;
    const right = topRows[2] || null;

    return h(
      "section",
      { class: "ath10-podium-section", "aria-label": "Podest Top 3" },
      h(
        "div",
        { class: "ath10-podium-grid" },
        renderPodiumCard(left, 2, group.valueLabel),
        renderPodiumCard(center, 1, group.valueLabel),
        renderPodiumCard(right, 3, group.valueLabel)
      )
    );
  }

  function renderRemainingTable(group) {
    const rows = Array.isArray(group?.rows) ? group.rows.slice(3) : [];
    if (!rows.length) return null;

    return h(
      "section",
      { class: "ath10-rest-section", "aria-label": "Weitere Platzierungen" },
      h("div", { class: "ath10-rest-head" }),
      h(
        "div",
        { class: "ath10-table-wrap" },
        h(
          "table",
          { class: "ath10-table" },
          h("thead", {}),
          h(
            "tbody",
            {},
            rows.map((row, idx) =>
              h(
                "tr",
                { class: "ath10-row", ...interactiveProps(row.name) },
                h(
                  "td",
                  { class: "ath10-td ath10-td-rank" },
                  h("span", { class: "ath10-rank-badge" }, `${row.displayRank ?? normalizeRank(row.rank, idx + 4)}.`)
                ),
                h(
                  "td",
                  { class: "ath10-td ath10-td-athlete" },
                  h(
                    "div",
                    { class: "ath10-athlete" },
                    renderCap(row.og, "md"),
                    h(
                      "div",
                      { class: "ath10-athlete-meta" },
                      h("div", { class: "ath10-athlete-name" }, row.name || "—"),
                      h("div", { class: "ath10-athlete-og" }, row.og || "—")
                    )
                  )
                ),
                h(
                  "td",
                  { class: "ath10-td ath10-td-value" },
                  h("span", { class: "ath10-value-pill" }, String(row.value ?? ""))
                )
              )
            )
          )
        )
      )
    );
  }

  function renderPanelHeader(group, available, currentKey) {
    return h(
      "div",
      { class: "ath10-panel-head" },
      h(
        "div",
        { class: "ath10-panel-title-wrap" },
        h("div", { class: "ath10-panel-kicker" }, "Kategorie"),
        h("div", { class: "ath10-panel-tabs-wrap" }, renderToolbar(available, currentKey)),
        h(
          "div",
          { class: "ath10-select-wrap ath10-select-wrap--panel" },
          renderCategorySelect(available, currentKey)
        )
      )
    );
  }

  function renderNote(group) {
    if (!group?.note) return null;
    return h(
      "div",
      { class: "ath10-note", role: "note" },
      h("div", { class: "ath10-note-title" }, "Hinweis"),
      h("div", { class: "ath10-note-text" }, group.note)
    );
  }

  function renderTop10() {
    const mount = State.mount;
    if (!mount) return;

    const groups = State.groups || {};
    const available = TOP10_GROUPS
      .map((def) => groups[def.key])
      .filter((g) => g && Array.isArray(g.rows) && g.rows.length > 0);

    if (!available.length) {
      mount.innerHTML = '<div class="ath10-status ath10-status--empty">Keine Top-10 Daten vorhanden.</div>';
      return;
    }

    if (!available.some((g) => g.key === State.currentKey)) {
      State.currentKey = available[0].key;
    }

    const current = available.find((g) => g.key === State.currentKey) || available[0];

    const shell = h(
      "section",
      { class: "ath10-shell", "aria-label": "Top-10 Ranglisten" },
      h(
        "header",
        { class: "ath10-header" },
        h(
          "div",
          { class: "ath10-header-text" },
          h("div", { class: "ath10-kicker" }, "Athletenstatistik"),
          h("h2", { class: "ath10-title" }, "Top-10 Ranglisten")
        )
      ),
      h(
        "section",
        { class: "ath10-panel" },
        renderPanelHeader(current, available, State.currentKey),
        renderPodium(current),
        renderRemainingTable(current)
      ),
      renderNote(current)
    );

    mount.innerHTML = "";
    mount.classList.add("ath10-root");
    mount.appendChild(shell);
  }

  async function init() {
    const mount = State.mount;
    if (!mount) return;

    try {
      const top10 = await loadTop10Json();
      State.groups = buildTop10GroupsFromJson(top10);
      renderTop10();
    } catch (err) {
      console.error(err);
      mount.innerHTML = '<div class="ath10-status ath10-status--error">Top-10 konnten nicht geladen werden.</div>';
    }
  }

  function mountComponent(mountEl, options = {}) {
    const el = typeof mountEl === "string" ? $(mountEl) : mountEl;
    if (!el) return;

    State.mount = el;
    State.top10Url = typeof options.top10Url === "string" ? options.top10Url : DEFAULT_TOP10_URL;
    State.openByName = typeof options.openByName === "function" ? options.openByName : null;
    State.currentKey = "starts";
    State.groups = null;

    el.innerHTML = '<div class="ath10-status ath10-status--loading">Top-10 wird geladen …</div>';
    init();
  }

  window.AthTop10 = { mount: mountComponent };
})();