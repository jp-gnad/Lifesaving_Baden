import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = globalThis;
await import("../../../web/js/punkterechner/punkterechner_ils_records.js");

const records = [
  {
    category: "open",
    age: "Open",
    gender: "male",
    event: "200m Obstacle Swim",
    kind: "individual",
    seconds: 111.73,
    time: "1:51.73"
  },
  {
    category: "open",
    age: "Open",
    gender: "male",
    event: "Line Throw",
    kind: "team",
    seconds: 8.69,
    time: "0:08.69"
  },
  {
    category: "open",
    age: "Open",
    gender: "mixed",
    event: "4x50m Pool Lifesaver Relay",
    kind: "team",
    seconds: 102.92,
    time: "1:42.92"
  },
  {
    category: "youth",
    age: "Youth",
    gender: "female",
    event: "A Future ILS Event",
    kind: "individual",
    seconds: 60,
    time: "1:00.00"
  },
  {
    category: "masters",
    age: "M30",
    gender: "female",
    event: "200m Obstacle Swim",
    kind: "individual",
    seconds: 130.14,
    time: "2:10.14"
  },
  {
    category: "masters",
    age: "M50",
    gender: "female",
    event: "100m Obstacle Swim",
    kind: "individual",
    seconds: 69.54,
    time: "1:09.54"
  }
];

window.prIlsRecords.records = records;

test("maps known ILS disciplines and keeps unknown future events", () => {
  const openMen = window.prGetIlsDisciplines("Einzel", "Offen", "männlich");
  assert.equal(openMen.length, 1);
  assert.equal(openMen[0].label, "200m Hindernisschwimmen");
  assert.equal(openMen[0].labelEn, "200m Obstacle Swim");
  assert.equal(openMen[0].recordSeconds, 111.73);

  const future = window.prGetIlsDisciplines("Einzel", "Youth", "weiblich");
  assert.equal(future.length, 1);
  assert.equal(future[0].label, "A Future ILS Event");
});

test("uses Mixed as gender and Open or Youth as age", () => {
  const mixed = window.prGetIlsDisciplines("Mannschaft", "Offen", "mixed");
  assert.equal(mixed.length, 1);
  assert.equal(mixed[0].label, "4×50m Rettungsstaffel");
});

test("derives available masters ages from live records", () => {
  assert.deepEqual(window.prGetIlsMasterAgeValues(), ["30", "50"]);

  const masters = window.prGetIlsDisciplines("Einzel", "50", "weiblich");
  assert.equal(masters.length, 1);
  assert.equal(masters[0].label, "100m Hindernisschwimmen");
});

test("treats line throw as a team discipline", () => {
  const teams = window.prGetIlsDisciplines("Mannschaft", "Offen", "männlich");
  assert.equal(teams.length, 1);
  assert.equal(teams[0].label, "Leinenwurf");
});
