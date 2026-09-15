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

function row({ name = "Alex Beispiel", gender = "w", birth = 8, year = 2026, date, meet = "LMS", club = "Ettlingen", lv = "BA", bv = "GER", times = [], places = [] } = {}) {
  const values = Array(28).fill("");
  values[0] = gender;
  values[1] = name;
  values[9] = date ?? (Date.UTC(year, 5, 15) - Date.UTC(1899, 11, 30)) / 86400000;
  values[10] = `${meet} - ${year}`;
  values[11] = birth;
  values[12] = club;
  values[13] = lv;
  values[27] = bv;
  times.forEach((value, index) => { values[3 + index] = value; });
  places.forEach((value, index) => { values[15 + index] = value; });
  return values;
}

function assertTotals(stats) {
  assert.equal(stats.ages.reduce((total, group) => total + group.count, 0), stats.athletes);
  assert.equal(stats.ageClasses.reduce((total, group) => total + group.count, 0), stats.athletes);
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
    assert.equal(count(stats, "ages", "age_18"), 1);
    assert.equal(stats.firstDate, "2022-06-15");
    assert.equal(stats.lastDate, "2026-06-15");
    assertTotals(stats);
  }
});

test("every age is shown separately through 29, then grouped as 30+", () => {
  const ages = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 65];
  const rows = ages.map((age) => row({ name: `Person ${age}`, birth: (2026 - age) % 100 }));
  rows.push(row({ name: "Unbekannter Jahrgang", birth: "" }));
  rows.push(row({ name: "Ungültiges Datum", birth: 8, date: "not-a-date" }));
  const stats = build(rows);
  assert.equal(stats.ages[0].key, "age_10");
  assert.equal(stats.ages.at(-2).key, "age_30_plus");
  assert.equal(stats.ages.at(-2).count, 1);
  assert.equal(stats.ages.at(-1).key, "unknown");
  assert.equal(stats.ages.at(-1).count, 2);
  for (const age of ages.filter((value) => value < 30)) {
    assert.equal(count(stats, "ages", `age_${age}`), 1);
  }
  assertTotals(stats);
});

test("age classes cover every athlete", () => {
  const ages = [8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 39, 40, 81];
  const rows = ages.map((age) => row({ name: `Klasse ${age}`, birth: (2026 - age) % 100 }));
  rows.push(row({ name: "Ohne Alter", birth: "" }));
  const stats = build(rows);

  assert.equal(count(stats, "ageClasses", "ak_10"), 2);
  assert.equal(count(stats, "ageClasses", "ak_11_12"), 2);
  assert.equal(count(stats, "ageClasses", "ak_13_14"), 2);
  assert.equal(count(stats, "ageClasses", "ak_15_16"), 2);
  assert.equal(count(stats, "ageClasses", "ak_17_18"), 2);
  assert.equal(count(stats, "ageClasses", "ak_open"), 2);
  assert.equal(count(stats, "ageClasses", "ak_masters"), 2);
  assert.equal(count(stats, "ageClasses", "unknown"), 1);
  assertTotals(stats);
});

test("a dated row without a competition cannot replace the last competition", () => {
  const incomplete = row({ year: 2026 });
  incomplete[10] = "";
  const stats = build([row({ year: 2022 }), incomplete]);
  assert.equal(stats.athletes, 1);
  assert.equal(count(stats, "ages", "age_14"), 1);
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
  assert.equal(count(stats, "ages", "age_18"), 1);
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
  assert.equal(stats.disqualifications, 3);
  assert.equal(stats.athletes, 1);
  assertTotals(stats);
});

