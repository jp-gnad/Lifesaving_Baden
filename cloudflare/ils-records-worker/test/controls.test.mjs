import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(
  new URL("../../../web/js/punkterechner/punkterechner_controls.js", import.meta.url),
  "utf8"
);

const context = {
  console,
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  document: {
    getElementById: () => null,
    querySelectorAll: () => []
  }
};
context.window = context;
context.window.prGetIlsMasterAgeValues = () => ["30", "35", "50"];
vm.createContext(context);
vm.runInContext(source, context);

test("renders mode, gender and record source as segmented controls", () => {
  const markup = context.prCreateControlsMarkup();

  ["pr-mode", "pr-gender", "pr-rule"].forEach(id => {
    assert.match(markup, new RegExp(`<select id="${id}"[^>]*hidden`));
    assert.match(markup, new RegExp(`data-pr-select="${id}"`));
  });

  assert.match(markup, /<select id="pr-score">/);
  assert.match(markup, /<select id="pr-age">/);

  const orderedIds = ["pr-mode", "pr-gender", "pr-age", "pr-score", "pr-rule"];
  const positions = orderedIds.map(id => markup.indexOf(`id="${id}"`));
  assert.ok(positions.every((position, index) => index === 0 || position > positions[index - 1]));
});

test("shows the currently selected language in the language switch", () => {
  vm.runInContext('prLangState.current = "de"', context);
  assert.equal(context.prT("switchText"), "Deutsch");
  assert.match(context.prT("switchFlag"), /Deutschland\.svg$/);

  vm.runInContext('prLangState.current = "en"', context);
  assert.equal(context.prT("switchText"), "English");
  assert.match(context.prT("switchFlag"), /Großbritannien\.svg$/);
  vm.runInContext('prLangState.current = "de"', context);
});

test("offers live ILS masters ages only for individual world records", () => {
  const individual = context.prGetAgeOptions("International", "Einzel");
  assert.deepEqual(
    Array.from(individual, option => option.value),
    ["Offen", "Youth", "30", "35", "50"]
  );
  assert.deepEqual(
    Array.from(individual.slice(2), option => option.label),
    ["30", "35", "50"]
  );

  vm.runInContext('prLangState.current = "en"', context);
  const englishIndividual = context.prGetAgeOptions("International", "Einzel");
  assert.deepEqual(
    Array.from(englishIndividual.slice(2), option => option.label),
    ["30", "35", "50"]
  );
  vm.runInContext('prLangState.current = "de"', context);

  const national = context.prGetAgeOptions("National", "Einzel");
  assert.deepEqual(
    Array.from(national.slice(0, 6), option => option.label),
    ["12", "13/14", "15/16", "17/18", "Offen", "25"]
  );

  const team = context.prGetAgeOptions("International", "Mannschaft");
  assert.deepEqual(Array.from(team, option => option.value), ["Offen", "Youth"]);
});

test("offers Mixed only for world-record teams", () => {
  assert.deepEqual(
    Array.from(
      context.prGetGenderOptions("International", "Mannschaft"),
      option => option.value
    ),
    ["weiblich", "m\u00e4nnlich", "mixed"]
  );
  assert.deepEqual(
    Array.from(
      context.prGetGenderOptions("International", "Einzel"),
      option => option.value
    ),
    ["weiblich", "m\u00e4nnlich"]
  );
  assert.deepEqual(
    Array.from(
      context.prGetGenderOptions("National", "Mannschaft"),
      option => option.value
    ),
    ["weiblich", "m\u00e4nnlich"]
  );
});
