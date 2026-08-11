import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../../../web/js/punkterechner/punkterechner_calculator_tabel.js", import.meta.url),
  "utf8"
);

const context = vm.createContext({
  console,
  Intl,
  Math,
  Number,
  isFinite,
  window: {},
  document: {
    getElementById() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  }
});

vm.runInContext(source, context);

function sortLabels(labels, mode, age) {
  const disciplines = labels.map((label, index) => ({ id: String(index), label }));
  return Array.from(
    context.prSortDisciplinesByNationalOrder(disciplines, mode, age),
    discipline => discipline.label
  );
}

test("uses the German open individual discipline order and appends ILS-only events", () => {
  assert.deepEqual(
    sortLabels(
      [
        "100m komb. Rettungsübung",
        "100m Future Rescue",
        "50m Retten",
        "200m Hindernisschwimmen",
        "100m Retten mit Flossen",
        "100m Lifesaver",
        "200m Super-Lifesaver"
      ],
      "Einzel",
      "Offen"
    ),
    [
      "200m Hindernisschwimmen",
      "100m Lifesaver",
      "50m Retten",
      "100m komb. Rettungsübung",
      "100m Retten mit Flossen",
      "200m Super-Lifesaver",
      "100m Future Rescue"
    ]
  );
});

test("uses the German team discipline order for Open and Mixed selections", () => {
  assert.deepEqual(
    sortLabels(
      [
        "Leinenwurf",
        "4×25m Puppenstaffel",
        "4×50m Lifesavingstaffel",
        "4×50m Gurtretterstaffel",
        "4×50m Hindernisstaffel",
        "4×50m Rettungsstaffel"
      ],
      "Mannschaft",
      "Open"
    ),
    [
      "4×50m Hindernisstaffel",
      "4×25m Puppenstaffel",
      "4×50m Gurtretterstaffel",
      "4×50m Rettungsstaffel",
      "Leinenwurf",
      "4×50m Lifesavingstaffel"
    ]
  );
});

test("uses the corresponding German Masters age order", () => {
  assert.deepEqual(
    sortLabels(
      [
        "100m Lifesaver",
        "100m Hindernisschwimmen",
        "100m Future Rescue",
        "100m Retten mit Flossen",
        "50m Retten"
      ],
      "Einzel",
      "30"
    ),
    [
      "100m Hindernisschwimmen",
      "50m Retten",
      "100m Retten mit Flossen",
      "100m Lifesaver",
      "100m Future Rescue"
    ]
  );
});
