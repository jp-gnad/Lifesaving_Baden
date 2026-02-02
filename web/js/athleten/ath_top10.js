(function () {
  const DEFAULT_TOP10_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/top10.json";

  const TOP10_GROUPS = [
    { key: "starts", label: "Starts" },
    { key: "wettkaempfe", label: "Wettkämpfe" },
    { key: "lsc_aktuell", label: "LSC aktuell" },
    { key: "aktive_jahre", label: "Aktive Jahre" },
    { key: "hoechster_lsc", label: "Höchster LSC" },
    { key: "auslandswettkaempfe", label: "Auslandswettkämpfe" }
  ];

  const FLAG_BASE_URL = "./svg";
  const CAP_FALLBACK_FILE = "Cap-Baden_light.svg";
  const CAP_FALLBACK_URL = `${FLAG_BASE_URL}/${encodeURIComponent(CAP_FALLBACK_FILE)}`;
  const NONE_CAP_URL = `${FLAG_BASE_URL}/Cap-None.svg`;

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

  function formatOrtsgruppe(raw) {
    let s = (raw || "").toString().trim();
    s = s.replace(/^(og|dlrg)\s+/i, "");
    s = s
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return "DLRG " + s;
  }

  function capFileFromOrtsgruppe(rawOG) {
    const og = String(rawOG || "").trim();
    if (!og) return CAP_FALLBACK_FILE;
    if (og === "Nieder-Olm/Wörrstadt") return "Cap-Nieder-OlmWörrstadt.svg";
    return `Cap-${og}.svg`;
  }

  async function loadTop10Json() {
    const resp = await fetch(encodeURI(State.top10Url), { mode: "cors" });
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
          .map((it) => [it.name ?? "", it.og ?? "", it.value ?? ""])
      };
    }
    return out;
  }

  function openProfileFromTop10Row(tr) {
    const name = (tr?.dataset?.name || "").trim();
    if (!name) return;

    const fn =
      (typeof State.openByName === "function" && State.openByName) ||
      (typeof window.AthSearch?.openByName === "function" && window.AthSearch.openByName) ||
      (typeof window.openAthleteProfileByName === "function" && window.openAthleteProfileByName);

    if (typeof fn === "function") fn(name);
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

  function renderTop10Table(group, headerRightNode) {
    if (!group) return h("div", {}, "Keine Daten.");

    const rows = group.rows || [];

    const headTable = h(
      "table",
      { class: "ath-top10-table ath-top10-table-head" },
      h(
        "tbody",
        {},
        h(
          "tr",
          { class: "ath-top10-header-row" },
          h("th", { class: "ath-top10-header-cell ath-top10-header-nameog" }, "Name / Ortsgruppe"),
          h(
            "th",
            { class: "ath-top10-header-cell ath-top10-header-select" },
            h("div", { class: "ath-top10-header-select-wrap" }, headerRightNode || "Wert")
          )
        )
      )
    );

    const bodyRows = rows.map((cells) => {
      const name = String(cells[0] ?? "").trim();
      const og = String(cells[1] ?? "").trim();
      const value = cells[2] ?? "";

      const capTd = renderTop10CapCell(og);

      const nameOgTd = h(
        "td",
        { class: "ath-top10-name-cell" },
        h("div", { class: "ath-top10-name" }, name),
        og ? h("div", { class: "ath-top10-og" }, og) : null
      );

      const valueTd = h("td", { class: "ath-top10-value-cell" }, String(value ?? ""));

      return h(
        "tr",
        {
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
          onpointerdown: function () {
            this.classList.add("active");
          },
          onpointerup: function () {
            this.classList.remove("active");
          },
          onpointercancel: function () {
            this.classList.remove("active");
          },
          onpointerleave: function () {
            this.classList.remove("active");
          }
        },
        capTd,
        nameOgTd,
        valueTd
      );
    });

    const bodyTable = h("table", { class: "ath-top10-table ath-top10-table-body" }, h("tbody", {}, ...bodyRows));

    return h("div", { class: "ath-top10-table-combo" }, headTable, bodyTable);
  }

  function renderTop10() {
    const mount = State.mount;
    if (!mount) return;

    const groups = State.groups || {};
    const available = TOP10_GROUPS.filter((def) => groups[def.key] && groups[def.key].rows.length);

    if (!available.length) {
      mount.innerHTML = '<div class="ath-top10-empty">Keine Top&nbsp;10 Daten vorhanden.</div>';
      return;
    }

    if (!available.some((g) => g.key === State.currentKey)) {
      State.currentKey = available[0].key;
    }

    const current = groups[State.currentKey];

    const select = h(
      "select",
      { class: "ath-top10-select", "aria-label": "Top-10-Auswahl" },
      available.map((def) =>
        h("option", { value: def.key, selected: def.key === State.currentKey }, def.label)
      )
    );

    select.addEventListener("change", (e) => {
      State.currentKey = e.target.value;
      renderTop10();
    });

    let infoNode = null;
    if (current && typeof current.label === "string") {
      const labelLower = current.label.toLowerCase();
      if (labelLower.includes("höchster") && labelLower.includes("lsc")) {
        infoNode = h("div", { class: "ath-top10-info" }, [
          "Hinweis:",
          h("br"),
          "In dieser Auswertung werden nur LifesavingScore-Werte ab dem Jahr 2001 berücksichtigt."
        ]);
      }
      if (labelLower.includes("starts")) {
        infoNode = h("div", { class: "ath-top10-info" }, [
          "Hinweis:",
          h("br"),
          "Es werden nur 50m Retten, 100m Retten mit Flossen, 100m Kombi, 100m Lifesaver, 200m Super Lifesaver und 200m Hindernis gezählt."
        ]);
      }
      if (labelLower.includes("wettkämpfe")) {
        infoNode = h("div", { class: "ath-top10-info" }, ["Hinweis:", h("br"), "Es werden nur Pool-Einzel Wettkämpfe gezählt."]);
      }
      if (labelLower.includes("lsc") && labelLower.includes("aktuell")) {
        infoNode = h("div", { class: "ath-top10-info" }, [
          "Hinweis:",
          h("br"),
          "Es werden nur Sportler berücksichtigt, die in den letzten 2 Jahren an Pool-Einzel Wettkämpfen teilgenommen haben."
        ]);
      }
      if (labelLower.includes("aktive") && labelLower.includes("jahre")) {
        infoNode = h("div", { class: "ath-top10-info" }, [
          "Hinweis:",
          h("br"),
          "Es werden nur Jahre gezählt, inden man Pool-Einzel Wettkämpfe geschwommen ist."
        ]);
      }
    }

    const head = h("div", { class: "ath-top10-head" }, h("div", { class: "ath-top10-label" }, "Top-10"));
    const tableWrap = h("div", { class: "ath-top10-table-wrap" }, renderTop10Table(current, select));

    mount.innerHTML = "";
    mount.appendChild(head);
    mount.appendChild(tableWrap);
    if (infoNode) mount.appendChild(infoNode);
  }

  async function init() {
    const mount = State.mount;
    if (!mount) return;

    try {
      const top10 = await loadTop10Json();
      State.groups = buildTop10GroupsFromJson(top10);
      renderTop10();
    } catch (err) {
      mount.innerHTML = '<div class="ath-top10-error">Top&nbsp;10 konnten nicht geladen werden.</div>';
    }
  }

  function mount(mountEl, options = {}) {
    const el = typeof mountEl === "string" ? $(mountEl) : mountEl;
    if (!el) return;

    State.mount = el;
    State.top10Url = typeof options.top10Url === "string" ? options.top10Url : DEFAULT_TOP10_URL;
    State.openByName = typeof options.openByName === "function" ? options.openByName : null;
    State.currentKey = "starts";
    State.groups = null;

    el.innerHTML = `<div class="ath-top10-empty">Top&nbsp;10 wird geladen …</div>`;
    init();
  }

  window.AthTop10 = { mount };
})();
