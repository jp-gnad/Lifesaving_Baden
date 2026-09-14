const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const sandbox = { window: {} };
for (const file of ["web/js/clubs/clubs_data.js", "web/js/uebersicht/uebersicht_data.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), sandbox);
}
const build = (rows) => sandbox.window.OverviewData.buildStats(rows, sandbox.window.ClubsData.normalizeOrtsgruppeName);
const count = (stats, group, key) => stats[group].find((item) => item.key === key).count;

function row({ name = "Alex Beispiel", gender = "w", birth = 8, year = 2026, date, meet = "LMS", club = "Ettlingen", times = [], places = [] } = {}) {
  const values = Array(28).fill("");
  values[0] = gender;
  values[1] = name;
  values[9] = date ?? (Date.UTC(year, 5, 15) - Date.UTC(1899, 11, 30)) / 86400000;
  values[10] = `${meet} - ${year}`;
  values[11] = birth;
  values[12] = club;
  times.forEach((value, index) => { values[3 + index] = value; });
  places.forEach((value, index) => { values[15 + index] = value; });
  return values;
}

function assertTotals(stats) {
  assert.equal(stats.ages.reduce((total, group) => total + group.count, 0), stats.athletes);
  assert.equal(stats.genders.reduce((total, group) => total + group.count, 0), stats.athletes);
}

test("latest competition determines age once, regardless of row order or club changes", () => {
  const rows = [
    row({ year: 2026, club: "Wettersbach" }),
    row({ year: 2022, club: "Durlach" }),
    row({ year: 2025, name: "Beispiel, Alex" }),
    row({ year: 2026 })
  ];
  for (const input of [rows, [...rows].reverse()]) {
    const stats = build(input);
    assert.equal(stats.athletes, 1);
    assert.equal(stats.clubs, 2);
    assert.equal(stats.competitions, 3);
    assert.equal(count(stats, "ages", "ak17_18"), 1);
    assert.equal(stats.firstDate, "2022-06-15");
    assert.equal(stats.lastDate, "2026-06-15");
    assertTotals(stats);
  }
});

test("all age boundaries and unknown ages use disjoint groups", () => {
  const ages = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 65];
  const rows = ages.map((age) => row({ name: `Person ${age}`, birth: (2026 - age) % 100 }));
  rows.push(row({ name: "Unbekannter Jahrgang", birth: "" }));
  rows.push(row({ name: "Ungültiges Datum", birth: 8, date: "not-a-date" }));
  const stats = build(rows);
  assert.deepEqual(Array.from(stats.ages, (group) => group.count), [1, 2, 2, 2, 2, 2, 2]);
  assertTotals(stats);
});

test("a dated row without a competition cannot replace the last competition", () => {
  const incomplete = row({ year: 2026 });
  incomplete[10] = "";
  const stats = build([row({ year: 2022 }), incomplete]);
  assert.equal(stats.athletes, 1);
  assert.equal(count(stats, "ages", "ak13_14"), 1);
  assert.equal(stats.lastDate, "2022-06-15");
});

test("missing years can be resolved only when the name and gender have one known year", () => {
  const stats = build([
    row({ year: 2021, birth: 8 }),
    row({ year: 2026, birth: "" }),
    row({ name: "Sam Muster", birth: 6 }),
    row({ name: "Sam Muster", birth: 7 }),
    row({ name: "Sam Muster", birth: "" }),
    row({ name: "Sam Muster", birth: "", gender: "m" })
  ]);
  assert.equal(stats.athletes, 5);
  assert.equal(count(stats, "ages", "ak17_18"), 1);
  assert.equal(count(stats, "ages", "unknown"), 2);
  assert.equal(count(stats, "genders", "w"), 4);
  assert.equal(count(stats, "genders", "m"), 1);
  assertTotals(stats);
});

test("starts count each time OR place, including DQs, but ignore zero and placeholders", () => {
  const stats = build([
    row({ times: ["1:05,32", "DQ", "0", "—", "", 0], places: [1, "DSQ", 0, "-", 2, "0,00"] }),
    row({ times: [0, "0.00", "-", "Ausg.", "", null], places: [0, "", "", "", "DISQ", ""] })
  ]);
  assert.equal(stats.starts, 5);
  assert.equal(stats.athletes, 1);
  assertTotals(stats);
});

test("club normalization and competition editions match the club profile", () => {
  const stats = build([
    row({ club: "Ettlingen", year: 2025 }),
    row({ club: "Wettersbach", year: 2025 }),
    row({ club: "Durlach", year: 2026 }),
    row({ club: "Söllingen", year: 2026 }),
    row({ club: "Grötzingen", year: 2026 }),
    row({ club: "", meet: "OMS-Beispiel", year: 2026 })
  ]);
  assert.equal(stats.clubs, 2);
  assert.equal(stats.competitions, 3);
});

test("year 00 and four-digit years work; missing gender stays unknown", () => {
  const stats = build([
    row({ name: "Jahrgang Null", birth: 0 }),
    row({ name: "Jahrgang Null", birth: 2000 }),
    row({ name: "Geschlecht unbekannt", gender: "", birth: 2010 })
  ]);
  assert.equal(stats.athletes, 2);
  assert.equal(count(stats, "ages", "ak19_plus"), 1);
  assert.equal(count(stats, "ages", "ak15_16"), 1);
  assert.equal(count(stats, "genders", "unknown"), 1);
  assertTotals(stats);
});

test("empty data and optional header do not create phantom people", () => {
  const stats = build([null, [], row({ name: "" }), ["Geschlecht", "Name"]]);
  for (const metric of ["athletes", "clubs", "competitions", "starts"]) assert.equal(stats[metric], 0);
  assert.equal(stats.firstDate, "");
  assertTotals(stats);
});
