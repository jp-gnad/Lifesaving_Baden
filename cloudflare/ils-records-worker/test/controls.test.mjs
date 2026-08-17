import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(
  new URL("../../../web/js/punkterechner/punkterechner_controls.js", import.meta.url),
  "utf8"
);
const pageSource = await readFile(
  new URL("../../../web/js/punkterechner.js", import.meta.url),
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

const pageContext = {
  prT: key => ({
    modeLabel: "Disziplinen",
    modeIndividual: "Einzel",
    modeTeam: "Mannschaft",
    heroInfoNational: "Hero-Info",
    sourceNote: "Quellenhinweis",
    sourceLinkText: "Quelle"
  })[key] || key,
  document: {
    addEventListener: () => {}
  }
};
pageContext.window = pageContext;
vm.createContext(pageContext);
vm.runInContext(pageSource, pageContext);

test("renders the compact hero mode switch", () => {
  const markup = pageContext.prCreateHeroMarkup();

  assert.match(markup, /id="pr-hero-mode"[^>]*role="group"/);
  assert.match(markup, /data-pr-hero-mode="Einzel"[^>]*aria-pressed="true"/s);
  assert.match(markup, /data-pr-hero-mode="Mannschaft"[^>]*aria-pressed="false"/s);
  assert.match(markup, />・<\/span>/);
});

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

test("renders compact settings with a dedicated overlay launcher", () => {
  const markup = context.prCreateControlsMarkup();

  assert.match(markup, /id="pr-controls-launcher"/);
  assert.match(markup, /id="pr-controls-launcher-label"[^>]*>Einstellungen<\/span>/);
  assert.match(markup, /aria-controls="pr-controls-surface"/);
  assert.match(markup, /id="pr-controls-surface"/);
  assert.match(markup, /aria-labelledby="pr-settings-title"/);
  assert.match(markup, /aria-hidden="true"\s+inert/);
  assert.match(markup, /id="pr-controls-compact-summary"/);
  assert.match(markup, /class="pr-controls-compact-summary ath-overview-chips is-filled"/);
  assert.match(markup, /id="pr-controls-compact-summary"[^>]*role="group"/);
  ["rule", "age", "gender"].forEach(action => {
    assert.match(
      markup,
      new RegExp(`<button id="pr-summary-${action}-action" class="pr-controls-summary-chip ath-overview-chip" type="button"`)
    );
  });
  assert.match(markup, /id="pr-summary-rule-value"/);
  assert.match(markup, /id="pr-summary-age-value"/);
  assert.match(markup, /id="pr-summary-gender-value"/);
  assert.match(markup, /id="pr-controls-toggle"[\s\S]*aria-label="Einstellungen schließen"/);
});

test("shows the currently selected language in the language switch", () => {
  vm.runInContext('prLangState.current = "de"', context);
  assert.equal(context.prT("switchText"), "Deutsch");
  assert.match(context.prT("switchFlag"), /Deutschland\.svg$/);
  assert.match(context.prT("heroInfoNational"), /Deutsche Meisterschaften/);
  assert.match(context.prT("heroInfoInternational"), /Lifesaving Score/);

  vm.runInContext('prLangState.current = "en"', context);
  assert.equal(context.prT("switchText"), "English");
  assert.match(context.prT("switchFlag"), /Großbritannien\.svg$/);
  assert.match(context.prT("heroInfoNational"), /German championships/);
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
