const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function setup() {
  const document = { readyState: "loading", addEventListener() {}, querySelector: () => null };
  const window = { addEventListener() {}, scrollTo() {}, location: { protocol: "http:" } };
  const context = vm.createContext({ window, document, history: {}, console, URL, Map, Set });
  load(context, "shared/club_names.js");
  return context;
}

function load(context, file, exposed = "") {
  let source = fs.readFileSync(path.join(__dirname, "..", "web/js", file), "utf8");
  // Expose private behavior in the test context without changing the browser API.
  if (exposed) {
    const end = Math.max(source.lastIndexOf("})();"), source.lastIndexOf("})(window);"));
    assert.ok(end >= 0);
    source = source.slice(0, end) + `window.testApi = { ${exposed} };\n` + source.slice(end);
  }
  vm.runInContext(source, context, { filename: file });
  return context.window.testApi;
}

function row(birth, name = "Alex Beispiel") {
  const values = Array(28).fill("");
  values[0] = "w";
  values[1] = name;
  values[3] = "1:00,00";
  values[9] = 46000;
  values[10] = "LMS";
  values[11] = birth;
  values[12] = "Testclub";
  values[13] = "BA";
  values[21] = "50";
  values[22] = "national";
  return values;
}

const missingYears = [undefined, null, "", "  ", "-", "–", '""'];

test("athlete search data keeps unknown years and their results without merging them with year 00", () => {
  const context = setup();
  load(context, "athleten/ath_data_smal.js");
  const api = context.window.AthDataSmall;
  const rows = [...missingYears.map((birth) => row(birth)), row(0), row("00"), row(2000), row("08", "Kim Beispiel")];
  for (const build of [api.buildIndicesFromRows, api.buildAthletesWithMeets]) {
    const athletes = build(rows);
    assert.equal(athletes.length, 3);
    const unknown = athletes.find((athlete) => athlete.id === "ath_alex-beispiel_x_w");
    assert.ok(unknown);
    assert.equal(unknown.jahrgang, null);
    assert.equal(unknown.ortsgruppe, "Testclub");
    assert.equal(athletes.find((athlete) => athlete.id === "ath_alex-beispiel_2000_w").jahrgang, 2000);
    assert.equal(athletes.find((athlete) => athlete.name === "Kim Beispiel").jahrgang, 2008);
    if (unknown.meets) assert.equal(unknown.meets.length, missingYears.length);
  }
});

test("profile and club readers agree with athlete search IDs and reject missing/invalid years", () => {
  for (const file of ["profil.js", "clubs/clubs_profil.js", "clubs/clubs_top10.js"]) {
    const api = load(setup(), file, "parseTwoDigitYearWithMeetYear");
    for (const value of [...missingYears, true, -1, 8.5, "abc", 123]) {
      assert.equal(api.parseTwoDigitYearWithMeetYear(value, "2026-10-23"), null, `${file}: ${String(value)}`);
    }
    for (const [value, expected] of [[0, 2000], ["00", 2000], [8, 2008], [99, 1999], [2008, 2008]]) {
      assert.equal(api.parseTwoDigitYearWithMeetYear(value, "2026-10-23"), expected, file);
    }
  }
  const profile = load(setup(), "profil.js", "buildIndicesFromRows");
  const athletes = profile.buildIndicesFromRows([row(""), row(0)]);
  assert.equal(athletes.length, 2);
  assert.equal(athletes.find((athlete) => athlete.jahrgang == null).id, "ath_alex-beispiel_x_w");
});

test("search and profile display unknown years as a dash and do not calculate an age class", () => {
  const context = setup();
  const search = load(context, "athleten/ath_search.js", "formatYearShort");
  for (const value of missingYears.slice(0, 4)) assert.equal(search.formatYearShort(value), "–");
  assert.equal(search.formatYearShort(2000), "00");
  const head = load(context, "profil/profil_head.js", "ageFromJahrgang, akDE");
  for (const value of missingYears) {
    assert.equal(head.ageFromJahrgang(value, 2026), null);
    assert.equal(head.akDE(head.ageFromJahrgang(value, 2026)), "–");
  }
  assert.equal(head.ageFromJahrgang(2008, 2026), 18);
  assert.equal(head.akDE(18), "17/18");
});

test("time and LSC charts omit age-based data when birth year is unknown", async () => {
  const context = setup();
  const tabs = load(context, "profil/profil_tabs.js", "ageAt, buildTimeSeriesForDiscipline");
  const charts = load(context, "profil/profil_tabs_charts.js", "buildLSCSeries, buildCalculatedLSCSeries");
  const meet = { date: "2026-10-23", LSC: "100", "50m_Retten_Zeit": "1:00,00" };
  for (const jahrgang of missingYears) {
    const athlete = { jahrgang, meets: [meet] };
    assert.ok(Number.isNaN(tabs.ageAt(meet.date, jahrgang)));
    assert.equal(tabs.buildTimeSeriesForDiscipline(athlete, "50_retten").length, 0);
    assert.equal(charts.buildLSCSeries(athlete).length, 0);
    assert.equal((await charts.buildCalculatedLSCSeries(athlete)).length, 0);
  }
  assert.ok(tabs.ageAt(meet.date, 2008) > 18);
  assert.equal(charts.buildLSCSeries({ jahrgang: 2008, meets: [meet] }).length, 1);
});

test("calculator does not import an athlete or infer an age without a birth year", async () => {
  const context = setup();
  let calls = 0;
  context.document.getElementById = () => { calls++; throw new Error("Unexpected calculator change"); };
  const api = load(context, "punkterechner/punkterechner_athlete_search.js", "prApplyAthleteSelection, prBuildAthleteIdFromRow");
  for (const jahrgang of missingYears) {
    await api.prApplyAthleteSelection({ name: "Alex Beispiel", jahrgang });
    assert.equal(api.prBuildAthleteIdFromRow(row(jahrgang)), "ath_alex-beispiel_x_w");
  }
  assert.equal(calls, 0);
  assert.equal(api.prBuildAthleteIdFromRow(row(0)), "ath_alex-beispiel_2000_w");
});

test("points tables leave age blank and exclude unknown ages from age-restricted lists", () => {
  const api = load(setup(), "0_gadges/Punkte_tabellen.js", "buildAthletesForConfig");
  const cfg = { DATE_TO: "2026-12-31", KAMPF: 1, REF_WR: { w: { lifesaver100: { sec: 50 } } } };
  const rows = [row(""), row("00", "Jahrgang Null")];
  const athletes = api.buildAthletesForConfig(rows, cfg);
  assert.equal(athletes.length, 2);
  const unknown = athletes.find((athlete) => athlete.baseName === "Alex Beispiel");
  assert.equal(unknown.birthYear, null);
  assert.equal(unknown.age, null);
  assert.equal(unknown.ak, "–");
  assert.equal(api.buildAthletesForConfig(rows, { ...cfg, AGE_MAX: 99 }).length, 1);
  assert.equal(api.buildAthletesForConfig(rows, { ...cfg, AGE_MIN: 0 }).length, 1);
});
