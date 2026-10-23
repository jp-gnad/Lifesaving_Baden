const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.join(__dirname, "..", "web");
const canonical = "Bodman-Ludwigshafen";

function load(context, file, exposed = "", transform = (source) => source) {
  let source = transform(fs.readFileSync(path.join(root, "js", file), "utf8"));
  if (exposed) {
    const end = Math.max(source.lastIndexOf("})();"), source.lastIndexOf("})(window);"),
      source.lastIndexOf('})(typeof window !== "undefined"'));
    assert.ok(end >= 0, file);
    source = source.slice(0, end) + `window.testApi = { ${exposed} };\n` + source.slice(end);
  }
  vm.runInContext(source, context, { filename: file });
  return context.window.testApi;
}

function setup(rows = []) {
  const document = { readyState: "loading", addEventListener() {}, querySelector: () => null };
  const window = { addEventListener() {}, scrollTo() {}, location: { protocol: "http:" } };
  window.ExcelLoader = { loadSheetRows: async () => rows, getUrlCandidates: () => ["fixture.xlsx"] };
  const context = vm.createContext({ window, document, history: {}, console, URL, Map, Set, Date });
  load(context, "shared/club_names.js");
  return context;
}

function row(club, { name = "Alex Beispiel", meet = "LMS", time = "1:00,00", date = 46000 } = {}) {
  const values = Array(28).fill("");
  values[0] = "w";
  values[1] = name;
  values[3] = time;
  values[9] = date;
  values[10] = meet;
  values[11] = 8;
  values[12] = club;
  values[13] = "BA";
  values[21] = "50";
  values[22] = "national";
  values[23] = "GER";
  values[24] = "OG";
  values[27] = "GER";
  return values;
}

test("merger aliases normalize precisely without turning other clubs into merged clubs", () => {
  const { ClubNames } = setup().window;
  for (const alias of ["Bodman", "Bodmann", "Ludwigshafen", canonical, " bodman-ludwigshafen ",
    "OG Bodman", "DLRG Ludwigshafen", "Bodman / Ludwigshafen", "Bodman – Ludwigshafen"]) {
    assert.equal(ClubNames.normalize(alias), canonical, alias);
    assert.equal(ClubNames.normalize(ClubNames.normalize(alias)), canonical);
  }
  for (const value of ["Ettlingen", "Wettersbach", "Durlach", "Ludwigshafen am Rhein", "Bodman Testclub", ""]) {
    assert.equal(ClubNames.normalize(value), value);
  }
});

test("club search and legacy profile links resolve to one merged OG without support points", async () => {
  // Aliases must remain searchable even if the database only contains the new name.
  for (const rows of [[row(canonical)], [row("Bodman"), row("Ludwigshafen"), row(canonical)]]) {
    const context = setup(rows);
    load(context, "clubs/clubs_data.js");
    const data = context.window.ClubsData;
    const { groups, stats } = await data.loadGroupsAndStats();
    assert.equal(stats.ortsgruppen, 1);
    const club = groups.find((group) => group.kind === "og");
    assert.equal(club.name, canonical);
    assert.equal(club.displayName, canonical);
    assert.equal(club.supportPoints.length, 0);
    assert.equal(club.avatar.mode, "single");
    const search = load(context, "clubs/clubs_search.js", "state, updateSuggestions");
    context.window.ClubsSearch.setGroups(groups);
    for (const alias of ["Bodman", "Bodmann", "Ludwigshafen", canonical]) {
      search.state.query = alias;
      search.updateSuggestions();
      assert.equal(search.state.suggestions.length, 1, alias);
      assert.equal(search.state.suggestions[0], club);
      const id = `group_og_${alias.toLowerCase()}`;
      assert.equal(data.findGroupById(groups, id), club, id);
    }
  }
});

