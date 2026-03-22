(function (global) {
  const ProfileLSC = {};
  const internals = global.ProfileTabsInternals || (global.ProfileTabsInternals = {});

  const WINDOW_DAYS = 731;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WR_SHEET_NAME = "WR-Open";
  const WR_HEADER_ROW = 3;
  const WR_FIRST_DATA_ROW = 4;
  const LSC_WARNING_ICON_SRC = "./svg/icon_status_yellow.svg";

  const WR_STATE = {
    promise: null,
    workbook: null,
    sheet: null,
    years: [],
    yearRowIndex: {},
    columnIndex: {}
  };

  const CACHE = new Map();
  const HISTORY_CACHE = new Map();
  let renderRequestId = 0;

  const DISCIPLINE_META = {
    "50_retten": {
      recordKeys: ["50m Retten"]
    },
    "100_retten_flosse": {
      recordKeys: ["100m Retten", "100m Retten mit Flossen", "100m Flossenretten"]
    },
    "100_kombi": {
      recordKeys: ["100m Kombi", "100m komb. Rettungsübung", "100m kombinierte Rettungsübung"]
    },
    "100_lifesaver": {
      recordKeys: [
        "100m Lifesaver",
        "100m Retten m Fl. u Gr.",
        "100m Retten mit Flossen u Gurtretter"
      ]
    },
    "200_super": {
      recordKeys: ["200m Superlifesaver", "200m Super Lifesaver"]
    },
    "200_hindernis": {
      recordKeys: ["200m Hindernis", "200m Hindernisschwimmen"]
    }
  };

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

  function getDisciplines() {
    return Array.isArray(internals.DISCIPLINES) ? internals.DISCIPLINES : [];
  }

  function parseTimeToSec(raw) {
    if (typeof internals.parseTimeToSec === "function") {
      return internals.parseTimeToSec(raw);
    }
    if (raw == null) return NaN;
    const s = String(raw).trim().replace(",", ".");
    if (!s || /^dq$/i.test(s)) return NaN;
    const parts = s.split(":");
    if (parts.length === 1) {
      const sec = parseFloat(parts[0]);
      return Number.isFinite(sec) ? sec : NaN;
    }
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const sec = parseFloat(parts[1]);
      return Number.isFinite(min) && Number.isFinite(sec) ? (min * 60) + sec : NaN;
    }
    return NaN;
  }

  function formatSeconds(sec) {
    if (typeof internals.formatSeconds === "function") {
      return internals.formatSeconds(sec).replace(".", ",");
    }
    if (!Number.isFinite(sec)) return "—";
    const total = Math.round(sec * 100);
    const min = Math.floor(total / 6000);
    const s = Math.floor((total % 6000) / 100);
    const cs = total % 100;
    const secPart = min ? String(s).padStart(2, "0") : String(s);
    return (min ? `${min}:${secPart}` : secPart) + "," + String(cs).padStart(2, "0");
  }

  function formatDate(dateIso) {
    if (typeof internals.fmtDateShort === "function") {
      return internals.fmtDateShort(dateIso);
    }
    const d = new Date(String(dateIso || "").slice(0, 10));
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("de-DE");
  }

  function formatDateWithYear(dateIso) {
    const iso = String(dateIso || "").slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    let d = null;

    if (match) {
      const year = Number(match[1]);
      const monthIndex = Number(match[2]) - 1;
      const day = Number(match[3]);
      const parsed = new Date(year, monthIndex, day);
      if (
        !isNaN(parsed.getTime()) &&
        parsed.getFullYear() === year &&
        parsed.getMonth() === monthIndex &&
        parsed.getDate() === day
      ) {
        d = parsed;
      }
    }

    if (!d) {
      const parsed = new Date(iso);
      if (!isNaN(parsed.getTime())) d = parsed;
    }

    if (!d) return formatDate(dateIso);
    return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  }

  function fmtPoints(value) {
    return Number.isFinite(value)
      ? new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
      : "—";
  }

  function fmtValue(value) {
    return Number.isFinite(value)
      ? new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
      : "—";
  }

  function parseStoredLsc(value) {
    const normalized = String(value ?? "").trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? round2(parsed) : null;
  }

  function buildLscMismatchMessage(delta) {
    return [
      "Es gibt möglicherweise Probleme bei der Berechnung ihres LSCs.",
      "Bitte wenden sie sich an den Administrator.",
      `Der Unterschied beträgt ${fmtPoints(delta)} P.`
    ].join("\n");
  }

  function createLscTitle(className = "") {
    const cls = ["lsc-calc-title", className].filter(Boolean).join(" ");
    return h(
      "span",
      { class: cls },
      h("span", { class: "lsc-calc-title-line is-lead" }, "Aktueller"),
      h("span", { class: "lsc-calc-title-line" }, "Lifesaving-Score")
    );
  }

  function createBestLscTitle(className = "") {
    const cls = ["lsc-calc-title", className].filter(Boolean).join(" ");
    return h(
      "span",
      { class: cls },
      h("span", { class: "lsc-calc-title-line is-lead" }, "Bester"),
      h("span", { class: "lsc-calc-title-line" }, "Lifesaving-Score")
    );
  }

  function normalizeKey(str) {
    return String(str || "")
      .toLowerCase()
      .replace(/[äÄ]/g, "ae")
      .replace(/[öÖ]/g, "oe")
      .replace(/[üÜ]/g, "ue")
      .replace(/[ß]/g, "ss")
      .replace(/[×*]/g, "x")
      .replace(/[^a-z0-9x]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function canonicalRecordKey(name) {
    let s = normalizeKey(name);

    s = s.replace(/\bhindernisschwimmen\b/g, "hindernis");
    s = s.replace(/\bkombinierte rettungsuebung\b/g, "kombi");
    s = s.replace(/\bkombinierte rettungsubung\b/g, "kombi");
    s = s.replace(/\bkomb rettungsuebung\b/g, "kombi");
    s = s.replace(/\bkomb rettungsubung\b/g, "kombi");
    s = s.replace(/\bsuper lifesaver\b/g, "superlifesaver");
    s = s.replace(/\bmanikin tow with fins\b/g, "100m retten");
    s = s.replace(/\bmanikin carry with fins\b/g, "100m retten");
    s = s.replace(/\brescue medley\b/g, "100m kombi");
    s = s.replace(/\bobstacle swim\b/g, "hindernis");
    s = s.replace(/\b100m retten m fl u gr\b/g, "100m lifesaver");
    s = s.replace(/\b100m retten mit flossen u gurtretter\b/g, "100m lifesaver");

    return s.replace(/\s+/g, " ").trim();
  }

  function normalizeGender(gender) {
    return String(gender || "").toLowerCase().startsWith("w") ? "w" : "m";
  }

  function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function isExcludedRun(run) {
    const mehrkampf = String(run?.Mehrkampf_Platz || "").trim().toLowerCase();
    return mehrkampf === "ausg." || mehrkampf === "ausg";
  }

  function isDqLikeValue(value) {
    const text = String(value || "").trim().toLowerCase();
    return text === "dq" || text === "disq";
  }

  function calcPoints(timeSec, recordSec) {
    if (!Number.isFinite(timeSec) || timeSec <= 0 || !Number.isFinite(recordSec) || recordSec <= 0) {
      return 0;
    }

    const ratio = timeSec / recordSec;
    if (ratio >= 5) return 0;
    if (ratio >= 2) return round2((2000 / 3) - ((400 / 3) * ratio));
    return round2((467 * ratio * ratio) - (2001 * ratio) + 2534);
  }

  function excelCellToSeconds(cell) {
    if (!cell) return null;
    if (typeof cell.v === "number") {
      if (cell.v >= 0 && cell.v < 1) {
        return round2(cell.v * 86400);
      }
      return round2(cell.v);
    }

    const raw = String(cell.w || cell.v || "").trim();
    if (!raw) return null;
    const parsed = parseTimeToSec(raw);
    return Number.isFinite(parsed) ? round2(parsed) : null;
  }

  async function ensureWrOpenIndex() {
    if (WR_STATE.promise) return WR_STATE.promise;

    WR_STATE.promise = (async () => {
      if (!global.ExcelLoader || typeof global.ExcelLoader.getWorkbook !== "function") {
        throw new Error("ExcelLoader fehlt für die LSC-Berechnung.");
      }

      WR_STATE.workbook = await global.ExcelLoader.getWorkbook({ urlKey: "recordsCriteria" });
      WR_STATE.sheet = WR_STATE.workbook?.Sheets?.[WR_SHEET_NAME] || null;

      if (!WR_STATE.sheet || !global.XLSX) {
        throw new Error("WR-Open konnte nicht geladen werden.");
      }

      const range = global.XLSX.utils.decode_range(WR_STATE.sheet["!ref"] || "A1:A1");
      const years = [];
      const yearRowIndex = {};
      const columnIndex = {};

      for (let r = WR_FIRST_DATA_ROW; r <= range.e.r; r++) {
        const addr = global.XLSX.utils.encode_cell({ c: 0, r });
        const cell = WR_STATE.sheet[addr];
        const year = parseInt(cell && cell.v, 10);
        if (!Number.isFinite(year)) continue;
        years.push(year);
        yearRowIndex[year] = r;
      }

      for (let c = 1; c <= range.e.c; c++) {
        const addr = global.XLSX.utils.encode_cell({ c, r: WR_HEADER_ROW });
        const cell = WR_STATE.sheet[addr];
        if (!cell || cell.v == null) continue;

        let header = canonicalRecordKey(cell.v);
        if (!header || header === canonicalRecordKey("WR-Open")) continue;

        let genderKey = "w";
        if (/\d$/.test(header)) {
          const suffix = header.charAt(header.length - 1);
          if (suffix === "2") {
            genderKey = "m";
            header = header.slice(0, -1).trim();
          }
        }

        columnIndex[`${header}|${genderKey}`] = c;
      }

      WR_STATE.years = years.sort((a, b) => a - b);
      WR_STATE.yearRowIndex = yearRowIndex;
      WR_STATE.columnIndex = columnIndex;
    })();

    return WR_STATE.promise;
  }

  function getSelectedWrYear(year) {
    const years = WR_STATE.years.slice().sort((a, b) => a - b);
    if (!years.length) return null;
    if (WR_STATE.yearRowIndex[year] != null) return year;

    let best = null;
    for (const y of years) {
      if (y <= year) best = y;
      else break;
    }
    return best != null ? best : years[0];
  }

  function readWrSeconds(year, genderKey, recordKeys) {
    const selectedYear = getSelectedWrYear(year);
    if (selectedYear == null) return null;

    const candidateYears = [];

    for (const y of WR_STATE.years.slice().sort((a, b) => a - b)) {
      if (y >= selectedYear) candidateYears.push(y);
    }

    for (const y of WR_STATE.years.slice().sort((a, b) => b - a)) {
      if (y < selectedYear) candidateYears.push(y);
    }

    const uniqueYears = Array.from(new Set(candidateYears));
    const keys = Array.isArray(recordKeys) ? recordKeys : [];

    for (const label of keys) {
      const col = WR_STATE.columnIndex[`${canonicalRecordKey(label)}|${genderKey}`];
      if (col == null) continue;

      for (const y of uniqueYears) {
        const row = WR_STATE.yearRowIndex[y];
        if (row == null) continue;
        const addr = global.XLSX.utils.encode_cell({ c: col, r: row });
        const sec = excelCellToSeconds(WR_STATE.sheet[addr]);
        if (Number.isFinite(sec) && sec > 0) return sec;
      }
    }

    return null;
  }

  function flattenRuns(athlete) {
    const meets = Array.isArray(athlete?.meets) ? athlete.meets : [];
    const flat = [];

    meets.forEach((meet, meetIndex) => {
      const runs = Array.isArray(meet?._runs) && meet._runs.length ? meet._runs : [meet];
      runs.forEach((run, runIndex) => {
        const dateIso = String(run?.date || meet?.date || "").slice(0, 10);
        const d = new Date(dateIso);
        if (isNaN(d.getTime())) return;

        flat.push({
          ...run,
          date: dateIso,
          meet_name: String(run?.meet_name || meet?.meet_name || "").trim(),
          _sortRun: Number(run?._lauf) || (runIndex + 1),
          _sortIndex: Number(run?._srcIndex) || ((meetIndex + 1) * 1000) + runIndex
        });
      });
    });

    flat.sort((l, r) => {
      const dl = new Date(l.date).getTime();
      const dr = new Date(r.date).getTime();
      return dl - dr || (l._sortRun - r._sortRun) || (l._sortIndex - r._sortIndex);
    });

    return flat;
  }

  function makeCacheKey(athlete, flatRuns) {
    const last = flatRuns[flatRuns.length - 1];
    return [
      athlete?.id || "",
      athlete?.jahrgang || "",
      athlete?.geschlecht || "",
      flatRuns.length,
      last?.date || "",
      last?._sortRun || ""
    ].join("|");
  }

  function makeMeetKey(run) {
    return [
      String(run?.date || "").trim(),
      String(run?.meet_name || "").trim().toLowerCase()
    ].join("||");
  }

  function getLookbackRuns(flatRuns, targetIndex) {
    const target = flatRuns[targetIndex];
    if (!target) return [];

    const targetMs = new Date(target.date).getTime();
    const out = [];

    for (let i = targetIndex; i >= 0; i--) {
      const run = flatRuns[i];
      const runMs = new Date(run.date).getTime();
      if (!Number.isFinite(runMs)) continue;
      if ((targetMs - runMs) / DAY_MS > WINDOW_DAYS) break;
      out.push(run);
    }

    return out;
  }

  function calculateLscForTargetIndex(athlete, flatRuns, targetIndex) {
    if (!Array.isArray(flatRuns) || !flatRuns.length) {
      return {
        finalScore: null,
        latestRun: null,
        disciplines: [],
        topDisciplines: [],
        targetIndex: -1
      };
    }

    const safeIndex = Math.max(0, Math.min(flatRuns.length - 1, Number(targetIndex) || 0));
    const latestRun = flatRuns[safeIndex];
    const lookbackRuns = getLookbackRuns(flatRuns, safeIndex);
    const genderKey = normalizeGender(athlete?.geschlecht);
    const disciplines = [];

    for (const disc of getDisciplines()) {
      const meta = DISCIPLINE_META[disc.key] || { recordKeys: [disc.label] };
      const entries = [];
      const excludedEntries = [];

      for (const run of lookbackRuns) {
        const raw = String(run?.[disc.meetZeit] || "").trim();
        const placeRaw = String(run?.[disc.meetPlatz] || "").trim();
        const isDq = isDqLikeValue(raw) || isDqLikeValue(placeRaw);
        if (!raw && !isDq) continue;

        const entryKey = [
          disc.key,
          String(run.date || "").trim(),
          String(run.meet_name || "").trim(),
          raw,
          String(run?._sortRun || "")
        ].join("|");

        const excludedReason = isExcludedRun(run) ? "ausg." : "";
        if (excludedReason) {
          const timeSeconds = parseTimeToSec(raw);
          if (Number.isFinite(timeSeconds)) {
            excludedEntries.push({
              entryKey,
              date: run.date,
              meetName: String(run.meet_name || "").trim(),
              rawTime: raw,
              timeSeconds,
              points: 0,
              displayPoints: 0,
              wrSeconds: null,
              year: new Date(run.date).getFullYear(),
              reason: excludedReason
            });
          }
          continue;
        }

        const year = new Date(run.date).getFullYear();
        let wrSeconds = null;
        if (!isDq) {
          wrSeconds = readWrSeconds(year, genderKey, meta.recordKeys);
          if (!Number.isFinite(wrSeconds) || wrSeconds <= 0) continue;
        }

        const timeSeconds = parseTimeToSec(raw);
        const points = isDq ? 0 : calcPoints(timeSeconds, wrSeconds);
        if (!isDq && !(points > 0)) continue;

        const baseEntry = {
          entryKey,
          date: run.date,
          meetName: String(run.meet_name || "").trim(),
          rawTime: raw,
          timeSeconds: Number.isFinite(timeSeconds) ? round2(timeSeconds) : null,
          points,
          displayPoints: isDq ? 0 : points,
          wrSeconds,
          year
        };

        entries.push(baseEntry);

        if (isDq) {
          excludedEntries.push({
            ...baseEntry,
            points: 0,
            displayPoints: 0,
            reason: "DQ"
          });
        }
      }

      entries.sort((l, r) => r.points - l.points || new Date(r.date) - new Date(l.date));
      const topEntries = entries.slice(0, 3);
      const visibleCount = entries.length;
      const averagePoints = topEntries.length
        ? round2(topEntries.reduce((sum, entry) => sum + entry.points, 0) / topEntries.length)
        : 0;

      disciplines.push({
        key: disc.key,
        label: disc.label,
        averagePoints,
        entries: topEntries,
        excludedEntries,
        consideredCount: entries.length,
        visibleCount,
        hasCountableEntry: entries.length > 0
      });
    }

    const topDisciplines = disciplines
      .filter(disc => disc.hasCountableEntry)
      .slice()
      .sort((l, r) => r.averagePoints - l.averagePoints)
      .slice(0, 3)
      .map(disc => disc.key);

    const selected = disciplines.filter(disc => topDisciplines.includes(disc.key));
    const finalScore = selected.length
      ? round2(selected.reduce((sum, disc) => sum + disc.averagePoints, 0) / selected.length)
      : 0;

    return {
      finalScore,
      latestRun,
      disciplines,
      topDisciplines,
      targetIndex: safeIndex
    };
  }

  async function calculateCurrentLsc(athlete) {
    const flatRuns = flattenRuns(athlete);
    if (!flatRuns.length) {
      return {
        finalScore: null,
        latestRun: null,
        disciplines: [],
        topDisciplines: [],
        targetIndex: -1
      };
    }

    const cacheKey = makeCacheKey(athlete, flatRuns);
    if (CACHE.has(cacheKey)) return CACHE.get(cacheKey);

    const promise = (async () => {
      await ensureWrOpenIndex();
      return calculateLscForTargetIndex(athlete, flatRuns, flatRuns.length - 1);
    })();

    CACHE.set(cacheKey, promise);

    try {
      return await promise;
    } catch (error) {
      CACHE.delete(cacheKey);
      throw error;
    }
  }

  function collapseHistorySeriesByMeet(series) {
    const byMeet = new Map();

    (Array.isArray(series) ? series : []).forEach((entry) => {
      const key = makeMeetKey(entry?.run || entry);
      const prev = byMeet.get(key);
      const currentRun = Number(entry?.sortRun || 0);
      const prevRun = Number(prev?.sortRun || 0);

      if (!prev || currentRun >= prevRun) {
        byMeet.set(key, entry);
      }
    });

    return Array.from(byMeet.values()).sort((l, r) => {
      const dl = new Date(String(l?.date || "")).getTime();
      const dr = new Date(String(r?.date || "")).getTime();
      return dl - dr || (Number(l?.sortRun || 0) - Number(r?.sortRun || 0));
    });
  }

  async function calculateHistorySeries(athlete, options = {}) {
    const flatRuns = flattenRuns(athlete);
    if (!flatRuns.length) return [];

    const cacheKey = makeCacheKey(athlete, flatRuns);
    if (!HISTORY_CACHE.has(cacheKey)) {
      HISTORY_CACHE.set(cacheKey, (async () => {
        await ensureWrOpenIndex();

        const rows = [];
        for (let i = 0; i < flatRuns.length; i++) {
          const calc = calculateLscForTargetIndex(athlete, flatRuns, i);
          const run = flatRuns[i];
          const excelLsc = parseStoredLsc(run?.LSC);
          const calculatedLsc = Number.isFinite(calc.finalScore) ? calc.finalScore : null;
          const delta =
            Number.isFinite(excelLsc) && Number.isFinite(calculatedLsc)
              ? round2(calculatedLsc - excelLsc)
              : null;

          rows.push({
            athleteId: athlete?.id || "",
            athleteName: athlete?.name || "",
            jahrgang: athlete?.jahrgang || "",
            date: String(run?.date || "").trim(),
            meetName: String(run?.meet_name || "").trim(),
            sortRun: Number(run?._sortRun || 0),
            excelLsc,
            calculatedLsc,
            delta,
            absDelta: Number.isFinite(delta) ? round2(Math.abs(delta)) : null,
            run,
            calc
          });

          if ((i + 1) % 20 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        return rows;
      })());
    }

    const history = await HISTORY_CACHE.get(cacheKey);
    return options.byMeet ? collapseHistorySeriesByMeet(history) : history.slice();
  }

  async function calculateBestHistoricalLsc(athlete) {
    const history = await calculateHistorySeries(athlete, { byMeet: true });
    let bestEntry = null;
    let bestExcelEntry = null;

    (Array.isArray(history) ? history : []).forEach((entry) => {
      if (Number.isFinite(entry?.excelLsc) && (!bestExcelEntry || entry.excelLsc > bestExcelEntry.excelLsc)) {
        bestExcelEntry = entry;
      }

      if (!Number.isFinite(entry?.calculatedLsc)) return;
      if (!bestEntry || entry.calculatedLsc > bestEntry.calculatedLsc) {
        bestEntry = entry;
      }
    });

    return {
      finalScore: Number.isFinite(bestEntry?.calculatedLsc) ? round2(bestEntry.calculatedLsc) : null,
      firstDate: String(bestEntry?.date || "").trim() || null,
      bestExcelLsc: Number.isFinite(bestExcelEntry?.excelLsc) ? round2(bestExcelEntry.excelLsc) : null,
      bestExcelDate: String(bestExcelEntry?.date || "").trim() || null,
      entry: bestEntry
    };
  }

  function createTile() {
    const title = h("div", { class: "info-label" }, createLscTitle());
    const warningSlot = h("div", { class: "lsc-calc-warning-slot", dataset: { role: "warning-slot" } });
    const head = h("div", { class: "lsc-calc-tile-head" }, title, warningSlot);
    const value = h("div", { class: "info-value big", dataset: { role: "value" } }, "…");
    const meta = h("div", { class: "info-sub lsc-calc-meta", dataset: { role: "meta" } }, "Wird berechnet …");

    const layout = h(
      "div",
      { class: "lsc-calc-tile-layout" },
      h("div", { class: "lsc-calc-tile-col lsc-calc-tile-col-title" }, head),
      h("div", { class: "lsc-calc-tile-col lsc-calc-tile-col-value" }, value, meta)
    );

    return h("div", { class: "info-tile accent lsc-tile lsc-calc-tile" }, layout);
  }

  function createBestTile() {
    const title = h("div", { class: "info-label" }, createBestLscTitle());
    const head = h("div", { class: "lsc-calc-tile-head" }, title);
    const value = h("div", { class: "info-value big", dataset: { role: "value" } }, "â€¦");
    const meta = h("div", { class: "info-sub lsc-calc-meta", dataset: { role: "meta" } }, "Wird berechnet â€¦");

    const layout = h(
      "div",
      { class: "lsc-calc-tile-layout" },
      h("div", { class: "lsc-calc-tile-col lsc-calc-tile-col-title" }, head),
      h("div", { class: "lsc-calc-tile-col lsc-calc-tile-col-value" }, value, meta)
    );

    return h("div", { class: "info-tile accent lsc-tile lsc-calc-tile lsc-best-tile" }, layout);
  }

  function createBestScoreTile() {
    const title = h("div", { class: "info-label" }, createBestLscTitle());
    const warningSlot = h("div", { class: "lsc-calc-warning-slot", dataset: { role: "warning-slot" } });
    const head = h("div", { class: "lsc-calc-tile-head" }, title, warningSlot);
    const value = h("div", { class: "info-value big", dataset: { role: "value" } }, "\u2026");
    const meta = h("div", { class: "info-sub lsc-calc-meta", dataset: { role: "meta" } }, "Wird berechnet \u2026");

    const layout = h(
      "div",
      { class: "lsc-calc-tile-layout" },
      h("div", { class: "lsc-calc-tile-col lsc-calc-tile-col-title" }, head),
      h("div", { class: "lsc-calc-tile-col lsc-calc-tile-col-value" }, value, meta)
    );

    return h("div", { class: "info-tile accent lsc-tile lsc-calc-tile lsc-best-tile" }, layout);
  }

  function applyTileMessage(tile, message) {
    const value = tile?.querySelector?.('[data-role="value"]');
    const meta = tile?.querySelector?.('[data-role="meta"]');

    if (value) value.textContent = "â€”";
    if (meta) meta.textContent = message;
    updateTileComparisonState(tile, null, null);
  }

  function setTileMessage(tile, message) {
    const value = tile?.querySelector?.('[data-role="value"]');
    const meta = tile?.querySelector?.('[data-role="meta"]');

    if (value) value.textContent = "\u2014";
    if (meta) meta.textContent = message;
    updateTileComparisonState(tile, null, null);
  }

  function updateTileComparisonState(tile, athlete, calculatedLsc) {
    const warningSlot = tile.querySelector('[data-role="warning-slot"]');
    if (!warningSlot) return;

    warningSlot.replaceChildren();
    tile.removeAttribute("data-lsc-mismatch");

    const excelLsc = parseStoredLsc(athlete?.lsc);
    if (!Number.isFinite(excelLsc) || !Number.isFinite(calculatedLsc)) return;

    const delta = round2(calculatedLsc - excelLsc);
    const absDelta = round2(Math.abs(delta));
    if (!(absDelta > 0)) return;

    const message = buildLscMismatchMessage(absDelta);
    const button = h(
      "button",
      {
        class: "lsc-calc-warning-button",
        type: "button",
        title: "Abweichung zum Excel-LSC anzeigen",
        "aria-label": "Abweichung zum Excel-LSC anzeigen",
        onclick: (event) => {
          event.preventDefault();
          event.stopPropagation();
          global.alert(message);
        }
      },
      h("img", {
        class: "lsc-calc-warning-icon",
        src: LSC_WARNING_ICON_SRC,
        alt: "",
        loading: "lazy",
        decoding: "async"
      })
    );

    tile.setAttribute("data-lsc-mismatch", "true");
    warningSlot.appendChild(button);
  }

  function createDetailsCard() {
    const summaryTitle = h(
      "span",
      { class: "ath-lsc-calc-summary-title", dataset: { role: "summary-title" } },
      createLscTitle("ath-lsc-calc-summary-title-text")
    );
    const summaryMeta = h("span", { class: "ath-lsc-calc-summary-meta", dataset: { role: "summary-meta" } }, "Berechnung wird geladen …");
    const summary = h("summary", { class: "ath-lsc-calc-summary" }, summaryTitle, summaryMeta);

    const body = h("div", { class: "ath-lsc-calc-body", dataset: { role: "body" } },
      h("div", { class: "best-empty" }, "LSC-Berechnung wird geladen …")
    );

    return h("details", { class: "ath-lsc-calc-card" }, summary, body);
  }

  function createStandaloneSection() {
    return h(
      "div",
      { class: "ath-profile-section lsc" },
      h("div", { class: "ath-info-header" }, h("h3", {}, "LSC")),
      h(
        "div",
        { class: "ath-lsc-calc-card ath-lsc-calc-standalone" },
        h("div", { class: "ath-lsc-calc-body", dataset: { role: "body" } },
          h("div", { class: "best-empty" }, "LSC-Berechnung wird geladen …")
        )
      )
    );
  }

  function renderBody(card, calc) {
    const body = card.querySelector('[data-role="body"]');
    if (!body) return;
    body.innerHTML = "";

    const latestRun = calc.latestRun;
    const summary = h("div", { class: "ath-lsc-calc-explainer" },
      h("p", {},
        "Grundlage: alle Zeiten der letzten 2 Jahre bis ",
        h("strong", {}, latestRun ? `${formatDate(latestRun.date)} (${latestRun.meet_name || "Wettkampf"})` : "zum letzten Wettkampf"),
        ". Pro Disziplin werden die besten 3 Punktwerte gemittelt, danach fließen nur die besten 3 Disziplinmittel in den LSC ein."
      )
    );
    body.appendChild(summary);

    const grid = h("div", { class: "ath-lsc-calc-grid" });

    calc.disciplines.forEach((disc) => {
      const usedInScore = calc.topDisciplines.includes(disc.key);
      const visibleEntries = disc.entries.filter(entry => Number.isFinite(entry.timeSeconds));
      const badge = usedInScore
        ? h("span", { class: "ath-lsc-calc-badge" }, "zählt")
        : h("span", { class: "ath-lsc-calc-badge muted" }, "Reserve");

      const head = h("div", { class: "ath-lsc-calc-head" },
        h("div", {},
          h("div", { class: "ath-lsc-calc-label" }, disc.label),
          h("div", { class: "ath-lsc-calc-sub" }, `${visibleEntries.length || 0} sichtbar · ${disc.entries.length || 0} von ${disc.consideredCount || 0} Leistungen berücksichtigt`)
        ),
        h("div", { class: "ath-lsc-calc-value" }, `${fmtPoints(disc.averagePoints)} P`, badge)
      );

      const rows = visibleEntries.length
        ? visibleEntries.map((entry, index) =>
            h("div", { class: "ath-lsc-calc-row" },
              h("div", { class: "ath-lsc-calc-rank" }, `#${index + 1}`),
              h("div", { class: "ath-lsc-calc-main" },
                h("div", { class: "ath-lsc-calc-time" }, formatSeconds(entry.timeSeconds)),
                h("div", { class: "ath-lsc-calc-rowmeta" },
                  entry.reason
                    ? `${formatDate(entry.date)} · ${entry.meetName || "Wettkampf"} · Grund: ${entry.reason}`
                    : `${formatDate(entry.date)} · ${entry.meetName || "Wettkampf"} · WR ${formatSeconds(entry.wrSeconds)}`
                )
              ),
              h("div", { class: "ath-lsc-calc-points" }, `${fmtPoints(entry.displayPoints)} P`)
            )
          )
        : [];

      const shownKeys = new Set(visibleEntries.map(entry => entry.entryKey));
      const excludedRows = (disc.excludedEntries || [])
        .filter(entry => !shownKeys.has(entry.entryKey))
        .map(entry =>
          h("div", { class: "ath-lsc-calc-row is-excluded" },
            h("div", { class: "ath-lsc-calc-rank" }, "0"),
            h("div", { class: "ath-lsc-calc-main" },
              h("div", { class: "ath-lsc-calc-time" },
                Number.isFinite(entry.timeSeconds)
                  ? formatSeconds(entry.timeSeconds)
                  : (String(entry.rawTime || "").trim() || String(entry.reason || "DQ"))
              ),
              h("div", { class: "ath-lsc-calc-rowmeta" },
                `${formatDate(entry.date)} · ${entry.meetName || "Wettkampf"} · Grund: ${entry.reason || "nicht gewertet"}`
              )
            ),
            h("div", { class: "ath-lsc-calc-points" }, "0,00 P")
          )
        );

      if (!rows.length && !excludedRows.length) {
        rows.push(h("div", { class: "best-empty compact" }, "Keine relevanten Zeiten im 2-Jahres-Fenster."));
      }

      grid.appendChild(
        h("section", {
          class: `ath-lsc-calc-discipline${usedInScore ? " is-counted" : ""}`
        },
          head,
          h("div", { class: "ath-lsc-calc-rows" },
            rows,
            excludedRows.length
              ? h("div", { class: "ath-lsc-calc-excluded-block" },
                  h("div", { class: "ath-lsc-calc-excluded-title" }, "Ausgeschlossen / 0 Punkte"),
                  excludedRows
                )
              : null
          )
        )
      );
    });

    body.appendChild(grid);
  }

  function applyError(tile, card, message) {
    const value = tile.querySelector('[data-role="value"]');
    const meta = tile.querySelector('[data-role="meta"]');
    const summaryMeta = card.querySelector('[data-role="summary-meta"]');
    const body = card.querySelector('[data-role="body"]');

    if (value) value.textContent = "—";
    if (meta) meta.textContent = message;
    if (summaryMeta) summaryMeta.textContent = message;
    if (body) {
      body.innerHTML = "";
      body.appendChild(h("div", { class: "best-empty" }, message));
    }
  }

  async function hydrateOverviewParts(athlete, tile, bestTile, card, requestId) {
    try {
      const [calc, best] = await Promise.all([
        calculateCurrentLsc(athlete),
        calculateBestHistoricalLsc(athlete)
      ]);
      if (requestId !== renderRequestId) return;

      const value = tile.querySelector('[data-role="value"]');
      const meta = tile.querySelector('[data-role="meta"]');
      const bestValue = bestTile.querySelector('[data-role="value"]');
      const bestMeta = bestTile.querySelector('[data-role="meta"]');
      const summaryMeta = card.querySelector('[data-role="summary-meta"]');

      if (Number.isFinite(calc.finalScore)) {
        if (value) value.textContent = fmtValue(calc.finalScore);
        updateTileComparisonState(tile, athlete, calc.finalScore);

        const standLabel = calc.latestRun
          ? formatDateWithYear(calc.latestRun.date)
          : "Letzter Wettkampf";

        if (meta) meta.textContent = standLabel;
        if (summaryMeta) {
          summaryMeta.textContent = `${fmtValue(calc.finalScore)} · ${standLabel}`;
        }
        renderBody(card, calc);
      } else {
        applyError(tile, card, "Nicht genügend Zeiten für eine LSC-Berechnung.");
      }

      if (Number.isFinite(best.finalScore)) {
        if (bestValue) bestValue.textContent = fmtValue(best.finalScore);
        if (bestMeta) bestMeta.textContent = best.firstDate ? formatDateWithYear(best.firstDate) : "Unbekanntes Datum";
        updateTileComparisonState(
          bestTile,
          Number.isFinite(best.bestExcelLsc) ? { lsc: best.bestExcelLsc } : null,
          best.finalScore
        );
      } else {
        setTileMessage(bestTile, "Kein berechneter LSC-Verlauf.");
      }
    } catch (error) {
      console.error("LSC-Berechnung fehlgeschlagen:", error);
      if (requestId !== renderRequestId) return;
      applyError(tile, card, "LSC konnte nicht berechnet werden.");
      setTileMessage(bestTile, "LSC konnte nicht berechnet werden.");
    }
  }

  ProfileLSC.createOverviewParts = function createOverviewParts(athlete) {
    const tile = createTile();
    const bestTile = createBestScoreTile();
    const requestId = ++renderRequestId;
    const details = createDetailsCard();
    hydrateOverviewParts(athlete, tile, bestTile, details, requestId);
    return { tile, bestTile, tiles: [tile, bestTile] };
  };

  ProfileLSC.createSection = function createSection(athlete) {
    const section = createStandaloneSection();
    const body = section.querySelector('[data-role="body"]');

    (async () => {
      try {
        const calc = await calculateCurrentLsc(athlete);
        renderBody(section, calc);
      } catch (error) {
        console.error("LSC-Berechnung im Tab fehlgeschlagen:", error);
        if (body) {
          body.innerHTML = "";
          body.appendChild(h("div", { class: "best-empty" }, "LSC konnte nicht berechnet werden."));
        }
      }
    })();

    return section;
  };

  ProfileLSC.calculateCurrentLsc = calculateCurrentLsc;
  ProfileLSC.calculateHistorySeries = calculateHistorySeries;

  global.ProfileLSC = ProfileLSC;
})(window);