test("rankings count club starts, disciplines and one DQ per affected discipline", () => {
  const stats = build([
    row({ name: "Alex Beispiel", club: "Ettlingen", meet: "LMS", times: ["DQ", "1:00", "", "", "", ""] }),
    row({ name: "Alex Beispiel", club: "Wettersbach", meet: "DMS", times: ["DSQ", "", "", "", "", ""] }),
    row({ name: "Kim Muster", club: "Durlach", times: ["", "", "", "", "", "Ausg."] }),
    row({ name: "Kim Muster", club: "Durlach", times: ["", "", "", "", "", "1:30"] })
  ]);

  assert.equal(stats.rankings.clubsByStarts[0].label, "Ettlingen");
  assert.equal(stats.rankings.clubsByStarts[0].count, 3);
  assert.equal(stats.rankings.clubsByStarts[0].capKey, "Ettlingen");
  assert.equal(stats.rankings.clubsByStarts[0].lvCode, "BA");
  assert.equal(stats.rankings.clubsByStarts[0].profileId, "group_og_ettlingen-wettersbach");
  assert.equal(stats.rankings.clubsByCompetitions[0].label, "Ettlingen");
  assert.equal(stats.rankings.clubsByCompetitions[0].count, 2);
  assert.equal(stats.rankings.landesverbaendeByStarts[0].label, "Baden");
  assert.equal(stats.rankings.landesverbaendeByStarts[0].capKey, "BA");
  assert.equal(stats.rankings.landesverbaendeByStarts[0].count, 5);
  assert.equal(stats.rankings.landesverbaendeByStarts[0].profileId, "group_lv_baden");
  assert.equal(stats.rankings.landesverbaendeByCompetitions[0].count, 2);
  assert.equal(stats.rankings.bundesverbaendeByStarts[0].label, "Deutschland");
  assert.equal(stats.rankings.bundesverbaendeByStarts[0].capKey, "GER");
  assert.equal(stats.rankings.bundesverbaendeByStarts[0].count, 5);
  assert.equal(stats.rankings.bundesverbaendeByStarts[0].profileId, "group_bv_deutschland");
  assert.equal(stats.rankings.bundesverbaendeByCompetitions[0].count, 2);
  assert.equal(stats.rankings.peopleByStarts[0].label, "Alex Beispiel");
  assert.equal(stats.rankings.peopleByStarts[0].count, 3);
  assert.equal(stats.rankings.peopleByStarts[0].profileId, "ath_alex-beispiel_2008_w");
  assert.equal(stats.rankings.peopleByCompetitions[0].label, "Alex Beispiel");
  assert.equal(stats.rankings.peopleByCompetitions[0].count, 2);
  assert.deepEqual({ ...stats.rankings.disciplines[0] }, { label: "100m Lifesaver", count: 2 });
  assert.deepEqual(
    { ...stats.rankings.disqualifications[0] },
    { label: "Alex Beispiel", profileId: "ath_alex-beispiel_2008_w", count: 2 }
  );
  assert.equal(stats.rankings.disqualifications[1].count, 1);
  assert.equal(stats.disqualifications, 3);
  assertTotals(stats);
});

test("disqualification ranking omits a tied group that would exceed five athletes", () => {
  const rows = [];
  [13, 10, 9, 8, 8, 8, 7].forEach((dqCount, athleteIndex) => {
    let remaining = dqCount;
    let meetIndex = 0;
    while (remaining > 0) {
      const count = Math.min(6, remaining);
      rows.push(row({
        name: `DQ Person ${athleteIndex}`,
        meet: `Wettkampf ${athleteIndex}-${meetIndex}`,
        times: Array(count).fill("DQ")
      }));
      remaining -= count;
      meetIndex += 1;
    }
  });
  const stats = build(rows);
  assert.deepEqual(Array.from(stats.rankings.disqualifications, (item) => item.count), [13, 10, 9]);
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
  assert.equal(count(stats, "ages", "age_26"), 1);
  assert.equal(count(stats, "ages", "age_16"), 1);
  assert.equal(count(stats, "genders", "unknown"), 1);
  assertTotals(stats);
});

test("empty data and optional header do not create phantom people", () => {
  const stats = build([null, [], row({ name: "" }), ["Geschlecht", "Name"]]);
  for (const metric of ["athletes", "clubs", "competitions", "starts", "disqualifications"]) assert.equal(stats[metric], 0);
  assert.equal(stats.firstDate, "");
  assertTotals(stats);
});
