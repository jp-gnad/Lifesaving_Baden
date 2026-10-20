const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function row({ club = "Testclub", lv = "BA", bv = "GER", name = "Alex Beispiel", meet = "LMS", time = 60 } = {}) {
  const values = Array(28).fill("");
  values[0] = "w";
  values[1] = name;
  values[3] = time;
  values[9] = 46000;
  values[10] = meet;
  values[11] = 8;
  values[12] = club;
  values[13] = lv;
  values[21] = "50";
  values[23] = "Spanien";
  values[24] = "BV";
  values[27] = bv;
  return values;
}

class Element {
  constructor(tag, ownerDocument) {
    this.tag = tag;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.classList = {
      add: () => {},
      contains: (name) => (this.className || "").split(" ").includes(name),
      toggle: () => {}
    };
  }
  set innerHTML(value) { this.children = []; }
  setAttribute(key, value) { this.attributes[key] = value; }
  appendChild(child) { this.children.push(child); }
  addEventListener(key, callback) { this.listeners[key] = callback; }
  contains(target) { return !!target && (this === target || this.children.some((child) => child.contains?.(target))); }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  scrollIntoView() {}
  querySelector(selector) { return find(this, (el) => el.classList?.contains(selector.slice(1))); }
}

function find(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children || []) {
    const match = find(child, predicate);
    if (match) return match;
  }
}

