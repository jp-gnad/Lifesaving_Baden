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
    { key: "erfolge", label: "Erfolge" },
    { key: "wettkaempfe", label: "Wettkämpfe" }
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
    land: 23,
    startrecht: 24,
    wertung: 25,
    vorlaeufe: 26,
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
  let PROFILE_GROUPS = [];
  const LV_CODES_BY_GROUP = {
    Baden: ["BA"],
    "Baden-Württemberg": ["BA", "WÜ", "WU", "WUE"],
    Berlin: ["BE"],
    Brandenburg: ["BB"],
    Hessen: ["HE"],
    Nordrhein: ["NR", "NW", "NO", "NRH"],
    "Nordrhein-Westfalen": ["NR", "NW", "NO", "NRH", "WE", "WF", "WL"],
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

  function formatDateShort(iso) {
    const date = new Date(String(iso || "").slice(0, 10));
    if (Number.isNaN(date.getTime())) return "";
    const months = ["Jan.", "Feb.", "Mär.", "Apr.", "Mai", "Jun.", "Jul.", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
    return `${date.getUTCDate()}. ${months[date.getUTCMonth()]}`;
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

  function normalizeMeetName(value) {
    return normalize(value).replace(/\s+-\s+.*$/, "");
  }

  function normalizeLand(value) {
    const land = normalize(value);
    if (!land) return "";
    return land.toUpperCase() === "GER" ? "Deutschland" : land;
  }

  function iso3FromLand(landName) {
    const land = normalizeLand(landName);
    if (!land) return "";
    if (/^[A-Z]{3}$/.test(land)) return land;
    return LAND_TO_ISO3[land] || land.slice(0, 3).toUpperCase();
  }

  function poolLabel(pool) {
    const value = normalize(pool);
    if (value === "25") return "25 m";
    if (value === "50") return "50 m";
    return "";
  }

  function medalForPlace(placeStr) {
    const place = parseInt(placeStr, 10);
    if (!Number.isFinite(place)) return null;
    if (place === 1) return { file: "medal_gold.svg", alt: "Gold" };
    if (place === 2) return { file: "medal_silver.svg", alt: "Silber" };
    if (place === 3) return { file: "medal_bronze.svg", alt: "Bronze" };
    return null;
  }

  function formatClubMeetPlace(value) {
    const text = normalize(value);
    if (!text) return "";
    const place = parseInt(text, 10);
    return Number.isFinite(place) ? String(place) : text;
  }

  function capFileFromOrtsgruppe(rawOG) {
    const og = normalize(rawOG).replace(/^og\s+/i, "");
    if (!og) return "";
    if (og === "Nieder-Olm/Wörrstadt") return "Cap-Nieder-OlmWörrstadt.svg";
    return `Cap-${og}.svg`;
  }

  function getClubMeetStartrechtCap(row) {
    const startrecht = normalize(row?.[COLS.startrecht]).toUpperCase();

    if (startrecht === "OG") {
      const ogName = normalize(row?.[COLS.ortsgruppe]).replace(/^og\s+/i, "");
      const file = capFileFromOrtsgruppe(ogName);
      return file ? { key: `OG|${ogName}`, file, label: `OG ${ogName}` } : null;
    }

    if (startrecht === "LV") {
      const code = normalizeLvCode(row?.[COLS.lvState]);
      return code ? { key: `LV|${code}`, file: `Cap-${code}.svg`, label: `LV ${code}` } : null;
    }

    if (startrecht === "BV") {
      const code = normalizeBvCode(row?.[COLS.bvNatio]);
      return code ? { key: `BV|${code}`, file: `Cap-${code}.svg`, label: `BV ${code}` } : null;
    }

    return null;
  }

  function isClubMeetIndividualScoring(value) {
    const scoring = normalize(value).toLowerCase().replace(/[\s\-]+/g, "");
    return !scoring || scoring.includes("einzel");
  }

  function isSeniorClubMeetName(meetName) {
    const raw = normalize(meetName);
    const shortName = normalizeMeetName(raw);
    return normalizeForCompare(shortName) === "dsm" || /-\s*sen\b/i.test(raw);
  }

  function ageGroupFromBirthYear(birthYear, meetYear, meetName = "") {
    const born = Number(birthYear);
    const year = Number(meetYear);
    if (!Number.isFinite(born) || !Number.isFinite(year) || born <= 0) return { label: "AK ?", sort: 99 };

    const age = year - born;
    if (isSeniorClubMeetName(meetName)) {
      const seniorAge = Math.max(20, Math.floor(age / 5) * 5);
      return { label: `AK ${seniorAge}`, sort: seniorAge };
    }

    if (age <= 10) return { label: "AK 10", sort: 10 };
    if (age <= 12) return { label: "AK 12", sort: 12 };
    if (age <= 14) return { label: "AK 13/14", sort: 14 };
    if (age <= 16) return { label: "AK 15/16", sort: 16 };
    if (age <= 18) return { label: "AK 17/18", sort: 18 };
    return { label: "Offen", sort: 50 };
  }

  function genderLabel(gender) {
    return normalizeGender(gender) === "w" ? "weiblich" : "männlich";
  }

  function genderSortValue(gender) {
    return normalizeGender(gender) === "w" ? 0 : 1;
  }

  function compareClubMeetAthlete(left, right) {
    const ageDiff = Number(left.ageGroupSort) - Number(right.ageGroupSort);
    if (ageDiff !== 0) return ageDiff;

    const genderDiff = genderSortValue(left.gender) - genderSortValue(right.gender);
    if (genderDiff !== 0) return genderDiff;

    const placeDiff = clubMeetPlaceSortValue(left.multiPlace) - clubMeetPlaceSortValue(right.multiPlace);
    if (placeDiff !== 0) return placeDiff;

    const lastNameCompare = String(left.lastName || "").localeCompare(String(right.lastName || ""), "de", { sensitivity: "base" });
    if (lastNameCompare !== 0) return lastNameCompare;

    const firstNameCompare = String(left.firstName || "").localeCompare(String(right.firstName || ""), "de", { sensitivity: "base" });
    if (firstNameCompare !== 0) return firstNameCompare;

    return Number(left.birthYear || 0) - Number(right.birthYear || 0);
  }

  function clubMeetPlaceSortValue(place) {
    const parsed = parseInt(place, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 9999;
  }

  function hasClubMeetStartValue(value) {
    if (value == null) return false;
    if (typeof value === "number") return Number.isFinite(value) && value > 0;
    const text = normalize(value);
    return !!text && !/^[-—]$/.test(text) && !/^0(?:[,.]0+)?$/.test(text);
  }

  function formatClubMeetStartTime(value) {
    const seconds = parseTimeToSec(value);
    if (Number.isFinite(seconds)) return formatSeconds(seconds);
    return normalize(value) || "—";
  }

  function roundLabelFromLauf(laufNummer, maxLauf) {
    const run = Number(laufNummer);
    const max = Number(maxLauf);
    if (!Number.isFinite(run) || !Number.isFinite(max) || max <= 1) return "";

    if (max === 2) return run === 1 ? "Vorlauf" : (run === 2 ? "Finale" : "");
    if (max === 3) return run === 1 ? "Vorlauf" : (run === 2 ? "Halbfinale" : (run === 3 ? "Finale" : ""));
    if (max === 4) {
      if (run === 1) return "Vorlauf";
      if (run === 2) return "Viertelfinale";
      if (run === 3) return "Halbfinale";
      if (run === 4) return "Finale";
      return "";
    }

    if (run === max) return "Finale";
    if (run === max - 1) return "Halbfinale";
    if (run === max - 2) return "Viertelfinale";
    return "Vorlauf";
  }

  function getClubMeetRunNumber(row, athlete) {
    const raw = normalize(row?.[COLS.vorlaeufe]);
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return Number(athlete?.runRows || 0) + 1;
  }

  function collectClubMeetStarts(row, runNo) {
    return DISCIPLINES
      .map((discipline, index) => {
        const rawValue = row?.[discipline.col];
        const rawPlace = row?.[discipline.placeCol];
        if (!hasClubMeetStartValue(rawValue) && !hasClubMeetStartValue(rawPlace)) return null;

        return {
          key: discipline.key,
          label: discipline.label,
          order: index,
          runNo,
          placeLabel: formatClubMeetPlace(rawPlace),
          showMedal: isClubMeetIndividualScoring(row?.[COLS.wertung]),
          timeLabel: formatClubMeetStartTime(rawValue)
        };
      })
      .filter(Boolean);
  }

  function addClubMeetStarts(athlete, starts) {
    if (!athlete || !Array.isArray(starts) || !starts.length) return;
    if (!Array.isArray(athlete.starts)) athlete.starts = [];
    if (!(athlete.startKeys instanceof Set)) athlete.startKeys = new Set();

    starts.forEach((start) => {
      const key = `${start.key}|${start.runNo || ""}|${start.placeLabel}|${start.timeLabel}`;
      if (athlete.startKeys.has(key)) return;
      athlete.startKeys.add(key);
      athlete.starts.push(start);
    });

    athlete.starts.sort((left, right) => (Number(left.order) - Number(right.order)) || (Number(left.runNo || 0) - Number(right.runNo || 0)));
  }

  function addClubMeetStartrechtCap(athlete, row) {
    const cap = getClubMeetStartrechtCap(row);
    if (!athlete || !cap) return;
    if (!Array.isArray(athlete.startrechtCaps)) athlete.startrechtCaps = [];
    if (!(athlete.startrechtCapKeys instanceof Set)) athlete.startrechtCapKeys = new Set();
    if (athlete.startrechtCapKeys.has(cap.key)) return;
    athlete.startrechtCapKeys.add(cap.key);
    athlete.startrechtCaps.push(cap);
  }

  function finalizeClubMeetAthlete(athlete) {
    if (!athlete || !Array.isArray(athlete.starts)) return athlete;
    const totalRuns = Number.isFinite(Number(athlete.runMax)) ? Number(athlete.runMax) : athlete.starts.length;
    athlete.starts.forEach((start) => {
      start.roundLabel = roundLabelFromLauf(start.runNo, totalRuns);
      start.isFinalRun = totalRuns <= 1 || Number(start.runNo) === totalRuns;
    });
    return athlete;
  }

  function setClubMeetMultiPlace(athlete, rawPlace) {
    if (!athlete) return;
    const place = formatClubMeetPlace(rawPlace);
    if (!place || athlete.multiPlace) return;
    athlete.multiPlace = place;
  }

  function renderClubMeetPlace(place, className = "club-meet-place", showMedal = true, suffix = "") {
    const placeLabel = formatClubMeetPlace(place);
    const medal = showMedal ? medalForPlace(placeLabel) : null;

    return h(
      "span",
      { class: className },
      h("span", {}, placeLabel ? `${placeLabel}${suffix}` : "—"),
      medal
        ? h("img", {
            class: "club-meet-medal",
            src: `./assets/svg/${medal.file}`,
            alt: medal.alt,
            loading: "lazy",
            decoding: "async",
            onerror: (event) => event.currentTarget.remove()
          })
        : null
    );
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
    const rawAffiliation = normalize(row?.[COLS.ortsgruppe]).replace(/^og\s+/i, "");
    const foldedAffiliation = normalizeForCompare(rawAffiliation);
    if (foldedAffiliation === "ettlingen" || foldedAffiliation === "wettersbach") {
      return rawAffiliation;
    }

    return window.ClubsData && typeof window.ClubsData.normalizeOrtsgruppeName === "function"
      ? window.ClubsData.normalizeOrtsgruppeName(row[COLS.ortsgruppe])
      : normalize(row[COLS.ortsgruppe]);
  }

  function createSingleOgAffiliationGroup(affiliation) {
    const name = normalize(affiliation);
    const folded = normalizeForCompare(name);
    if (folded !== "ettlingen" && folded !== "wettersbach") return null;

    return {
      id: `group_og_${folded}`,
      kind: "og",
      name,
      label: "Ortsgruppe",
      searchKeys: [name],
      avatar: {
        mode: "single",
        iconKeys: [name]
      }
    };
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

  function findBestenlisteAffiliationGroup(affiliation) {
    return createSingleOgAffiliationGroup(affiliation) || findAffiliationGroup(affiliation);
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
      const affiliationGroup = showAffiliationAvatar ? findBestenlisteAffiliationGroup(affiliation) : null;
      if (isInvalidResultMark(row[COLS.pMehrkampf])) continue;

      for (const discipline of DISCIPLINES) {
        if (isInvalidResultMark(row[discipline.placeCol])) continue;
        if (discipline.key === "z100k") {
          const meetYear = getYearFromISO(dateIso);
          if (Number.isFinite(meetYear) && meetYear < 2007) continue;
        }

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

  function formatDateLocalDE(date = new Date()) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) return "";

    return `${String(value.getDate()).padStart(2, "0")}.${String(value.getMonth() + 1).padStart(2, "0")}.${value.getFullYear()}`;
  }

  function getBestenlisteStandSummary(date = new Date()) {
    const dateText = typeof date === "string" ? formatDateDE(date) : formatDateLocalDE(date);
    return `Stand: ${dateText || "-"}`;
  }

  function getLatestDatabaseMeetDateIso(rows) {
    let latest = "";

    for (const row of Array.isArray(rows) ? rows : []) {
      const iso = excelSerialToISO(row?.[COLS.excelDate]);
      if (iso && (!latest || iso > latest)) latest = iso;
    }

    return latest;
  }

  function sanitizePdfFileNamePart(value) {
    const part = normalize(value)
      .replace(/[<>:"/\\|?*]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[.-]+|[.-]+$/g, "");
    return part || "Club";
  }

  function getBestenlistePdfFileName(group, date = new Date()) {
    return [
      "Bestenliste",
      `${BESTS_STATE.pool}m`,
      sanitizePdfFileNamePart(group?.name || "Club"),
      formatDateLocalDE(date).replace(/[<>:"/\\|?*]+/g, "-")
    ].join("_") + ".pdf";
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
  const PDF_AVATAR_REPLACEMENT_OPACITY = 0.28;

  function pushPdfUnique(list, value) {
    const normalizedValue = normalize(value);
    if (!normalizedValue || list.includes(normalizedValue)) return;
    list.push(normalizedValue);
  }

  function buildPdfCapKeyVariants(raw) {
    const value = normalize(raw);
    if (!value) return [];

    const out = [];
    const ascii = value
      .replace(/\u00e4/gi, "ae")
      .replace(/\u00f6/gi, "oe")
      .replace(/\u00fc/gi, "ue")
      .replace(/\u00df/g, "ss");

    pushPdfUnique(out, value);
    pushPdfUnique(out, ascii);
    pushPdfUnique(out, value.replace(/[\/\\]/g, ""));
    pushPdfUnique(out, ascii.replace(/[\/\\]/g, ""));
    pushPdfUnique(out, value.replace(/[\/\\]/g, "-"));
    pushPdfUnique(out, ascii.replace(/[\/\\]/g, "-"));
    pushPdfUnique(out, value.replace(/\s+/g, ""));
    pushPdfUnique(out, ascii.replace(/\s+/g, ""));

    return out;
  }

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

  function rasterizeSvgForPdf(image, opacity = 1) {
    const canvas = document.createElement("canvas");
    canvas.width = PDF_AVATAR_RASTER_SIZE;
    canvas.height = PDF_AVATAR_RASTER_SIZE;
    const clampedOpacity = Math.max(0, Math.min(1, Number(opacity) || 1));

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let data = "";

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = (pixels[index + 3] / 255) * clampedOpacity;
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

  async function loadPdfImageResource(url, cache, opacity = 1) {
    const clampedOpacity = Math.max(0, Math.min(1, Number(opacity) || 1));
    const cacheKey = `${url}|${clampedOpacity}`;
    if (cache.byUrl.has(cacheKey)) return cache.byUrl.get(cacheKey);

    const promise = loadPdfImageElement(url)
      .then((image) => {
        const resource = {
          name: `Im${cache.resources.length + 1}`,
          ...rasterizeSvgForPdf(image, clampedOpacity)
        };
        cache.resources.push(resource);
        return resource;
      })
      .catch(() => null);

    cache.byUrl.set(cacheKey, promise);
    return promise;
  }

  async function loadPdfImageForKeys(keys, cache, options = {}) {
    const primaryKeys = options.primaryKeys instanceof Set ? options.primaryKeys : new Set();
    const fadeReplacements = !!options.fadeReplacements;

    for (const key of Array.isArray(keys) ? keys : []) {
      const candidates = buildPdfIconUrlCandidates(key);
      const isPrimaryKey = primaryKeys.has(normalizeForCompare(key));
      const opacity = fadeReplacements && !isPrimaryKey ? PDF_AVATAR_REPLACEMENT_OPACITY : 1;

      for (const url of candidates) {
        const resource = await loadPdfImageResource(url, cache, opacity);
        if (resource) return resource;
      }
    }

    for (const url of buildPdfIconUrlCandidates("Baden_light")) {
      const opacity = fadeReplacements ? PDF_AVATAR_REPLACEMENT_OPACITY : 1;
      const resource = await loadPdfImageResource(url, cache, opacity);
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

  function getPdfPrimaryAvatarKeys(group) {
    const primaryKeys = [];

    if (group?.kind === "og") {
      [group.name, ...(Array.isArray(group.searchKeys) ? group.searchKeys : [])].forEach((value) => {
        buildPdfCapKeyVariants(value).forEach((key) => pushPdfUnique(primaryKeys, key));
      });
    }

    return new Set(primaryKeys.map(normalizeForCompare));
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
        const primaryKeys = getPdfPrimaryAvatarKeys(group);
        const fadeReplacements = group?.kind === "og" && primaryKeys.size > 0;
        const images = (
          await Promise.all(
            getPdfAvatarKeySets(group).map((keys) =>
              loadPdfImageForKeys(keys, cache, {
                fadeReplacements,
                primaryKeys
              })
            )
          )
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

  const PDF_FONT_REMOTE_BASE_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/assets/fonts";
  const PDF_FONT_BASE_URL = "./assets/fonts";
  const PDF_FONT_DEFS = [
    { resourceName: "F1", fontName: "DLRG-Regular", fileName: "LT_50141_regular.woff", weight: 400 },
    { resourceName: "F2", fontName: "DLRG-Heavy", fileName: "LT_50140_heavy.woff", weight: 800 }
  ];

  function buildPdfFontUrlCandidates(fileName) {
    const encoded = encodeURIComponent(fileName);
    const bases = [PDF_FONT_BASE_URL, PDF_FONT_REMOTE_BASE_URL].filter(
      (base, index, list) => base && list.indexOf(base) === index
    );
    return bases.map((base) => `${base}/${encoded}`);
  }

  function bytesToPdfBinaryString(bytes) {
    let out = "";
    const chunkSize = 8192;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      out += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return out;
  }

  function setUint32(bytes, offset, value) {
    bytes[offset] = (value >>> 24) & 255;
    bytes[offset + 1] = (value >>> 16) & 255;
    bytes[offset + 2] = (value >>> 8) & 255;
    bytes[offset + 3] = value & 255;
  }

  function setUint16(bytes, offset, value) {
    bytes[offset] = (value >>> 8) & 255;
    bytes[offset + 1] = value & 255;
  }

  function align4(value) {
    return (value + 3) & ~3;
  }

  async function inflateWoffTable(bytes) {
    if (!("DecompressionStream" in window)) {
      throw new Error("DecompressionStream missing");
    }

    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function convertWoffToSfnt(buffer) {
    const view = new DataView(buffer);
    if (view.getUint32(0) !== 0x774f4646) throw new Error("Unsupported font format");

    const flavor = view.getUint32(4);
    const numTables = view.getUint16(12);
    const records = [];
    let dataOffset = 12 + numTables * 16;

    for (let index = 0; index < numTables; index++) {
      const offset = 44 + index * 20;
      const tag =
        String.fromCharCode(view.getUint8(offset)) +
        String.fromCharCode(view.getUint8(offset + 1)) +
        String.fromCharCode(view.getUint8(offset + 2)) +
        String.fromCharCode(view.getUint8(offset + 3));
      const srcOffset = view.getUint32(offset + 4);
      const compLength = view.getUint32(offset + 8);
      const origLength = view.getUint32(offset + 12);
      const checksum = view.getUint32(offset + 16);
      const raw = new Uint8Array(buffer, srcOffset, compLength);
      const data = compLength === origLength ? new Uint8Array(raw) : await inflateWoffTable(raw);

      records.push({
        tag,
        checksum,
        data,
        length: origLength,
        offset: dataOffset
      });

      dataOffset = align4(dataOffset + origLength);
    }

    const out = new Uint8Array(dataOffset);
    setUint32(out, 0, flavor);
    setUint16(out, 4, numTables);

    const entrySelector = Math.floor(Math.log2(numTables));
    const searchRange = Math.pow(2, entrySelector) * 16;
    const rangeShift = numTables * 16 - searchRange;
    setUint16(out, 6, searchRange);
    setUint16(out, 8, entrySelector);
    setUint16(out, 10, rangeShift);

    records.forEach((record, index) => {
      const offset = 12 + index * 16;
      out[offset] = record.tag.charCodeAt(0);
      out[offset + 1] = record.tag.charCodeAt(1);
      out[offset + 2] = record.tag.charCodeAt(2);
      out[offset + 3] = record.tag.charCodeAt(3);
      setUint32(out, offset + 4, record.checksum);
      setUint32(out, offset + 8, record.offset);
      setUint32(out, offset + 12, record.length);
      out.set(record.data.subarray(0, record.length), record.offset);
    });

    return out;
  }

  function getSfntTables(sfnt) {
    const view = new DataView(sfnt.buffer, sfnt.byteOffset, sfnt.byteLength);
    const numTables = view.getUint16(4);
    const tables = new Map();

    for (let index = 0; index < numTables; index++) {
      const offset = 12 + index * 16;
      const tag =
        String.fromCharCode(view.getUint8(offset)) +
        String.fromCharCode(view.getUint8(offset + 1)) +
        String.fromCharCode(view.getUint8(offset + 2)) +
        String.fromCharCode(view.getUint8(offset + 3));
      tables.set(tag, {
        offset: view.getUint32(offset + 8),
        length: view.getUint32(offset + 12)
      });
    }

    return { view, tables };
  }

  function readInt16(view, offset) {
    return view.getInt16(offset);
  }

  function scaleFontMetric(value, unitsPerEm) {
    return Math.round((Number(value) || 0) * 1000 / unitsPerEm);
  }

  function buildPdfByteToUnicodeMap() {
    const map = new Map();
    for (let code = 32; code <= 255; code++) {
      map.set(code, code);
    }
    Object.entries(WIN_ANSI_MAP).forEach(([char, byte]) => {
      map.set(byte, char.codePointAt(0));
    });
    return map;
  }

  const PDF_WIN_ANSI_CODEPOINTS = buildPdfByteToUnicodeMap();

  function createCmapLookup(sfntInfo) {
    const cmap = sfntInfo.tables.get("cmap");
    if (!cmap) return () => 0;

    const view = sfntInfo.view;
    const tableOffset = cmap.offset;
    const count = view.getUint16(tableOffset + 2);
    let subtableOffset = 0;
    let subtableFormat = 0;

    for (let index = 0; index < count; index++) {
      const recordOffset = tableOffset + 4 + index * 8;
      const platform = view.getUint16(recordOffset);
      const encoding = view.getUint16(recordOffset + 2);
      const offset = view.getUint32(recordOffset + 4);
      const format = view.getUint16(tableOffset + offset);

      if ((platform === 3 && (encoding === 10 || encoding === 1)) || platform === 0) {
        subtableOffset = tableOffset + offset;
        subtableFormat = format;
        if (format === 12) break;
      }
    }

    if (subtableFormat === 12) {
      const groupCount = view.getUint32(subtableOffset + 12);
      return (codePoint) => {
        for (let index = 0; index < groupCount; index++) {
          const offset = subtableOffset + 16 + index * 12;
          const start = view.getUint32(offset);
          const end = view.getUint32(offset + 4);
          if (codePoint >= start && codePoint <= end) {
            return view.getUint32(offset + 8) + codePoint - start;
          }
        }
        return 0;
      };
    }

    if (subtableFormat === 4) {
      const segCount = view.getUint16(subtableOffset + 6) / 2;
      const endCodeOffset = subtableOffset + 14;
      const startCodeOffset = endCodeOffset + segCount * 2 + 2;
      const idDeltaOffset = startCodeOffset + segCount * 2;
      const idRangeOffsetOffset = idDeltaOffset + segCount * 2;

      return (codePoint) => {
        for (let index = 0; index < segCount; index++) {
          const end = view.getUint16(endCodeOffset + index * 2);
          const start = view.getUint16(startCodeOffset + index * 2);
          if (codePoint < start || codePoint > end) continue;

          const delta = view.getInt16(idDeltaOffset + index * 2);
          const rangeOffsetPos = idRangeOffsetOffset + index * 2;
          const rangeOffset = view.getUint16(rangeOffsetPos);
          if (rangeOffset === 0) return (codePoint + delta) & 0xffff;

          const glyphOffset = rangeOffsetPos + rangeOffset + (codePoint - start) * 2;
          const glyph = view.getUint16(glyphOffset);
          return glyph ? (glyph + delta) & 0xffff : 0;
        }
        return 0;
      };
    }

    return () => 0;
  }

  function parsePdfFontMetrics(sfnt, fontName, weight) {
    const info = getSfntTables(sfnt);
    const view = info.view;
    const head = info.tables.get("head");
    const hhea = info.tables.get("hhea");
    const hmtx = info.tables.get("hmtx");
    const maxp = info.tables.get("maxp");
    if (!head || !hhea || !hmtx || !maxp) throw new Error("Font tables missing");

    const unitsPerEm = view.getUint16(head.offset + 18) || 1000;
    const bbox = [
      scaleFontMetric(readInt16(view, head.offset + 36), unitsPerEm),
      scaleFontMetric(readInt16(view, head.offset + 38), unitsPerEm),
      scaleFontMetric(readInt16(view, head.offset + 40), unitsPerEm),
      scaleFontMetric(readInt16(view, head.offset + 42), unitsPerEm)
    ];
    const ascent = scaleFontMetric(readInt16(view, hhea.offset + 4), unitsPerEm);
    const descent = scaleFontMetric(readInt16(view, hhea.offset + 6), unitsPerEm);
    const numberOfHMetrics = view.getUint16(hhea.offset + 34);
    const glyphCount = view.getUint16(maxp.offset + 4);
    const cmapLookup = createCmapLookup(info);
    const advances = [];

    for (let gid = 0; gid < glyphCount; gid++) {
      const metricIndex = Math.min(gid, Math.max(0, numberOfHMetrics - 1));
      advances[gid] = view.getUint16(hmtx.offset + metricIndex * 4);
    }

    const widths = [];
    for (let byte = 32; byte <= 255; byte++) {
      const codePoint = PDF_WIN_ANSI_CODEPOINTS.get(byte) || byte;
      const gid = cmapLookup(codePoint);
      const advance = advances[gid] || advances[0] || unitsPerEm * 0.5;
      widths.push(scaleFontMetric(advance, unitsPerEm));
    }

    return {
      fontName,
      weight,
      bbox,
      ascent,
      descent,
      capHeight: ascent,
      italicAngle: 0,
      stemV: weight >= 700 ? 115 : 80,
      widths,
      fontData: bytesToPdfBinaryString(sfnt)
    };
  }

  async function fetchPdfFontBuffer(fileName) {
    let lastError = null;

    for (const url of buildPdfFontUrlCandidates(fileName)) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`Font konnte nicht geladen werden: ${fileName}`);
  }

  async function loadBestenlistePdfFonts() {
    try {
      return (
        await Promise.all(
          PDF_FONT_DEFS.map(async (fontDef) => {
            const buffer = await fetchPdfFontBuffer(fontDef.fileName);
            const sfnt = await convertWoffToSfnt(buffer);
            return {
              ...fontDef,
              ...parsePdfFontMetrics(sfnt, fontDef.fontName, fontDef.weight)
            };
          })
        )
      );
    } catch (error) {
      console.warn("DLRG-Schrift konnte nicht in die PDF eingebettet werden:", error);
      return [];
    }
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

  function buildPdfBlob(pageCommands, imageResources = [], fontResources = [], metadata = {}) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const objects = [];
    const pageIds = [];

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    let nextObjectId = 3;
    const infoId = metadata?.title ? nextObjectId++ : null;
    const fontResourceRefs = [];

    if (infoId) {
      objects[infoId] =
        `<< /Title ${pdfText(metadata.title)} /Creator ${pdfText("Lifesaving Baden")} /Producer ${pdfText("Lifesaving Baden")} >>`;
    }

    if (fontResources.length) {
      fontResources.forEach((font) => {
        const fontFileId = nextObjectId++;
        const descriptorId = nextObjectId++;
        const fontId = nextObjectId++;
        const fontName = String(font.fontName || font.resourceName || "DLRG").replace(/[^A-Za-z0-9_-]/g, "");

        objects[fontFileId] =
          `<< /Length ${font.fontData.length} /Length1 ${font.fontData.length} >>\n` +
          `stream\n${font.fontData}\nendstream`;
        objects[descriptorId] =
          `<< /Type /FontDescriptor /FontName /${fontName} /Flags 32 ` +
          `/FontBBox [${font.bbox.join(" ")}] /ItalicAngle ${fmtPdfNumber(font.italicAngle || 0)} ` +
          `/Ascent ${fmtPdfNumber(font.ascent)} /Descent ${fmtPdfNumber(font.descent)} ` +
          `/CapHeight ${fmtPdfNumber(font.capHeight || font.ascent)} /StemV ${fmtPdfNumber(font.stemV || 80)} ` +
          `/FontFile2 ${fontFileId} 0 R >>`;
        objects[fontId] =
          `<< /Type /Font /Subtype /TrueType /BaseFont /${fontName} /FirstChar 32 /LastChar 255 ` +
          `/Widths [${font.widths.join(" ")}] /Encoding /WinAnsiEncoding /FontDescriptor ${descriptorId} 0 R >>`;
        fontResourceRefs.push(`/${font.resourceName} ${fontId} 0 R`);
      });
    } else {
      objects[nextObjectId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
      fontResourceRefs.push(`/F1 ${nextObjectId} 0 R`);
      nextObjectId++;
      objects[nextObjectId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
      fontResourceRefs.push(`/F2 ${nextObjectId} 0 R`);
      nextObjectId++;
    }

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
        `/Resources << /ProcSet [/PDF /Text /ImageC] /Font << ${fontResourceRefs.join(" ")} >>${xObjectResource} >> /Contents ${contentId} 0 R >>`;
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
    const infoRef = infoId ? ` /Info ${infoId} 0 R` : "";
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R${infoRef} >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: "application/pdf" });
  }

  async function createBestenlistePdfBlob(group, data, generatedAt = new Date(), fileName = "", standDate = generatedAt) {
    const pdfAvatarAssets = await buildPdfAvatarAssets(data);
    const pdfMetaSummary = `${getBestenlisteSettingsSummary()} | ${getBestenlisteStandSummary(standDate)}`;
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 28;
    const tableWidth = pageWidth - margin * 2;
    const bottom = pageHeight - margin;
    const columns = [
      { label: "Pl.", width: 24 },
      { label: "Schwimmer", width: 132 },
      { label: "Zeit", width: 54 },
      { label: "Gliederung", width: 116 },
      { label: "Wettkampf", width: 147 },
      { label: "Datum", width: tableWidth - 24 - 132 - 54 - 116 - 147 }
    ];
    const rowHeight = 13;
    const headHeight = 13;
    const titleHeight = 8;
    const disciplineTopGap = 7;
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
      writer.text(margin, y, `DLRG ${group?.label || "Club"}`, 7, "F2", "0.35 0.35 0.4");
      y += 15;
      writer.text(margin, y, `${group?.name || "Club"} - Bestenliste`, 14, "F2", "0.08 0.08 0.1");
      y += 12;
      writer.text(margin, y, pdfMetaSummary, 7, "F1", "0.35 0.35 0.4");
      y += 20;
      writer.text(margin, y, genderTitle, 12, "F2", "0.08 0.08 0.1");
      y += 16;
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
      const disciplineTitleColor = genderKey === "women" ? "0.89 0.024 0.075" : "0 0.412 0.706";

      data.forEach((discipline, index) => {
        const entries = genderKey === "women" ? discipline.women : discipline.men;
        const topGap = index > 0 ? disciplineTopGap : 0;
        const tableHeight = topGap + titleHeight + headHeight + Math.max(1, entries.length) * rowHeight + gap;
        ensureSpace(tableHeight, genderTitle);
        y += topGap;
        writer.text(margin, y, discipline.label, 10, "F2", disciplineTitleColor);
        y += titleHeight;
        drawTableHeader(genderKey);
        drawRows(entries, genderKey);
        y += gap;
      });
    };

    renderGender("women", "Frauen");
    renderGender("men", "Männer");
    if (commands.length) pages.push(commands);
    const pdfFontAssets = await loadBestenlistePdfFonts();
    return buildPdfBlob(pages, pdfAvatarAssets.resources, pdfFontAssets, {
      title: fileName ? fileName.replace(/\.pdf$/i, "") : `${group?.name || "Club"} - Bestenliste`
    });
  }

  async function openBestenlistePdf(group) {
    const generatedAt = new Date();
    const fileName = getBestenlistePdfFileName(group, generatedAt);
    const tab = window.open("", "_blank");
    if (tab) {
      tab.document.write(`<!doctype html><title>${fileName}</title><body style="font-family:sans-serif;padding:24px">PDF wird erstellt...</body>`);
    }

    try {
      const rows = await getBestenlisteRows();
      const standDate = getLatestDatabaseMeetDateIso(rows) || generatedAt;
      const data = buildBestenliste(rows, group, BESTS_STATE);
      const blob = await createBestenlistePdfBlob(group, data, generatedAt, fileName, standDate);
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

  function renderStatsPanel(panel, group) {
    if (window.ClubsProfileStats && typeof window.ClubsProfileStats.render === "function") {
      window.ClubsProfileStats.render(panel, group, {
        COLS,
        h,
        normalize,
        normalizeForCompare,
        groupMatchesRow,
        excelSerialToISO,
        getYearFromISO,
        normalizeMeetName,
        normalizeGender,
        parseTwoDigitYearWithMeetYear,
        makeAthleteId,
        getBestenlisteRows
      });
      return;
    }

    if (panel) {
      panel.innerHTML = "";
      panel.appendChild(h("div", { class: "club-bests-status club-bests-status--error" }, "Stats-Modul konnte nicht geladen werden."));
    }
  }

  function buildClubMeetData(rows, group) {
    const byKey = new Map();

    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || !groupMatchesRow(group, row)) continue;

      const rawName = normalize(row[COLS.meetName]);
      const name = normalizeMeetName(rawName);
      if (!name) continue;

      const dateIso = excelSerialToISO(row[COLS.excelDate]);
      const year = getYearFromISO(dateIso);
      if (!Number.isFinite(year)) continue;

      const land = normalizeLand(row[COLS.land]);
      const pool = normalize(row[COLS.pool]);
      const key = [
        normalizeForCompare(name),
        dateIso || String(year),
        normalizeForCompare(land),
        pool
      ].join("|");

      if (!byKey.has(key)) {
        byKey.set(key, {
          rawName,
          name,
          dateIso,
          year,
          land,
          pool,
          athletes: new Set(),
          athleteMap: new Map(),
          rows: 0
        });
      }

      const entry = byKey.get(key);
      entry.rows += 1;

      const athleteName = normalize(row[COLS.name]);
      if (athleteName) {
        const gender = normalizeGender(row[COLS.gender]);
        const birthYear = parseTwoDigitYearWithMeetYear(row[COLS.yy2], dateIso);
        const athleteId = makeAthleteId(athleteName, gender, birthYear);
        const ageGroup = ageGroupFromBirthYear(birthYear, year, rawName);
        entry.athletes.add(athleteId);

        if (!entry.athleteMap.has(athleteId)) {
          const { lastName, firstName } = splitNameParts(athleteName);
          entry.athleteMap.set(athleteId, {
            id: athleteId,
            name: athleteName,
            gender,
            genderLabel: genderLabel(gender),
            birthYear,
            ageGroupLabel: ageGroup.label,
            ageGroupSort: ageGroup.sort,
            lastName,
            firstName,
            multiPlace: "",
            runRows: 0,
            runMax: 0,
            startrechtCaps: [],
            startrechtCapKeys: new Set(),
            starts: [],
            startKeys: new Set()
          });
        }

        const athlete = entry.athleteMap.get(athleteId);
        const runNo = getClubMeetRunNumber(row, athlete);
        athlete.runRows += 1;
        athlete.runMax = Math.max(Number(athlete.runMax) || 0, Number(runNo) || 0);
        setClubMeetMultiPlace(athlete, row[COLS.pMehrkampf]);
        addClubMeetStartrechtCap(athlete, row);
        addClubMeetStarts(athlete, collectClubMeetStarts(row, runNo));
      }
    }

    const items = Array.from(byKey.values())
      .map((entry) => ({
        ...entry,
        athleteCount: entry.athletes.size,
        athleteList: Array.from(entry.athleteMap.values()).map(finalizeClubMeetAthlete).sort(compareClubMeetAthlete),
        dateLabel: formatDateShort(entry.dateIso),
        fullDateLabel: formatDateDE(entry.dateIso),
        iso3: iso3FromLand(entry.land),
        poolLabel: poolLabel(entry.pool)
      }))
      .sort((left, right) => {
        const dateCompare = String(right.dateIso || "").localeCompare(String(left.dateIso || ""));
        if (dateCompare !== 0) return dateCompare;
        return String(left.name || "").localeCompare(String(right.name || ""), "de", { sensitivity: "base" });
      });

    const years = Array.from(new Set(items.map((item) => item.year))).sort((left, right) => right - left);
    const byYear = new Map(years.map((year) => [year, items.filter((item) => item.year === year)]));
    return { years, byYear, total: items.length };
  }

  function groupClubMeetAthletes(athletes) {
    const groups = [];
    const byKey = new Map();

    for (const athlete of Array.isArray(athletes) ? athletes : []) {
      const key = `${athlete.ageGroupLabel}|${athlete.gender}`;
      if (!byKey.has(key)) {
        const group = {
          key,
          ageGroupLabel: athlete.ageGroupLabel || "AK ?",
          gender: athlete.gender,
          genderLabel: athlete.genderLabel || genderLabel(athlete.gender),
          athletes: []
        };
        byKey.set(key, group);
        groups.push(group);
      }

      byKey.get(key).athletes.push(athlete);
    }

    return groups;
  }

  function formatClubMeetAthleteName(athlete) {
    const firstName = normalize(athlete?.firstName);
    const lastName = normalize(athlete?.lastName);
    const name = firstName || lastName ? normalize(`${firstName} ${lastName}`) : normalize(athlete?.name);
    const year = formatBirthYearShort(athlete?.birthYear);
    return `${name || "—"}${year ? ` (${year})` : ""}`;
  }

  function renderClubMeetAthleteStarts(athlete, detailId) {
    const starts = Array.isArray(athlete?.starts) ? athlete.starts : [];

    return h(
      "div",
      { class: "club-meet-athlete-details", id: detailId, "aria-hidden": "true" },
      starts.length
        ? h(
            "ul",
            { class: "club-meet-starts" },
            starts.map((start) =>
              h(
                "li",
                { class: "club-meet-start" },
                h(
                  "span",
                  { class: "club-meet-start-discipline-wrap" },
                  h("span", { class: "club-meet-start-discipline" }, start.label || "—"),
                  start.roundLabel ? h("span", { class: "club-meet-start-round" }, start.roundLabel) : null
                ),
                renderClubMeetPlace(start.placeLabel, "club-meet-start-place", start.showMedal !== false && start.isFinalRun !== false),
                h("span", { class: "club-meet-start-time" }, start.timeLabel || "—")
              )
            )
          )
        : h("div", { class: "club-meet-starts-empty" }, "Keine Disziplinzeiten erfasst.")
    );
  }

  function renderClubMeetStartrechtCaps(athlete) {
    const caps = Array.isArray(athlete?.startrechtCaps) ? athlete.startrechtCaps : [];
    if (!caps.length) return null;

    return h(
      "span",
      { class: "club-meet-startrecht-caps", "aria-label": "Startrecht" },
      caps.map((cap) =>
        h("img", {
          class: "club-meet-startrecht-cap",
          src: `./assets/svg/${encodeURIComponent(cap.file)}`,
          alt: cap.label || "Startrecht",
          title: cap.label || "",
          loading: "lazy",
          decoding: "async",
          onerror: (event) => event.currentTarget.remove()
        })
      )
    );
  }

  function renderClubMeetAthlete(athlete, parentDetailId) {
    const athleteDetailId = `${parentDetailId}-ath-${slugPart(athlete?.id || formatClubMeetAthleteName(athlete))}`;
    const item = h("li", { class: "club-meet-athlete" });
    const details = renderClubMeetAthleteStarts(athlete, athleteDetailId);

    const toggleDetails = () => {
      const isOpen = !item.classList.contains("is-open");
      item.classList.toggle("is-open", isOpen);
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
      details.setAttribute("aria-hidden", isOpen ? "false" : "true");
    };

    const button = h(
      "button",
      {
        class: "club-meet-athlete-button",
        type: "button",
        "aria-expanded": "false",
        "aria-controls": athleteDetailId,
        onclick: toggleDetails
      },
      h(
        "span",
        { class: "club-meet-athlete-main" },
        athlete?.multiPlace
          ? renderClubMeetPlace(athlete.multiPlace, "club-meet-athlete-place", true, ".")
          : h("span", { class: "club-meet-athlete-place club-meet-athlete-place--empty", "aria-hidden": "true" }, ""),
        h("span", { class: "club-meet-athlete-name" }, formatClubMeetAthleteName(athlete))
      ),
      renderClubMeetStartrechtCaps(athlete) || h("span", { class: "club-meet-startrecht-caps is-empty", "aria-hidden": "true" }),
      h("span", { class: "club-meet-athlete-toggle", "aria-hidden": "true" })
    );

    item.appendChild(button);
    item.appendChild(details);
    return item;
  }

  function renderClubMeetDetails(meet, detailId) {
    const groups = groupClubMeetAthletes(meet.athleteList || []);

    return h(
      "div",
      { class: "club-meet-details", id: detailId, "aria-hidden": "true" },
      h(
        "div",
        { class: "club-meet-details-inner" },
        groups.length
          ? h(
              "div",
              { class: "club-meet-athlete-groups" },
              groups.map((group) =>
                h(
                  "section",
                  { class: "club-meet-athlete-group" },
                  h(
                    "h4",
                    {},
                    h("span", {}, group.ageGroupLabel),
                    h("span", {}, group.genderLabel)
                  ),
                  h(
                    "ul",
                    {},
                    group.athletes.map((athlete) => renderClubMeetAthlete(athlete, detailId))
                  )
                )
              )
            )
          : h("div", { class: "club-meet-details-empty" }, "Keine Sportlerdaten verfügbar.")
      )
    );
  }

  function renderClubMeetRow(meet, index = 0, canExpand = true) {
    const eventName = meet.rawName || meet.name;
    const swimmerLabel = String(meet.athleteCount || 0);
    const detailId = `club-meet-details-${slugPart(meet.key || `${meet.year}-${index}`)}`;
    const item = h("article", { class: `club-meet-item${canExpand ? "" : " club-meet-item--static"}` });
    const details = canExpand ? renderClubMeetDetails(meet, detailId) : null;

    const toggleDetails = () => {
      if (!canExpand || !details) return;
      const isOpen = !item.classList.contains("is-open");
      item.classList.toggle("is-open", isOpen);
      row.setAttribute("aria-expanded", isOpen ? "true" : "false");
      details.setAttribute("aria-hidden", isOpen ? "false" : "true");
    };

    const row = h(
      canExpand ? "button" : "div",
      canExpand
        ? {
            class: "club-meet-row",
            type: "button",
            "aria-expanded": "false",
            "aria-controls": detailId,
            onclick: toggleDetails
          }
        : {
            class: "club-meet-row club-meet-row--static"
          },
      h(
        "time",
        { class: "club-meet-date", datetime: meet.dateIso || "" },
        meet.dateLabel || "—"
      ),
      h(
        "span",
        { class: "club-meet-event-cell", "aria-hidden": "true" },
        eventName
          ? h("img", {
              class: "club-meet-event-icon",
              src: `./assets/png/events/${encodeURIComponent(eventName)}.png`,
              alt: "",
              loading: "lazy",
              decoding: "async",
              onerror: (event) => {
                const img = event.currentTarget;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = "1";
                  img.src = "./assets/png/events/DLRG.png";
                } else {
                  img.remove();
                }
              }
            })
          : null
      ),
      h(
        "span",
        { class: "club-meet-name" },
        h("span", { class: "club-meet-name-main" }, meet.name || "—"),
        meet.fullDateLabel ? h("span", { class: "club-meet-date-full" }, meet.fullDateLabel) : null
      ),
      h(
        "span",
        { class: "club-meet-country" },
        meet.land
          ? h("img", {
              class: "club-meet-flag",
              src: `./assets/svg/${encodeURIComponent(meet.land)}.svg`,
              alt: meet.land,
              loading: "lazy",
              decoding: "async",
              onerror: (event) => event.currentTarget.remove()
            })
          : null,
        h("span", { class: "club-meet-iso" }, meet.iso3 || "—")
      ),
      h("span", { class: "club-meet-pool" }, meet.poolLabel || "—"),
      h(
        "span",
        { class: "club-meet-count" },
        h("span", {}, swimmerLabel),
        canExpand ? h("span", { class: "club-meet-toggle", "aria-hidden": "true" }) : null
      )
    );

    item.appendChild(row);
    if (details) item.appendChild(details);
    return item;
  }

  function renderClubMeetHeader() {
    return h(
      "div",
      { class: "club-meet-header", "aria-hidden": "true" },
      h("span", { class: "club-meet-header-date" }, "Datum"),
      h("span", { class: "club-meet-header-name" }, "Wettkampf"),
      h("span", { class: "club-meet-header-land" }, "Land"),
      h("span", { class: "club-meet-header-pool" }, "Bahn"),
      h("span", { class: "club-meet-header-count" }, "Sportler")
    );
  }

  async function renderClubMeets(panel, group) {
    if (!panel || !group) return;

    panel.innerHTML = "";
    const box = h("section", { class: "club-meets-section" });
    const title = h("h3", {}, "");
    const olderButton = h("button", {
      class: "club-meets-nav-btn",
      type: "button",
      "aria-label": "Vorheriges Wettkampfjahr",
      onclick: () => changeYear(1)
    }, "‹");
    const newerButton = h("button", {
      class: "club-meets-nav-btn",
      type: "button",
      "aria-label": "Nächstes Wettkampfjahr",
      onclick: () => changeYear(-1)
    }, "›");
    const header = h("div", { class: "club-meets-head" }, olderButton, title, newerButton);
    const list = h("div", { class: "club-meets-list" }, h("div", { class: "club-bests-status" }, "Wettkämpfe werden geladen ..."));

    box.appendChild(header);
    box.appendChild(list);
    panel.appendChild(box);

    let years = [];
    let byYear = new Map();
    let activeIndex = 0;
    const canExpandMeets = group.kind === "og";

    try {
      const rows = await getBestenlisteRows();
      const data = buildClubMeetData(rows, group);
      years = data.years;
      byYear = data.byYear;

      if (!years.length) {
        title.textContent = "—";
        olderButton.disabled = true;
        newerButton.disabled = true;
        list.innerHTML = "";
        list.appendChild(h("div", { class: "club-bests-empty" }, "Keine Wettkämpfe erfasst."));
        return;
      }

      paint();
    } catch (error) {
      console.error("Club-Wettkämpfe konnten nicht geladen werden:", error);
      title.textContent = "—";
      olderButton.disabled = true;
      newerButton.disabled = true;
      list.innerHTML = "";
      list.appendChild(h("div", { class: "club-bests-status club-bests-status--error" }, "Wettkämpfe konnten nicht geladen werden."));
    }

    function changeYear(delta) {
      const next = activeIndex + delta;
      if (next < 0 || next >= years.length) return;
      activeIndex = next;
      paint();
    }

    function paint() {
      const year = years[activeIndex];
      const meets = byYear.get(year) || [];
      title.textContent = String(year);
      olderButton.disabled = activeIndex >= years.length - 1;
      newerButton.disabled = activeIndex <= 0;

      list.innerHTML = "";
      if (!meets.length) {
        list.appendChild(h("div", { class: "club-bests-empty" }, "Keine Wettkämpfe in diesem Jahr."));
        return;
      }

      list.appendChild(renderClubMeetHeader());
      meets.forEach((meet, index) => list.appendChild(renderClubMeetRow(meet, index, canExpandMeets)));
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
    renderStatsPanel(panels.querySelector('[data-key="stats"]'), group);
    renderClubMeets(panels.querySelector('[data-key="wettkaempfe"]'), group);
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