test("club profile combines historical results, personal bests, competitions and statistics", async () => {
  const rows = [row("Bodman"), row("Ludwigshafen", { time: "0:59,00" }),
    row(canonical, { name: "Kim Beispiel", meet: "DMS", time: "DQ" }), row("Anderer Verein")];
  const context = setup(rows);
  load(context, "clubs/clubs_data.js");
  const { groups } = await context.window.ClubsData.loadGroupsAndStats();
  const club = groups.find((group) => group.name === canonical);
  const profile = load(context, "clubs/clubs_profil.js",
    "COLS, normalize, normalizeForCompare, groupMatchesRow, excelSerialToISO, getYearFromISO, normalizeMeetName, normalizeGender, parseTwoDigitYearWithMeetYear, makeAthleteId, setProfileGroups, buildBestenliste, buildClubMeetData, getGroupSupportPoints");
  profile.setProfileGroups(groups);
  assert.deepEqual(rows.map((values) => profile.groupMatchesRow(club, values)), [true, true, true, false]);
  assert.equal(profile.getGroupSupportPoints(club).length, 0);
  const bests = profile.buildBestenliste(rows, club, { pool: "50", personalOnly: true, ageGroup: "open", limit: 10 });
  const lifesaver = bests.find((discipline) => discipline.key === "z100l");
  assert.equal(lifesaver.women.length, 1);
  assert.equal(lifesaver.women[0].seconds, 59);
  assert.equal(lifesaver.women[0].affiliation, canonical);
  assert.equal(lifesaver.women[0].affiliationGroup.id, club.id);
  assert.equal(profile.buildClubMeetData(rows, club).total, 2);
  const stats = load(context, "clubs/clubs_profile_stats.js",
    "build: (rows, group, helpers) => { shared = helpers; return buildClubStatsData(rows, group); }");
  const result = stats.build(rows, club, profile);
  assert.equal(result.totals.competitions, 2);
  assert.equal(result.totals.athletes, 2);
  assert.equal(result.totals.starts, 3);
  assert.equal(result.totals.dqs, 1);
});

test("athlete search, calculator data and profile history use the same merged membership", () => {
  const rows = [row("Bodman"), row("Ludwigshafen", { date: 46001 }), row(canonical, { date: 46002 })];
  const context = setup(rows);
  load(context, "athleten/ath_data_smal.js");
  const data = context.window.AthDataSmall;
  assert.equal(data.buildIndicesFromRows(rows)[0].ortsgruppe, canonical);
  const athlete = data.buildAthletesWithMeets(rows)[0];
  assert.equal(athlete.ortsgruppe, canonical);
  assert.deepEqual(Array.from(athlete.meets, (meet) => meet.Ortsgruppe), [canonical, canonical, canonical]);
  const profile = load(context, "profil.js", "buildIndicesFromRows, mapRowToMeet");
  assert.equal(profile.buildIndicesFromRows(rows)[0].ortsgruppe, canonical);
  assert.equal(profile.mapRowToMeet(rows[0]).Ortsgruppe, canonical);
  load(context, "profil/profil_tabs.js");
  const head = load(context, "profil/profil_head.js", "collectOrtsgruppenForAthlete");
  const membership = head.collectOrtsgruppenForAthlete(athlete);
  assert.equal(membership.curr, canonical);
  assert.equal(membership.others.length, 0);
});

test("static and computed athlete rankings normalize historical club names", () => {
  const context = setup();
  const api = load(context, "athleten/ath_top10.js", "buildTop10GroupsFromJson, pushCountMetrics, pushLscEntry");
  const result = api.buildTop10GroupsFromJson({ groups: { lscAlltimeHigh: [
    { name: "Alex Beispiel", og: "Bodman", rank: 1, value: 100 }
  ] } });
  assert.equal(result.lsc.rows[0].og, canonical);
  const entries = [];
  api.pushCountMetrics(entries, { name: "Alex Beispiel" }, "Ludwigshafen", 1);
  api.pushLscEntry(entries, { name: "Alex Beispiel" }, { calculatedLsc: 100 }, "Bodman");
  assert.ok(entries.every((entry) => entry.og === canonical));
});

test("nomination, mandatory-time and qualification lists show the merged OG for every old name", () => {
  const context = setup();
  const points = load(context, "0_gadges/Punkte_tabellen.js", "buildAthletesForConfig");
  const pointsConfig = { DATE_TO: "2026-12-31", KAMPF: 1, REF_WR: { w: { lifesaver100: { sec: 50 } } } };
  const rows = [row("Bodman"), row("Ludwigshafen", { name: "Kim Beispiel" })];
  const nominees = points.buildAthletesForConfig(rows, pointsConfig);
  assert.equal(nominees.length, 2);
  assert.ok(nominees.every((athlete) => athlete.og === canonical));
  for (const file of ["0_gadges/PZ_tabellen.js", "0_gadges/Qualli_tabellen.js"]) {
    const api = load(context, file, "createInstance", (source) => {
      const modified = source.replace(/return \{\s+init,\s+\};/, "return { init, buildPeopleForConfig };");
      assert.notEqual(modified, source);
      return modified;
    });
    const instance = api.createInstance("Test", "Test", {});
    const cfg = { gender: "w", qualiStart: new Date("2020-01-01"), qualiEnd: new Date("2030-12-31"),
      poolLength: "", rulebook: "", seasonYear: 2026, minAge: null, maxAge: null,
      pz1: { life100: 10000 }, pz: { life100: 10000 } };
    const people = instance.buildPeopleForConfig(rows, cfg);
    assert.equal(people.length, 2, file);
    assert.ok(people.every((person) => person.ortsgruppe === canonical), file);
  }
});

