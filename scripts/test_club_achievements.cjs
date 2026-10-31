const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const root = path.join(__dirname, "..", "web/js");
function load(context, file, expose = "") {
  let source = fs.readFileSync(path.join(root, file), "utf8");
  if (expose) {
    const end = source.lastIndexOf("})();");
    source = source.slice(0, end) + `window.testApi = { ${expose} };\n` + source.slice(end);
  }
  vm.runInContext(source, context, { filename: file });
  return context.window.testApi;
}

function setup() {
  const context = vm.createContext({
    window: { location: { protocol: "http:" }, addEventListener() {} },
    document: { addEventListener() {} }, console
  });
  load(context, "shared/club_names.js");
  load(context, "clubs/clubs_data.js");
  const helpers = load(context, "clubs/clubs_profil.js",
    "COLS, DISCIPLINES, groupMatchesRow, normalizeForCompare, excelSerialToISO, parseTwoDigitYearWithMeetYear, makeAthleteId");
  const { buildAchievementsData } = load(context, "clubs/clubs_profile_achievements.js", "buildAchievementsData");
  const groups = {
    og: { kind: "og", name: "Ettlingen/Wettersbach" },
    lv: { kind: "lv", name: "Baden", searchKeys: ["BA"] },
    bv: { kind: "bv", name: "Deutschland", bvCodes: ["GER"] }
  };
  return { build: (rows, group = groups.og) => buildAchievementsData(rows, group, helpers), groups };
}

function row({ name = "Alex Beispiel", club = "Ettlingen", lv = "BA", bv = "GER", startrecht = "OG",
  meet = "LMS - 2024", date = 45400, year = 8, pool = "50", scoring = "Mehrkampf", round = 1,
  multi = "", lifesaver = "", rescue = "", time = 60, rescueTime = "" } = {}) {
  const values = Array(28).fill("");
  Object.assign(values, { 0: "w", 1: name, 3: time, 4: rescueTime, 9: date, 10: meet, 11: year,
    12: club, 13: lv, 14: multi, 15: lifesaver, 16: rescue, 21: pool, 23: "GER",
    24: startrecht, 25: scoring, 26: round, 27: bv });
  return values;
}
const total = (data) => data.medals.gold + data.medals.silver + data.medals.bronze;
const count = (data, key) => data.categories.find((category) => category.key === key).count;

test("participations and medals belong exclusively to the represented OG, LV or BV", () => {
  const { build, groups } = setup();
  const rows = [row({ startrecht: "OG", multi: 1 }), row({ startrecht: "LV", multi: 2 }),
    row({ startrecht: "BV", multi: 3 }), row({ startrecht: "", multi: 1 }),
    row({ club: "Durlach", lv: "BY", bv: "ESP", multi: 1 }),
    row({ startrecht: "LV", lv: "BY", multi: 1 }), row({ startrecht: "BV", bv: "ESP", multi: 1 })];
  for (const kind of ["og", "lv", "bv"]) {
    const result = build(rows, groups[kind]);
    assert.equal(result.competitions, 1, kind);
    assert.equal(total(result), 1, kind);
    assert.equal(result.medals[{ og: "gold", lv: "silver", bv: "bronze" }[kind]], 1, kind);
  }
});

test("only the nine agreed event types count, excluding WG qualification and WM/EM", () => {
  const { build } = setup();
  const meets = ["OMS-Ettlingen", "BMS-KA", "LMS", "DMM", "DEM", "JRP", "DP", "BP", "World-Games"];
  const rows = meets.map((meet) => row({ meet: `${meet} - 2024`, multi: 1 }));
  for (const meet of ["WG-Quali", "World-Games-Quali", "WM-Natio", "EM", "DSM", "Salzpokal", "DP-Quali", "XOMS", "Bestenliste50"]) {
    rows.push(row({ meet: `${meet} - 2024`, multi: 1 }));
  }
  const data = build(rows);
  assert.equal(data.competitions, 9);
  assert.equal(total(data), 9);
  assert.ok(data.categories.every((category) => category.count === 1));
});

test("an edition counts once across people, dates, pools, rounds and duplicate rows", () => {
  const { build } = setup();
  const data = build([row({ multi: 1 }), row({ multi: 1 }), row({ date: 45401, multi: 1 }),
    row({ date: 45401, pool: "25", multi: 2 }), row({ name: "Kim Beispiel", multi: 3 }),
    row({ meet: "LMS - 2023", multi: 1 }), row({ meet: "BMS-KA - 2024" }), row({ meet: "BMS-EN - 2024" })]);
  assert.equal(data.competitions, 4);
  assert.equal(count(data, "LMS"), 2);
  assert.equal(count(data, "BMS"), 2);
  assert.equal(data.firstYear, 2023);
  assert.equal(data.lastYear, 2024);
  assert.equal(total(data), 4, "duplicates are removed but different people, editions and pool events retain medals");
});

