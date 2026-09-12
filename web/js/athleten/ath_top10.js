(function () {
  const DEFAULT_TOP10_URL = "./data/top10.json";
  const REMOTE_TOP10_URL =
    "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/data/top10.json";
  const LEGACY_TOP10_URL =
    "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/top10.json";
  const MODE_GROUPS = {
    overall: [
      { key: "starts", label: "Starts" },
      { key: "wettkaempfe", label: "Wettkämpfe" },
      { key: "lsc", label: "LSC" },
      { key: "lsc_junioren", label: "LSC U19" },
      { key: "auslandswettkaempfe", label: "Auslandswettkämpfe" },
      { key: "aktive_jahre", label: "Aktive Jahre" }
    ],
    current: [
      { key: "starts", label: "Starts" },
      { key: "wettkaempfe", label: "Wettkämpfe" },
      { key: "lsc", label: "LSC" },
      { key: "lsc_junioren", label: "LSC U19" },
      { key: "auslandswettkaempfe", label: "Auslandswettkämpfe" }
    ]
  };

  const JSON_GROUP_MAP = {
    lsc: "lscAlltimeHigh",
    lsc_junioren: "lscU19AlltimeHigh"
  };

  const GROUP_VALUE_LABEL = {
    starts: "Starts",
    wettkaempfe: "Wettkämpfe",
    lsc: "LSC",
    lsc_junioren: "LSC",
    aktive_jahre: "Jahre",
    auslandswettkaempfe: "Wettkämpfe"
  };

  const STORAGE_KEY = "lifesaving-baden:athleten-top10-preferences";
  const STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
    groups: { overall: {}, current: {} },
    mode: "overall",
    metric: "count",
    currentKey: "starts",
    top10Url: DEFAULT_TOP10_URL,
    openByName: null,
    liveAthletesPromise: null,
    currentLscPromise: null,
    dataMaxMs: NaN,
    currentCutoffMs: NaN,
    liveCalcId: 0
  };

  const CapProbe = new Map();

  function readPreferences() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!Number.isFinite(Number(saved?.ts)) || Date.now() - Number(saved.ts) > STORAGE_TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return saved;
    } catch (_) {
      return null;
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ts: Date.now(),
        mode: State.mode,
        metric: State.metric
      }));
    } catch (_) {
      // Die Rangliste funktioniert auch ohne verfügbaren Browser-Speicher.
    }
  }

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

  function capFilesFromOrtsgruppe(rawOG) {
    const og = String(rawOG || "").trim();
    if (!og) return [];

    const keys = [og.replace(/[\/\\]/g, "-"), og.replace(/[\/\\]/g, "")];
    // Existence is checked by probeCapFileExists; no static asset list needed.
    return [...new Set(keys.filter(Boolean))].map((key) => `Cap-${key}.svg`);
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
        const resp = await fetch(normalizeUrl(candidate), /^https?:\/\//i.test(candidate) ? { mode: "cors" } : {});
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

    for (const def of MODE_GROUPS.overall.filter((group) => JSON_GROUP_MAP[group.key])) {
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
          value: formatLscValue(it.value)
        }));

      const rows = applyCompetitionRanks(sorted);

      out[def.key] = {
        key: def.key,
        label: def.label,
        valueLabel: GROUP_VALUE_LABEL[def.key] || "Wert",
        status: rows.length ? "ready" : "empty",
        rows,
        source: "json"
      };
    }

    return out;
  }

  function normalizeUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";

    try {
      return encodeURI(decodeURI(raw));
    } catch (_) {
      return encodeURI(raw);
    }
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
    const canCalculateLatest = typeof window.ProfileLSC?.calculateLatestLscSince === "function";
    const canCalculateHistory = typeof window.ProfileLSC?.calculateHistorySeries === "function";
    if (!canCalculateLatest && !canCalculateHistory) {
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

  function pushLscEntry(target, athlete, entry, og) {
    if (!entry || !(Number(entry?.calculatedLsc) > 0)) return;

    target.push({
      name: String(athlete?.name || "").trim(),
      og: String(og || athlete?.ortsgruppe || entry?.run?.Ortsgruppe || "").trim(),
      valueRaw: Number(entry.calculatedLsc),
      value: formatLscValue(entry.calculatedLsc)
    });
  }

  function isForeignMeet(meet) {
    const country = String(meet?.Land || "").trim().toUpperCase();
    return !!country && country !== "GER";
  }

  function countStartsAtMeet(meet) {
    let count = 0;
    for (let i = 0; i < DISCIPLINE_TIME_KEYS.length; i++) {
      if (String(meet?.[DISCIPLINE_TIME_KEYS[i]] || "").trim()) count += 1;
    }
    return count;
  }

  function competitionKey(meet) {
    const name = normalizeKey(meet?.meet_name);
    if (!name) return "";
    const date = String(meet?.date || "").slice(0, 10);
    return `${name}|${date}`;
  }

  function isMeetInCurrentWindow(meet) {
    const ms = dateIsoToMs(meet?.date);
    return Number.isFinite(ms) &&
      Number.isFinite(State.currentCutoffMs) &&
      Number.isFinite(State.dataMaxMs) &&
      ms >= State.currentCutoffMs &&
      ms <= State.dataMaxMs;
  }

  function pushCountMetrics(target, athlete, og, countValue, averageValue = null) {
    const countRaw = Number(countValue);
    const averageRaw = Number(averageValue);
    if (!(countRaw > 0)) return;
    target.push({
      name: String(athlete?.name || "").trim(),
      og: String(og || athlete?.ortsgruppe || "").trim(),
      countRaw,
      averageRaw: Number.isFinite(averageRaw) && averageRaw > 0 ? averageRaw : null
    });
  }

  function createComputedGroup(key, entries, supportsAverage = false) {
    return {
      key,
      label: MODE_GROUPS.overall.find((group) => group.key === key)?.label || key,
      valueLabel: GROUP_VALUE_LABEL[key] || "Wert",
      status: entries.length ? "ready" : "empty",
      entries,
      supportsAverage,
      source: "excel"
    };
  }

  function collectCountGroups(athletes) {
    State.dataMaxMs = getDataMaxDateMs(athletes);
    State.currentCutoffMs = Number.isFinite(State.dataMaxMs)
      ? State.dataMaxMs - (731 * DAY_MS)
      : NaN;

    const overall = { starts: [], wettkaempfe: [], auslandswettkaempfe: [], aktive_jahre: [] };
    const current = { starts: [], wettkaempfe: [], auslandswettkaempfe: [] };

    for (let i = 0; i < athletes.length; i++) {
      const athlete = athletes[i];
      if (!isBaAthlete(athlete)) continue;

      const latestNationalMeet = getLastNationalMeet(athlete);
      const displayOg = latestNationalMeet?.Ortsgruppe || athlete?.ortsgruppe;
      const meets = Array.isArray(athlete?.meets) ? athlete.meets : [];
      const activeYears = new Set();
      const overallCompetitions = new Set();
      const overallForeignCompetitions = new Set();
      const currentCompetitions = new Set();
      const currentForeignCompetitions = new Set();
      let overallStarts = 0;
      let currentStarts = 0;

      for (let j = 0; j < meets.length; j++) {
        const meet = meets[j];
        const meetStarts = countStartsAtMeet(meet);
        const key = competitionKey(meet);
        const year = Number(String(meet?.date || "").slice(0, 4));
        const isCurrent = isMeetInCurrentWindow(meet);

        overallStarts += meetStarts;
        if (key) overallCompetitions.add(key);
        if (key && isForeignMeet(meet)) overallForeignCompetitions.add(key);
        if (Number.isFinite(year) && year > 0) activeYears.add(year);

        if (isCurrent) {
          currentStarts += meetStarts;
          if (key) currentCompetitions.add(key);
          if (key && isForeignMeet(meet)) currentForeignCompetitions.add(key);
        }
      }

      const activeYearCount = activeYears.size;
      pushCountMetrics(overall.starts, athlete, displayOg, overallStarts, activeYearCount ? overallStarts / activeYearCount : null);
      pushCountMetrics(
        overall.wettkaempfe,
        athlete,
        displayOg,
        overallCompetitions.size,
        activeYearCount ? overallCompetitions.size / activeYearCount : null
      );
      pushCountMetrics(overall.auslandswettkaempfe, athlete, displayOg, overallForeignCompetitions.size);
      pushCountMetrics(overall.aktive_jahre, athlete, displayOg, activeYearCount);

      pushCountMetrics(current.starts, athlete, displayOg, currentStarts, currentStarts / 2);
      pushCountMetrics(current.wettkaempfe, athlete, displayOg, currentCompetitions.size, currentCompetitions.size / 2);
      pushCountMetrics(current.auslandswettkaempfe, athlete, displayOg, currentForeignCompetitions.size);
    }

    return {
      overall: {
        starts: createComputedGroup("starts", overall.starts, true),
        wettkaempfe: createComputedGroup("wettkaempfe", overall.wettkaempfe, true),
        auslandswettkaempfe: createComputedGroup("auslandswettkaempfe", overall.auslandswettkaempfe),
        aktive_jahre: createComputedGroup("aktive_jahre", overall.aktive_jahre)
      },
      current: {
        starts: createComputedGroup("starts", current.starts, true),
        wettkaempfe: createComputedGroup("wettkaempfe", current.wettkaempfe, true),
        auslandswettkaempfe: createComputedGroup("auslandswettkaempfe", current.auslandswettkaempfe),
        lsc: { key: "lsc", label: "LSC", status: "idle", rows: [], source: "excel" },
        lsc_junioren: { key: "lsc_junioren", label: "LSC U19", status: "idle", rows: [], source: "excel" }
      }
    };
  }

  function formatAverageValue(value) {
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  }

  function buildRankedRows(entries, valueKey, formatter) {
    const sorted = (Array.isArray(entries) ? entries : [])
      .filter((entry) => Number(entry?.[valueKey]) > 0)
      .slice()
      .sort((left, right) => {
        const diff = Number(right?.[valueKey]) - Number(left?.[valueKey]);
        return diff || String(left?.name || "").localeCompare(String(right?.name || ""), "de");
      });
    if (!sorted.length) return [];

    const thresholdIndex = Math.min(10, sorted.length) - 1;
    const threshold = Number(sorted[thresholdIndex]?.[valueKey]);
    const rows = sorted
      .filter((entry) => Number(entry?.[valueKey]) >= threshold)
      .map((entry, index) => ({
        rank: index + 1,
        name: entry.name,
        og: entry.og,
        value: formatter(Number(entry[valueKey]))
      }));
    return applyCompetitionRanks(rows);
  }

  function buildDisplayGroup(group) {
    if (!group) return null;
    if (!Array.isArray(group.entries)) return group;

    const useAverage = State.mode === "overall" && group.supportsAverage && State.metric === "average";
    const rows = buildRankedRows(
      group.entries,
      useAverage ? "averageRaw" : "countRaw",
      useAverage ? formatAverageValue : (value) => String(value)
    );
    return {
      ...group,
      rows,
      status: rows.length ? "ready" : "empty",
      valueLabel: useAverage ? "Ø pro Jahr" : (GROUP_VALUE_LABEL[group.key] || "Wert")
    };
  }

  function buildLscGroup(key, entries) {
    const rows = buildRankedRows(entries, "valueRaw", formatLscValue);
    return {
      key,
      label: key === "lsc_junioren" ? "LSC U19" : "LSC",
      valueLabel: "LSC",
      status: rows.length ? "ready" : "empty",
      rows,
      source: "excel"
    };
  }

  async function collectCurrentLscGroups(athletes) {
    ensureLscRuntime();
    const currentYear = new Date().getFullYear();
    const currentEntries = [];
    const juniorEntries = [];

    for (let i = 0; i < athletes.length; i++) {
      const athlete = athletes[i];
      if (!isBaAthlete(athlete)) continue;
      const latestNationalMeet = getLastNationalMeet(athlete);
      const displayOg = latestNationalMeet?.Ortsgruppe || athlete?.ortsgruppe;

      try {
        const latestEntry = typeof window.ProfileLSC.calculateLatestLscSince === "function"
          ? await window.ProfileLSC.calculateLatestLscSince(athlete, State.currentCutoffMs)
          : pickLatestEligibleHistoryEntry(
              await window.ProfileLSC.calculateHistorySeries(athlete),
              State.currentCutoffMs
            );
        if (latestEntry) pushLscEntry(currentEntries, athlete, latestEntry, displayOg);
        if (latestEntry && isJuniorAthlete(athlete, currentYear)) {
          pushLscEntry(
            juniorEntries,
            athlete,
            latestEntry,
            latestEntry?.run?.Ortsgruppe || displayOg
          );
        }
      } catch (error) {
        console.error("Live-LSC für Athlet fehlgeschlagen:", athlete?.name || athlete?.id || "unbekannt", error);
      }

      if ((i + 1) % 12 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return {
      lsc: buildLscGroup("lsc", currentEntries),
      lsc_junioren: buildLscGroup("lsc_junioren", juniorEntries)
    };
  }

  function ensureCurrentLscGroups() {
    if (State.currentLscPromise) return State.currentLscPromise;
    const lscGroup = State.groups.current?.lsc;
    if (lscGroup?.status === "ready" || lscGroup?.status === "empty") return Promise.resolve();

    const requestId = State.liveCalcId;
    State.groups.current.lsc = { ...lscGroup, status: "loading" };
    State.groups.current.lsc_junioren = { ...State.groups.current.lsc_junioren, status: "loading" };
    renderTop10();

    State.currentLscPromise = getLiveAthletesWithMeets()
      .then((athletes) => collectCurrentLscGroups(athletes))
      .then((groups) => {
        if (requestId !== State.liveCalcId) return;
        State.groups.current = { ...State.groups.current, ...groups };
      })
      .catch((error) => {
        console.error("Live-Top-10 konnten nicht berechnet werden:", error);
        if (requestId !== State.liveCalcId) return;
        State.groups.current.lsc = { ...State.groups.current.lsc, status: "error" };
        State.groups.current.lsc_junioren = { ...State.groups.current.lsc_junioren, status: "error" };
      })
      .finally(() => {
        if (requestId === State.liveCalcId) renderTop10();
      });

    return State.currentLscPromise;
  }

  function setFallbackTransparency(imgEl, wrapperEl, isFallback) {
    if (!imgEl) return;
    imgEl.classList.toggle("is-fallback", !!isFallback);
    wrapperEl?.classList.toggle("is-fallback", !!isFallback);
  }

  function setCapWithCache(imgEl, capFiles, wrapperEl) {
    imgEl.src = CAP_FALLBACK_URL;
    setFallbackTransparency(imgEl, wrapperEl, true);

    const files = (Array.isArray(capFiles) ? capFiles : [capFiles])
      .map((file) => String(file || "").trim())
      .filter((file) => file && file !== CAP_FALLBACK_FILE);
    if (!files.length) return;

    (async () => {
      for (const file of files) {
        const ok = await probeCapFileExists(file);
        if (!ok) continue;

        imgEl.src = `${FLAG_BASE_URL}/${encodeURIComponent(file)}`;
        setFallbackTransparency(imgEl, wrapperEl, false);
        return;
      }
    })();
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
    setCapWithCache(img, capFilesFromOrtsgruppe(og), wrapper);

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
      maybeLoadSelectedLsc();
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
              maybeLoadSelectedLsc();
            }
          },
          g.label
        )
      )
    );

    return h("div", { class: "ath10-toolbar" }, tabs);
  }

  function renderSegmentedSwitch({ label, options, value, onChange, className = "" }) {
    return h(
      "div",
      { class: `ath10-switch-wrap ${className}`.trim() },
      h("span", { class: "ath10-switch-label" }, label),
      h(
        "div",
        { class: "ath10-switch", role: "group", "aria-label": label },
        options.map((option) => h(
          "button",
          {
            class: `ath10-switch-option${option.value === value ? " is-active" : ""}`,
            type: "button",
            "aria-pressed": option.value === value ? "true" : "false",
            onclick: () => {
              if (option.value === value) return;
              onChange(option.value);
            }
          },
          option.label
        ))
      )
    );
  }

  function renderModeSwitch(placement = "desktop") {
    return renderSegmentedSwitch({
      label: "Zeitraum",
      value: State.mode,
      options: [
        { value: "overall", label: "Gesamt" },
        { value: "current", label: "Aktuell" }
      ],
      className: `ath10-mode-switch ath10-mode-switch--${placement}`,
      onChange: (mode) => {
        State.mode = mode;
        const allowed = MODE_GROUPS[mode].some((group) => group.key === State.currentKey);
        if (!allowed) State.currentKey = "starts";
        savePreferences();
        renderTop10();
        maybeLoadSelectedLsc();
      }
    });
  }

  function renderMetricSwitch(placement = "panel") {
    const averageLabel = placement === "mobile" ? "Schnitt" : "Ø pro Jahr";
    return renderSegmentedSwitch({
      label: "Wertung",
      value: State.metric,
      options: [
        { value: "count", label: "Anzahl" },
        { value: "average", label: averageLabel }
      ],
      className: `ath10-metric-switch ath10-metric-switch--${placement}`,
      onChange: (metric) => {
        State.metric = metric;
        savePreferences();
        renderTop10();
      }
    });
  }

  function renderMobileControls(group, available, currentKey) {
    const showMetric = State.mode === "overall" && group?.supportsAverage;
    return h(
      "div",
      { class: "ath10-mobile-controls", "aria-label": "Rangliste einstellen" },
      renderModeSwitch("mobile"),
      h(
        "div",
        { class: "ath10-mobile-metric-slot" },
        showMetric ? renderMetricSwitch("mobile") : null
      ),
      h(
        "label",
        { class: "ath10-mobile-category" },
        h("span", { class: "ath10-switch-label" }, "Kategorie"),
        renderCategorySelect(available, currentKey)
      )
    );
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

  function getRowDisplayRank(row, fallback) {
    return normalizeRank(row?.displayRank ?? row?.rank, fallback);
  }

  function renderPodium(group) {
    const rows = Array.isArray(group?.rows) ? group.rows : [];
    if (!rows.length) return null;

    const podiumRows = [2, 1, 3].flatMap((rank) =>
      rows.filter((row, index) => getRowDisplayRank(row, index + 1) === rank)
    );
    if (!podiumRows.length) return null;

    return h(
      "section",
      { class: "ath10-podium-section", "aria-label": "Podest Plätze 1 bis 3" },
      h(
        "div",
        {
          class: `ath10-podium-grid${podiumRows.length > 3 ? " ath10-podium-grid--scrollable" : ""}`,
          dataset: { count: String(podiumRows.length) },
          style: `--ath10-podium-count: ${Math.max(3, podiumRows.length)}`
        },
        podiumRows.map((row, index) =>
          renderPodiumCard(row, getRowDisplayRank(row, index + 1), group.valueLabel)
        )
      )
    );
  }

  function renderRemainingTable(group) {
    const rows = (Array.isArray(group?.rows) ? group.rows : []).filter(
      (row, index) => getRowDisplayRank(row, index + 1) > 3
    );
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

  function formatDataDate(ms) {
    if (!Number.isFinite(ms)) return "";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date(ms));
  }

  function getGroupNote(group) {
    const isCurrent = State.mode === "current";
    const isAverage = State.mode === "overall" && group?.supportsAverage && State.metric === "average";
    const dataEnd = formatDataDate(State.dataMaxMs);
    const dataStart = formatDataDate(State.currentCutoffMs);
    const range = dataStart && dataEnd ? ` vom ${dataStart} bis ${dataEnd}` : " der letzten 731 Tage";
    const averageSuffix = isAverage
      ? (isCurrent ? " Der Durchschnitt wird durch zwei Jahre geteilt." : " Der Durchschnitt wird durch die aktiven Jahre der Person geteilt.")
      : "";

    if (group?.key === "starts") {
      return `Es werden nur badische Athleten berücksichtigt. Gezählt werden die sechs Einzeldisziplinen${isCurrent ? range : " im gesamten Datenbestand"}.${averageSuffix}`;
    }
    if (group?.key === "wettkaempfe") {
      return `Es werden nur badische Athleten berücksichtigt. Wettkämpfe werden pro Person eindeutig über Name und Datum gezählt${isCurrent ? range : " im gesamten Datenbestand"}.${averageSuffix}`;
    }
    if (group?.key === "lsc") {
      return isCurrent
        ? `Gewertet wird pro badischer Person der zeitlich aktuellste berechnete LSC${range}; ein früherer höherer Wert bleibt unberücksichtigt.`
        : "Gewertet wird der höchste in der JSON-Gesamtwertung gespeicherte LSC. Berücksichtigt werden Werte ab dem Jahr 2001.";
    }
    if (group?.key === "lsc_junioren") {
      return isCurrent
        ? `Gewertet wird bei aktuell jahrgangsbasiert unter 19-jährigen badischen Athleten der zeitlich aktuellste berechnete LSC${range}.`
        : "Gewertet wird der höchste LSC, den ein badischer Athlet bei einem Wettkampf als U19 erzielt hat. Berücksichtigt werden Werte ab dem Jahr 2001.";
    }
    if (group?.key === "aktive_jahre") {
      return "Es werden nur badische Athleten berücksichtigt. Gezählt werden die aktiven Kalenderjahre im gesamten Datenbestand.";
    }
    if (group?.key === "auslandswettkaempfe") {
      return `Es werden nur badische Athleten berücksichtigt. Gezählt werden eindeutige Wettkämpfe außerhalb von GER${isCurrent ? range : " im gesamten Datenbestand"}.`;
    }
    return "";
  }

  function renderNote(group) {
    const note = getGroupNote(group);
    if (!note) return null;
    return h(
      "div",
      { class: "ath10-note", role: "note" },
      h("div", { class: "ath10-note-title" }, "Hinweis"),
      h("div", { class: "ath10-note-text" }, note)
    );
  }

  function renderGroupBody(group) {
    if (group?.status === "loading" || group?.status === "idle") {
      return h("div", { class: "ath10-panel-status" }, "Rangliste wird berechnet …");
    }
    if (group?.status === "error") {
      return h("div", { class: "ath10-panel-status ath10-panel-status--error" }, "Diese Rangliste konnte nicht geladen werden.");
    }
    if (!Array.isArray(group?.rows) || !group.rows.length) {
      const message = State.mode === "overall" && group?.key === "lsc_junioren"
        ? "Für LSC U19 Gesamt sind noch keine Daten vorhanden."
        : "Für diese Rangliste sind keine Daten vorhanden.";
      return h("div", { class: "ath10-panel-status" }, message);
    }
    return [renderPodium(group), renderRemainingTable(group)];
  }

  function maybeLoadSelectedLsc() {
    if (State.mode !== "current") return;
    if (State.currentKey !== "lsc" && State.currentKey !== "lsc_junioren") return;
    ensureCurrentLscGroups();
  }

  function renderTop10() {
    const mount = State.mount;
    if (!mount) return;

    const groups = State.groups?.[State.mode] || {};
    const available = MODE_GROUPS[State.mode].map((def) => buildDisplayGroup(
      groups[def.key] || {
        key: def.key,
        label: def.label,
        valueLabel: GROUP_VALUE_LABEL[def.key] || "Wert",
        status: "loading",
        rows: []
      }
    ));

    if (!available.some((g) => g.key === State.currentKey)) {
      State.currentKey = "starts";
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
          h("h2", { class: "ath10-title" }, "Top-10 Ranglisten"),
          h(
            "div",
            { class: "ath10-desktop-controls" },
            renderModeSwitch("desktop"),
            h(
              "div",
              { class: "ath10-desktop-metric-slot" },
              State.mode === "overall" && current?.supportsAverage ? renderMetricSwitch("desktop") : null
            )
          ),
          renderMobileControls(current, available, State.currentKey)
        )
      ),
      h(
        "section",
        { class: "ath10-panel" },
        renderPanelHeader(current, available, State.currentKey),
        renderGroupBody(current)
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
    const requestId = State.liveCalcId;
    const [athleteResult, jsonResult] = await Promise.allSettled([
      getLiveAthletesWithMeets(),
      loadTop10Json()
    ]);
    if (requestId !== State.liveCalcId) return;

    const nextGroups = { overall: {}, current: {} };
    if (athleteResult.status === "fulfilled") {
      const computed = collectCountGroups(athleteResult.value);
      Object.assign(nextGroups.overall, computed.overall);
      Object.assign(nextGroups.current, computed.current);
    } else {
      console.error("Top-10 aus Excel konnten nicht geladen werden:", athleteResult.reason);
      for (const def of MODE_GROUPS.overall.filter((group) => !JSON_GROUP_MAP[group.key])) {
        nextGroups.overall[def.key] = { ...def, status: "error", rows: [], source: "excel" };
      }
      for (const def of MODE_GROUPS.current) {
        nextGroups.current[def.key] = { ...def, status: "error", rows: [], source: "excel" };
      }
    }

    if (jsonResult.status === "fulfilled") {
      Object.assign(nextGroups.overall, buildTop10GroupsFromJson(jsonResult.value));
    } else {
      console.error("LSC-Gesamtwertungen aus JSON konnten nicht geladen werden:", jsonResult.reason);
      for (const def of MODE_GROUPS.overall.filter((group) => JSON_GROUP_MAP[group.key])) {
        nextGroups.overall[def.key] = { ...def, status: "error", rows: [], source: "json" };
      }
    }

    State.groups = nextGroups;
    renderTop10();
    maybeLoadSelectedLsc();
  }

  function mountComponent(mountEl, options = {}) {
    const el = typeof mountEl === "string" ? $(mountEl) : mountEl;
    if (!el) return;

    State.mount = el;
    State.top10Url = typeof options.top10Url === "string" ? options.top10Url : DEFAULT_TOP10_URL;
    State.openByName = typeof options.openByName === "function" ? options.openByName : null;
    const preferences = readPreferences();
    State.mode = preferences?.mode === "current" ? "current" : "overall";
    State.metric = preferences?.metric === "average" ? "average" : "count";
    State.currentKey = "starts";
    State.groups = { overall: {}, current: {} };
    State.currentLscPromise = null;
    State.dataMaxMs = NaN;
    State.currentCutoffMs = NaN;
    State.liveCalcId += 1;

    el.innerHTML = '<div class="ath10-status ath10-status--loading">Top-10 wird geladen …</div>';
    init();
  }

  window.AthTop10 = { mount: mountComponent };
})();