test("Müllheim and Staufen share one searchable club and legacy links without support points", async () => {
  const merged = "Müllheim-Neuenburg";
  for (const rows of [[row(merged)], [row("Müllheim"), row("Müllheim-Neunburg"), row("Staufen")]]) {
    const context = setup(rows);
    load(context, "clubs/clubs_data.js");
    const data = context.window.ClubsData;
    const { groups, stats } = await data.loadGroupsAndStats();
    assert.equal(stats.ortsgruppen, 1);
    const club = groups.find((group) => group.kind === "og");
    assert.equal(club.name, merged);
    assert.equal(club.supportPoints.length, 0);
    const search = load(context, "clubs/clubs_search.js", "state, updateSuggestions");
    context.window.ClubsSearch.setGroups(groups);
    for (const name of ["Müllheim", merged, "Müllheim-Neunburg", "Muellheim", "Staufen"]) {
      search.state.query = name;
      search.updateSuggestions();
      assert.equal(search.state.suggestions.length, 1, name);
      assert.equal(search.state.suggestions[0], club);
      assert.equal(data.normalizeOrtsgruppeName(name), merged);
    }
    for (const id of ["group_og_mullheim", "group_og_mullheim-neuenburg", "group_og_mullheim-neunburg", "group_og_staufen"]) {
      assert.equal(data.findGroupById(groups, id), club, id);
    }
    for (const other of ["Bad Krozingen", "Heitersheim", "Staufenberg"]) {
      assert.equal(data.normalizeOrtsgruppeName(other), other);
    }
  }
});

test("combined club bests, avatars and exports retain the club recorded for each result", async () => {
  const names = ["Müllheim", "Müllheim-Neuenburg", "Staufen"];
  const rows = names.map((name, i) => row(name, { name: `Person ${i}`, time: `1:0${i},00` }));
  const context = setup(rows);
  load(context, "clubs/clubs_data.js");
  const { groups } = await context.window.ClubsData.loadGroupsAndStats();
  const club = groups.find((group) => group.kind === "og");
  const profile = load(context, "clubs/clubs_profil.js", "buildBestenliste, setProfileGroups");
  profile.setProfileGroups(groups);
  const settings = { pool: "50", personalOnly: true, ageGroup: "open", limit: 10 };
  const results = profile.buildBestenliste(rows, club, settings).find((discipline) => discipline.key === "z100l").women;
  assert.deepEqual(Array.from(results, (entry) => entry.affiliation), names);
  assert.deepEqual(Array.from(results, (entry) => entry.affiliationGroup.name), names);
  assert.equal(new Set(results.map((entry) => entry.affiliationGroup.id)).size, 3);
  const samePerson = names.map((name, i) => row(name, { time: `1:0${2 - i},00` }));
  const best = profile.buildBestenliste(samePerson, club, settings).find((discipline) => discipline.key === "z100l").women;
  assert.equal(best.length, 1);
  assert.equal(best[0].affiliation, "Staufen");
});

test("athlete histories preserve Müllheim and Staufen and never merge their meet entries", () => {
  const names = ["Müllheim", "Staufen", "Müllheim-Neuenburg"];
  const rows = names.map((name) => row(name));
  const context = setup(rows);
  load(context, "athleten/ath_data_smal.js");
  const athlete = context.window.AthDataSmall.buildAthletesWithMeets(rows)[0];
  assert.equal(athlete.meets.length, 3);
  assert.deepEqual(Array.from(athlete.meets, (meet) => meet.Ortsgruppe), names);
  const profile = load(context, "profil.js", "mapRowToMeet");
  assert.deepEqual(rows.map((values) => profile.mapRowToMeet(values).Ortsgruppe), names);
  const tabs = load(context, "profil/profil_tabs.js", "mergeDuplicateMeets");
  const heats = [{ ...athlete.meets[0], Vorläufe: "1" }, { ...athlete.meets[0], Vorläufe: "2" }];
  const meets = tabs.mergeDuplicateMeets([...heats, ...athlete.meets.slice(1)]);
  assert.equal(meets.length, 3);
  assert.deepEqual(Array.from(meets, (meet) => meet.Ortsgruppe).sort(), [...names].sort());
  assert.equal(meets.find((meet) => meet.Ortsgruppe === "Müllheim")._runs.length, 2);
  const head = load(context, "profil/profil_head.js", "collectOrtsgruppenForAthlete");
  const membership = head.collectOrtsgruppenForAthlete(athlete);
  assert.equal(membership.curr, "Müllheim-Neuenburg");
  assert.deepEqual(Array.from(membership.others).sort(), ["Müllheim", "Staufen"]);
});

