(function (global) {
  const ProfileTabs = {};
  const ProfileTabsInternals = global.ProfileTabsInternals || (global.ProfileTabsInternals = {});

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

  function s(tag, attrs = {}, ...children) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null) continue;
      el.setAttribute(k, String(v));
    }
    for (const c of children.flat()) {
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }

  const MIN_QUERY_LEN = 3;

  let AllMeetsByAthleteId = new Map();
  let AthletesPool = [];

  ProfileTabs.setAllMeetsByAthleteId = (map) => {
    AllMeetsByAthleteId = map instanceof Map ? map : new Map();
  };

  ProfileTabs.setAthletes = (list) => {
    AthletesPool = Array.isArray(list) ? list : [];
  };

  const State = {
    poolLen: "50"
  };

  ProfileTabs.setPoolLen = (v) => {
    const x = String(v || "").trim();
    if (x === "25" || x === "50") State.poolLen = x;
  };

  ProfileTabs.getPoolLen = () => State.poolLen;

  function dismissKeyboard() {
    try {
      const ae = document.activeElement;
      if (ae && typeof ae.blur === "function") ae.blur();

      let trap = document.getElementById("kb-blur-trap");
      if (!trap) {
        trap = document.createElement("input");
        trap.type = "text";
        trap.id = "kb-blur-trap";
        trap.tabIndex = -1;
        trap.autocomplete = "off";
        trap.style.position = "fixed";
        trap.style.opacity = "0";
        trap.style.pointerEvents = "none";
        trap.style.height = "0";
        trap.style.width = "0";
        document.body.appendChild(trap);
      }
      trap.focus({ preventScroll: true });
      trap.blur();
    } catch (e) {}
  }

  const FLAG_BASE_URL = "./svg";

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
    AUS: "AUSTRALIA"
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
    TH: "LV Thüringen"
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

  function pickBasisMeetPreferNat(meets, { staleNationalDays = 365 } = {}) {
    const list = Array.isArray(meets) ? meets : [];

    let bestNat = null;
    let bestInt = null;
    let bestAny = null;

    const isNewer = (d, idx, best) =>
      !best || d > best.d || (d.getTime() === best.d.getTime() && idx > best.idx);

    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m) continue;

      const dStr = String(m.date || "").slice(0, 10);
      const d = new Date(dStr);
      if (isNaN(d.getTime())) continue;

      const rw = String(m.Regelwerk || "").toLowerCase().trim();
      const isNat = rw.startsWith("nat") || rw.startsWith("national");
      const isInt = rw.startsWith("int") || rw.startsWith("international");
      const kind = isNat ? "nat" : isInt ? "int" : "other";

      if (isNewer(d, i, bestAny)) bestAny = { d, idx: i, kind, m };

      const og = String(m.Ortsgruppe ?? m.ortsgruppe ?? "").trim();
      const lv = String(m.LV_state ?? m.lv_state ?? "").trim().toUpperCase();
      const bv = String(m.BV_natio ?? m.BV_nation ?? "").trim();

      const hasAff = !!(og || lv || bv);
      if (!hasAff) continue;

      if (isNat) {
        if (isNewer(d, i, bestNat)) bestNat = { d, idx: i, m };
      } else if (isInt) {
        if (isNewer(d, i, bestInt)) bestInt = { d, idx: i, m };
      }
    }

    if (!bestNat && !bestInt) return null;
    if (!bestNat) return bestInt.m;
    if (!bestInt) return bestNat.m;

    if (bestAny?.kind === "int") {
      const staleMs = staleNationalDays * 24 * 60 * 60 * 1000;
      const diffMs = bestAny.d.getTime() - bestNat.d.getTime();
      if (diffMs >= staleMs) {
        return bestInt.m;
      }
    }

    return bestNat.m;
  }

  function deriveAffiliation(a) {
    const meets =
      Array.isArray(a?.meets) && a.meets.length
        ? a.meets
        : (AllMeetsByAthleteId.get(a?.id) || []);

    const basis = pickBasisMeetPreferNat(meets);

    const ogKey = String(
      basis?.Ortsgruppe ??
      basis?.ortsgruppe ??
      a?.ortsgruppe ??
      ""
    ).trim();

    const lvCode = String(
      basis?.LV_state ??
      a?.LV_state ??
      a?.lv_state ??
      ""
    ).trim().toUpperCase();

    const bvCode = normalizeBVCode(
      basis?.BV_natio ??
      a?.BV_natio ??
      a?.BV_nation ??
      ""
    );

    const startrecht = String(
      basis?.Startrecht ??
      ""
    ).trim().toUpperCase();

    let label = ogKey;

    if (startrecht === "LV" && lvCode) {
      label = LV_STATE_LABEL[lvCode] || lvCode;
    } else if (startrecht === "BV" && bvCode) {
      label = ISO3_TO_EN[bvCode] || bvCode;
    }

    return { ogKey, lvCode, bvCode, startrecht, label };
  }

  function currentOrtsgruppeFromMeets(a) {
    const aff = deriveAffiliation(a);
    return aff.ogKey || String(a?.ortsgruppe || "").trim();
  }

  function capCandidatesAvatar(aff) {
    const ogKey = String(aff?.ogKey || "").trim();
    const lvCode = String(aff?.lvCode || "").trim().toUpperCase();
    const bvCode = String(aff?.bvCode || "").trim().toUpperCase();
    const sr = String(aff?.startrecht || "").trim().toUpperCase();

    const out = [];
    if (ogKey) out.push({ key: ogKey, overlay: false });

    const pushOverlay = (k) => {
      const kk = String(k || "").trim();
      if (kk) out.push({ key: kk, overlay: true });
    };

    if (sr === "BV") { pushOverlay(bvCode); pushOverlay(lvCode); }
    else { pushOverlay(lvCode); pushOverlay(bvCode); }

    return out;
  }

  function applyCapFallback(img, hostEl, seq, {
    overlayClass = "cap-overlay",
    noneSrc = `${FLAG_BASE_URL}/Cap-None.svg`
  } = {}) {
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
      i++;
      if (i < seq.length) load();
      else {
        hostEl.classList.remove(overlayClass);
        img.onerror = null;
        img.src = noneSrc;
      }
    };

    load();
  }

  function renderCapAvatarLocal(a, size = "sm", extraClass = "") {
    const wrap = h("div", { class: `ath-avatar ${size} ${extraClass}`.trim() });

    const img = h("img", {
      class: "avatar-img",
      alt: "Vereinskappe",
      loading: size === "xl" ? "eager" : "lazy",
      decoding: "async"
    });

    const aff = deriveAffiliation(a);
    const seq = capCandidatesAvatar(aff);
    applyCapFallback(img, wrap, seq, { overlayClass: "cap-overlay" });

    wrap.appendChild(img);
    return wrap;
  }


  function formatOrtsgruppe(raw) {
    let s = (raw || "").toString().trim();
    s = s.replace(/^(og|dlrg)\s+/i, "");
    s = s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return "DLRG " + s;
  }

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

  function capFileFromOrtsgruppe(rawOG) {
    const og = String(rawOG || "").trim();
    if (!og) return "Cap-Baden_light.svg";
    if (og === "Nieder-Olm/Wörrstadt") return "Cap-Nieder-OlmWörrstadt.svg";
    return `Cap-${og}.svg`;
  }

  function ogInfoFromMeet(m) {
    const ogRaw = m.Ortsgruppe ?? m.ortsgruppe ?? "";
    const lvRaw = m.LV_state ?? m.lv_state ?? "";
    const startRaw = String(m.Startrecht ?? m.startrecht ?? "").trim().toUpperCase();
    const bvRaw = m.BV_natio ?? m.BV_nation ?? "";

    const ogKey = String(ogRaw || "").trim();
    const lvCode = String(lvRaw || "").trim().toUpperCase();
    const bvCode = normalizeBVCode(bvRaw);

    let label;

    if (startRaw === "LV" && lvCode) {
      label = LV_STATE_LABEL[lvCode] || lvCode;
    } else if (startRaw === "BV" && bvCode) {
      label = ISO3_TO_EN[bvCode] || bvCode || String(bvRaw || "").trim();
    } else {
      label = ogKey;
    }

    return {
      label,
      ogKey,
      lvCode,
      bvCode,
      startrecht: startRaw
    };
  }

  function buildOgCapCell(ogInfo) {
    const cell = h("span", { class: "m-ogcap-cell" });

    const { ogKey, lvCode, bvCode, startrecht, label } = ogInfo;

    let seq = [];

    if (startrecht === "OG") {
      seq = [
        { key: ogKey, overlay: false },
        { key: lvCode, overlay: true },
        { key: bvCode, overlay: true }
      ];
    } else if (startrecht === "LV") {
      seq = [
        { key: lvCode, overlay: false },
        { key: ogKey, overlay: true },
        { key: bvCode, overlay: true }
      ];
    } else if (startrecht === "BV") {
      seq = [
        { key: bvCode, overlay: false },
        { key: ogKey, overlay: true },
        { key: lvCode, overlay: true }
      ];
    } else {
      seq = [
        { key: ogKey, overlay: false },
        { key: lvCode, overlay: true },
        { key: bvCode, overlay: true }
      ];
    }

    seq = seq.filter(entry => entry.key && String(entry.key).trim() !== "");

    let currentIndex = 0;
    let noneUsed = false;

    if (!seq.length) {
      const imgNone = h("img", {
        class: "m-ogcap-icon",
        src: "svg/Cap-None.svg",
        alt: "no cap",
        loading: "lazy",
        decoding: "async",
        onerror: (e) => e.currentTarget.remove()
      });
      cell.appendChild(imgNone);
      return cell;
    }

    const img = h("img", {
      class: "m-ogcap-icon",
      src: "",
      alt: label || seq[0].key,
      loading: "lazy",
      decoding: "async",
      onerror: (e) => {
        if (currentIndex + 1 < seq.length) {
          currentIndex++;
          applyCandidate();
        } else if (!noneUsed) {
          noneUsed = true;
          cell.classList.remove("ogcap-overlay");
          img.src = "svg/Cap-None.svg";
        } else {
          img.remove();
        }
      }
    });

    function applyCandidate() {
      const entry = seq[currentIndex];
      if (entry.overlay) {
        cell.classList.add("ogcap-overlay");
      } else {
        cell.classList.remove("ogcap-overlay");
      }
      img.src = `${FLAG_BASE_URL}/Cap-${encodeURIComponent(entry.key)}.svg`;
    }
    applyCandidate();

    cell.appendChild(img);
    return cell;
  }

  function poolLabel(pool) {
    return pool === "25" ? "25m" : (pool === "50" ? "50m" : "—");
  }

  function fmtDateShort(dStr) {
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d)) return "—";
    const months = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Jun.", "Jul.", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
    return `${d.getDate()}. ${months[d.getMonth()]}`;
  }

  function medalForPlace(placeStr) {
    const p = parseInt(placeStr, 10);
    if (!Number.isFinite(p)) return null;
    if (p === 1) return { file: "medal_gold.svg", alt: "Gold" };
    if (p === 2) return { file: "medal_silver.svg", alt: "Silber" };
    if (p === 3) return { file: "medal_bronze.svg", alt: "Bronze" };
    return null;
  }

  function roundLabelFromLauf(laufNummer, maxLauf) {
    const ln = Number(laufNummer);
    const mx = Number(maxLauf);
    if (!Number.isFinite(ln) || !Number.isFinite(mx) || mx <= 1) return null;

    if (mx === 2) return ln === 1 ? "Vorlauf" : (ln === 2 ? "Finale" : null);
    if (mx === 3) return ln === 1 ? "Vorlauf" : (ln === 2 ? "Halbfinale" : (ln === 3 ? "Finale" : null));
    if (mx === 4) return ln === 1 ? "Vorlauf" : (ln === 2 ? "Viertelfinale" : (ln === 3 ? "Halbfinale" : (ln === 4 ? "Finale" : null)));

    if (ln === mx) return "Finale";
    if (ln === mx - 1) return "Halbfinale";
    if (ln === mx - 2) return "Viertelfinale";
    return "Vorlauf";
  }

  function assumedBirthDate(jahrgang) {
    const y = Number(jahrgang);
    if (!Number.isFinite(y)) return null;
    return new Date(y, 6, 1);
  }

  function ageAt(dateStr, jahrgang) {
    const birth = assumedBirthDate(jahrgang);
    if (!birth) return NaN;
    const d = new Date(dateStr);
    if (isNaN(d)) return NaN;
    const msPerYear = 365.2425 * 24 * 60 * 60 * 1000;
    return (d - birth) / msPerYear;
  }

  const DISCIPLINES = [
    { key: "50_retten", label: "50m Retten", meetZeit: "50m_Retten_Zeit", meetPlatz: "50m_Retten_Platz" },
    { key: "100_retten_flosse", label: "100m Retten mit Flossen", meetZeit: "100m_Retten_Zeit", meetPlatz: "100m_Retten_Platz" },
    { key: "100_kombi", label: "100m Kombi", meetZeit: "100m_Kombi_Zeit", meetPlatz: "100m_Kombi_Platz" },
    { key: "100_lifesaver", label: "100m Lifesaver", meetZeit: "100m_Lifesaver_Zeit", meetPlatz: "100m_Lifesaver_Platz" },
    { key: "200_super", label: "200m Super Lifesaver", meetZeit: "200m_SuperLifesaver_Zeit", meetPlatz: "200m_SuperLifesaver_Platz" },
    { key: "200_hindernis", label: "200m Hindernis", meetZeit: "200m_Hindernis_Zeit", meetPlatz: "200m_Hindernis_Platz" }
  ];

  const MEET_DISC_TIME_FIELDS = [
    "50m_Retten_Zeit",
    "100m_Retten_Zeit",
    "100m_Kombi_Zeit",
    "100m_Lifesaver_Zeit",
    "200m_SuperLifesaver_Zeit",
    "200m_Hindernis_Zeit"
  ];

  function parseTimeToSec(raw) {
    if (raw == null) return NaN;
    const s = String(raw).trim();
    if (/^dq$/i.test(s)) return NaN;
    const norm = s.replace(",", ".");
    const parts = norm.split(":");
    if (parts.length === 1) {
      const sec = parseFloat(parts[0]);
      return Number.isFinite(sec) ? sec : NaN;
    } else if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const sec = parseFloat(parts[1]);
      if (!Number.isFinite(m) || !Number.isFinite(sec)) return NaN;
      return m * 60 + sec;
    }
    return NaN;
  }

  function formatSeconds(sec) {
    if (sec == null || isNaN(sec)) return "—";
    const tot = Math.round(Math.max(0, Number(sec)) * 100);
    const m = Math.floor(tot / 6000);
    const s = Math.floor((tot % 6000) / 100);
    const cs = tot % 100;
    const sPart = (m ? String(s).padStart(2, "0") : String(s));
    return (m ? `${m}:${sPart}` : sPart) + "." + String(cs).padStart(2, "0");
  }

  function avgTimeForDiscipline(athlete, lane, disc) {
    const meets = Array.isArray(athlete.meets) ? athlete.meets : [];
    let sum = 0, cnt = 0;
    for (const m of meets) {
      if (!m || (lane && m.pool !== lane)) continue;
      const z = m[disc.meetZeit];
      if (!z || /^dq$/i.test(String(z).trim())) continue;
      const sec = parseTimeToSec(z);
      if (Number.isFinite(sec)) { sum += sec; cnt++; }
    }
    return cnt > 0 ? (sum / cnt) : NaN;
  }

  function nonEmpty(v) { return v != null && String(v).trim() !== ""; }

  function meetKey(m) {
    const name = String(m?.meet_name || "").trim().toLowerCase();
    const date = String(m?.date || "").trim();
    return name + "||" + date;
  }

  function mergeDuplicateMeets(meets) {
    const list = Array.isArray(meets) ? meets.slice() : [];
    const groups = new Map();

    list.forEach((m, idx) => {
      if (!m || !m.meet_name) return;
      const k = meetKey(m);
      if (!groups.has(k)) groups.set(k, []);

      const raw = (m.Vorläufe ?? m._lauf ?? "").toString().trim();
      const parsed = parseInt(raw, 10);
      const runNo = Number.isFinite(parsed) && parsed > 0
        ? parsed
        : (groups.get(k).length + 1);

      groups.get(k).push({
        ...m,
        _lauf: runNo,
        _lauf_raw: raw,
        _srcIndex: idx
      });
    });

    const merged = [];

    for (const runs0 of groups.values()) {
      const runs = runs0.sort((a, b) => (a._lauf - b._lauf) || (a._srcIndex - b._srcIndex));

      const highest = runs[runs.length - 1];
      const out = { ...highest };
      out._runs = runs.map(r => ({ ...r }));
      out._lauf_max = runs.reduce((m, r) => Math.max(m, Number(r._lauf) || 0), 0) || runs.length;

      const ALL_TIME_FIELDS = MEET_DISC_TIME_FIELDS.slice();
      const PLACE_FIELDS = MEET_DISC_TIME_FIELDS.map(f => f.replace(/_Zeit$/i, "_Platz"));

      function pickFromHighest(field) {
        for (let i = runs.length - 1; i >= 0; i--) {
          const v = runs[i][field];
          if (v != null && String(v).trim() !== "") return v;
        }
        return "";
      }

      ALL_TIME_FIELDS.forEach(f => { out[f] = pickFromHighest(f); });
      PLACE_FIELDS.forEach(f => { out[f] = pickFromHighest(f); });

      out.Mehrkampf_Platz = pickFromHighest("Mehrkampf_Platz");
      out.LSC = pickFromHighest("LSC");
      out.Wertung = highest.Wertung || out.Wertung || "";
      out.Startrecht = highest.Startrecht || out.Startrecht || "";
      out.Regelwerk = highest.Regelwerk || out.Regelwerk || "";
      out.Ortsgruppe = highest.Ortsgruppe || out.Ortsgruppe || "";
      out.pool = highest.pool || out.pool;
      out.Land = highest.Land || out.Land;

      merged.push(out);
    }

    merged.sort((l, r) => new Date(r.date) - new Date(l.date));
    return merged;
  }

  function withHydratedMeets(ax) {
    const meets = AllMeetsByAthleteId.get(ax.id) || ax.meets || [];
    return { ...ax, meets };
  }

  function computeMeetInfo(a) {
    const meets = Array.isArray(a.meets) ? a.meets : [];
    const total = meets.length;

    let c50 = 0, c25 = 0;
    let first = null, last = null, firstName = null;
    const years = new Set();

    let cNat = 0, cIntl = 0;

    for (const m of meets) {
      if (m.pool === "50") c50++; else if (m.pool === "25") c25++;

      const reg = String(m.Regelwerk || "").toLowerCase().trim();
      if (reg.startsWith("int")) cIntl++;
      else if (reg.startsWith("nat")) cNat++;

      const d = new Date(m.date);
      if (!isNaN(d)) {
        years.add(d.getFullYear());
        if (!first || d < first) {
          first = d;
          firstName = shortMeetName(m.meet_name || m.meet || "") || (m.meet_name || m.meet || null);
        }
        if (!last || d > last) { last = d; }
      }
    }

    const pct50 = total ? Math.round((c50 / total) * 100) : 0;
    const pctIntl = total ? Math.round((cIntl / total) * 100) : 0;

    return {
      total, c50, c25, pct50, pct25: total ? 100 - pct50 : 0,
      first: first ? first.toISOString().slice(0, 10) : null,
      last: last ? last.toISOString().slice(0, 10) : null,
      firstName,
      activeYears: years.size,
      cNat, cIntl, pctIntl
    };
  }

  function shortMeetName(name) {
    if (!name) return "—";
    const s = String(name);
    const i = s.indexOf(" - ");
    return (i >= 0 ? s.slice(0, i) : s).trim();
  }

  function fmtDate(dStr) {
    if (!dStr) return "—";
    const d = new Date(dStr);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("de-DE");
  }

  function fmtInt(n) { return Number.isFinite(n) ? n.toLocaleString("de-DE") : "—"; }

  function hasStartVal(v) {
    return v != null && String(v).trim() !== "";
  }

  function totalStartsFromMeets(a) {
    const meets = Array.isArray(a.meets) ? a.meets : [];
    let total = 0;
    for (const m of meets) {
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs) {
        for (const f of MEET_DISC_TIME_FIELDS) {
          if (hasStartVal(run[f])) total++;
        }
      }
    }
    return total;
  }

  function computeStartsPerStartrecht(a) {
    const meets = Array.isArray(a.meets) ? a.meets : [];
    const out = { OG: 0, BZ: 0, LV: 0, BV: 0 };
    for (const m of meets) {
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs) {
        const sr = (run.Startrecht || "").toUpperCase();
        if (!out.hasOwnProperty(sr)) continue;
        let cnt = 0;
        for (const f of MEET_DISC_TIME_FIELDS) {
          if (hasStartVal(run[f])) cnt++;
        }
        out[sr] += cnt;
      }
    }
    return out;
  }

  function countStartrechte(a) {
    const c = { OG: 0, BZ: 0, LV: 0, BV: 0 };
    if (!Array.isArray(a?.meets)) return c;
    for (const m of a.meets) {
      const sr = String(m?.Startrecht || "").toUpperCase();
      if (sr in c) c[sr] += 1;
    }
    return c;
  }

  function computeLaneDQProb(ax) {
    const out = { "25": { starts: 0, dq: 0 }, "50": { starts: 0, dq: 0 } };
    const stats = (ax && ax.stats) || {};

    for (const lane of ["25", "50"]) {
      const laneStats = stats[lane] || {};
      for (const d of DISCIPLINES) {
        const s = laneStats[d.key];
        if (!s) continue;
        out[lane].starts += Number(s.starts || 0);
        out[lane].dq += Number(s.dq || 0);
      }
    }

    const pct = (dq, starts) => (starts > 0 ? Math.round((dq / starts) * 1000) / 10 : 0);
    return {
      "25": { ...out["25"], pct: pct(out["25"].dq, out["25"].starts) },
      "50": { ...out["50"], pct: pct(out["50"].dq, out["50"].starts) }
    };
  }

  function sumAllDQ(obj) {
    const s50 = (obj.stats && obj.stats["50"]) || {};
    const s25 = (obj.stats && obj.stats["25"]) || {};
    let total = 0;
    for (const d of DISCIPLINES) {
      total += Number(s50[d.key]?.dq || 0);
      total += Number(s25[d.key]?.dq || 0);
    }
    return total;
  }

  function sumWettkampfMeter(a) {
    const meets = Array.isArray(a.meets) ? a.meets : [];
    let total = 0;
    for (const m of meets) {
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs) {
        for (const [key, val] of Object.entries(run)) {
          if (!/_Zeit$/i.test(key)) continue;
          const v = (val ?? "").toString().trim();
          if (!v) continue;
          let dist = NaN;
          let mm = key.match(/^(\d+)m[_ ]/i) || key.match(/(\d+)m/i);
          if (mm) dist = parseInt(mm[1], 10);
          if (Number.isFinite(dist)) total += dist;
        }
      }
    }
    return total;
  }

  function fmtMeters(m) {
    if (!Number.isFinite(m) || m <= 0) return "—";
    return `${m.toLocaleString("de-DE")} m`;
  }

  function countRegelwerk(meets) {
    let intl = 0, nat = 0;
    (meets || []).forEach(m => {
      const r = String(m.Regelwerk || "").toLowerCase();
      if (r.startsWith("int")) intl++;
      else if (r.startsWith("nat")) nat++;
    });
    const total = intl + nat;
    const pctIntl = total ? Math.round((intl / total) * 100) : 0;
    const pctNat = total ? 100 - pctIntl : 0;
    return { intl, nat, pctIntl, pctNat, total };
  }

  function buildTimeSeriesForDiscipline(a, discKey, opts = {}) {
    const dMeta = DISCIPLINES.find(d => d.key === discKey);
    if (!dMeta) return [];
    const jahrgang = Number(a?.jahrgang);
    if (!Number.isFinite(jahrgang)) return [];

    const lanesWanted = new Set(
      Array.isArray(opts.lanes) || (opts.lanes instanceof Set)
        ? Array.from(opts.lanes)
        : ["25", "50"]
    );

    const meets = Array.isArray(a.meets) ? a.meets : [];
    const birth = new Date(`${jahrgang}-07-01T00:00:00Z`);
    const rows = [];

    for (const m of meets) {
      const dateISO = String(m?.date || "").slice(0, 10);
      if (!dateISO) continue;
      const d = new Date(dateISO);
      if (isNaN(d)) continue;

      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      const laufMax = Number.isFinite(m?._lauf_max) ? m._lauf_max
        : runs.reduce((mx, r) => Math.max(mx, parseInt(r?._lauf || r?.Vorläufe || 1, 10) || 1), 1);

      for (const r of runs) {
        const lauf = parseInt((r?._lauf ?? r?.Vorläufe ?? 1), 10);
        const raw = r?.[dMeta.meetZeit] ?? m?.[dMeta.meetZeit] ?? "";
        const sec = parseTimeToSec(raw);
        if (!Number.isFinite(lauf) || !Number.isFinite(sec)) continue;

        const pool = String(r?.pool || m?.pool || "").trim();
        if (!lanesWanted.has(pool)) continue;

        const ageYears = (d - birth) / (365.2425 * 24 * 3600 * 1000);
        const age = Math.round(ageYears * 100) / 100;
        const meetName = String(m.meet_name || m.meet || "").replace(/\s+-\s+.*$/, "").trim();

        const rl = roundLabelFromLauf(lauf, laufMax);
        const showRound = (rl === "Vorlauf" || rl === "Finale") ? rl : "";

        rows.push({
          age,
          sec,
          date: dateISO,
          meet_name: meetName,
          lauf,
          lauf_max: laufMax,
          round: showRound,
          pool
        });
      }
    }

    rows.sort((a, b) => (new Date(a.date) - new Date(b.date)) || (a.lauf - b.lauf));
    return rows;
  }

  function countStartsPerDisciplineAll(a) {
    const meets = Array.isArray(a?.meets) ? a.meets : [];
    const out = {};
    for (const d of DISCIPLINES) { out[d.key] = 0; }

    for (const m of meets) {
      const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];
      for (const run of runs) {
        for (const d of DISCIPLINES) {
          const v = run[d.meetZeit];
          if (v != null && String(v).trim() !== "") out[d.key] += 1;
        }
      }
    }
    return out;
  }

  Object.assign(ProfileTabsInternals, {
    MIN_QUERY_LEN,
    DISCIPLINES,
    renderCapAvatarLocal,
    withHydratedMeets,
    mergeDuplicateMeets,
    buildTimeSeriesForDiscipline,
    countStartsPerDisciplineAll,
    parseTimeToSec,
    formatSeconds,
    fmtDateShort,
    getAthletesPool: () => AthletesPool
  });

  function renderDisciplinePieCard(a) {
    return global.ProfileTabsCharts.renderDisciplinePieCard(a);
  }

  function renderLSCChart(a) {
    return global.ProfileTabsCharts.renderLSCChart(a);
  }

  function renderTimeChart(a) {
    return global.ProfileTabsCharts.renderTimeChart(a);
  }

  function deriveFromMeets(a) {
    return global.ProfileTabsCharts.deriveFromMeets(a);
  }

  function renderBahnSwitch(athlete, refs) {
    const b50 = h("button", {
      class: "seg-btn" + (State.poolLen === "50" ? " active" : ""),
      type: "button",
      onclick: () => {
        if (State.poolLen !== "50") {
          State.poolLen = "50";
          b50.classList.add("active");
          b25.classList.remove("active");
          paintBestzeitenGrid(athlete, refs);
        }
      }
    }, "50 m");

    const b25 = h("button", {
      class: "seg-btn" + (State.poolLen === "25" ? " active" : ""),
      type: "button",
      onclick: () => {
        if (State.poolLen !== "25") {
          State.poolLen = "25";
          b25.classList.add("active");
          b50.classList.remove("active");
          paintBestzeitenGrid(athlete, refs);
        }
      }
    }, "25 m");

    refs.bestBtn50 = b50;
    refs.bestBtn25 = b25;

    return h("div", { class: "seg" }, b50, b25);
  }

  function renderBestzeitenSection(athlete, refs) {
    const header = h("div", { class: "ath-bests-header" },
      h("h3", {}, ""),
      renderBahnSwitch(athlete, refs)
    );
    const grid = h("div", { class: "ath-bests-grid" });
    refs.bestGrid = grid;
    const section = h("div", { class: "ath-profile-section bests" }, header, grid);
    paintBestzeitenGrid(athlete, refs);
    section.appendChild(renderTimeChart(athlete));
    return section;
  }

  function paintBestzeitenGrid(athlete, refs) {
    if (!refs.bestGrid) return;

    const lane = State.poolLen || "50";
    const times = (athlete.pbs && athlete.pbs[lane]) || {};
    const statsMap = (athlete.stats && athlete.stats[lane]) || {};
    const meets = Array.isArray(athlete.meets) ? athlete.meets : [];

    refs.bestGrid.innerHTML = "";

    function findPbMeetNameForDisc(d, bestSec) {
      if (!Number.isFinite(bestSec)) return "";

      let bestName = "";
      let bestDate = null;

      for (const m of meets) {
        if (!m) continue;

        const mLane = (m.pool === "25" ? "25" : (m.pool === "50" ? "50" : null));
        if (mLane !== lane) continue;

        const runs = Array.isArray(m._runs) && m._runs.length ? m._runs : [m];

        for (const r of runs) {
          const raw = r[d.meetZeit];
          const sec = parseTimeToSec(raw);
          if (!Number.isFinite(sec)) continue;

          if (Math.abs(sec - bestSec) > 1e-9) continue;

          const rawName = String(m.meet_name || m.meet || "").trim();
          const nm = rawName;

          const dStr = String(m.date || "").slice(0, 10);
          const dObj = new Date(dStr);

          if (!bestName) {
            bestName = nm;
            bestDate = Number.isNaN(dObj.getTime()) ? null : dObj;
          } else if (!Number.isNaN(dObj.getTime()) && bestDate && dObj < bestDate) {
            bestName = nm;
            bestDate = dObj;
          }
        }
      }
      return bestName;
    }

    const showList = DISCIPLINES.filter(d => {
      const hasTime = Number.isFinite(times[d.key]);
      const dqOnly = Number(statsMap[d.key]?.dq || 0) > 0;
      return hasTime || dqOnly;
    });

    if (!showList.length) {
      refs.bestGrid.appendChild(
        h("div", { class: "best-empty" },
          lane === "50" ? "Keine Bestzeiten auf 50 m vorhanden." : "Keine Bestzeiten auf 25 m vorhanden."
        )
      );
      return;
    }

    showList.forEach(d => {
      const sec = times[d.key];
      const st = statsMap[d.key] || {};
      const starts = Number(st.starts || 0);
      const dq = Number(st.dq || 0);
      const hasTime = Number.isFinite(sec);

      const frontValue = hasTime ? formatSeconds(sec) : (dq > 0 ? "DQ" : "—");
      const aria = hasTime ? `Bestzeit ${formatSeconds(sec)}` : (dq > 0 ? "DQ" : "keine Zeit");

      const compName = hasTime ? findPbMeetNameForDisc(d, sec) : "";

      const tile = h("article", {
        class: "best-tile",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": `${d.label} – ${aria}${compName ? " – " + compName : ""}`
      });

      const inner = h("div", { class: "tile-inner" });

      const frontChildren = [
        h("div", { class: "best-label" }, d.label),
        h("div", { class: "best-time" }, frontValue)
      ];
      if (compName) {
        frontChildren.push(
          h("div", { class: "best-meet" }, compName)
        );
      }

      const front = h("div", { class: "tile-face tile-front" }, ...frontChildren);

      const avgSec = avgTimeForDiscipline(athlete, lane, d);
      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "tile-stats" },
          statRow("Schnitt", Number.isFinite(avgSec) ? formatSeconds(avgSec) : "—"),
          statRow("Starts", starts),
          statRow("DQ / Strafen", dq)
        )
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);
      refs.bestGrid.appendChild(tile);

      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) tile.addEventListener("pointerdown", toggleLock);
      else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, { passive: true });
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleLock();
        }
      });

      function statRow(k, v) {
        return h("div", { class: "stat" },
          h("span", { class: "k" }, k),
          h("span", { class: "v" }, String(v))
        );
      }
    });

    function fitBestLabels() {
      const labels = document.querySelectorAll('.best-label');
      const MAX = 0.8;
      const MIN = 0.55;

      labels.forEach(label => {
        let size = MAX;
        label.style.fontSize = MAX + 'rem';
        label.style.whiteSpace = 'nowrap';

        while (label.scrollWidth > label.clientWidth && size > MIN) {
          size -= 0.02;
          label.style.fontSize = size.toFixed(2) + 'rem';
        }
      });
    }

    window.addEventListener('load', fitBestLabels);
    window.addEventListener('resize', fitBestLabels);
  }

  function renderMeetsSection(a) {
    const allMeets = Array.isArray(a.meets) ? a.meets.slice() : [];
    const jahrgang = Number(a?.jahrgang);

    if (!allMeets.length) {
      const emptyBox = h("div", { class: "ath-profile-section meets" },
        h("div", { class: "ath-info-header" }, h("h3", {}, "Wettkämpfe (—)")),
        h("div", { class: "best-empty" }, "Keine Wettkämpfe erfasst.")
      );
      return emptyBox;
    }

    const years = Array.from(new Set(
      allMeets
        .map(m => (new Date(m.date)).getFullYear())
        .filter(y => Number.isFinite(y))
    )).sort((a, b) => b - a);

    let idx = 0;
    let meetDebugId = 0;

    const box = h("div", { class: "ath-profile-section meets" });

    const title = h("h3", {}, "");
    const head = h("div", { class: "ath-info-header meets-head" },
      h("button", { class: "nav-btn", type: "button", onclick: () => changeYear(+1) }, "‹"),
      title,
      h("button", { class: "nav-btn", type: "button", onclick: () => changeYear(-1) }, "›")
    );

    const listWrap = h("div", { class: "meets-list" });
    box.appendChild(head);
    box.appendChild(listWrap);

    paint(years[idx]);

    return box;

    function changeYear(delta) {
      const next = idx + delta;
      if (next < 0 || next >= years.length) return;
      idx = next;
      paint(years[idx]);
    }

    function paint(year) {
      title.textContent = year;

      const items = allMeets
        .filter(m => (new Date(m.date)).getFullYear() === year)
        .sort((l, r) => new Date(r.date) - new Date(l.date));

      listWrap.innerHTML = "";
      if (!items.length) {
        listWrap.appendChild(h("div", { class: "best-empty" }, "Keine Wettkämpfe in diesem Jahr."));
        return;
      }

      items.forEach(m => {
        const debugId = ++meetDebugId;

        const placeStr = (m.Mehrkampf_Platz || "").toString().trim();
        const medal = medalForPlace(placeStr);

        const placeEl = h("span", { class: "m-place" },
          placeStr || "",
          medal ? h("img", {
            class: "m-medal",
            src: `${FLAG_BASE_URL}/${medal.file}`,
            alt: medal.alt,
            loading: "lazy",
            decoding: "async",
            onerror: (e) => e.currentTarget.remove()
          }) : null
        );

        const poolEl = h("span", { class: "m-pool" }, poolLabel(m.pool));

        const landName = (m.Land || "").toString().trim();
        const iso3 = iso3FromLand(landName);
        const landEl = h("span", { class: "m-country" },
          h("img", {
            class: "m-flag",
            src: `${FLAG_BASE_URL}/${encodeURIComponent(landName)}.svg`,
            alt: landName || "Land",
            loading: "lazy",
            decoding: "async",
            onerror: (e) => e.currentTarget.remove()
          }),
          h("span", { class: "m-iso" }, ` ${iso3}`)
        );

        const dateEl = buildDateEl(m.date);

        const meetRawName = (m.meet_name || "").toString().trim();
        const meetShortName = (meetRawName || "—").replace(/\s+-\s+.*$/, "");
        const nameEl = h("span", { class: "m-name" },
          h("span", { class: "m-name-main" }, meetShortName)
        );

        const eventIconCell = h("span", { class: "m-event-cell" },
          meetRawName
            ? h("img", {
              class: "m-event-icon",
              src: `png/events/${encodeURIComponent(meetRawName)}.png`,
              alt: meetShortName,
              loading: "lazy",
              decoding: "async",
              onerror: (e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = "1";
                  img.src = "png/events/DLRG.png";
                } else {
                  img.remove();
                }
              }
            })
            : null
        );

        const ageLabel = ageLabelAtMeet(m.date);
        const ageEl = h("span", { class: "m-age" }, ageLabel || "");

        const ogInfo = ogInfoFromMeet(m);
        const ogLabel = ogInfo.label;

        const ogCapCell = buildOgCapCell(ogInfo);
        const ogEl = h("span", { class: "m-og" }, ogLabel || "");

        const row = h("div", {
          class: "meet-row",
          role: "button",
          tabindex: "0",
          "aria-expanded": "false",
          onkeydown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          },
          onclick: toggle
        },
          dateEl,
          placeEl,
          eventIconCell,
          nameEl,
          ageEl,
          ogCapCell,
          ogEl,
          landEl,
          poolEl
        );

        const details = h("div", {
          class: "meet-details",
          "aria-hidden": "true",
          style: "height:0"
        }, ...buildResultRows(m));

        listWrap.appendChild(row);
        listWrap.appendChild(details);

        function toggle() {
          const isOpen = row.classList.toggle("open");
          row.setAttribute("aria-expanded", isOpen ? "true" : "false");
          if (isOpen) expand(details); else collapse(details);
        }

        function expand(el) {
          el.setAttribute("aria-hidden", "false");
          el.style.height = el.scrollHeight + "px";
          el.addEventListener("transitionend", () => {
            if (row.classList.contains("open")) el.style.height = "auto";
          }, { once: true });
        }

        function collapse(el) {
          el.setAttribute("aria-hidden", "true");
          if (el.style.height === "" || el.style.height === "auto") {
            el.style.height = el.scrollHeight + "px";
          }
          requestAnimationFrame(() => {
            el.style.height = "0px";
          });
        }
      });
    }

    function ageLabelAtMeet(dateStr) {
      if (!Number.isFinite(jahrgang)) return "";
      const v = ageAt(dateStr, jahrgang);
      if (!Number.isFinite(v)) return "";
      const years = Math.floor(v + 1e-6);
      return years + " J.";
    }

    function buildDateEl(dateStr) {
      const d = new Date(dateStr);
      if (isNaN(d)) {
        return h("span", { class: "m-date" }, fmtDateShort(dateStr));
      }
      const day = d.getDate();
      const month = monthShortDE(d.getMonth());

      return h("span", { class: "m-date" },
        h("span", { class: "m-date-day" }, day + "."),
        h("span", { class: "m-date-month" }, month)
      );
    }

    function monthShortDE(idx) {
      const names = ["Jan.", "Feb.", "Mär.", "Apr.", "Mai", "Jun.", "Jul.", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
      return names[idx] ?? "";
    }

    function buildResultRows(m) {
      const F = [
        { base: "50m_Retten", label: "50m Retten" },
        { base: "100m_Retten", label: "100m Retten mit Flossen" },
        { base: "100m_Kombi", label: "100m Kombi" },
        { base: "100m_Lifesaver", label: "100m Lifesaver" },
        { base: "200m_SuperLifesaver", label: "200m Super Lifesaver" },
        { base: "200m_Hindernis", label: "200m Hindernis" }
      ];

      const runs = Array.isArray(m._runs) && m._runs.length
        ? [...m._runs].sort((a, b) => (a._lauf || 1) - (b._lauf || 1))
        : [m];

      const rows = [];

      for (const f of F) {
        for (let i = 0; i < runs.length; i++) {
          const run = runs[i];
          const t = run[`${f.base}_Zeit`];
          const p = run[`${f.base}_Platz`];

          const hasAny = (t && String(t).trim() !== "") || (p && String(p).trim() !== "");
          if (!hasAny) continue;

          const wRaw = String(run.Wertung ?? m.Wertung ?? "").toLowerCase();
          const isEinzel = wRaw.replace(/[\s\-]+/g, "").includes("einzel");

          const placeStr = (p || "").toString().trim();
          const medal = isEinzel ? medalForPlace(placeStr) : null;

          const placeEl = h("span", { class: "pl" },
            placeStr || "",
            medal ? h("img", {
              class: "res-medal",
              src: `${FLAG_BASE_URL}/${medal.file}`,
              alt: medal.alt,
              loading: "lazy",
              decoding: "async",
              onerror: (e) => e.currentTarget.remove()
            }) : null
          );

          const total = Number.isFinite(m._lauf_max) ? m._lauf_max : runs.length;
          const rLabel = roundLabelFromLauf(run._lauf, total);
          const discWrap = h("span", { class: "d-wrap" },
            h("span", { class: "d" }, f.label),
            (rLabel ? h("span", { class: "d-sub" }, rLabel) : null)
          );

          rows.push(
            h("div", { class: "meet-res" },
              discWrap,
              placeEl,
              h("span", { class: "t" }, (t && String(t).trim() !== "") ? String(t) : "—")
            )
          );
        }
      }

      return rows.length ? rows : [h("div", { class: "best-empty" }, "Keine Einzelergebnisse erfasst.")];
    }
  }

  function renderOverviewSection(a) {
    const header = h("div", { class: "ath-info-header" }, h("h3", {}, ""));
    const grid = h("div", { class: "ath-info-grid" });

    const meets = computeMeetInfo(a);
    const totalDQ = sumAllDQ(a);
    const startsPer = computeStartsPerStartrecht(a);
    const totalStarts = totalStartsFromMeets(a);
    const dqLane = computeLaneDQProb(a);
    const totalMeters = sumWettkampfMeter(a);
    const chartCard = renderLSCChart(a);
    const pieCard = renderDisciplinePieCard(a);

    grid.appendChild(infoTileBig("LSC", a.lsc != null ? fmtInt(a.lsc) : "—"));
    grid.appendChild(infoTileWettkaempfeFlip(a, meets));
    grid.appendChild(infoTileStartsFlip(totalStarts, startsPer));
    grid.appendChild(infoTileDQFlip(totalDQ, dqLane));
    grid.appendChild(renderBahnverteilungTile(a));
    grid.appendChild(renderRegelwerkTile(a));
    grid.appendChild(infoTileYearsFlip(meets.activeYears, meets.first, meets.firstName));
    grid.appendChild(infoTileMetersFlip("Wettkampfmeter", totalMeters, meets.total));

    return h("div", { class: "ath-profile-section info" }, header, grid, chartCard, pieCard);

    function infoTileBig(label, value) {
      const title = h("div", { class: "info-label lsc-label", "data-state": "short" },
        h("span", { class: "label label-short", "aria-hidden": "false" }, "LSC"),
        h("span", { class: "label label-long", "aria-hidden": "true" }, "Lifesaving Score")
      );
      const valueEl = h("div", { class: "info-value big" }, value);
      const wrap = h("div", {
        class: "info-tile accent lsc-tile",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        onclick: toggle,
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }
      }, title, valueEl);
      function toggle() {
        const toLong = title.dataset.state !== "long";
        title.dataset.state = toLong ? "long" : "short";
        title.classList.toggle("show-long", toLong);
        title.querySelector(".label-short")?.setAttribute("aria-hidden", toLong ? "true" : "false");
        title.querySelector(".label-long")?.setAttribute("aria-hidden", toLong ? "false" : "true");
        wrap.setAttribute("aria-pressed", toLong ? "true" : "false");
      }
      return wrap;
    }

    function renderBahnverteilungTile(a) {
      const m = computeMeetInfo(a);

      const tile = h("div", {
        class: "info-tile flip dist",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Bahnverteilung"
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Bahnverteilung"),
        (() => {
          const bar = h("div", { class: "info-progress" },
            h("div", { class: "p50", style: `width:${m.pct50 || 0}%` })
          );
          return bar;
        })(),
        h("div", { class: "info-legend" },
          h("span", { class: "l50" }, `50m ${m.pct50 || 0}%`)
        )
      );

      const rows = [];
      if (m.c25 > 0) rows.push(statRow("25m Bahn", m.c25));
      if (m.c50 > 0) rows.push(statRow("50m Bahn", m.c50));
      if (rows.length === 0) rows.push(statRow("—", "—"));

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Wettkämpfe auf"),
        h("div", { class: "tile-stats" }, rows)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) {
        tile.addEventListener("pointerdown", toggleLock);
      } else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, { passive: true });
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLock(); }
      });

      return tile;

      function statRow(k, v) {
        return h("div", { class: "stat" },
          h("span", { class: "k" }, k),
          h("span", { class: "v" }, String(v))
        );
      }
    }

    function infoTileWettkaempfeFlip(a, meets) {
      const counts = countStartrechte(a);
      const rows = Object.entries(counts).filter(([, v]) => v > 0);

      const tile = h("div", {
        class: "info-tile flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Wettkämpfe – Details nach Startrecht"
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Wettkämpfe"),
        h("div", { class: "info-value" }, fmtInt(meets.total))
      );

      const back = h("div", { class: "tile-face tile-back" },
        rows.length
          ? h("div", { class: "tile-stats" },
            ...rows.map(([k, v]) =>
              h("div", { class: "stat" },
                h("span", { class: "k" }, k),
                h("span", { class: "v" }, String(v))
              )
            )
          )
          : h("div", { class: "best-empty" }, "Keine Starts mit OG/BZ/LV/BV")
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) {
        tile.addEventListener("pointerdown", toggleLock);
      } else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, { passive: true });
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLock(); }
      });

      return tile;
    }

    function infoTileStartsFlip(total, per) {
      const tile = h("div", {
        class: "info-tile flip starts-flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        onclick: toggle,
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Total Starts"),
        h("div", { class: "info-value" }, fmtInt(total))
      );

      const list = [];
      const labelMap = { OG: "Ortsgrppe", BZ: "Bezirk", LV: "Landesverband", BV: "Bundesverband" };
      (["OG", "BZ", "LV", "BV"]).forEach(k => {
        const v = per[k] || 0;
        if (v > 0) {
          list.push(statRow(labelMap[k], v));
        }
      });

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "tile-stats" }, ...list)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      function toggle() {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      }

      return tile;

      function statRow(k, v) {
        return h("div", { class: "stat" },
          h("span", { class: "k" }, k),
          h("span", { class: "v" }, String(v))
        );
      }
    }

    function renderRegelwerkTile(a) {
      const c = countRegelwerk(a.meets);

      const tile = h("div", {
        class: "info-tile flip regelwerk",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        "aria-label": "Regelwerk"
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Regelwerk"),
        (() => {
          const bar = h("div", { class: "info-progress" },
            h("div", { class: "pIntl", style: `width:${c.pctIntl}%` })
          );
          return bar;
        })(),
        h("div", { class: "info-legend" },
          h("span", { class: "lintl" }, (c.pctIntl === 0 ? `National: 100%` : `International: ${c.pctIntl}%`))
        )
      );

      const backStats = [];
      if (c.nat > 0) backStats.push(statRow("National", c.nat));
      if (c.intl > 0) backStats.push(statRow("International", c.intl));
      if (backStats.length === 0) backStats.push(statRow("—", "—"));

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Regelwerk"),
        h("div", { class: "tile-stats" }, backStats)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      const toggleLock = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) {
        tile.addEventListener("pointerdown", toggleLock);
      } else {
        tile.addEventListener("click", toggleLock);
        tile.addEventListener("touchstart", toggleLock, { passive: true });
      }
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLock(); }
      });

      return tile;

      function statRow(k, v) {
        return h("div", { class: "stat" },
          h("span", { class: "k" }, k),
          h("span", { class: "v" }, String(v))
        );
      }
    }

    function infoTileYearsFlip(activeYears, firstISO, firstName) {
      const tile = h("div", {
        class: "info-tile flip years-flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        onclick: toggle,
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "Aktive Jahre"),
        h("div", { class: "info-value" }, fmtInt(activeYears))
      );

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Erster Wettkampf"),
        h("div", { class: "info-value" }, fmtDate(firstISO)),
        firstName ? h("div", { class: "info-sub" }, firstName) : null
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      function toggle() {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      }
      return tile;
    }

    function infoTileMetersFlip(label, totalMeters, totalMeets) {
      const avg = totalMeets ? Math.round(totalMeters / totalMeets) : null;

      const tile = h("div", {
        class: "info-tile flip meters",
        role: "button", tabindex: "0", "aria-pressed": "false"
      });
      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, label),
        h("div", { class: "info-value" }, fmtMeters(totalMeters))
      );

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "⌀ Meter / Wettkampf"),
        h("div", { class: "info-value" }, avg != null ? fmtMeters(avg) : "—")
      );

      inner.append(front, back);
      tile.appendChild(inner);

      const toggle = () => {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      };
      if ("onpointerdown" in window) tile.addEventListener("pointerdown", toggle);
      else { tile.addEventListener("click", toggle); tile.addEventListener("touchstart", toggle, { passive: true }); }
      tile.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });

      return tile;
    }

    function infoTileDQFlip(totalDQ, dqLane) {
      const tile = h("div", {
        class: "info-tile flip dq-flip",
        role: "button",
        tabindex: "0",
        "aria-pressed": "false",
        onclick: toggle,
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }
      });

      const inner = h("div", { class: "tile-inner" });

      const front = h("div", { class: "tile-face tile-front" },
        h("div", { class: "info-label" }, "DQ / Strafen"),
        h("div", { class: "info-value" }, fmtInt(totalDQ))
      );

      const rows = [];
      if (dqLane["25"].starts > 0) {
        rows.push(
          h("div", { class: "dq-row" },
            h("span", { class: "lane" }, "25m"),
            h("span", { class: "pct" }, `${dqLane["25"].pct.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`),
            h("span", { class: "meta" }, `(${dqLane["25"].dq})`)
          )
        );
      }
      if (dqLane["50"].starts > 0) {
        rows.push(
          h("div", { class: "dq-row" },
            h("span", { class: "lane" }, "50m"),
            h("span", { class: "pct" }, `${dqLane["50"].pct.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`),
            h("span", { class: "meta" }, `(${dqLane["50"].dq})`)
          )
        );
      }

      const back = h("div", { class: "tile-face tile-back" },
        h("div", { class: "info-label" }, "Wahrscheinlichkeit"),
        h("div", { class: "dq-rows" }, ...rows)
      );

      inner.appendChild(front);
      inner.appendChild(back);
      tile.appendChild(inner);

      function toggle() {
        const locked = tile.classList.toggle("is-flipped");
        tile.setAttribute("aria-pressed", locked ? "true" : "false");
      }
      return tile;
    }
  }

  function renderAthTabs(labels, activeLabel, onChange) {
    const map = { "Bestzeiten": "bests", "Info": "info", "Wettkämpfe": "meets" };
    const bar = h("div", { class: "ath-tabs full-bleed" });
    const list = h("div", { class: "ath-tabs-list" });
    const ul = h("div", { class: "ath-tabs-underline" });

    let activeBtn = null;

    labels.forEach(lbl => {
      const key = map[lbl] || lbl.toLowerCase();
      const btn = h("button", {
        class: "ath-tab" + (lbl === activeLabel ? " active" : ""),
        type: "button",
        onclick: () => setActive(btn, key)
      }, lbl.toUpperCase());
      list.appendChild(btn);
      if (lbl === activeLabel) activeBtn = btn;
    });

    bar.appendChild(list);
    bar.appendChild(ul);

    function positionUnderline(btn) {
      const r = btn.getBoundingClientRect();
      const p = list.getBoundingClientRect();
      ul.style.width = r.width + "px";
      ul.style.left = (r.left - p.left) + "px";
    }
    function setActive(btn, key) {
      list.querySelectorAll(".ath-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      positionUnderline(btn);
      onChange?.(key);
    }

    requestAnimationFrame(() => activeBtn && positionUnderline(activeBtn));
    window.addEventListener("resize", () => {
      const cur = list.querySelector(".ath-tab.active");
      cur && positionUnderline(cur);
    });

    return bar;
  }

  function renderAthTabsAndPanels(ax, refs) {
    const panels = h("div", { class: "ath-tab-panels" },
      h("div", { class: "ath-tab-panel", "data-key": "bests" }, renderBestzeitenSection(ax, refs)),
      h("div", { class: "ath-tab-panel", "data-key": "info" }, renderOverviewSection(ax)),
      h("div", { class: "ath-tab-panel", "data-key": "meets" }, renderMeetsSection(ax))
    );

    const tabs = renderAthTabs(["Bestzeiten", "Info", "Wettkämpfe"], "Bestzeiten", (key) => {
      panels.querySelectorAll(".ath-tab-panel").forEach(p => {
        p.classList.toggle("active", p.dataset.key === key);
      });
    });

    const wrap = h("div", { class: "ath-tabs-wrap" }, tabs, panels);

    requestAnimationFrame(() => {
      panels.querySelectorAll(".ath-tab-panel").forEach(p =>
        p.classList.toggle("active", p.dataset.key === "bests")
      );
      const activeBtn = wrap.querySelector(".ath-tab.active") || wrap.querySelector(".ath-tab");
      if (activeBtn) {
        const ul = wrap.querySelector(".ath-tabs-underline");
        const lst = wrap.querySelector(".ath-tabs-list");
        const pr = lst.getBoundingClientRect();
        const tr = activeBtn.getBoundingClientRect();
        ul.style.width = tr.width + "px";
        ul.style.left = (tr.left - pr.left) + "px";
      }
    });

    return wrap;
  }

  ProfileTabs.renderAthTabsAndPanels = renderAthTabsAndPanels;

  ProfileTabs.createAthTabsWrap = (ax) => {
    const refs = { bestGrid: null, bestBtn50: null, bestBtn25: null };
    const el = renderAthTabsAndPanels(ax, refs);
    return el;
  };

  ProfileTabs.hydrateAthleteForTabs = (a) => {
    if (!a) return a;
    if (!Array.isArray(a.meets) || a.meets.length === 0) {
      const list = AllMeetsByAthleteId.get(a.id) || [];
      a = { ...a, meets: list };
    }
    const mergedMeets = mergeDuplicateMeets(a.meets);
    const derived = deriveFromMeets({ ...a, meets: mergedMeets });
    return { ...a, ...derived, meets: mergedMeets };
  };

  global.ProfileTabs = ProfileTabs;
})(window);
