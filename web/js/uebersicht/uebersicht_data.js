(function (global) {
  "use strict";

  const GENDERS = [
    { key: "w", label: "Weiblich", color: "#e58cab" },
    { key: "m", label: "Männlich", color: "#78a9d8" },
    { key: "unknown", label: "Unbekannt", color: "#42444a" }
  ];
  const DISCIPLINES = [
    { key: "lifesaver_100", label: "100m Lifesaver", timeCol: 3, placeCol: 15 },
    { key: "retten_50", label: "50m Retten", timeCol: 4, placeCol: 16 },
    { key: "super_200", label: "200m Super-Lifesaver", timeCol: 5, placeCol: 17 },
    { key: "kombi_100", label: "100m Kombi", timeCol: 6, placeCol: 18 },
    { key: "retten_100", label: "100m Retten mit Flossen", timeCol: 7, placeCol: 19 },
    { key: "hindernis_200", label: "200m Hindernis", timeCol: 8, placeCol: 20 }
  ];
  const LV_ALIASES = {
    BAY: "BY",
    WU: "WÜ",
    WUE: "WÜ",
    NRH: "NR",
    NO: "NR",
    NW: "NR",
    WF: "WE",
    WL: "WE"
  };
  const LV_NAMES = {
    BA: "Baden",
    BY: "Bayern",
    BB: "Brandenburg",
    BE: "Berlin",
    HB: "Bremen",
    HH: "Hamburg",
    HE: "Hessen",
    MV: "Mecklenburg-Vorpommern",
    NI: "Niedersachsen",
    RP: "Rheinland-Pfalz",
    SL: "Saarland",
    SN: "Sachsen",
    ST: "Sachsen-Anhalt",
    SH: "Schleswig-Holstein",
    TH: "Thüringen",
    "WÜ": "Württemberg",
    NR: "Nordrhein",
    WE: "Westfalen",
    NRW: "Nordrhein-Westfalen"
  };
  const BV_ALIASES = {
    DEU: "GER",
    NLD: "NED",
    CHE: "SUI",
    DNK: "DEN"
  };
  const BV_NAMES = {
    GER: "Deutschland",
    AUS: "Australien",
    BEL: "Belgien",
    BRA: "Brasilien",
    BUL: "Bulgarien",
    CAN: "Kanada",
    CZE: "Tschechien",
    DEN: "Dänemark",
    EGY: "Ägypten",
    ESP: "Spanien",
    FRA: "Frankreich",
    GBR: "Großbritannien",
    HKG: "Hongkong",
    ITA: "Italien",
    JPN: "Japan",
    NED: "Niederlande",
    NOR: "Norwegen",
    NZL: "Neuseeland",
    POL: "Polen",
    SIN: "Singapur",
    SUI: "Schweiz",
    SWE: "Schweden",
    USA: "USA"
  };
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

  function isDisqualification(value) {
    return /(dq|dsq|disq|ausg)/i.test(normalize(value));
  }

  function displayPersonName(value) {
    const name = normalize(value);
    if (!name.includes(",")) return name;
    const [lastName, firstName] = name.split(/,(.+)/).slice(0, 2);
    return normalize(`${firstName} ${lastName}`);
  }

  function athleteProfileId(name, gender, birthYear) {
    if (!normalize(name) || !Number.isFinite(birthYear)) return "";
    const base = normalize(name)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const genderKey = gender === "w" ? "w" : "m";
    return `ath_${base}_${birthYear}_${genderKey}`;
  }

  function groupProfileId(kind, name) {
    const slug = normalize(name)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[-/]+/g, " ")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "x";
    return `group_${kind}_${slug}`;
  }

  function topRanking(items, limit) {
    return items
      .filter((item) => item.count > 0)
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "de"))
      .slice(0, limit);
  }

  function topRankingWithoutSplitTie(items, limit) {
    const sorted = topRanking(items, Number.POSITIVE_INFINITY);
    const result = [];
    for (let index = 0; index < sorted.length;) {
      const count = sorted[index].count;
      const tied = [];
      while (index < sorted.length && sorted[index].count === count) tied.push(sorted[index++]);
      if (result.length + tied.length > limit) break;
      result.push(...tied);
    }
    return result;
  }

  function getLandesverband(value) {
    const raw = normalize(value).toUpperCase();
    const key = LV_ALIASES[raw] || raw;
    return {
      key,
      label: LV_NAMES[key] || key,
      capKey: key === "NRW" ? "NR" : key
    };
  }

  function getBundesverband(value) {
    const raw = normalize(value).toUpperCase();
    const key = BV_ALIASES[raw] || raw;
    return { key, label: BV_NAMES[key] || key, capKey: key };
  }

  function buildStats(rows, normalizeClub) {
    const entries = [];
    const birthYearsByName = new Map();
    const clubs = new Set();
    const competitions = new Set();
    const activeClubs = new Map();
    const clubCompetitions = new Map();
    const activeLandesverbaende = new Map();
    const landesverbandCompetitions = new Map();
    const activeBundesverbaende = new Map();
    const bundesverbandCompetitions = new Map();
    const disciplineCounts = Object.fromEntries(DISCIPLINES.map(({ key }) => [key, 0]));
    let starts = 0;
    let disqualificationsTotal = 0;
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
      if (!birthYearsByName.has(nameKey)) birthYearsByName.set(nameKey, new Set());
      if (birthYear != null) birthYearsByName.get(nameKey).add(birthYear);

      let club = "";
      let clubLabel = "";
      let clubCapKey = "";
      const lvCode = normalize(row[13]).toUpperCase();
      const landesverband = getLandesverband(lvCode);
      const bundesverband = getBundesverband(row[27]);
      if (!missing(row[12])) {
        const rawClub = normalize(row[12]).replace(/^og\s+/i, "");
        club = normalizeClub(rawClub);
        const isEttlingenGroup = club === "Ettlingen/Wettersbach";
        clubLabel = isEttlingenGroup ? "Ettlingen" : club;
        clubCapKey = isEttlingenGroup ? "Ettlingen" : club;
        if (!missing(club)) clubs.add(fold(club));
      }
      const meetName = normalize(row[10]);
      let competitionKey = "";
      if (!missing(meetName) && date) {
        // Wie im Club-Profil: ein normalisierter Wettkampfname pro Kalenderjahr.
        competitionKey = `${date.year}|${fold(meetName.replace(/\s+-\s+.*$/, ""))}`;
        competitions.add(competitionKey);
        if (!firstDate || date.serial < firstDate.serial) firstDate = date;
        if (!lastDate || date.serial > lastDate.serial) lastDate = date;
      }

      let rowStarts = 0;
      let rowDisqualifications = 0;
      for (const discipline of DISCIPLINES) {
        const started = hasStart(row[discipline.timeCol]) || hasStart(row[discipline.placeCol]);
        if (started) {
          starts += 1;
          rowStarts += 1;
          disciplineCounts[discipline.key] += 1;
        }
        if (isDisqualification(row[discipline.timeCol]) || isDisqualification(row[discipline.placeCol])) {
          rowDisqualifications += 1;
          disqualificationsTotal += 1;
        }
      }
      if (club && rowStarts) {
        const clubKey = fold(club);
        const rankingClub = activeClubs.get(clubKey) || {
          label: clubLabel,
          capKey: clubCapKey,
          lvCode,
          profileId: groupProfileId("og", club),
          count: 0
        };
        rankingClub.count += rowStarts;
        if (!rankingClub.lvCode && lvCode) rankingClub.lvCode = lvCode;
        activeClubs.set(clubKey, rankingClub);
      }
      if (club && competitionKey) {
        const clubKey = fold(club);
        const rankingClub = clubCompetitions.get(clubKey) || {
          label: clubLabel,
          capKey: clubCapKey,
          lvCode,
          profileId: groupProfileId("og", club),
          competitions: new Set()
        };
        rankingClub.competitions.add(competitionKey);
        if (!rankingClub.lvCode && lvCode) rankingClub.lvCode = lvCode;
        clubCompetitions.set(clubKey, rankingClub);
      }
      if (landesverband.key && rowStarts) {
        const rankingLv = activeLandesverbaende.get(landesverband.key) || {
          label: landesverband.label,
          capKey: landesverband.capKey,
          lvCode: landesverband.capKey,
          profileId: groupProfileId("lv", landesverband.label),
          count: 0
        };
        rankingLv.count += rowStarts;
        activeLandesverbaende.set(landesverband.key, rankingLv);
      }
      if (landesverband.key && competitionKey) {
        const rankingLv = landesverbandCompetitions.get(landesverband.key) || {
          label: landesverband.label,
          capKey: landesverband.capKey,
          lvCode: landesverband.capKey,
          profileId: groupProfileId("lv", landesverband.label),
          competitions: new Set()
        };
        rankingLv.competitions.add(competitionKey);
        landesverbandCompetitions.set(landesverband.key, rankingLv);
      }
      if (bundesverband.key && rowStarts) {
        const rankingBv = activeBundesverbaende.get(bundesverband.key) || {
          label: bundesverband.label,
          capKey: bundesverband.capKey,
          lvCode: bundesverband.capKey,
          profileId: groupProfileId("bv", bundesverband.label),
          count: 0
        };
        rankingBv.count += rowStarts;
        activeBundesverbaende.set(bundesverband.key, rankingBv);
      }
      if (bundesverband.key && competitionKey) {
        const rankingBv = bundesverbandCompetitions.get(bundesverband.key) || {
          label: bundesverband.label,
          capKey: bundesverband.capKey,
          lvCode: bundesverband.capKey,
          profileId: groupProfileId("bv", bundesverband.label),
          competitions: new Set()
        };
        rankingBv.competitions.add(competitionKey);
        bundesverbandCompetitions.set(bundesverband.key, rankingBv);
      }
      entries.push({
        nameKey,
        name: displayPersonName(row[1]),
        sourceName: normalize(row[1]),
        gender,
        birthYear,
        date: missing(row[10]) ? null : date,
        starts: rowStarts,
        competitionKey,
        disqualifications: rowDisqualifications
      });
    }

    const people = new Map();
    const activePeople = new Map();
    const peopleCompetitions = new Map();
    const disqualifications = new Map();
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
      if (entry.starts) {
        const athlete = activePeople.get(id) || {
          label: entry.name,
          profileId: athleteProfileId(entry.sourceName, entry.gender, birthYear),
          count: 0
        };
        athlete.count += entry.starts;
        activePeople.set(id, athlete);
      }
      if (entry.competitionKey) {
        const athlete = peopleCompetitions.get(id) || {
          label: entry.name,
          profileId: athleteProfileId(entry.sourceName, entry.gender, birthYear),
          competitions: new Set()
        };
        athlete.competitions.add(entry.competitionKey);
        peopleCompetitions.set(id, athlete);
      }
      if (entry.disqualifications) {
        const athlete = disqualifications.get(id) || {
          label: entry.name,
          profileId: athleteProfileId(entry.sourceName, entry.gender, birthYear),
          count: 0
        };
        athlete.count += entry.disqualifications;
        disqualifications.set(id, athlete);
      }
    }

    const genderCounts = Object.fromEntries(GENDERS.map(({ key }) => [key, 0]));
    const exactAgeCounts = new Map();
    let unknownAges = 0;
    for (const person of people.values()) {
      genderCounts[person.gender] += 1;
      const age = person.latestDate && person.birthYear != null ? person.latestDate.year - person.birthYear : null;
      if (age == null || age < 0 || age > 120) {
        unknownAges += 1;
      } else {
        exactAgeCounts.set(age, (exactAgeCounts.get(age) || 0) + 1);
      }
    }

    const ageValues = Array.from(exactAgeCounts.keys()).sort((left, right) => left - right);
    const youngestAge = ageValues[0];
    const ages = [];
    if (Number.isFinite(youngestAge) && youngestAge < 30) {
      for (let age = youngestAge; age < 30; age += 1) {
        ages.push({ key: `age_${age}`, label: String(age), count: exactAgeCounts.get(age) || 0 });
      }
    }
    const thirtyPlus = ageValues
      .filter((age) => age >= 30)
      .reduce((sum, age) => sum + (exactAgeCounts.get(age) || 0), 0);
    if (thirtyPlus || !ages.length) ages.push({ key: "age_30_plus", label: "30+", count: thirtyPlus });
    if (unknownAges) ages.push({ key: "unknown", label: "?", count: unknownAges });

    const ageClassDefinitions = [
      { key: "ak_10", label: "10", ariaLabel: "Altersklasse 10", min: 0, max: 10 },
      { key: "ak_11_12", label: "11/12", ariaLabel: "Altersklasse 11 und 12", min: 11, max: 12 },
      { key: "ak_13_14", label: "13/14", ariaLabel: "Altersklasse 13 und 14", min: 13, max: 14 },
      { key: "ak_15_16", label: "15/16", ariaLabel: "Altersklasse 15 und 16", min: 15, max: 16 },
      { key: "ak_17_18", label: "17/18", ariaLabel: "Altersklasse 17 und 18", min: 17, max: 18 },
      { key: "ak_open", label: "Offen", ariaLabel: "Altersklasse Offen, 19 bis 39", min: 19, max: 39 },
      { key: "ak_masters", label: "Masters", ariaLabel: "Altersklasse Masters, ab 40", min: 40, max: 120 }
    ];
    const ageClasses = ageClassDefinitions.map((group) => ({
      key: group.key,
      label: group.label,
      ariaLabel: group.ariaLabel,
      count: ageValues
        .filter((age) => age >= group.min && age <= group.max)
        .reduce((sum, age) => sum + (exactAgeCounts.get(age) || 0), 0)
    }));
    if (unknownAges) ageClasses.push({ key: "unknown", label: "?", ariaLabel: "Alter unbekannt", count: unknownAges });

    return {
      athletes: people.size,
      clubs: clubs.size,
      competitions: competitions.size,
      starts,
      disqualifications: disqualificationsTotal,
      firstDate: firstDate?.iso || "",
      lastDate: lastDate?.iso || "",
      genders: GENDERS.map((item) => ({ ...item, count: genderCounts[item.key] })),
      ages,
      ageClasses,
      rankings: {
        clubsByStarts: topRanking(Array.from(activeClubs.values()), 5),
        clubsByCompetitions: topRanking(Array.from(clubCompetitions.values(), (item) => ({
          label: item.label,
          capKey: item.capKey,
          lvCode: item.lvCode,
          profileId: item.profileId,
          count: item.competitions.size
        })), 5),
        landesverbaendeByStarts: topRanking(Array.from(activeLandesverbaende.values()), 5),
        landesverbaendeByCompetitions: topRanking(Array.from(landesverbandCompetitions.values(), (item) => ({
          label: item.label,
          capKey: item.capKey,
          lvCode: item.lvCode,
          profileId: item.profileId,
          count: item.competitions.size
        })), 5),
        bundesverbaendeByStarts: topRanking(Array.from(activeBundesverbaende.values()), 5),
        bundesverbaendeByCompetitions: topRanking(Array.from(bundesverbandCompetitions.values(), (item) => ({
          label: item.label,
          capKey: item.capKey,
          lvCode: item.lvCode,
          profileId: item.profileId,
          count: item.competitions.size
        })), 5),
        peopleByStarts: topRanking(Array.from(activePeople.values()), 5),
        peopleByCompetitions: topRanking(Array.from(peopleCompetitions.values(), (item) => ({
          label: item.label,
          profileId: item.profileId,
          count: item.competitions.size
        })), 5),
        disciplines: topRanking(DISCIPLINES.map((item) => ({
          label: item.label,
          count: disciplineCounts[item.key]
        })), 6),
        disqualifications: topRankingWithoutSplitTie(Array.from(disqualifications.values()), 5)
      }
    };
  }

  global.OverviewData = { buildStats };
})(window);