function setup(rows) {
  const document = {
    activeElement: null,
    listeners: {},
    createElement: (tag) => new Element(tag, document),
    createTextNode: (text) => ({ text }),
    addEventListener(key, callback) { this.listeners[key] = callback; }
  };
  const sandbox = {
    window: {}, console, document
  };
  sandbox.window.ExcelLoader = {
    loadSheetRows: async () => rows,
    getUrlCandidates: () => ["fixture.xlsx"]
  };
  const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  vm.runInNewContext(read("web/js/clubs/clubs_data.js"), sandbox);
  vm.runInNewContext(read("web/js/clubs/clubs_search.js"), sandbox);
  // Expose private calculations only in this test context; the browser API stays unchanged.
  const source = read("web/js/clubs/clubs_top10.js").replace(
    "window.ClubsTop10 = { mount: mountComponent };",
    "window.ClubsTop10 = { mount: mountComponent }; window.testTop10 = { State, buildRegionFilters, filterRegionRows, buildGroups, refreshGroups, CLUB_LSC_STATE, DISCIPLINES };"
  );
  vm.runInNewContext(source, sandbox);
  const api = sandbox.window.testTop10;
  api.CLUB_LSC_STATE.worldRecordPromise = Promise.resolve(Object.fromEntries(
    api.DISCIPLINES.map(({ key }) => [key, { w: 50, m: 50 }])
  ));
  return { ...sandbox.window, api, document };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

function rankingRows() {
  return [
    { club: "Badenclub", lv: "BA", bv: "GER" },
    { club: "Bayernclub", lv: "BAY", bv: "DEU" },
    { club: "Spanienclub", lv: "Catalunya", bv: "ESP" }
  ].flatMap((club) => Array.from({ length: 100 }, (_, i) => row({
    ...club, name: `Person ${i % 10}`, meet: `Cup ${Math.floor(i / 10)}`
  })));
}

test("dropdown regions come from BV/LV data, skip headers/blanks and merge aliases", () => {
  const header = row({ lv: "LV", bv: "BV" });
  header[10] = "Wettkampf";
  header[12] = "Ortsgruppe";
  const rows = [header, row(), row({ lv: "BAY", bv: "DEU" }), row({ lv: "BY", bv: "Deutschland" }),
    row({ lv: "WÜ", bv: "ESP" }), row({ lv: "WUE", bv: "ESP" }),
    row({ lv: "Catalunya", bv: "FRA" }), row({ lv: "", bv: "" })];
  const { api } = setup(rows);
  const filters = Array.from(api.buildRegionFilters(rows));
  assert.deepEqual(filters.filter((f) => f.kind === "bv").map((f) => f.label), ["Deutschland", "FRA", "Spanien"]);
  assert.deepEqual(filters.filter((f) => f.kind === "lv").map((f) => f.label), ["Baden", "Bayern", "Catalunya", "Württemberg"]);
  assert.equal(api.filterRegionRows(rows, "all"), rows);
  assert.equal(api.filterRegionRows(rows, "bv:deutschland").length, 3);
  assert.equal(api.filterRegionRows(rows, "lv:bayern").length, 2);
  assert.equal(api.filterRegionRows(rows, "lv:wurttemberg").length, 2);
});

test("all nine rankings use the same region before aggregation and top-ten selection", async () => {
  const rows = rankingRows();
  const { api, ClubsData } = setup(rows);
  const { groups } = await ClubsData.loadGroupsAndStats();
  for (const [key, names] of [
    ["all", ["Badenclub", "Bayernclub", "Spanienclub"]],
    ["bv:deutschland", ["Badenclub", "Bayernclub"]],
    ["bv:spanien", ["Spanienclub"]],
    ["lv:baden", ["Badenclub"]],
    ["lv:bayern", ["Bayernclub"]]
  ]) {
    const result = await api.buildGroups(api.filterRegionRows(rows, key), groups);
    assert.equal(Object.keys(result).length, 9);
    for (const [category, ranking] of Object.entries(result)) {
      assert.ok(ranking, category);
      assert.deepEqual(Array.from(ranking.rows, (r) => r.name).sort(), names, `${key}: ${category}`);
    }
  }

  // A club outside the unfiltered top ten must still be found when its region is selected.
  const crowded = Array.from({ length: 12 }, (_, i) => row({ club: `Club ${i}`, lv: "BA" }));
  crowded.push(row({ club: "Zielclub", lv: "BAY" }));
  const target = await api.buildGroups(api.filterRegionRows(crowded, "lv:bayern"), groups);
  assert.deepEqual(Array.from(target.competition_presence.rows, (r) => r.name), ["Zielclub"]);
});

test("a club's counts, DQ threshold and club score use only matching rows", async () => {
  const rows = Array.from({ length: 100 }, () => row({ lv: "BA", time: 60 }));
  rows.push(row({ lv: "BY", time: 50 }));
  const { api, ClubsData } = setup(rows);
  const { groups } = await ClubsData.loadGroupsAndStats();
  const all = await api.buildGroups(rows, groups);
  const baden = await api.buildGroups(api.filterRegionRows(rows, "lv:baden"), groups);
  const bayern = await api.buildGroups(api.filterRegionRows(rows, "lv:bayern"), groups);
  assert.equal(all.start_count.rows[0].value, 101);
  assert.equal(baden.start_count.rows[0].value, 100);
  assert.equal(bayern.start_count.rows[0].value, 1);
  assert.equal(baden.dq_rate.rows.length, 1);
  assert.equal(bayern.dq_rate.rows.length, 0);
  assert.ok(bayern.club_score.rows[0].value > baden.club_score.rows[0].value);
  assert.equal(all.club_score.rows[0].value, bayern.club_score.rows[0].value);
});

test("public dropdown applies to all categories, preserves category and survives empty results", async () => {
  const { api, ClubsTop10 } = setup(rankingRows());
  const mount = new Element("div");
  ClubsTop10.mount(mount);
  await flush();
  assert.equal(api.State.regionKey, "lv:baden");
  for (const ranking of Object.values(api.State.groups)) {
    assert.deepEqual(Array.from(ranking.rows, (r) => r.name), ["Badenclub"]);
  }
  const regionSelect = () => find(mount, (el) => el.className?.includes("clubs10-region-select"));
  const list = find(mount, (el) => el.attributes?.role === "listbox");
  assert.deepEqual(list.children.filter((el) => el.attributes?.role === "group").map((el) => el.attributes["aria-label"]), ["Länder", "Bundesländer"]);
  const choose = (key) => find(mount, (el) => el.attributes?.["data-region-key"] === key).listeners.click();

  const category = find(mount, (el) => el.tag === "select" && el.attributes["aria-label"] === "Top-10 Kategorie auswählen");
  category.listeners.change({ target: { value: "dq_rate" } });
  choose("bv:spanien");
  await flush();
  assert.equal(api.State.currentKey, "dq_rate");
  for (const ranking of Object.values(api.State.groups)) {
    assert.deepEqual(Array.from(ranking.rows, (r) => r.name), ["Spanienclub"]);
  }

  // Simulate a region with insufficient starts for DQ eligibility.
  api.State.rows = [row({ lv: "BAY" })];
  choose("lv:bayern");
  await flush();
  assert.equal(api.State.currentKey, "dq_rate");
  assert.ok(find(mount, (el) => el.className === "ath10-status ath10-status--empty"));
  assert.ok(regionSelect());
});

test("region menu shows existing cap SVGs, including code aliases and the selected cap", async () => {
  const { ClubsTop10 } = setup(rankingRows());
  const mount = new Element("div");
  ClubsTop10.mount(mount);
  await flush();
  for (const [key, file] of [
    ["bv:deutschland", "Cap-GER.svg"], ["bv:spanien", "Cap-ESP.svg"],
    ["lv:baden", "Cap-BA.svg"], ["lv:bayern", "Cap-BY.svg"]
  ]) {
    const option = find(mount, (el) => el.attributes?.["data-region-key"] === key);
    const image = find(option, (el) => el.tag === "img");
    assert.equal(image.src, `./assets/svg/${file}`);
    assert.ok(fs.existsSync(path.join(__dirname, "..", "web", "assets", "svg", file)));
  }
  find(mount, (el) => el.attributes?.["data-region-key"] === "lv:bayern").listeners.click();
  await flush();
  const trigger = find(mount, (el) => el.tag === "summary");
  assert.equal(find(trigger, (el) => el.tag === "img").src, "./assets/svg/Cap-BY.svg");
});

test("region menu supports keyboard navigation, Escape and closing outside", async () => {
  const { ClubsTop10, document } = setup(rankingRows());
  const mount = new Element("div");
  ClubsTop10.mount(mount);
  await flush();
  const dropdown = mount.querySelector(".clubs10-region-dropdown");
  const trigger = mount.querySelector(".clubs10-region-select");
  const list = mount.querySelector(".clubs10-region-options");
  const key = (target, value) => target.listeners.keydown({ key: value, preventDefault() {} });
  trigger.focus();
  key(trigger, "ArrowDown");
  assert.equal(dropdown.open, true);
  assert.equal(document.activeElement.attributes["data-region-key"], "lv:baden");
  dropdown.listeners.toggle();
  assert.equal(trigger.attributes["aria-expanded"], "true");
  key(list, "ArrowDown");
  assert.equal(document.activeElement.attributes["data-region-key"], "lv:bayern");
  key(list, "End");
  assert.equal(document.activeElement.attributes["data-region-key"], "lv:catalunya");
  key(list, "Home");
  assert.equal(document.activeElement.attributes["data-region-key"], "all");
  key(list, "Escape");
  assert.equal(dropdown.open, false);
  assert.equal(document.activeElement, trigger);
  dropdown.open = true;
  document.listeners.pointerdown({ target: new Element("div") });
  assert.equal(dropdown.open, false);

  find(mount, (el) => el.attributes?.["data-region-key"] === "lv:bayern").listeners.click();
  await flush();
  assert.equal(document.activeElement, mount.querySelector(".clubs10-region-select"));
});

test("rapid filter changes cannot overwrite the newest selection", async () => {
  const { api, ClubsData } = setup(rankingRows());
  api.State.rows = rankingRows();
  api.State.allGroups = (await ClubsData.loadGroupsAndStats()).groups;
  let release;
  const records = await api.CLUB_LSC_STATE.worldRecordPromise;
  api.CLUB_LSC_STATE.worldRecordPromise = new Promise((resolve) => { release = resolve; });
  api.State.regionKey = "lv:baden";
  const first = api.refreshGroups();
  api.State.regionKey = "bv:spanien";
  const second = api.refreshGroups();
  release(records);
  await Promise.all([first, second]);
  assert.equal(api.State.regionKey, "bv:spanien");
  assert.equal(api.State.groups.start_count.rows[0].name, "Spanienclub");
  assert.equal(api.State.loading, false);
});
