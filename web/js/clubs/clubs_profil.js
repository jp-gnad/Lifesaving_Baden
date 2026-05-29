document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <div id="rek-search-layer"></div>

    <section class="hero">
      <div class="container hero-content">
        <div class="hero-search-spacer" aria-hidden="true"></div>
        <div class="rek-hero-layout">
          <div id="rek-hero-avatar" class="rek-hero-avatar-wrap" aria-hidden="true"></div>
          <div class="rek-hero-copy">
            <p id="rek-hero-kicker" class="hero-kicker"></p>
            <h1 id="rek-hero-title">Clubs</h1>
            <p id="rek-hero-meta" class="hero-meta"></p>
          </div>
        </div>
      </div>
    </section>

    <section id="rekorde-profil-section">
      <div id="rekorde-profil-container"></div>
    </section>
  `;
});

(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const PROFILE_TABS = [
    { key: "bestenliste", label: "Bestenliste" },
    { key: "stats", label: "Stats" },
    { key: "erfolge", label: "Erfolge" }
  ];
  const COLS = {
    gender: 0,
    name: 1,
    z100l: 3,
    z50r: 4,
    z200s: 5,
    z100k: 6,
    z100r: 7,
    z200h: 8,
    excelDate: 9,
    meetName: 10,
    yy2: 11,
    ortsgruppe: 12,
    lvState: 13,
    pMehrkampf: 14,
    p100l: 15,
    p50r: 16,
    p200s: 17,
    p100k: 18,
    p100r: 19,
    p200h: 20,
    pool: 21,
    bvNatio: 27
  };
  const DISCIPLINES = [
    { key: "z50r", label: "50m Retten", col: COLS.z50r, placeCol: COLS.p50r },
    { key: "z100r", label: "100m Retten mit Flossen", col: COLS.z100r, placeCol: COLS.p100r },
    { key: "z100k", label: "100m Kombi", col: COLS.z100k, placeCol: COLS.p100k },
    { key: "z100l", label: "100m Lifesaver", col: COLS.z100l, placeCol: COLS.p100l },
    { key: "z200s", label: "200m Super-Lifesaver", col: COLS.z200s, placeCol: COLS.p200s },
    { key: "z200h", label: "200m Hindernis", col: COLS.z200h, placeCol: COLS.p200h }
  ];
  const BESTS_STATE = {
    pool: "50",
    limit: 5,
    personalOnly: true,
    ageGroup: "open"
  };
  let PROFILE_GROUPS = [];
  const LV_CODES_BY_GROUP = {
    Baden: ["BA"],
    "Baden-Württemberg": ["BA", "WÜ", "WU", "WUE"],
    Berlin: ["BE"],
    Brandenburg: ["BB"],
    Hessen: ["HE"],
    Nordrhein: ["NR", "NW", "NO", "NRH"],
    "Nordrhein-Westfalen": ["NR", "NW", "NO", "NRH", "WF", "WE", "WL"],
    "Rheinland-Pfalz": ["RP"],
    Saarland: ["SL"],
    Württemberg: ["WÜ", "WU", "WUE"]
  };

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

  function getGroupIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("gliederung") || "").trim();
  }

  const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

  const normalizeForCompare = (value) =>
    normalize(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/ß/g, "ss");

  function normalizeLvCode(value) {
    const code = normalize(value).toUpperCase().replace(/\s+/g, "");
    if (code === "WU" || code === "WUE") return "WÜ";
    return code;
  }

  function normalizeBvCode(value) {
    const raw = normalize(value);
    const code = raw.toUpperCase().replace(/\s+/g, "");
    if (code === "GER" || code === "DEU" || normalizeForCompare(raw) === "deutschland") return "GER";
    return code;
  }

  function normalizeGender(value) {
    return String(value || "").toLowerCase().startsWith("w") ? "w" : "m";
  }

  function normalizePool(value) {
    const pool = normalize(value);
    return pool === "25" || pool === "50" ? pool : "";
  }

  function excelSerialToISO(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    const base = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(base.getTime() + num * 86400000);
    return date.toISOString().slice(0, 10);
  }

  function formatDateDE(iso) {
    const date = new Date(String(iso || "").slice(0, 10));
    if (Number.isNaN(date.getTime())) return "";
    return `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${date.getUTCFullYear()}`;
  }

  function formatBirthYearShort(year) {
    if (!year) return "";
    return String(year).slice(-2).padStart(2, "0");
  }

  function getNameFitClass(entry) {
    const text = `${normalize(entry?.name)}${entry?.birthYear ? ` (${formatBirthYearShort(entry.birthYear)})` : ""}`;
    if (text.length >= 34) return " club-bests-name-main--xs";
    if (text.length >= 29) return " club-bests-name-main--sm";
    if (text.length >= 24) return " club-bests-name-main--md";
    return "";
  }

  function getYearFromISO(iso) {
    const year = Number(String(iso || "").slice(0, 4));
    return Number.isFinite(year) ? year : null;
  }

  function matchesAgeGroup(settings, birthYear, dateIso) {
    if (settings?.ageGroup !== "u19") return true;

    const meetYear = getYearFromISO(dateIso);
    const bornYear = Number(birthYear);
    if (!Number.isFinite(meetYear) || !Number.isFinite(bornYear)) return false;

    return meetYear - bornYear <= 18;
  }

  function parseTwoDigitYearWithMeetYear(twoDigit, meetISO) {
    const yy = Number(twoDigit);
    const meetYear = Number((meetISO || "").slice(0, 4));
    if (!Number.isFinite(yy) || !Number.isFinite(meetYear)) return "";

    let year = 1900 + yy;
    while (meetYear - year > 100) year += 100;
    return year;
  }

  function splitNameParts(name) {
    const raw = normalize(name);
    if (!raw) return { lastName: "", firstName: "" };

    if (raw.includes(",")) {
      const [lastName, firstName] = raw.split(/,(.+)/).map((part) => normalize(part));
      return { lastName, firstName };
    }

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { lastName: raw, firstName: "" };
    return { lastName: parts[parts.length - 1], firstName: parts.slice(0, -1).join(" ") };
  }

  function slugPart(value) {
    return normalizeForCompare(value)
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  }

  function makeAthleteId(name, gender, birthYear) {
    const { lastName, firstName } = splitNameParts(name);
    return `${slugPart(lastName) || "x"},${slugPart(firstName) || "x"}_${normalizeGender(gender)}_${birthYear || "x"}`;
  }

  function parseTimeToSec(raw) {
    if (raw == null) return null;
    if (typeof raw === "number") {
      if (!Number.isFinite(raw) || raw <= 0) return null;
      return raw < 1 ? raw * 86400 : raw;
    }

    const value = String(raw).trim();
    if (!value || /^(dq|dsq|disq|ausg\.?|na|n\/a|-|—)$/i.test(value)) return null;
    if (/(dq|dsq|disq|ausg)/i.test(value)) return null;

    const cleaned = value.replace(/\s+/g, "").replace(",", ".");
    const parts = cleaned.split(":").map((part) => Number(part));

    if (parts.length === 2 && parts.every(Number.isFinite)) {
      return parts[0] * 60 + parts[1];
    }

    const num = Number(cleaned);
    if (!Number.isFinite(num) || num <= 0) return null;
    return num < 1 ? num * 86400 : num;
  }

  function isInvalidResultMark(value) {
    return /(dq|dsq|disq|ausg)/i.test(String(value || "").trim());
  }

  function formatSeconds(sec) {
    if (!Number.isFinite(sec)) return "";
    const minutes = Math.floor(sec / 60);
    const rest = sec - minutes * 60;
    const secText = rest.toFixed(2).replace(".", ",").padStart(5, "0");
    return minutes > 0 ? `${minutes}:${secText}` : secText;
  }

  function setHero(group) {
    const avatarMount = $("#rek-hero-avatar");
    const kicker = $("#rek-hero-kicker");
    const title = $("#rek-hero-title");
    const meta = $("#rek-hero-meta");

    if (!group) {
      if (avatarMount) avatarMount.innerHTML = "";
      if (kicker) kicker.textContent = "Clubs";
      if (title) title.textContent = "Gliederung nicht gefunden";
      if (meta) meta.textContent = "";
      document.title = "Lifesaving Baden - Clubs";
      return;
    }

    if (avatarMount) {
      avatarMount.innerHTML = "";
      if (window.ClubsSearch && typeof window.ClubsSearch.renderAvatar === "function") {
        avatarMount.appendChild(window.ClubsSearch.renderAvatar(group, "xl", "rek-hero-avatar"));
      }
    }

    if (kicker) kicker.textContent = group.label || "Gliederung";
    if (title) title.textContent = group.name || "Clubs";
    if (meta) meta.textContent = group.subtitle || "";
    document.title = `Lifesaving Baden - ${group.name || "Clubs"}`;
  }

  function groupMatchesRow(group, row) {
    if (!group || !row) return false;

    if (group.kind === "og") {
      const ogName =
        window.ClubsData && typeof window.ClubsData.normalizeOrtsgruppeName === "function"
          ? window.ClubsData.normalizeOrtsgruppeName(row[COLS.ortsgruppe])
          : normalize(row[COLS.ortsgruppe]);
      return normalizeForCompare(ogName) === normalizeForCompare(group.name);
    }

    if (group.kind === "lv") {
      const rowCode = normalizeLvCode(row[COLS.lvState]);
      const codes = new Set([
        ...(LV_CODES_BY_GROUP[group.name] || []),
        ...(Array.isArray(group.searchKeys) ? group.searchKeys : [])
      ].map(normalizeLvCode).filter(Boolean));
      return codes.has(rowCode);
    }

    if (group.kind === "bv") {
      const rowCode = normalizeBvCode(row[COLS.bvNatio]);
      const codes = new Set([
        "GER",
        ...(Array.isArray(group.searchKeys) ? group.searchKeys : [])
      ].map(normalizeBvCode).filter(Boolean));
      return codes.has(rowCode);
    }

    return false;
  }

  function setProfileGroups(groups) {
    PROFILE_GROUPS = Array.isArray(groups) ? groups : [];
  }

  function getRowAffiliation(row) {
    return window.ClubsData && typeof window.ClubsData.normalizeOrtsgruppeName === "function"
      ? window.ClubsData.normalizeOrtsgruppeName(row[COLS.ortsgruppe])
      : normalize(row[COLS.ortsgruppe]);
  }

  function findAffiliationGroup(affiliation) {
    const target = normalizeForCompare(affiliation);
    if (!target) return null;

    return (
      PROFILE_GROUPS.find((item) => {
        if (!item || item.kind !== "og") return false;
        if (normalizeForCompare(item.name) === target) return true;
        return (Array.isArray(item.searchKeys) ? item.searchKeys : []).some(
          (key) => normalizeForCompare(key) === target
        );
      }) || null
    );
  }

  function compareEntry(left, right) {
    const timeDiff = Number(left.seconds) - Number(right.seconds);
    if (Math.abs(timeDiff) > 1e-9) return timeDiff;

    const nameCompare = String(left.name || "").localeCompare(String(right.name || ""), "de", { sensitivity: "base" });
    if (nameCompare !== 0) return nameCompare;

    return String(left.dateIso || "").localeCompare(String(right.dateIso || ""));
  }

  function withRanks(entries, limit) {
    const sorted = [...entries].sort(compareEntry);
    let prevSeconds = null;
    let prevRank = 0;

    return sorted
      .map((entry, index) => {
        const rank =
          index > 0 && Math.abs(Number(entry.seconds) - Number(prevSeconds)) <= 1e-9
            ? prevRank
            : index + 1;
        prevSeconds = entry.seconds;
        prevRank = rank;
        return { ...entry, rank };
      })
      .filter((entry) => entry.rank <= limit);
  }

  function isOmsMeet(meetName) {
    return /^OMS\s*-/i.test(normalize(meetName));
  }

  function buildBestenliste(rows, group, settings) {
    const byDiscipline = new Map();
    const personalBest = new Map();
    const showAffiliationAvatar = !!group;
    const excludeOmsMeets = group?.kind === "lv" || group?.kind === "bv";

    DISCIPLINES.forEach((discipline) => {
      byDiscipline.set(discipline.key, { m: [], w: [] });
    });

    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || !groupMatchesRow(group, row)) continue;
      if (normalizePool(row[COLS.pool]) !== settings.pool) continue;

      const name = normalize(row[COLS.name]);
      if (!name) continue;

      const gender = normalizeGender(row[COLS.gender]);
      const dateIso = excelSerialToISO(row[COLS.excelDate]);
      const birthYear = parseTwoDigitYearWithMeetYear(row[COLS.yy2], dateIso);
      if (!matchesAgeGroup(settings, birthYear, dateIso)) continue;

      const meetName = normalize(row[COLS.meetName]);
      if (excludeOmsMeets && isOmsMeet(meetName)) continue;

      const athleteId = makeAthleteId(name, gender, birthYear);
      const affiliation = getRowAffiliation(row);
      const affiliationGroup = showAffiliationAvatar ? findAffiliationGroup(affiliation) : null;
      if (isInvalidResultMark(row[COLS.pMehrkampf])) continue;

      for (const discipline of DISCIPLINES) {
        if (isInvalidResultMark(row[discipline.placeCol])) continue;

        const seconds = parseTimeToSec(row[discipline.col]);
        if (!Number.isFinite(seconds)) continue;

        const entry = {
          disciplineKey: discipline.key,
          athleteId,
          name,
          gender,
          birthYear,
          seconds,
          timeLabel: formatSeconds(seconds),
          meetName,
          dateIso,
          dateLabel: formatDateDE(dateIso),
          affiliation,
          affiliationGroup
        };

        if (settings.personalOnly) {
          const key = `${discipline.key}|${gender}|${athleteId}`;
          const prev = personalBest.get(key);
          if (!prev || compareEntry(entry, prev) < 0) personalBest.set(key, entry);
        } else {
          byDiscipline.get(discipline.key)[gender].push(entry);
        }
      }
    }

    if (settings.personalOnly) {
      for (const entry of personalBest.values()) {
        byDiscipline.get(entry.disciplineKey)[entry.gender].push(entry);
      }
    }

    return DISCIPLINES.map((discipline) => {
      const groupEntries = byDiscipline.get(discipline.key) || { m: [], w: [] };
      return {
        ...discipline,
        women: withRanks(groupEntries.w, settings.limit),
        men: withRanks(groupEntries.m, settings.limit)
      };
    });
  }

  function createBestenlisteControls(panel, group) {
    const createPoolButton = (pool) =>
      h(
        "button",
        {
          class: `club-bests-seg-btn${BESTS_STATE.pool === pool ? " is-active" : ""}`,
          type: "button",
          "aria-pressed": BESTS_STATE.pool === pool ? "true" : "false",
          onclick: () => {
            BESTS_STATE.pool = pool;
            renderBestenliste(panel, group);
          }
        },
        `${pool} m`
      );

    const createAgeButton = (ageGroup, label) =>
      h(
        "button",
        {
          class: `club-bests-seg-btn${BESTS_STATE.ageGroup === ageGroup ? " is-active" : ""}`,
          type: "button",
          "aria-pressed": BESTS_STATE.ageGroup === ageGroup ? "true" : "false",
          onclick: () => {
            BESTS_STATE.ageGroup = ageGroup;
            renderBestenliste(panel, group);
          }
        },
        label
      );

    const limitSelect = h(
      "select",
      {
        class: "club-bests-select",
        "aria-label": "Anzahl der Platzierungen",
        onchange: (event) => {
          BESTS_STATE.limit = Number(event.target.value) || 5;
          renderBestenliste(panel, group);
        }
      },
      [3, 5, 10].map((value) =>
        h("option", { value, selected: value === BESTS_STATE.limit }, `Top ${value}`)
      )
    );

    const personalToggle = h(
      "label",
      { class: "club-bests-check" },
      h("input", {
        type: "checkbox",
        checked: BESTS_STATE.personalOnly,
        onchange: (event) => {
          BESTS_STATE.personalOnly = !!event.target.checked;
          renderBestenliste(panel, group);
        }
      }),
      h("span", {}, "Bestzeit pro Sportler")
    );

    const printButton = h(
      "button",
      {
        class: "club-bests-print-btn",
        type: "button",
        onclick: () => openBestenlistePdf(group)
      },
      "PDF"
    );

    return h(
      "div",
      { class: "club-bests-controls" },
      h(
        "div",
        { class: "club-bests-control-group", "aria-label": "Bahnlänge" },
        h("span", { class: "club-bests-control-label" }, "Bahn"),
        h("div", { class: "club-bests-seg" }, createPoolButton("50"), createPoolButton("25"))
      ),
      h(
        "div",
        { class: "club-bests-control-group", "aria-label": "Altersklasse" },
        h("span", { class: "club-bests-control-label" }, "Altersklasse"),
        h("div", { class: "club-bests-seg" }, createAgeButton("open", "Offen"), createAgeButton("u19", "U19"))
      ),
      h(
        "div",
        { class: "club-bests-control-group" },
        h("span", { class: "club-bests-control-label" }, "Plätze"),
        limitSelect
      ),
      personalToggle,
      h("div", { class: "club-bests-control-group club-bests-actions" }, printButton)
    );
  }

  function getBestenlisteSettingsSummary() {
    const ageGroup = BESTS_STATE.ageGroup === "u19" ? "U19" : "Offen";
    const mode = BESTS_STATE.personalOnly ? "Bestzeit pro Sportler" : "Alle Zeiten";
    return `${BESTS_STATE.pool} m | ${ageGroup} | Top ${BESTS_STATE.limit} | ${mode}`;
  }

  function renderBestenlistePrintHeader(group) {
    return h(
      "header",
      { class: "club-bests-print-header" },
      h("p", { class: "club-bests-print-kicker" }, group?.label || "Club"),
      h("h2", {}, `${group?.name || "Club"} - Bestenliste`),
      h("p", { class: "club-bests-print-meta" }, getBestenlisteSettingsSummary())
    );
  }

  const WIN_ANSI_MAP = {
    "\u20ac": 128,
    "\u201a": 130,
    "\u0192": 131,
    "\u201e": 132,
    "\u2026": 133,
    "\u2020": 134,
    "\u2021": 135,
    "\u02c6": 136,
    "\u2030": 137,
    "\u0160": 138,
    "\u2039": 139,
    "\u0152": 140,
    "\u017d": 142,
    "\u2018": 145,
    "\u2019": 146,
    "\u201c": 147,
    "\u201d": 148,
    "\u2022": 149,
    "\u2013": 150,
    "\u2014": 151,
    "\u02dc": 152,
    "\u2122": 153,
    "\u0161": 154,
    "\u203a": 155,
    "\u0153": 156,
    "\u017e": 158,
    "\u0178": 159
  };

  function pdfText(value) {
    const bytes = [];
    for (const char of String(value ?? "")) {
      const mapped = WIN_ANSI_MAP[char];
      const code = mapped ?? char.charCodeAt(0);
      bytes.push(code >= 32 && code <= 255 ? code : 63);
    }

    return `(${bytes
      .map((byte) => {
        if (byte === 40 || byte === 41 || byte === 92) return `\\${String.fromCharCode(byte)}`;
        if (byte < 32 || byte > 126) return `\\${byte.toString(8).padStart(3, "0")}`;
        return String.fromCharCode(byte);
      })
      .join("")})`;
  }

  function fitPdfText(value, maxWidth, fontSize) {
    const text = normalize(value);
    const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * 0.5)));
    return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}...` : text;
  }

  function fmtPdfNumber(value) {
    return Number(value).toFixed(2).replace(/\.?0+$/, "");
  }

  const PDF_AVATAR_REMOTE_BASE_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/assets/svg";
  const PDF_AVATAR_BASE_URL = "./assets/svg";
  const PDF_AVATAR_RASTER_SIZE = 72;

  function buildPdfIconUrlCandidates(key) {
    const value = normalize(key);
    if (!value) return [];

    const encoded = encodeURIComponent(value);
    const bases = [PDF_AVATAR_BASE_URL, PDF_AVATAR_REMOTE_BASE_URL].filter(
      (base, index, list) => base && list.indexOf(base) === index
    );

    return bases.flatMap((base) => [`${base}/Cap-${encoded}.svg`, `${base}/CAP-${encoded}.svg`]);
  }

  function loadPdfImageElement(url) {
    const load = (src) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.decoding = "sync";
        image.loading = "eager";
        image.src = src;
      });

    return fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Cap konnte nicht geladen werden: ${url}`);
        return response.text();
      })
      .then((svgText) => load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`))
      .catch(() => load(url));
  }

  const PDF_HEX = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, "0"));

  function rasterizeSvgForPdf(image) {
    const canvas = document.createElement("canvas");
    canvas.width = PDF_AVATAR_RASTER_SIZE;
    canvas.height = PDF_AVATAR_RASTER_SIZE;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let data = "";

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      const red = Math.round(pixels[index] * alpha + 255 * (1 - alpha));
      const green = Math.round(pixels[index + 1] * alpha + 255 * (1 - alpha));
      const blue = Math.round(pixels[index + 2] * alpha + 255 * (1 - alpha));
      data += PDF_HEX[red] + PDF_HEX[green] + PDF_HEX[blue];
    }

    return {
      data: `${data}>`,
      filter: "ASCIIHexDecode",
      width: canvas.width,
      height: canvas.height
    };
  }

  async function loadPdfImageResource(url, cache) {
    if (cache.byUrl.has(url)) return cache.byUrl.get(url);

    const promise = loadPdfImageElement(url)
      .then((image) => {
        const resource = {
          name: `Im${cache.resources.length + 1}`,
          ...rasterizeSvgForPdf(image)
        };
        cache.resources.push(resource);
        return resource;
      })
      .catch(() => null);

    cache.byUrl.set(url, promise);
    return promise;
  }

  async function loadPdfImageForKeys(keys, cache) {
    for (const key of Array.isArray(keys) ? keys : []) {
      const candidates = buildPdfIconUrlCandidates(key);
      for (const url of candidates) {
        const resource = await loadPdfImageResource(url, cache);
        if (resource) return resource;
      }
    }

    for (const url of buildPdfIconUrlCandidates("Baden_light")) {
      const resource = await loadPdfImageResource(url, cache);
      if (resource) return resource;
    }

    return null;
  }

  function getPdfAvatarKeySets(group) {
    const avatar = group?.avatar || {};

    if (avatar.mode === "dual") {
      return [avatar.leftKeys || [], avatar.rightKeys || []];
    }

    if (avatar.mode === "flip") {
      return [avatar.frontKeys || [], avatar.backKeys || []];
    }

    return [avatar.iconKeys || group?.iconKeys || []];
  }

  async function buildPdfAvatarAssets(data) {
    const cache = {
      byUrl: new Map(),
      resources: []
    };
    const groupsById = new Map();
    const avatarsByGroupId = new Map();

    data.forEach((discipline) => {
      [...(discipline.women || []), ...(discipline.men || [])].forEach((entry) => {
        if (entry.affiliationGroup?.id) groupsById.set(entry.affiliationGroup.id, entry.affiliationGroup);
      });
    });

    await Promise.all(
      Array.from(groupsById.values()).map(async (group) => {
        const images = (
          await Promise.all(getPdfAvatarKeySets(group).map((keys) => loadPdfImageForKeys(keys, cache)))
        ).filter(Boolean);

        if (images.length) {
          avatarsByGroupId.set(group.id, {
            mode: images.length > 1 ? "pair" : "single",
            images
          });
        }
      })
    );

    return {
      avatarsByGroupId,
      resources: cache.resources
    };
  }

  function createPdfWriter(commands, pageHeight) {
    const yPdf = (y) => pageHeight - y;
    return {
      text(x, y, value, size = 8, font = "F1", rgb = "0 0 0") {
        commands.push(
          `BT /${font} ${fmtPdfNumber(size)} Tf ${rgb} rg ${fmtPdfNumber(x)} ${fmtPdfNumber(yPdf(y))} Td ${pdfText(value)} Tj ET`
        );
      },
      rect(x, y, width, height, rgb = "1 1 1") {
        commands.push(
          `${rgb} rg ${fmtPdfNumber(x)} ${fmtPdfNumber(pageHeight - y - height)} ${fmtPdfNumber(width)} ${fmtPdfNumber(height)} re f`
        );
      },
      line(x1, y1, x2, y2, rgb = "0.75 0.75 0.75", width = 0.5) {
        commands.push(
          `${rgb} RG ${fmtPdfNumber(width)} w ${fmtPdfNumber(x1)} ${fmtPdfNumber(yPdf(y1))} m ${fmtPdfNumber(x2)} ${fmtPdfNumber(yPdf(y2))} l S`
        );
      },
      image(x, y, width, height, resource) {
        if (!resource?.name) return;
        commands.push(
          `q ${fmtPdfNumber(width)} 0 0 ${fmtPdfNumber(height)} ${fmtPdfNumber(x)} ${fmtPdfNumber(pageHeight - y - height)} cm /${resource.name} Do Q`
        );
      }
    };
  }

  function buildPdfBlob(pageCommands, imageResources = []) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const objects = [];
    const pageIds = [];

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

    let nextObjectId = 5;
    imageResources.forEach((image) => {
      image.objectId = nextObjectId++;
      objects[image.objectId] =
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${image.filter || "ASCIIHexDecode"} /Length ${image.data.length} >>\n` +
        `stream\n${image.data}\nendstream`;
    });

    const xObjectResource = imageResources.length
      ? ` /XObject << ${imageResources.map((image) => `/${image.name} ${image.objectId} 0 R`).join(" ")} >>`
      : "";

    pageCommands.forEach((commands, index) => {
      const pageId = nextObjectId + index * 2;
      const contentId = pageId + 1;
      const stream = commands.join("\n");
      pageIds.push(`${pageId} 0 R`);
      objects[pageId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /ProcSet [/PDF /Text /ImageC] /Font << /F1 3 0 R /F2 4 0 R >>${xObjectResource} >> /Contents ${contentId} 0 R >>`;
      objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    objects[2] = `<< /Type /Pages /Kids [${pageIds.join(" ")}] /Count ${pageIds.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let id = 1; id < objects.length; id++) {
      offsets[id] = pdf.length;
      pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id++) {
      pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: "application/pdf" });
  }

  async function createBestenlistePdfBlob(group, data) {
    const pdfAvatarAssets = await buildPdfAvatarAssets(data);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 28;
    const tableWidth = pageWidth - margin * 2;
    const bottom = pageHeight - margin;
    const columns = [
      { label: "Pl.", width: 24 },
      { label: "Schwimmer", width: 132 },
      { label: "Zeit", width: 54 },
      { label: "Gliederung", width: 98 },
      { label: "Wettkampf", width: 165 },
      { label: "Datum", width: tableWidth - 24 - 132 - 54 - 98 - 165 }
    ];
    const rowHeight = 13;
    const headHeight = 13;
    const titleHeight = 15;
    const gap = 8;
    const pages = [];
    let commands = [];
    let writer = createPdfWriter(commands, pageHeight);
    let y = margin;

    const addPage = (genderTitle, continued = false) => {
      if (commands.length) pages.push(commands);
      commands = [];
      writer = createPdfWriter(commands, pageHeight);
      y = margin;
      writer.text(margin, y, group?.label || "Club", 7, "F2", "0.35 0.35 0.4");
      y += 15;
      writer.text(margin, y, `${group?.name || "Club"} - Bestenliste`, 14, "F2", "0.08 0.08 0.1");
      y += 12;
      writer.text(margin, y, getBestenlisteSettingsSummary(), 7, "F1", "0.35 0.35 0.4");
      y += 20;
      writer.text(margin, y, continued ? `${genderTitle} (Fortsetzung)` : genderTitle, 12, "F2", "0.08 0.08 0.1");
      y += 11;
    };

    const ensureSpace = (height, genderTitle) => {
      if (y + height > bottom) addPage(genderTitle, true);
    };

    const drawTableHeader = (genderKey) => {
      const swimmerLabel = genderKey === "women" ? "Schwimmerin" : "Schwimmer";
      let x = margin;
      writer.rect(margin, y, tableWidth, headHeight, "0.93 0.93 0.93");
      writer.line(margin, y, margin + tableWidth, y, "0.72 0.72 0.72", 0.5);
      writer.line(margin, y + headHeight, margin + tableWidth, y + headHeight, "0.72 0.72 0.72", 0.5);

      columns.forEach((column, index) => {
        const label = index === 1 ? swimmerLabel : column.label;
        writer.text(x + 3, y + 9, label, 7, "F2", "0.24 0.25 0.28");
        x += column.width;
      });
      y += headHeight;
    };

    const drawRows = (entries, genderKey) => {
      if (!entries.length) {
        writer.text(margin + 3, y + 9, "Keine gültigen Zeiten.", 7, "F1", "0.45 0.45 0.5");
        y += rowHeight;
        return;
      }

      for (const entry of entries) {
        let x = margin;
        writer.line(margin, y, margin + tableWidth, y, "0.86 0.86 0.88", 0.35);
        const name = `${entry.name}${entry.birthYear ? ` (${formatBirthYearShort(entry.birthYear)})` : ""}`;
        const values = [
          String(entry.rank),
          fitPdfText(name, columns[1].width - 6, 7.4),
          entry.timeLabel,
          "",
          fitPdfText(entry.meetName || "-", columns[4].width - 6, 7.2),
          entry.dateLabel || "-"
        ];

        values.forEach((value, index) => {
          if (index === 3) {
            const avatar = pdfAvatarAssets.avatarsByGroupId.get(entry.affiliationGroup?.id);
            const iconSize = 10.5;
            const iconY = y + (rowHeight - iconSize) / 2;
            let textX = x + 3;
            let textWidth = columns[3].width - 6;

            if (avatar?.images?.length) {
              if (avatar.images.length > 1) {
                writer.image(x + 3, iconY, iconSize, iconSize, avatar.images[0]);
                writer.image(x + 10, iconY, iconSize, iconSize, avatar.images[1]);
                textX = x + 23;
                textWidth = columns[3].width - 26;
              } else {
                writer.image(x + 3, iconY, iconSize, iconSize, avatar.images[0]);
                textX = x + 17.5;
                textWidth = columns[3].width - 20.5;
              }
            }

            writer.text(
              textX,
              y + 9,
              fitPdfText(entry.affiliation || "-", textWidth, 7.2),
              7.2,
              "F1",
              "0.12 0.16 0.21"
            );
            x += columns[index].width;
            return;
          }

          const font = index === 1 || index === 2 ? "F2" : "F1";
          writer.text(x + 3, y + 9, value, index === 1 || index === 2 ? 7.4 : 7.2, font, "0.12 0.16 0.21");
          x += columns[index].width;
        });
        y += rowHeight;
      }
    };

    const renderGender = (genderKey, genderTitle) => {
      addPage(genderTitle);

      data.forEach((discipline) => {
        const entries = genderKey === "women" ? discipline.women : discipline.men;
        const tableHeight = titleHeight + headHeight + Math.max(1, entries.length) * rowHeight + gap;
        ensureSpace(tableHeight, genderTitle);
        writer.text(margin, y, discipline.label, 10, "F2", "0.82 0 0");
        y += titleHeight;
        drawTableHeader(genderKey);
        drawRows(entries, genderKey);
        y += gap;
      });
    };

    renderGender("women", "Frauen");
    renderGender("men", "Männer");
    if (commands.length) pages.push(commands);
    return buildPdfBlob(pages, pdfAvatarAssets.resources);
  }

  async function openBestenlistePdf(group) {
    const ageGroup = BESTS_STATE.ageGroup === "u19" ? "U19" : "Offen";
    const tab = window.open("", "_blank");
    if (tab) {
      tab.document.write("<!doctype html><title>PDF wird erstellt</title><body style=\"font-family:sans-serif;padding:24px\">PDF wird erstellt...</body>");
    }

    try {
      const rows = await getBestenlisteRows();
      const data = buildBestenliste(rows, group, BESTS_STATE);
      const blob = await createBestenlistePdfBlob(group, data);
      const url = URL.createObjectURL(blob);

      if (tab) {
        tab.location.href = url;
      } else {
        window.open(url, "_blank");
      }

      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (error) {
      console.error("PDF konnte nicht erstellt werden:", error);
      if (tab) {
        tab.document.body.textContent = "PDF konnte nicht erstellt werden.";
      }
    }
  }

  function renderBestRows(entries) {
    if (!entries.length) {
      return h("div", { class: "club-bests-empty" }, "Keine gültigen Zeiten.");
    }

    const showCapColumn = entries.some((entry) => entry.affiliationGroup);

    return h(
      "div",
      { class: "club-bests-table-wrap" },
      h(
        "table",
        { class: `club-bests-table${showCapColumn ? " has-club-caps" : ""}` },
        h(
          "thead",
          {},
          h(
            "tr",
            {},
            h("th", {}, "#"),
            showCapColumn ? h("th", { class: "club-bests-cap-head", "aria-label": "Club" }, "") : null,
            h("th", {}, "Name"),
            h("th", {}, "Zeit"),
            h("th", {}, "Wettkampf"),
            h("th", {}, "Datum")
          )
        ),
        h(
          "tbody",
          {},
          entries.map((entry) =>
            h(
              "tr",
              { class: entry.affiliationGroup ? "has-club-cap" : "" },
              h("td", { class: "club-bests-rank", "data-label": "#" }, String(entry.rank)),
              showCapColumn
                ? h(
                    "td",
                    { class: "club-bests-cap-cell", "data-label": "Club" },
                    entry.affiliationGroup ? renderAffiliationAvatar(entry) : null
                  )
                : null,
              h(
                "td",
                { class: "club-bests-name", "data-label": "Name" },
                h(
                  "span",
                  { class: `club-bests-name-main${getNameFitClass(entry)}` },
                  entry.name,
                  entry.birthYear
                    ? h("span", { class: "club-bests-birth-year" }, ` (${formatBirthYearShort(entry.birthYear)})`)
                    : null
                ),
                renderAffiliation(entry)
              ),
              h(
                "td",
                { class: "club-bests-time", "data-label": "Zeit" },
                h("span", { class: "club-bests-time-main" }, entry.timeLabel),
                h("span", { class: "club-bests-mobile-meet" }, entry.meetName || "—")
              ),
              h("td", { class: "club-bests-meet", "data-label": "Wettkampf" }, entry.meetName || "—"),
              h("td", { class: "club-bests-date", "data-label": "Datum" }, entry.dateLabel || "—")
            )
          )
        )
      )
    );
  }

  function renderAffiliation(entry) {
    if (!entry.affiliation) return null;

    return h(
      "div",
      { class: "club-bests-affiliation" },
      h("span", { class: "club-bests-affiliation-text" }, entry.affiliation)
    );
  }

  function renderAffiliationAvatar(entry) {
    if (
      !entry.affiliationGroup ||
      !window.ClubsSearch ||
      typeof window.ClubsSearch.renderAvatar !== "function"
    ) {
      return null;
    }

    return h(
      "div",
      { class: "club-bests-cap-wrap", "aria-hidden": "true" },
      window.ClubsSearch.renderAvatar(entry.affiliationGroup, "sm", "club-bests-row-avatar")
    );
  }

  function getGenderPagerIndex(grid) {
    if (!grid || !grid.clientWidth) return 0;
    return Math.max(0, Math.round(grid.scrollLeft / grid.clientWidth));
  }

  function updateGenderPager(grid, dots, prevButton, nextButton) {
    const page = getGenderPagerIndex(grid);
    const lastPage = Math.max(0, dots.length - 1);

    dots.forEach((dot, index) => {
      const active = index === page;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "page" : "false");
    });

    if (prevButton) prevButton.disabled = page <= 0;
    if (nextButton) nextButton.disabled = page >= lastPage;
  }

  function scrollGenderPager(grid, page) {
    if (!grid) return;
    grid.scrollTo({
      left: grid.clientWidth * page,
      behavior: "smooth"
    });
  }

  function renderGenderPager(discipline) {
    const pages = [
      { label: "Frauen", entries: discipline.women },
      { label: "MÃ¤nner", entries: discipline.men }
    ];

    const grid = h(
      "div",
      { class: "club-bests-gender-grid" },
      pages.map((page) =>
        h(
          "section",
          { class: "club-bests-gender-section", "aria-label": `${discipline.label} ${page.label}` },
          h("div", { class: "club-bests-gender-title" }, page.label),
          renderBestRows(page.entries)
        )
      )
    );

    const dots = pages.map((page, index) =>
      h("button", {
        class: `club-bests-page-dot${index === 0 ? " is-active" : ""}`,
        type: "button",
        "aria-label": `${discipline.label} ${page.label} anzeigen`,
        "aria-current": index === 0 ? "page" : "false",
        onclick: () => scrollGenderPager(grid, index)
      })
    );

    const prevButton = h("button", {
      class: "club-bests-pager-arrow club-bests-pager-arrow--prev",
      type: "button",
      "aria-label": "Vorherige Tabelle",
      disabled: true,
      onclick: () => scrollGenderPager(grid, Math.max(0, getGenderPagerIndex(grid) - 1))
    });
    const nextButton = h("button", {
      class: "club-bests-pager-arrow club-bests-pager-arrow--next",
      type: "button",
      "aria-label": "NÃ¤chste Tabelle",
      onclick: () => scrollGenderPager(grid, Math.min(pages.length - 1, getGenderPagerIndex(grid) + 1))
    });

    let frame = 0;
    grid.addEventListener(
      "scroll",
      () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => updateGenderPager(grid, dots, prevButton, nextButton));
      },
      { passive: true }
    );
    requestAnimationFrame(() => updateGenderPager(grid, dots, prevButton, nextButton));

    return h(
      "div",
      { class: "club-bests-gender-pager" },
      prevButton,
      grid,
      nextButton,
      h("div", { class: "club-bests-page-dots" }, dots)
    );
  }

  function ensureGenderPager(grid) {
    if (!grid || grid.closest(".club-bests-gender-pager")) return;

    const pages = Array.from(grid.querySelectorAll(".club-bests-gender-section"));
    if (pages.length <= 1 || !grid.parentNode) return;

    const pager = h("div", { class: "club-bests-gender-pager" });
    const prevButton = h("button", {
      class: "club-bests-pager-arrow club-bests-pager-arrow--prev",
      type: "button",
      "aria-label": "Vorherige Tabelle",
      disabled: true,
      onclick: () => scrollGenderPager(grid, Math.max(0, getGenderPagerIndex(grid) - 1))
    });
    const nextButton = h("button", {
      class: "club-bests-pager-arrow club-bests-pager-arrow--next",
      type: "button",
      "aria-label": "NÃ¤chste Tabelle",
      onclick: () => scrollGenderPager(grid, Math.min(pages.length - 1, getGenderPagerIndex(grid) + 1))
    });
    const dots = pages.map((page, index) => {
      const label = page.querySelector(".club-bests-gender-title")?.textContent || `Seite ${index + 1}`;
      return h("button", {
        class: `club-bests-page-dot${index === 0 ? " is-active" : ""}`,
        type: "button",
        "aria-label": `${label} anzeigen`,
        "aria-current": index === 0 ? "page" : "false",
        onclick: () => scrollGenderPager(grid, index)
      });
    });

    grid.parentNode.insertBefore(pager, grid);
    pager.appendChild(prevButton);
    pager.appendChild(grid);
    pager.appendChild(nextButton);
    pager.appendChild(h("div", { class: "club-bests-page-dots" }, dots));

    let frame = 0;
    grid.addEventListener(
      "scroll",
      () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => updateGenderPager(grid, dots, prevButton, nextButton));
      },
      { passive: true }
    );
    requestAnimationFrame(() => updateGenderPager(grid, dots, prevButton, nextButton));
  }

  function initGenderPagers(root) {
    root?.querySelectorAll(".club-bests-gender-grid").forEach(ensureGenderPager);
  }

  function renderBestenlisteGrid(data) {
    return h(
      "div",
      { class: "club-bests-grid" },
      data.map((discipline) =>
        h(
          "article",
          { class: "club-bests-card" },
          h("header", { class: "club-bests-card-head" }, h("h3", {}, discipline.label)),
          h(
            "div",
            { class: "club-bests-gender-grid" },
            h(
              "section",
              { class: "club-bests-gender-section", "aria-label": `${discipline.label} weiblich` },
              h("div", { class: "club-bests-gender-title" }, "Frauen"),
              renderBestRows(discipline.women)
            ),
            h(
              "section",
              { class: "club-bests-gender-section", "aria-label": `${discipline.label} männlich` },
              h("div", { class: "club-bests-gender-title" }, "Männer"),
              renderBestRows(discipline.men)
            )
          )
        )
      )
    );
  }

  function renderPrintAffiliation(entry) {
    return h(
      "div",
      { class: "club-bests-print-affiliation" },
      entry.affiliationGroup
        ? h("span", { class: "club-bests-print-affiliation-cap", "aria-hidden": "true" }, renderAffiliationAvatar(entry))
        : null,
      h("span", { class: "club-bests-print-affiliation-name" }, entry.affiliation || "—")
    );
  }

  function renderPrintRows(entries, genderKey) {
    const swimmerLabel = genderKey === "women" ? "Schwimmerin" : "Schwimmer";

    if (!entries.length) {
      return h("div", { class: "club-bests-print-empty" }, "Keine gültigen Zeiten.");
    }

    return h(
      "table",
      { class: "club-bests-print-table" },
      h(
        "thead",
        {},
        h(
          "tr",
          {},
          h("th", { class: "club-bests-print-rank" }, "Pl."),
          h("th", {}, swimmerLabel),
          h("th", { class: "club-bests-print-time" }, "Zeit"),
          h("th", {}, "Gliederung"),
          h("th", {}, "Wettkampf"),
          h("th", { class: "club-bests-print-date" }, "Datum")
        )
      ),
      h(
        "tbody",
        {},
        entries.map((entry) =>
          h(
            "tr",
            {},
            h("td", { class: "club-bests-print-rank" }, String(entry.rank)),
            h(
              "td",
              { class: "club-bests-print-name" },
              entry.name,
              entry.birthYear ? ` (${formatBirthYearShort(entry.birthYear)})` : ""
            ),
            h("td", { class: "club-bests-print-time" }, entry.timeLabel),
            h("td", {}, renderPrintAffiliation(entry)),
            h("td", { class: "club-bests-print-meet" }, entry.meetName || "—"),
            h("td", { class: "club-bests-print-date" }, entry.dateLabel || "—")
          )
        )
      )
    );
  }

  function renderBestenlistePrintLayout(data) {
    const renderGenderPage = (genderKey, title) =>
      h(
        "section",
        { class: "club-bests-print-gender" },
        h("h3", { class: "club-bests-print-gender-title" }, title),
        h(
          "div",
          { class: "club-bests-print-disciplines" },
          data.map((discipline) =>
            h(
              "article",
              { class: "club-bests-print-discipline" },
              h("h4", { class: "club-bests-print-discipline-title" }, discipline.label),
              renderPrintRows(genderKey === "women" ? discipline.women : discipline.men, genderKey)
            )
          )
        )
      );

    return h(
      "div",
      { class: "club-bests-print-layout" },
      renderGenderPage("women", "Frauen"),
      renderGenderPage("men", "MÃ¤nner")
    );
  }

  async function getBestenlisteRows() {
    if (!getBestenlisteRows.promise) {
      getBestenlisteRows.promise = window.ClubsData.loadWorkbookArray("Tabelle2");
    }
    return getBestenlisteRows.promise;
  }

  async function renderBestenliste(panel, group) {
    if (!panel || !group) return;

    panel.innerHTML = "";
    panel.appendChild(renderBestenlistePrintHeader(group));
    panel.appendChild(createBestenlisteControls(panel, group));
    const content = h("div", { class: "club-bests-content" }, h("div", { class: "club-bests-status" }, "Bestenliste wird geladen ..."));
    panel.appendChild(content);

    try {
      const rows = await getBestenlisteRows();
      const data = buildBestenliste(rows, group, BESTS_STATE);
      content.innerHTML = "";
      content.appendChild(renderBestenlisteGrid(data));
      initGenderPagers(content);
      content.appendChild(renderBestenlistePrintLayout(data));
    } catch (error) {
      console.error("Club-Bestenliste konnte nicht geladen werden:", error);
      content.innerHTML = "";
      content.appendChild(h("div", { class: "club-bests-status club-bests-status--error" }, "Bestenliste konnte nicht geladen werden."));
    }
  }

  function getActiveTabKey() {
    const hash = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
    return PROFILE_TABS.some((tab) => tab.key === hash) ? hash : PROFILE_TABS[0].key;
  }

  function activateProfileTab(shell, key, updateHash = true) {
    const activeKey = PROFILE_TABS.some((tab) => tab.key === key) ? key : PROFILE_TABS[0].key;

    shell.querySelectorAll(".club-profile-tab").forEach((tab) => {
      const isActive = tab.dataset.key === activeKey;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    shell.querySelectorAll(".club-profile-panel").forEach((panel) => {
      const isActive = panel.dataset.key === activeKey;
      panel.classList.toggle("is-active", isActive);
      panel.toggleAttribute("hidden", !isActive);
    });

    if (updateHash) {
      const url = new URL(window.location.href);
      url.hash = activeKey;
      history.replaceState(null, "", url.toString());
    }
  }

  function renderProfileShell(group) {
    const mount = $("#rekorde-profil-container");
    if (!mount) return;

    mount.innerHTML = "";

    if (!group) {
      mount.appendChild(
        h(
          "section",
          { class: "rek-profile-error" },
          h("p", {}, "Die angefragte Gliederung konnte nicht gefunden werden.")
        )
      );
      return;
    }

    const shell = h("section", { class: "club-profile-shell", "aria-label": "Clubprofil" });
    const tabs = h(
      "div",
      { class: "club-profile-tabs", role: "tablist", "aria-label": "Clubprofil-Bereiche" },
      PROFILE_TABS.map((tab) =>
        h(
          "button",
          {
            class: "club-profile-tab",
            type: "button",
            role: "tab",
            id: `club-profile-tab-${tab.key}`,
            "aria-controls": `club-profile-panel-${tab.key}`,
            dataset: { key: tab.key },
            onclick: () => activateProfileTab(shell, tab.key)
          },
          tab.label
        )
      )
    );
    const panels = h(
      "div",
      { class: "club-profile-panels" },
      PROFILE_TABS.map((tab) =>
        h("section", {
          class: "club-profile-panel",
          role: "tabpanel",
          id: `club-profile-panel-${tab.key}`,
          "aria-labelledby": `club-profile-tab-${tab.key}`,
          dataset: { key: tab.key },
          hidden: true
        })
      )
    );

    tabs.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

      const currentIndex = PROFILE_TABS.findIndex((tab) => tab.key === getActiveTabKey());
      const dir = event.key === "ArrowRight" ? 1 : -1;
      const next = PROFILE_TABS[(currentIndex + dir + PROFILE_TABS.length) % PROFILE_TABS.length];
      event.preventDefault();
      activateProfileTab(shell, next.key);
      shell.querySelector(`[data-key="${next.key}"]`)?.focus();
    });

    shell.appendChild(tabs);
    shell.appendChild(panels);
    mount.appendChild(shell);
    activateProfileTab(shell, getActiveTabKey(), false);
    renderBestenliste(panels.querySelector('[data-key="bestenliste"]'), group);
  }

  function openGroup(group) {
    if (!group) return;

    setHero(group);

    const url = new URL(window.location.href);
    url.searchParams.set("gliederung", String(group.id || ""));
    url.hash = "";
    history.replaceState(null, "", url.toString());

    renderProfileShell(group);
  }

  function renderApp() {
    const searchMount = $("#rek-search-layer");
    if (searchMount && window.ClubsSearch && typeof window.ClubsSearch.mount === "function") {
      searchMount.innerHTML = "";
      window.ClubsSearch.mount(searchMount, { openProfile: openGroup });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    renderApp();
    await new Promise(requestAnimationFrame);

    try {
      if (!window.ClubsData || typeof window.ClubsData.loadGroupsAndStats !== "function") {
        throw new Error("ClubsData missing");
      }

      const { groups } = await window.ClubsData.loadGroupsAndStats({ sheetName: "Tabelle2" });
      setProfileGroups(groups);

      if (window.ClubsSearch && typeof window.ClubsSearch.setGroups === "function") {
        window.ClubsSearch.setGroups(groups);
      }

      const requestedId = getGroupIdFromUrl();
      if (!requestedId) {
        setHero({ label: "Clubs", name: "Clubs", subtitle: "" });
        const mount = $("#rekorde-profil-container");
        if (mount) mount.innerHTML = "";
        return;
      }

      const hit = window.ClubsData.findGroupById(groups, requestedId);

      setHero(hit);
      renderProfileShell(hit);
    } catch (err) {
      console.error("Clubs-Profil Boot-Fehler:", err);
      setHero(null);

      const mount = $("#rekorde-profil-container");
      if (mount) {
        mount.innerHTML = '<section class="rek-profile-error"><p>Fehler beim Laden der Daten.</p></section>';
      }

      if (window.ClubsSearch && typeof window.ClubsSearch.showError === "function") {
        window.ClubsSearch.showError("Fehler beim Laden der Daten.");
      }
    }
  });
})();
