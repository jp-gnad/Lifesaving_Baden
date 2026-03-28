(function (global) {
  const ProfileHead = {};

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

  const FLAG_BASE_URL = "./assets/svg";
  const CAP_FALLBACK_FILE = "Cap-Baden_light.svg";
  const CAP_FALLBACK_URL = `${FLAG_BASE_URL}/${encodeURIComponent(CAP_FALLBACK_FILE)}`;

  let AllMeetsByAthleteId = new Map();

  ProfileHead.setAllMeetsByAthleteId = (map) => {
    AllMeetsByAthleteId = map instanceof Map ? map : new Map();
  };

  function renderAthleteName(name) {
    const full = (name || "").toString().trim();
    const idx = full.indexOf(" ");
    if (idx === -1) return [full];
    const first = full.slice(0, idx);
    const rest = full.slice(idx + 1);
    return [h("span", { class: "name-first" }, first), " ", h("span", { class: "name-rest" }, rest)];
  }

  function alignCapToName() {
    const head = document.querySelector(".ath-profile-head");
    if (!head) return;

    const cap = head.querySelector(".ath-profile-cap");
    const h2 = head.querySelector(".ath-profile-name h2");
    if (!cap || !h2) return;

    cap.style.setProperty("--cap-offset-y", "0px");

    const capRect = cap.getBoundingClientRect();
    const nameRect = h2.getBoundingClientRect();

    const capCenter = capRect.top + capRect.height / 2;
    const nameCenter = nameRect.top + nameRect.height / 2;

    const delta = nameCenter - capCenter;
    cap.style.setProperty("--cap-offset-y", `${delta}px`);
  }

  function fitProfileName() {
    const h2 = document.querySelector(".ath-profile-name h2");
    if (!h2) {
      alignCapToName();
      return;
    }

    const rest = h2.querySelector(".name-rest");
    const vw = window.innerWidth;

    h2.style.fontSize = "";
    h2.style.whiteSpace = "";
    if (rest) rest.style.fontSize = "";

    if (vw > 720) {
      h2.style.whiteSpace = "nowrap";

      const computed = getComputedStyle(h2);
      let sizePx = parseFloat(computed.fontSize) || 24;

      const rootComputed = getComputedStyle(document.documentElement);
      const rootPx = parseFloat(rootComputed.fontSize) || 16;
      const minPx = rootPx * 1.4;

      const step = 0.5;

      while (sizePx > minPx) {
        h2.style.fontSize = sizePx + "px";
        if (h2.scrollWidth <= h2.clientWidth + 0.5) break;
        sizePx -= step;
      }

      alignCapToName();
      return;
    }

    if (!rest) {
      alignCapToName();
      return;
    }

    const computedRest = getComputedStyle(rest);
    let maxSizePx = parseFloat(computedRest.fontSize) || 20;
    const minSizePx = maxSizePx * 0.7;
    let size = maxSizePx;
    const step = 0.5;

    while (size > minSizePx) {
      rest.style.fontSize = size + "px";
      const needWidth = rest.scrollWidth;
      const avail = h2.clientWidth;
      if (needWidth <= avail) break;
      size -= step;
    }

    alignCapToName();
  }

  let nameFitHandlerInstalled = false;

  function installNameFitHandlerOnce() {
    if (nameFitHandlerInstalled) return;
    nameFitHandlerInstalled = true;
    window.addEventListener("resize", fitProfileName);
  }

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

  function setCapWithCache(imgEl, hostEl, capCandidates) {
    const candidates = (Array.isArray(capCandidates) ? capCandidates : [])
      .map((x) => ({
        file: String(x?.file || "").trim(),
        toned: !!x?.toned
      }))
      .filter((x) => x.file);

    hostEl?.classList.remove("cap-overlay");
    imgEl.src = CAP_FALLBACK_URL;

    if (!candidates.length) {
      hostEl?.classList.add("cap-overlay");
      return;
    }

    (async () => {
      for (const candidate of candidates) {
        const ok = await probeCapFileExists(candidate.file);
        if (!ok) continue;

        hostEl?.classList.toggle("cap-overlay", candidate.toned);
        imgEl.src = `${FLAG_BASE_URL}/${encodeURIComponent(candidate.file)}`;
        return;
      }

      hostEl?.classList.add("cap-overlay");
    })();
  }

  function setSingleCapWithFallback(imgEl, hostEl, capFile) {
    const file = String(capFile || "").trim();

    hostEl?.classList.remove("cap-overlay");
    imgEl.src = CAP_FALLBACK_URL;

    if (!file || file === CAP_FALLBACK_FILE) {
      hostEl?.classList.add("cap-overlay");
      return;
    }

    (async () => {
      const ok = await probeCapFileExists(file);

      if (ok) {
        hostEl?.classList.remove("cap-overlay");
        imgEl.src = `${FLAG_BASE_URL}/${encodeURIComponent(file)}`;
        return;
      }

      hostEl?.classList.add("cap-overlay");
      imgEl.src = CAP_FALLBACK_URL;
    })();
  }

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
    Australien: "AUS",
    Schweden: "SWE"
  };

  const LV_STATE_LABEL = {
    BA: "LV Baden",
    BY: "LV Bayern",
    BE: "LV Berlin",
    BB: "LV Brandenburg",
    HB: "LV Bremen",
    HH: "LV Hamburg",
    HE: "LV Hessen",
    MV: "LV Mecklenburg-Vorp.",
    NI: "LV Niedersachsen",
    NR: "LV Nordrhein",
    WF: "LV Westfahlen",
    RP: "LV Rheinland-Pfalz",
    SL: "LV Saarland",
    SN: "LV Sachsen",
    ST: "LV Sachsen-Anhalt",
    SH: "LV Schleswig-Holstein",
    TH: "LV Thüringen",
  };

  const ISO3_TO_EN = {
    GER: "GERMANY",
    POL: "POLAND",
    FRA: "FRANCE",
    BEL: "BELGIUM",
    NED: "NETHERLANDS",
    ESP: "SPAIN",
    ITA: "ITALY",
    SUI: "SWITZERLAND",
    JPN: "JAPAN",
    DEN: "DENMARK",
    EGY: "EGYPT",
    GBR: "GREAT BRITAIN",
    AUS: "AUSTRALIA",
    SWE: "SWEDEN"
  };

  function iso3FromLand(landName) {
    return LAND_TO_ISO3[String(landName || "").trim()] || "—";
  }

  function normalizeBVCode(bvRaw) {
    const s = String(bvRaw ?? "").trim();
    if (!s) return "";
    if (/^[A-Z]{3}$/.test(s)) return s;
    const iso = iso3FromLand(s);
    if (iso && iso !== "—") return iso;
    return s.toUpperCase();
  }


  function deriveAffiliation(a) {
    const ogKey = String(a?.ortsgruppe || "").trim();
    const lvCode = String(a?.LV_state ?? a?.lv_state ?? "").trim().toUpperCase();
    const bvCode = normalizeBVCode(a?.BV_natio ?? a?.BV_nation ?? "");

    return { ogKey, lvCode, bvCode };
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

  const SUPPORTED_FLAGS_DE = new Set([
    "Spanien",
    "Australien",
    "Deutschland",
    "Belgien",
    "Italien",
    "Frankreich",
    "Schweiz",
    "Polen",
    "Japan",
    "Dänemark",
    "Ägypten",
    "Niederlande",
    "Großbritannien",
    "Schweden"
  ]);

  function countriesFromAthlete(a) {
    const fromMeets = new Set();
    (a.meets || []).forEach((m) => {
      const land = m && m.Land ? String(m.Land).trim() : null;
      if (land) fromMeets.add(land);
    });
    const arr = Array.from(fromMeets);
    if (arr.length) return arr;
    return Array.isArray(a.countriesDE) ? a.countriesDE : [];
  }

  function renderCountryFlagsInline(a) {
    const names = countriesFromAthlete(a)
      .map((n) => String(n).trim())
      .filter((n) => SUPPORTED_FLAGS_DE.has(n));

    if (!names.length) return null;

    return h(
      "div",
      { class: "kv-flags" },
      ...names.map((name) => {
        const wrap = h("span", { class: "ath-flag", title: name, "aria-label": name });
        const img = h("img", {
          class: "flag-img",
          src: `${FLAG_BASE_URL}/${encodeURIComponent(name)}.svg`,
          alt: name,
          loading: "lazy",
          decoding: "async",
          onerror: () => wrap.remove(),
        });
        wrap.appendChild(img);
        return wrap;
      })
    );
  }

  const HISTORIE_ICON_BASE = "./assets/png/historie";
  const HISTORIE_TOOLTIP = {
    DP: "Internationaler Deutschland-Pokal",
    JRP: "Junioren Rettungspokal",
    WM: "Weltmeisterschaft",
    EM: "Europameisterschaft",
    WG: "World Games",
  };

  function classifyHistorie(meet) {
    const raw = meet.meet_name || meet.name || "";
    if (!raw) return null;

    const name = raw.toLowerCase();
    const hasWord = (token) => new RegExp(`\\b${token}\\b`, "i").test(raw);

    if (hasWord("wg") || name.includes("world-games")) return "WG";
    if (hasWord("wm") || name.includes("weltmeisterschaft")) return "WM";
    if (hasWord("em") || name.includes("europameisterschaft")) return "EM";
    if (hasWord("jrp")) return "JRP";
    if (hasWord("dp") || hasWord("dt")) return "DP";

    return null;
  }

  function getMeetYear(meet) {
    const dRaw = meet.date || meet.datum || meet.datum_raw;

    if (dRaw instanceof Date) return dRaw.getFullYear();

    if (typeof dRaw === "string" && dRaw.trim()) {
      const d = new Date(dRaw);
      if (!Number.isNaN(d.getTime())) return d.getFullYear();
      const m = dRaw.match(/\b(19|20)\d{2}\b/);
      if (m) return Number(m[0]);
    }

    if (typeof meet.jahr === "number") return meet.jahr;
    return null;
  }

  function renderhistorieInline(ax) {
    const meets = Array.isArray(ax.meets) ? ax.meets : [];
    if (!meets.length) return null;

    const buckets = { DP: new Set(), JRP: new Set(), WM: new Set(), EM: new Set(), WG: new Set() };

    for (const meet of meets) {
      const cat = classifyHistorie(meet);
      if (!cat) continue;

      const year = getMeetYear(meet);
      if (!year) continue;

      const name = (meet.meet_name || meet.name || "").toLowerCase();

      let key;
      if (cat === "WM" || cat === "EM") {
        let kind = "other";
        if (name.includes("interclub")) kind = "interclub";
        else if (name.includes("national")) kind = "national";
        key = `${year}-${kind}`;
      } else {
        key = String(year);
      }

      buckets[cat].add(key);
    }

    const order = [
      { code: "WM", label: "Weltmeisterschaften" },
      { code: "EM", label: "Europameisterschaften" },
      { code: "WG", label: "World Games" },
      { code: "DP", label: "Deutschland-Pokale" },
      { code: "JRP", label: "Jugend-Rettungspokale" },
    ];

    const frag = document.createDocumentFragment();
    let any = false;

    for (const { code, label } of order) {
      const count = buckets[code].size;
      if (!count) continue;
      any = true;

      const wrap = h("span", { class: "historie-badge" });

      wrap.appendChild(h("span", { class: "historie-count" }, `${count}×`));

      const info = HISTORIE_TOOLTIP[code] || label;

      wrap.appendChild(
        h("img", {
          class: `historie-icon historie-${code.toLowerCase()}`,
          src: `${HISTORIE_ICON_BASE}/${code}.png`,
          alt: `${info} (${count}×)`,
          title: info,
        })
      );

      frag.appendChild(wrap);
    }

    if (!any) return null;
    return frag;
  }

  function genderTag(g) {
    const isW = (g || "").toLowerCase().startsWith("w");
    return { short: isW ? "w" : "m", full: isW ? "weiblich" : "männlich", cls: isW ? "w" : "m" };
  }

  const REF_YEAR = new Date().getFullYear();

  function ageFromJahrgang(jahrgang, refYear = REF_YEAR) {
    const age = refYear - Number(jahrgang);
    return isNaN(age) ? null : age;
  }

  function akDE(age) {
    if (age == null) return "?";
    if (age <= 10) return "10";
    if (age <= 12) return "12";
    if (age === 13 || age === 14) return "13/14";
    if (age === 15 || age === 16) return "15/16";
    if (age === 17 || age === 18) return "17/18";
    return "Offen";
  }

  function akLabelFromJahrgang(jahrgang) {
    return akDE(ageFromJahrgang(jahrgang));
  }

  function fmtDate(dStr) {
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("de-DE");
  }

  function shortMeetName(name) {
    if (!name) return "—";
    const s = String(name);
    const i = s.indexOf(" - ");
    return (i >= 0 ? s.slice(0, i) : s).trim();
  }

  function computeMeetInfo(a) {
    const meets = Array.isArray(a.meets) ? a.meets : [];
    const total = meets.length;

    let c50 = 0,
      c25 = 0;
    let first = null,
      last = null,
      firstName = null;
    const years = new Set();

    let cNat = 0,
      cIntl = 0;

    for (const m of meets) {
      if (m.pool === "50") c50++;
      else if (m.pool === "25") c25++;

      const reg = String(m.Regelwerk || "").toLowerCase().trim();
      if (reg.startsWith("int")) cIntl++;
      else if (reg.startsWith("nat")) cNat++;

      const d = new Date(m.date);
      if (!isNaN(d)) {
        years.add(d.getFullYear());
        if (!first || d < first) {
          first = d;
          firstName = shortMeetName(m.meet_name || m.meet || "");
        }
        if (!last || d > last) last = d;
      }
    }

    const pct50 = total ? Math.round((c50 / total) * 100) : 0;
    const pctIntl = total ? Math.round((cIntl / total) * 100) : 0;

    return {
      total,
      c50,
      c25,
      pct50,
      pct25: total ? 100 - pct50 : 0,
      first: first ? first.toISOString().slice(0, 10) : null,
      last: last ? last.toISOString().slice(0, 10) : null,
      firstName,
      activeYears: years.size,
      cNat,
      cIntl,
      pctIntl,
    };
  }

  function activityStatusFromLast(lastISO) {
    if (!lastISO) return { key: "inactive", label: "Inaktiv" };
    const last = new Date(lastISO);
    if (isNaN(last)) return { key: "inactive", label: "Inaktiv" };
    const now = new Date();
    const days = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (days < 365) return { key: "active", label: "Aktiv" };
    if (days < 730) return { key: "pause", label: "Pause" };
    return { key: "inactive", label: "Inaktiv" };
  }

  function renderStartrechtIcons(a) {
    const meets = Array.isArray(a?.meets) ? a.meets : [];

    const lvMap = new Map();
    const bvMap = new Map();

    for (const m of meets) {
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];

      for (const r of runs) {
        const sr = String(r?.Startrecht || m?.Startrecht || "").trim().toUpperCase();
        const dStr = String(r?.date || m?.date || "").slice(0, 10);
        const d = new Date(dStr);
        const t = isNaN(d.getTime()) ? -Infinity : d.getTime();

        if (sr === "LV") {
          const code = String(r?.LV_state ?? m?.LV_state ?? "").trim().toUpperCase();
          if (!code) continue;
          const prev = lvMap.get(code);
          if (prev == null || t > prev) lvMap.set(code, t);
        }

        if (sr === "BV") {
          const raw = r?.BV_natio ?? m?.BV_natio ?? r?.BV_nation ?? m?.BV_nation ?? "";
          const code = normalizeBVCode(raw);
          if (!code) continue;
          const prev = bvMap.get(code);
          if (prev == null || t > prev) bvMap.set(code, t);
        }
      }
    }

    const lvList = Array.from(lvMap.entries())
      .map(([code, t]) => ({ code, t }))
      .sort((a, b) => a.t - b.t);

    const bvList = Array.from(bvMap.entries())
      .map(([code, t]) => ({ code, t }))
      .sort((a, b) => a.t - b.t);

    if (!lvList.length && !bvList.length) return null;

    const wrap = h("div", { class: "sr-icons", "aria-label": "Startrechte" });

    const makeImg = (code, srLabel) =>
      h("img", {
        class: "sr-icon",
        src: `${FLAG_BASE_URL}/Cap-${encodeURIComponent(code)}.svg`,
        alt: `${srLabel} ${code}`,
        title: `${srLabel} ${code}`,
        loading: "lazy",
        decoding: "async",
        onerror: (e) => e.currentTarget.remove(),
      });

    if (lvList.length) {
      const gLv = h("span", { class: "sr-group sr-group--lv", "aria-label": "LV Startrechte" });
      lvList.forEach((x) => gLv.appendChild(makeImg(x.code, "LV")));
      wrap.appendChild(gLv);
    }

    if (bvList.length) {
      const gBv = h("span", { class: "sr-group sr-group--bv", "aria-label": "BV Startrechte" });
      bvList.forEach((x) => gBv.appendChild(makeImg(x.code, "BV")));
      wrap.appendChild(gBv);
    }

    return wrap;
  }

  function currentOrtsgruppeFromMeets(a) {
    const aff = deriveAffiliation(a);
    return aff.ogKey || String(a?.ortsgruppe || "").trim();
  }

  function capFileFromOrtsgruppe(rawOG) {
    const og = String(rawOG || "").trim();
    if (!og) return CAP_FALLBACK_FILE;
    if (og === "Nieder-Olm/Wörrstadt") return "Cap-Nieder-OlmWörrstadt.svg";
    return `Cap-${og}.svg`;
  }

  function capFileFromLVCode(rawCode) {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) return "";
    return `Cap-${code}.svg`;
  }

  function capFileFromBVCode(rawCode) {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) return "";
    return `Cap-${code}.svg`;
  }

  function uniqueNonEmpty(list) {
    return [...new Set((Array.isArray(list) ? list : []).map((x) => String(x || "").trim()).filter(Boolean))];
  }

  function renderProfileCap(a) {
    const aff = deriveAffiliation(a);
    const ogNow = aff.ogKey || String(a?.ortsgruppe || "").trim();

    const candidates = [
      { file: capFileFromOrtsgruppe(aff.ogKey || ogNow), toned: false },
      { file: capFileFromLVCode(aff.lvCode), toned: true },
      { file: capFileFromBVCode(aff.bvCode), toned: true }
    ].filter((x) => String(x.file || "").trim());

    const wrap = h("div", { class: "ath-avatar xl ath-profile-cap" });
    const img = h("img", {
      class: "avatar-img",
      alt: ogNow ? `Vereinskappe ${formatOrtsgruppe(ogNow)}` : "Vereinskappe",
      loading: "eager",
      decoding: "async",
      fetchpriority: "high",
    });

    setCapWithCache(img, wrap, candidates);
    wrap.appendChild(img);

    return wrap;
  }

  function collectOrtsgruppenForAthlete(ax) {
    const set = new Set();

    const curr = currentOrtsgruppeFromMeets(ax) || ax.ortsgruppe || "";
    if (curr) set.add(String(curr).trim());

    const meets = Array.isArray(ax.meets) ? ax.meets : [];
    for (const m of meets) {
      const raw = m.Ortsgruppe ?? m.ortsgruppe ?? m.og ?? m.OG ?? m.og_name ?? "";
      const norm = String(raw).trim();
      if (!norm) continue;
      set.add(norm);
    }

    const all = Array.from(set);

    const others = all
      .filter((og) => og !== curr)
      .sort((a, b) => a.localeCompare(b, "de-DE"));

    return { curr, others };
  }

  function renderOrtsgruppeMeta(ax) {
    const { curr, others } = collectOrtsgruppenForAthlete(ax);
    const currentLabel = curr || "—";
    const hasOthers = others.length > 0;

    const kv = h("span", { class: "kv kv-og", "data-key": "Ortsgruppe" }, h("span", { class: "k" }, "Ortsgruppe:"));
    const v = h("span", { class: "v og-v" });

    const mainRow = h("span", { class: "og-main-row" }, h("span", { class: "og-main" }, currentLabel));
    v.appendChild(mainRow);

    if (hasOthers) {
      const moreBox = h("div", { class: "og-more" });

      others.forEach((og) => {
        const ogName = String(og || "").trim();
        if (!ogName) return;

        const capFile = capFileFromOrtsgruppe(ogName);
        const capWrap = h("span", { class: "og-cap" });
        const capImg = h("img", {
          class: "og-cap-img",
          alt: `Cap ${ogName}`,
          loading: "lazy",
          decoding: "async"
        });

        setSingleCapWithFallback(capImg, capWrap, capFile);
        capWrap.appendChild(capImg);

        const row = h(
          "div",
          { class: "og-item" },
          capWrap,
          h("span", { class: "og-item-label" }, ogName)
        );
        moreBox.appendChild(row);
      });

      const btn = h(
        "button",
        {
          class: "og-toggle",
          type: "button",
          "aria-expanded": "false",
          "aria-label": "Weitere Ortsgruppen anzeigen",
          onclick: () => {
            const open = moreBox.classList.toggle("open");
            btn.setAttribute("aria-expanded", open ? "true" : "false");
          },
        },
        "▾"
      );

      mainRow.appendChild(btn);
      v.appendChild(moreBox);
    }

    kv.appendChild(v);
    return kv;
  }

  function renderMedalStats(a) {
    const m = (a && a.medals) || {};
    const g = Number(m.gold || 0),
      s = Number(m.silver || 0),
      b = Number(m.bronze || 0);
    const total = g + s + b,
      max = Math.max(g, s, b, 1),
      H = 115;

    const bar = (cls, label, value) => {
      const hpx = Math.round((value / max) * H);
      return h(
        "div",
        { class: `med-col ${cls}` },
        h("div", { class: "med-count" }, String(value)),
        h("div", { class: "med-barWrap" }, h("div", { class: "med-bar", style: `height:${hpx}px` })),
        h("div", { class: "med-label" }, label)
      );
    };

    return h(
      "aside",
      { class: "med-card", "aria-label": "Medaillen" },
      h(
        "div",
        { class: "med-head" },
        h("div", { class: "med-title" }, m.title || "Medaillen"),
        h("div", { class: "med-total" }, String(total))
      ),
      h("div", { class: "med-grid" }, bar("gold", "GOLD", g), bar("silver", "SILBER", s), bar("bronze", "BRONZE", b))
    );
  }

  function KV(k, v) {
    const wrap = h("span", { class: "kv", "data-key": k }, h("span", { class: "k" }, k + ":"));
    const val = h("span", { class: "v" });

    if (v == null) {
      val.appendChild(document.createTextNode("—"));
    } else if (typeof v === "string") {
      val.textContent = v;
    } else {
      val.appendChild(v);
    }

    wrap.appendChild(val);
    return wrap;
  }

  function createAthProfileHead(ax) {
    const gt = genderTag(ax.geschlecht);
    const ak = akLabelFromJahrgang(ax.jahrgang);
    const meets = computeMeetInfo(ax);
    const act = activityStatusFromLast(meets.last);
    const lastStr = fmtDate(meets.last);
    const age = ageFromJahrgang(ax.jahrgang);
    const band = age != null && age <= 18 ? "youth" : "open";
    const srIcons = renderStartrechtIcons(ax);

    const cap = renderProfileCap(ax);

    const nameBlock = h(
      "div",
      { class: "ath-profile-name" },
      h("h2", {}, ...renderAthleteName(ax.name))
    );

    const titleMeta = h(
      "div",
      { class: "ath-profile-title" },
      h(
        "div",
        { class: "gender-row" },
        h("span", { class: `gender-chip ${gt.cls}`, title: gt.full, "aria-label": `Geschlecht: ${gt.full}` }, gt.full),
        h("span", { class: `ak-chip ${band}`, title: `Altersklasse ${ak}`, "aria-label": `Altersklasse ${ak}` }, ak),
        h(
          "span",
          {
            class: `status-chip ${act.key}`,
            title: `Letzter Wettkampf: ${lastStr}`,
            "aria-label": `Aktivitätsstatus: ${act.label}. Letzter Wettkampf: ${lastStr}`,
          },
          h("span", { class: "status-dot" }),
          act.label
        ),
        srIcons
      ),
      h(
        "div",
        { class: "ath-profile-meta" },
        renderOrtsgruppeMeta(ax),
        KV("Jahrgang", String(ax.jahrgang)),
        KV("Länderpins", renderCountryFlagsInline(ax) || "—"),
        KV("Historie", renderhistorieInline(ax) || "—")
      )
    );

    return h(
      "div",
      { class: "ath-profile-head" },
      h("div", { class: "ath-profile-top" }, cap, nameBlock),
      h("div", { class: "ath-profile-bottom" }, titleMeta, renderMedalStats(ax))
    );
  }

  ProfileHead.createAthProfileHead = createAthProfileHead;
  ProfileHead.renderAthleteName = renderAthleteName;
  ProfileHead.fitProfileName = fitProfileName;
  ProfileHead.installNameFitHandlerOnce = installNameFitHandlerOnce;
  ProfileHead.alignCapToName = alignCapToName;

  global.ProfileHead = ProfileHead;
})(window);
