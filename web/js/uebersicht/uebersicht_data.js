(function (global) {
  "use strict";

  // Altersklassen und Startwertung entsprechen clubs_profile_stats.js.
  const AGE_CLASSES = [
    { key: "u10", label: "10 und jünger", color: "#34d399", max: 10 },
    { key: "ak11_12", label: "11/12", color: "#a3e635", max: 12 },
    { key: "ak13_14", label: "13/14", color: "#facc15", max: 14 },
    { key: "ak15_16", label: "15/16", color: "#fb923c", max: 16 },
    { key: "ak17_18", label: "17/18", color: "#f472b6", max: 18 },
    { key: "ak19_plus", label: "19 und älter", color: "#a78bfa", max: 120 },
    { key: "unknown", label: "Unbekannt", color: "#94a3b8", max: Infinity }
  ];
  const GENDERS = [
    { key: "w", label: "Weiblich", color: "#f472b6" },
    { key: "m", label: "Männlich", color: "#60a5fa" },
    { key: "unknown", label: "Unbekannt", color: "#94a3b8" }
  ];
  const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
  const fold = (value) => normalize(value).toLowerCase().normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "").replace(/ß/g, "ss");
  const missing = (value) => /^(?:|""|[-—])$/.test(normalize(value));

  function personName(value) {
    const name = normalize(value);
    // Dieselbe Namensaufteilung wie im Club-Profil, auch für „Nachname, Vorname“.
    const parts = name.includes(",")
      ? name.split(/,(.+)/).slice(0, 2)
      : [name.split(" ").slice(-1).join(" "), name.split(" ").slice(0, -1).join(" ")];
    return parts.map((part) => fold(part).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "x").join(",");
  }

  function readDate(value) {
    if (missing(value)) return null;
    const serial = Number(value);
    if (!Number.isFinite(serial) || serial <= 0 || serial > 2958465) return null;
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
    const year = date.getUTCFullYear();
    return year >= 1900 ? { serial, year, iso: date.toISOString().slice(0, 10) } : null;
  }

  function readBirthYear(value, meetYear) {
    if (missing(value)) return null;
    const raw = Number(value);
    if (!Number.isInteger(raw) || raw < 0) return null;
    if (raw >= 1900 && raw <= 9999) return raw;
    if (raw > 99 || !Number.isFinite(meetYear)) return null;
    let year = 1900 + raw;
    while (meetYear - year > 100) year += 100;
    return year <= meetYear ? year : null;
  }

  function hasStart(value) {
    if (value == null) return false;
    if (typeof value === "number") return Number.isFinite(value) && value > 0;
    const text = normalize(value);
    return !!text && !/^[-—]$/.test(text) && !/^0(?:[,.]0+)?$/.test(text);
  }

  function buildStats(rows, normalizeClub) {
    const entries = [];
    const birthYearsByName = new Map();
    const clubs = new Set();
    const competitions = new Set();
    let starts = 0;
    let firstDate = null;
    let lastDate = null;

    for (const row of Array.isArray(rows) ? rows : []) {
      if (!Array.isArray(row) || missing(row[1])) continue;
      const genderText = fold(row[0]);
      // Eine optionale Tabellenüberschrift zählt nicht als Person oder Start.
      if (/^(name|athlet|athletenname)$/.test(fold(row[1])) && /geschlecht|gender/.test(genderText)) continue;
      const gender = /^(w|f|female|weiblich)$/.test(genderText) ? "w"
        : /^(m|male|mannlich)$/.test(genderText) ? "m" : "unknown";
      const date = readDate(row[9]);
      const birthYear = readBirthYear(row[11], date?.year);
      const nameKey = `${personName(row[1])}|${gender}`;
      entries.push({ nameKey, gender, birthYear, date: missing(row[10]) ? null : date });
      if (!birthYearsByName.has(nameKey)) birthYearsByName.set(nameKey, new Set());
      if (birthYear != null) birthYearsByName.get(nameKey).add(birthYear);

      if (!missing(row[12])) {
        const club = normalizeClub(normalize(row[12]));
        if (!missing(club)) clubs.add(fold(club));
      }
      const meetName = normalize(row[10]);
      if (!missing(meetName) && date) {
        // Wie im Club-Profil: ein normalisierter Wettkampfname pro Kalenderjahr.
        competitions.add(`${date.year}|${fold(meetName.replace(/\s+-\s+.*$/, ""))}`);
        if (!firstDate || date.serial < firstDate.serial) firstDate = date;
        if (!lastDate || date.serial > lastDate.serial) lastDate = date;
      }
      for (let i = 0; i < 6; i += 1) {
        if (hasStart(row[3 + i]) || hasStart(row[15 + i])) starts += 1;
      }
    }

    const people = new Map();
    for (const entry of entries) {
      const candidates = birthYearsByName.get(entry.nameKey);
      // Fehlende Jahrgänge nur bei genau einem bekannten Kandidaten ergänzen.
      const birthYear = entry.birthYear ?? (candidates.size === 1 ? candidates.values().next().value : null);
      const id = `${entry.nameKey}|${birthYear ?? "unknown"}`;
      let person = people.get(id);
      if (!person) {
        person = { gender: entry.gender, birthYear, latestDate: null };
        people.set(id, person);
      }
      if (entry.date && (!person.latestDate || entry.date.serial > person.latestDate.serial)) {
        person.latestDate = entry.date;
      }
    }

    const ageCounts = Object.fromEntries(AGE_CLASSES.map(({ key }) => [key, 0]));
    const genderCounts = Object.fromEntries(GENDERS.map(({ key }) => [key, 0]));
    for (const person of people.values()) {
      genderCounts[person.gender] += 1;
      const age = person.latestDate && person.birthYear != null ? person.latestDate.year - person.birthYear : null;
      const ageClass = age != null && age >= 0 && age <= 120
        ? AGE_CLASSES.find((item) => age <= item.max).key : "unknown";
      ageCounts[ageClass] += 1;
    }

    return {
      athletes: people.size,
      clubs: clubs.size,
      competitions: competitions.size,
      starts,
      firstDate: firstDate?.iso || "",
      lastDate: lastDate?.iso || "",
      genders: GENDERS.map((item) => ({ ...item, count: genderCounts[item.key] })),
      ages: AGE_CLASSES.map((item) => ({ key: item.key, label: item.label, color: item.color, count: ageCounts[item.key] }))
    };
  }

  global.OverviewData = { buildStats };
})(window);