test("World Games aliases share one edition while a qualification stays separate and excluded", () => {
  const { build, groups } = setup();
  const rows = [row({ meet: "World-Games - 2001", startrecht: "BV", scoring: "Einzelkampf", lifesaver: 3 }),
    row({ meet: "WG - 2001", startrecht: "BV", scoring: "Einzelkampf", lifesaver: 3 }),
    row({ meet: "WG-Quali - 2001", multi: 1 })];
  assert.equal(build(rows).competitions, 0);
  const national = build(rows, groups.bv);
  assert.equal(count(national, "WG"), 1);
  assert.equal(national.medals.bronze, 1);
});

test("only final individual rankings count; a timed final in another discipline is retained", () => {
  const { build } = setup();
  const data = build([row({ scoring: "Einzelkampf", round: 1, lifesaver: 1, rescue: 3, rescueTime: 45 }),
    row({ scoring: "Einzelkampf", round: 2, lifesaver: 2 })]);
  assert.equal(data.medals.gold, 0);
  assert.equal(data.medals.silver, 1);
  assert.equal(data.medals.bronze, 1);
  assert.equal(data.medalTypes.individual, 2);
});

test("a final DQ or missing final ranking never falls back to a preliminary podium", () => {
  const { build } = setup();
  for (const final of [row({ scoring: "Einzelkampf", round: 2, time: "DQ", lifesaver: 1 }),
    row({ scoring: "Einzelkampf", round: 2, time: 59 })]) {
    assert.equal(total(build([row({ scoring: "Einzelkampf", lifesaver: 1 }), final])), 0);
  }
  assert.equal(total(build([row({ multi: 1 }), row({ round: 2, multi: 4 })])), 0);
  assert.equal(total(build([row({ multi: 1 }), row({ round: 2 })])), 0);
});

test("scoring controls individual and multi-event medals, including 2Kampf and 6-Kampf", () => {
  const { build } = setup();
  for (const scoring of ["Mehrkampf", "2Kampf", "6-Kampf"]) {
    const data = build([row({ scoring, multi: 1, lifesaver: 1 })]);
    assert.equal(data.medalTypes.multi, 1);
    assert.equal(data.medalTypes.individual, 0);
  }
  const individual = build([row({ scoring: "Einzelkampf", multi: 1, lifesaver: 2 })]);
  assert.equal(individual.medalTypes.multi, 0);
  assert.equal(individual.medals.silver, 1);
  const combined = build([row({ scoring: "Einzel-/Mehrkampf", multi: 1, lifesaver: 2 })]);
  assert.equal(combined.medalTypes.multi, 1);
  assert.equal(combined.medalTypes.individual, 1);
  assert.equal(total(build([row({ scoring: "", multi: 1, lifesaver: 1 })])), 0);
});

test("historical memberships and merger rules attribute medals at the time of the result", () => {
  const { build } = setup();
  const rows = [row({ club: "Wettersbach", meet: "LMS - 1999", year: "", multi: 1 }),
    row({ club: "Ettlingen", meet: "LMS - 2000", year: "", multi: 2 }),
    row({ club: "Durlach", meet: "LMS - 2024", year: "", multi: 3 })];
  assert.equal(total(build(rows)), 2, "unknown birth years do not exclude historical medals");
  assert.equal(total(build(rows, { kind: "og", name: "Durlach" })), 1);
  const merged = build([row({ club: "Bodman", name: "Alex", multi: 1 }),
    row({ club: "Ludwigshafen", name: "Kim", multi: 2 })], { kind: "og", name: "Bodman-Ludwigshafen" });
  assert.equal(merged.competitions, 1);
  assert.equal(total(merged), 2);
});

test("empty inputs, conflicting rankings, malformed places and missing years do not invent medals", () => {
  const { build } = setup();
  assert.equal(build([]).competitions, 0);
  assert.equal(build([]).firstYear, null);
  assert.equal(total(build([row({ multi: 1 }), row({ multi: 2 })])), 0);
  for (const multi of ["1?", "DQ", "-1", "1.5", ""]) assert.equal(total(build([row({ multi })])), 0);
  assert.equal(build([row({ meet: "LMS", date: "" })]).competitions, 0);
  assert.equal(build([row({ name: "", multi: 1 })]).competitions, 0);
  assert.equal(build([row({ time: "DQ" })]).competitions, 1, "a disqualified start is still a participation");
});

test("the Erfolge module is loaded before the club profile bootstrap", () => {
  const html = fs.readFileSync(path.join(root, "../clubs_profil.html"), "utf8");
  assert.ok(html.indexOf("clubs_profile_achievements.js") < html.indexOf("clubs_profil.js"));
});
