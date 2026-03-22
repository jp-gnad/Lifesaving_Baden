(function () {
  const DEFAULT_TOP10_URL = "./data/top10.json";
  const REMOTE_TOP10_URL =
    "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/data/top10.json";
  const LEGACY_TOP10_URL =
    "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/top10.json";
  const KNOWN_CAP_KEYS = new Set([
    "AUS", "BA", "Baden", "Baden_light", "BB", "BE", "BEL", "Bietigheim-Bissingen", "BRA", "BUL", "BY",
    "CAN", "CZE", "DEN", "Deutschland", "Durlach", "EGY", "ESP", "Ettlingen", "FRA", "GBR", "GER", "HE",
    "HH", "HKG", "ITA", "JPN", "Karlsruhe", "Luckenwalde", "Malsch", "MV", "NED", "NI", "Nieder-Olm/Wörrstadt",
    "none", "NOR", "NR", "NZL", "Pankow", "POL", "RP", "SH", "SIN", "SL", "SN", "ST", "SUI", "SWE", "TH",
    "USA", "Wadgassen", "Waghäusel", "Weil am Rhein", "Wettersbach", "WF", "WÜ"
  ]);

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
      "Es werden nur badische Athleten berücksichtigt. Gezählt werden 50m Retten, 100m Retten mit Flossen, 100m Kombi, 100m Lifesaver, 200m Super Lifesaver und 200m Hindernis.",
    wettkaempfe:
      "Es werden nur badische Athleten berücksichtigt. Gezählt werden eindeutige Wettkämpfe pro Person.",
    lsc_aktuell:
      "Es werden nur badische Athleten berücksichtigt. Gewertet wird der jeweils aktuellste berechnete LSC der letzten 2 Jahre relativ zum jüngsten Wettkampfdatum in der Datenbank.",
    lsc_junioren_aktuell:
      "Es werden nur badische Junioren berücksichtigt (jahrgangsbasiert < 19 Jahre). Gewertet wird der jeweils aktuellste berechnete LSC der letzten 2 Jahre relativ zu heute.",
    aktive_jahre:
      "Es werden nur badische Athleten berücksichtigt. Gezählt werden die Jahre, in denen eine Person in den Daten aufgetaucht ist.",
    hoechster_lsc:
      "In dieser Auswertung werden nur LifesavingScore-Werte ab dem Jahr 2001 berücksichtigt.",
    auslandswettkaempfe:
      "Es werden nur badische Athleten berücksichtigt. Gezählt werden eindeutige Wettkämpfe außerhalb von GER."
  };

  const FLAG_BASE_URL = "./assets/svg";
  const CAP_FALLBACK_FILE = "Cap-BA.svg";
  const CAP_FALLBACK_URL = `${FLAG_BASE_URL}/${encodeURIComponent(CAP_FALLBACK_FILE)}`;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const DISCIPLINE_TIME_KEYS = [
    "100m_Lifesaver_Zeit",
    "50m_Retten_Zeit",
    "200m_SuperLifesaver_Zeit",
    "100m_Kombi_Zeit",
    "100m_Retten_Zeit",
    "200m_Hindernis_Zeit"
  ];

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
    openByName: null,
    liveAthletesPromise: null,
    liveCalcId: 0
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

  function capFileFromOrtsgruppe(rawOG) {
    const og = String(rawOG || "").trim();
    if (!og) return CAP_FALLBACK_FILE;
    if (og === "Nieder-Olm/Wörrstadt") return "Cap-Nieder-OlmWörrstadt.svg";
    if (!KNOWN_CAP_KEYS.has(og)) return CAP_FALLBACK_FILE;
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

  function getTop10UrlCandidates() {
    const customUrl = String(State.top10Url || "").trim();
    if (customUrl && customUrl !== DEFAULT_TOP10_URL) {
      return [customUrl];
    }

    if (window.ExcelLoader && typeof window.ExcelLoader.getUrlCandidates === "function") {
      const candidates = window.ExcelLoader.getUrlCandidates("top10Data");
      if (candidates.length) return candidates;
    }

    if (window.location.protocol === "file:") {
      return [LEGACY_TOP10_URL, REMOTE_TOP10_URL];
    }

    return [DEFAULT_TOP10_URL, REMOTE_TOP10_URL, LEGACY_TOP10_URL];
  }

  async function loadTop10Json() {
    const candidates = getTop10UrlCandidates();

    if (window.ExcelLoader && typeof window.ExcelLoader.fetchFirstAvailable === "function") {
      const { response, url } = await window.ExcelLoader.fetchFirstAvailable(candidates);
      State.top10Url = url;
      return response.json();
    }

    let lastError = null;
    for (const candidate of candidates) {
      try {
        const resp = await fetch(encodeURI(candidate), /^https?:\/\//i.test(candidate) ? { mode: "cors" } : {});
        if (!resp.ok) throw new Error(`Top10 HTTP ${resp.status}`);
        State.top10Url = candidate;
        return resp.json();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Top10 konnte nicht geladen werden.");
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

  function formatLscValue(value) {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function normalizeKey(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function ensureLscRuntime() {
    if (!window.ProfileLSC || typeof window.ProfileLSC.calculateCurrentLsc !== "function") {
      throw new Error("ProfileLSC fehlt für die Live-LSC-Berechnung.");
    }

    const internals = window.ProfileTabsInternals || (window.ProfileTabsInternals = {});
    if (Array.isArray(internals.DISCIPLINES) && internals.DISCIPLINES.length) {
      return;
    }

    internals.DISCIPLINES = [
      { key: "50_retten", label: "50m Retten", meetZeit: "50m_Retten_Zeit", meetPlatz: "50m_Retten_Platz" },
      { key: "100_retten_flosse", label: "100m Retten mit Flossen", meetZeit: "100m_Retten_Zeit", meetPlatz: "100m_Retten_Platz" },
      { key: "100_kombi", label: "100m Kombi", meetZeit: "100m_Kombi_Zeit", meetPlatz: "100m_Kombi_Platz" },
      { key: "100_lifesaver", label: "100m Lifesaver", meetZeit: "100m_Lifesaver_Zeit", meetPlatz: "100m_Lifesaver_Platz" },
      { key: "200_super", label: "200m Super Lifesaver", meetZeit: "200m_SuperLifesaver_Zeit", meetPlatz: "200m_SuperLifesaver_Platz" },
      { key: "200_hindernis", label: "200m Hindernis", meetZeit: "200m_Hindernis_Zeit", meetPlatz: "200m_Hindernis_Platz" }
    ];
  }

  async function getLiveAthletesWithMeets() {
    if (!window.AthDataSmall || typeof window.AthDataSmall.loadAthletesWithMeets !== "function") {
      throw new Error("AthDataSmall fehlt für die Live-LSC-Berechnung.");
    }

    if (!State.liveAthletesPromise) {
      State.liveAthletesPromise = window.AthDataSmall.loadAthletesWithMeets({ sheetName: "Tabelle2" });
    }

    try {
      return await State.liveAthletesPromise;
    } catch (error) {
      State.liveAthletesPromise = null;
      throw error;
    }
  }

  function dateIsoToMs(dateIso) {
    const ms = new Date(String(dateIso || "").slice(0, 10)).getTime();
    return Number.isFinite(ms) ? ms : NaN;
  }

  function getDataMaxDateMs(athletes) {
    let maxMs = NaN;
    const list = Array.isArray(athletes) ? athletes : [];

    for (let i = 0; i < list.length; i++) {
      const meets = Array.isArray(list[i]?.meets) ? list[i].meets : [];
      for (let j = 0; j < meets.length; j++) {
        const ms = dateIsoToMs(meets[j]?.date);
        if (!Number.isFinite(ms)) continue;
        if (!Number.isFinite(maxMs) || ms > maxMs) {
          maxMs = ms;
        }
      }
    }

    return maxMs;
  }

  function getLastNationalMeet(athlete) {
    const meets = Array.isArray(athlete?.meets) ? athlete.meets : [];

    for (let i = meets.length - 1; i >= 0; i--) {
      const meet = meets[i];
      if (String(meet?.Regelwerk || "").trim().toLowerCase() === "national") {
        return meet;
      }
    }

    return null;
  }

  function isBaAthlete(athlete) {
    const latestNationalMeet = getLastNationalMeet(athlete);
    return latestNationalMeet
      ? String(latestNationalMeet?.LV_state || "").trim().toUpperCase() === "BA"
      : false;
  }

  function isJuniorAthlete(athlete, currentYear) {
    const birthYear = Number(athlete?.jahrgang);
    return Number.isFinite(birthYear) && (currentYear - birthYear) < 19;
  }

  function buildTodayCutoffMs() {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setFullYear(cutoff.getFullYear() - 2);
    return cutoff.getTime();
  }

  function pickLatestEligibleHistoryEntry(history, cutoffMs) {
    const entries = Array.isArray(history) ? history : [];

    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      const ms = dateIsoToMs(entry?.date);
      if (!Number.isFinite(ms)) continue;
      if (Number.isFinite(cutoffMs) && ms < cutoffMs) break;
      if (Number(entry?.calculatedLsc) > 0) {
        return entry;
      }
    }

    return null;
  }

  function pushLiveEntry(target, athlete, entry, og) {
    if (!entry || !(Number(entry?.calculatedLsc) > 0)) return;

    target.push({
      name: String(athlete?.name || "").trim(),
      og: String(og || athlete?.ortsgruppe || entry?.run?.Ortsgruppe || "").trim(),
      valueRaw: Number(entry.calculatedLsc),
      value: formatLscValue(entry.calculatedLsc)
    });
  }

  function pushCountEntry(target, athlete, og, value) {
    const numericValue = Number(value);
    if (!(numericValue > 0)) return;

    target.push({
      name: String(athlete?.name || "").trim(),
      og: String(og || athlete?.ortsgruppe || "").trim(),
      valueRaw: numericValue,
      value: String(numericValue)
    });
  }

  function countStarts(meets) {
    let count = 0;
    const list = Array.isArray(meets) ? meets : [];

    for (let i = 0; i < list.length; i++) {
      const meet = list[i];
      for (let j = 0; j < DISCIPLINE_TIME_KEYS.length; j++) {
        if (String(meet?.[DISCIPLINE_TIME_KEYS[j]] || "").trim()) {
          count += 1;
        }
      }
    }

    return count;
  }

  function countUniqueCompetitions(meets, predicate = null) {
    const seen = new Set();
    const list = Array.isArray(meets) ? meets : [];

    for (let i = 0; i < list.length; i++) {
      const meet = list[i];
      if (typeof predicate === "function" && !predicate(meet)) continue;

      const key = normalizeKey(meet?.meet_name);
      if (!key) continue;
      seen.add(key);
    }

    return seen.size;
  }

  function countActiveYears(meets) {
    const years = new Set();
    const list = Array.isArray(meets) ? meets : [];

    for (let i = 0; i < list.length; i++) {
      const year = Number(String(list[i]?.date || "").slice(0, 4));
      if (Number.isFinite(year) && year > 0) {
        years.add(year);
      }
    }

    return years.size;
  }

  function isForeignMeet(meet) {
    const country = String(meet?.Land || "").trim().toUpperCase();
    return !!country && country !== "GER";
  }

  async function collectLiveGroupEntries() {
    ensureLscRuntime();

    const athletes = await getLiveAthletesWithMeets();
    const currentYear = new Date().getFullYear();
    const maxDataMs = getDataMaxDateMs(athletes);
    const currentCutoffMs = Number.isFinite(maxDataMs) ? maxDataMs - (731 * DAY_MS) : NaN;
    const juniorCutoffMs = buildTodayCutoffMs();
    const startsEntries = [];
    const competitionEntries = [];
    const activeYearEntries = [];
    const foreignEntries = [];
    const currentEntries = [];
    const juniorEntries = [];

    for (let i = 0; i < athletes.length; i++) {
      const athlete = athletes[i];
      if (!isBaAthlete(athlete)) continue;
      const latestNationalMeet = getLastNationalMeet(athlete);
      const displayOg = latestNationalMeet?.Ortsgruppe || athlete?.ortsgruppe;
      const meets = Array.isArray(athlete?.meets) ? athlete.meets : [];

      pushCountEntry(startsEntries, athlete, displayOg, countStarts(meets));
      pushCountEntry(competitionEntries, athlete, displayOg, countUniqueCompetitions(meets));
      pushCountEntry(activeYearEntries, athlete, displayOg, countActiveYears(meets));
      pushCountEntry(foreignEntries, athlete, displayOg, countUniqueCompetitions(meets, isForeignMeet));

      try {
        const history = await window.ProfileLSC.calculateHistorySeries(athlete);
        const currentEntry = pickLatestEligibleHistoryEntry(history, currentCutoffMs);

        if (currentEntry) {
          pushLiveEntry(
            currentEntries,
            athlete,
            currentEntry,
            displayOg
          );
        }

        if (isJuniorAthlete(athlete, currentYear)) {
          const juniorEntry = pickLatestEligibleHistoryEntry(history, juniorCutoffMs);
          if (juniorEntry) {
            pushLiveEntry(
              juniorEntries,
              athlete,
              juniorEntry,
              juniorEntry?.run?.Ortsgruppe || athlete?.ortsgruppe
            );
          }
        }
      } catch (error) {
        console.error("Live-LSC für Athlet fehlgeschlagen:", athlete?.name || athlete?.id || "unbekannt", error);
      }

      if ((i + 1) % 12 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const byScoreDesc = (l, r) => {
      if (r.valueRaw !== l.valueRaw) return r.valueRaw - l.valueRaw;
      return l.name.localeCompare(r.name, "de");
    };

    startsEntries.sort(byScoreDesc);
    competitionEntries.sort(byScoreDesc);
    activeYearEntries.sort(byScoreDesc);
    foreignEntries.sort(byScoreDesc);
    currentEntries.sort(byScoreDesc);
    juniorEntries.sort(byScoreDesc);

    return {
      startsEntries,
      competitionEntries,
      activeYearEntries,
      foreignEntries,
      currentEntries,
      juniorEntries
    };
  }

  function getThresholdValue(entries, limit = 10) {
    const rows = Array.isArray(entries) ? entries : [];
    if (!rows.length) return null;
    const safeIndex = Math.min(limit, rows.length) - 1;
    return safeIndex >= 0 ? Number(rows[safeIndex]?.valueRaw) : null;
  }

  function buildLiveRows(entries) {
    const threshold = getThresholdValue(entries, 10);
    if (!(threshold > 0)) return [];

    return entries
      .filter((entry) => Number(entry?.valueRaw) >= threshold)
      .map((entry, index) => ({
        rank: index + 1,
        name: entry.name,
        og: entry.og,
        value: entry.value
      }));
  }

  function buildLiveGroup(key, entries) {
    return {
      key,
      label: TOP10_GROUPS.find((group) => group.key === key)?.label || key,
      valueLabel: GROUP_VALUE_LABEL[key] || "Wert",
      note: GROUP_NOTES[key] || "",
      rows: applyCompetitionRanks(buildLiveRows(entries))
    };
  }

  async function hydrateLiveTop10Groups() {
    const requestId = ++State.liveCalcId;
    const {
      startsEntries,
      competitionEntries,
      activeYearEntries,
      foreignEntries,
      currentEntries,
      juniorEntries
    } = await collectLiveGroupEntries();
    if (requestId !== State.liveCalcId || !State.groups) return;

    State.groups = {
      ...State.groups,
      starts: buildLiveGroup("starts", startsEntries),
      wettkaempfe: buildLiveGroup("wettkaempfe", competitionEntries),
      lsc_aktuell: buildLiveGroup("lsc_aktuell", currentEntries),
      lsc_junioren_aktuell: buildLiveGroup("lsc_junioren_aktuell", juniorEntries),
      aktive_jahre: buildLiveGroup("aktive_jahre", activeYearEntries),
      auslandswettkaempfe: buildLiveGroup("auslandswettkaempfe", foreignEntries)
    };

    renderTop10();
  }

  function setFallbackTransparency(imgEl, wrapperEl, isFallback) {
    if (!imgEl) return;
    imgEl.classList.toggle("is-fallback", !!isFallback);
    wrapperEl?.classList.toggle("is-fallback", !!isFallback);
  }

  function setCapWithCache(imgEl, capFile, wrapperEl) {
    imgEl.src = CAP_FALLBACK_URL;
    setFallbackTransparency(imgEl, wrapperEl, true);

    const file = String(capFile || "").trim();
    if (!file || file === CAP_FALLBACK_FILE) {
      return;
    }

    probeCapFileExists(file).then((ok) => {
      if (!ok) return;

      imgEl.src = `${FLAG_BASE_URL}/${encodeURIComponent(file)}`;
      setFallbackTransparency(imgEl, wrapperEl, false);
    });
  }

  function renderCap(rawOG, size = "md") {
    const og = String(rawOG || "").trim();

    const wrapper = h("span", {
      class: `ath10-cap ath10-cap--${size}`,
      "aria-hidden": "true"
    });

    const img = h("img", {
      class: "ath10-cap-img",
      alt: og ? `Vereinskappe ${formatOrtsgruppe(og)}` : "Vereinskappe Baden",
      loading: "lazy",
      decoding: "async"
    });

    wrapper.appendChild(img);
    setCapWithCache(img, capFileFromOrtsgruppe(og), wrapper);

    return wrapper;
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
      hydrateLiveTop10Groups().catch((error) => {
        console.error("Live-Top10 konnten nicht berechnet werden:", error);
      });
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
    State.liveCalcId += 1;

    el.innerHTML = '<div class="ath10-status ath10-status--loading">Top-10 wird geladen …</div>';
    init();
  }

  window.AthTop10 = { mount: mountComponent };
})();