test("historical club caps use the same federation fallback and appearance as Oberhausen-Rheinhausen", async () => {
  const names = ["Müllheim", "Müllheim-Neuenburg", "Staufen"];
  const rows = [...names, "Oberhausen-Rheinhausen"].map((name, i) => row(name, { name: `Person ${i}` }));
  const context = setup(rows);
  load(context, "clubs/clubs_data.js");
  const { groups } = await context.window.ClubsData.loadGroupsAndStats();
  const merged = groups.find((group) => group.name === "Müllheim-Neuenburg");
  const reference = groups.find((group) => group.name === "Oberhausen-Rheinhausen");
  const profile = load(context, "clubs/clubs_profil.js", "buildBestenliste, setProfileGroups");
  profile.setProfileGroups(groups);
  const results = profile.buildBestenliste(rows, merged, { pool: "50", personalOnly: true, ageGroup: "open", limit: 10 })
    .find((discipline) => discipline.key === "z100l").women;

  context.document.createElement = () => {
    const el = { children: [], style: {}, className: "", attributes: {},
      setAttribute(key, value) { this.attributes[key] = value; },
      appendChild(child) { this.children.push(child); }
    };
    el.classList = { toggle(name, enabled) {
      const classes = new Set(el.className.split(" ").filter(Boolean));
      if (enabled) classes.add(name); else classes.delete(name);
      el.className = [...classes].join(" ");
    } };
    return el;
  };
  load(context, "clubs/clubs_search.js");
  const render = (group) => {
    const host = context.window.ClubsSearch.renderAvatar(group, "sm", "club-bests-row-avatar");
    const image = host.children[0];
    let attempts = 0;
    while (!fs.existsSync(path.join(root, decodeURIComponent(image.src)))) {
      assert.ok(attempts++ < 40 && image.onerror, `missing cap: ${image.src}`);
      image.onerror();
    }
    image.onload?.();
    return { host, image };
  };
  const expected = render(reference);
  assert.ok(expected.host.className.includes("search-cap-overlay"));
  for (const entry of results) {
    const actual = render(entry.affiliationGroup);
    assert.equal(actual.image.src, expected.image.src, entry.affiliation);
    assert.equal(actual.host.className, expected.host.className, entry.affiliation);
    assert.equal(actual.image.attributes.alt, `Ortsgruppe ${entry.affiliation}`);
    assert.equal(entry.affiliationGroup.avatar.iconKeys[0], entry.affiliation);
  }
});

test("athlete rankings and qualification lists keep historical Müllheim and Staufen affiliations", () => {
  const context = setup();
  const names = ["Müllheim", "Müllheim-Neuenburg", "Staufen"];
  const api = load(context, "athleten/ath_top10.js", "buildTop10GroupsFromJson, pushCountMetrics, pushLscEntry");
  const groups = api.buildTop10GroupsFromJson({ groups: { lscAlltimeHigh: names.map((og, i) => ({
    name: `Person ${i}`, og, rank: i + 1, value: 100 - i
  })) } });
  assert.deepEqual(Array.from(groups.lsc.rows, (entry) => entry.og), names);
  const entries = [];
  names.forEach((og) => api.pushCountMetrics(entries, { name: "Alex" }, og, 1));
  assert.deepEqual(entries.map((entry) => entry.og), names);
  const points = load(context, "0_gadges/Punkte_tabellen.js", "buildAthletesForConfig");
  const cfg = { DATE_TO: "2026-12-31", KAMPF: 1, REF_WR: { w: { lifesaver100: { sec: 50 } } } };
  const rows = names.map((name, i) => row(name, { name: `Person ${i}` }));
  assert.deepEqual(Array.from(points.buildAthletesForConfig(rows, cfg), (athlete) => athlete.og), names);
});

for (const { names, aliases, ids, unrelated } of [
  {
    names: ["Nimburg", "Nimburg-Teningen", "Köndringen", "Teningen"],
    aliases: ["Koendringen", "Tenningen", "DLRG Nimburg"],
    ids: ["group_og_nimburg", "group_og_nimburg-teningen", "group_og_kondringen",
      "group_og_koendringen", "group_og_teningen", "group_og_tenningen"],
    unrelated: "Emmendingen"
  },
  {
    names: ["Waldshut", "Tiengen", "Waldshut-Tiengen"],
    aliases: ["Waldshut / Tiengen", "DLRG Waldshut"],
    ids: ["group_og_waldshut", "group_og_tiengen", "group_og_waldshut-tiengen"],
    unrelated: "Waldkirch"
  },
  {
    names: ["Villingen", "Schwenningen", "Villingen-Schwenningen"],
    aliases: ["Villingen / Schwenningen", "DLRG Villingen"],
    ids: ["group_og_villingen", "group_og_schwenningen", "group_og_villingen-schwenningen"],
    unrelated: "Villingen Testclub"
  }
]) {
test(`${names.at(-1)} combines its predecessors while searches, caps and historical results remain correct`, async () => {
  const mergedName = names.at(-1);
  for (const rows of [[row(mergedName)], names.map((name, i) => row(name, { name: `Person ${i}` }))]) {
    const context = setup(rows);
    load(context, "clubs/clubs_data.js");
    const data = context.window.ClubsData;
    const { groups, stats } = await data.loadGroupsAndStats();
    assert.equal(stats.ortsgruppen, 1);
    const club = groups.find((group) => group.kind === "og");
    assert.equal(club.name, mergedName);
    assert.equal(club.id, `group_og_${mergedName.toLowerCase()}`);
    assert.equal(club.supportPoints.length, 0);
    const search = load(context, "clubs/clubs_search.js", "state, updateSuggestions");
    context.window.ClubsSearch.setGroups(groups);
    for (const name of [...names, ...aliases]) {
      assert.equal(data.normalizeOrtsgruppeName(name), mergedName, name);
      search.state.query = name.replace(/^DLRG /, "");
      search.updateSuggestions();
      assert.equal(search.state.suggestions.length, 1, name);
      assert.equal(search.state.suggestions[0], club);
    }
    for (const id of ids) {
      assert.equal(data.findGroupById(groups, id), club, id);
    }
    assert.equal(data.normalizeOrtsgruppeName(unrelated), unrelated);

    const profile = load(context, "clubs/clubs_profil.js", "buildBestenliste, setProfileGroups");
    profile.setProfileGroups(groups);
    const results = profile.buildBestenliste(rows, club, { pool: "50", personalOnly: true, ageGroup: "open", limit: 10 })
      .find((discipline) => discipline.key === "z100l").women;
    assert.deepEqual(Array.from(results, (entry) => entry.affiliation), rows.map((values) => values[12]));
    for (const entry of results) {
      assert.equal(entry.affiliationGroup.displayName, entry.affiliation);
      assert.equal(entry.affiliationGroup.avatar.iconKeys[0], entry.affiliation);
      assert.ok(entry.affiliationGroup.avatar.iconKeys.includes("BA"));
    }
  }
  const rows = names.map((name) => row(name));
  const context = setup(rows);
  load(context, "athleten/ath_data_smal.js");
  const athlete = context.window.AthDataSmall.buildAthletesWithMeets(rows)[0];
  assert.deepEqual(Array.from(athlete.meets, (meet) => meet.Ortsgruppe), names);
  const profile = load(context, "profil.js", "mapRowToMeet");
  assert.deepEqual(rows.map((values) => profile.mapRowToMeet(values).Ortsgruppe), names);
  const tabs = load(context, "profil/profil_tabs.js", "mergeDuplicateMeets");
  const meets = tabs.mergeDuplicateMeets(athlete.meets);
  assert.equal(meets.length, names.length);
  assert.deepEqual(Array.from(meets, (meet) => meet.Ortsgruppe).sort(), [...names].sort());
});
}

test("every page using a club-name consumer loads the shared merger rules first", () => {
  const consumers = ["clubs/clubs_data.js", "clubs/clubs_profil.js", "athleten/ath_data_smal.js", "profil.js",
    "0_gadges/Punkte_tabellen.js", "0_gadges/PZ_tabellen.js", "0_gadges/Qualli_tabellen.js"];
  for (const file of fs.readdirSync(root).filter((name) => name.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const scripts = Array.from(html.matchAll(/<script[^>]+src="\.\/js\/([^"?]+)/g), (match) => match[1]);
    for (const consumer of consumers.filter((name) => scripts.includes(name))) {
      assert.ok(scripts.indexOf("shared/club_names.js") >= 0 &&
        scripts.indexOf("shared/club_names.js") < scripts.indexOf(consumer), `${file}: ${consumer}`);
    }
  }
});
