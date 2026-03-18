const PR_DISCIPLINES = {
  Einzel: {
    "12": [
      { id: "E12_50_HIND", label: "50m Hindernisschwimmen", excelKey: "50m hindernis", drKey: "50m Hindernis" },
      { id: "E12_50_KOMB", label: "50m komb. Schwimmen", excelKey: "50m komb schwimmen", drKey: "50m komb. Schwimmen" },
      { id: "E12_50_FLOSS", label: "50m Flossen", excelKey: "50m flossen", drKey: "50m Flossen" }
    ],
    "13/14": [
      { id: "E1314_100_HIND", label: "100m Hindernisschwimmen", excelKey: "100m hindernis", drKey: "100m Hindernis" },
      { id: "E1314_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E1314_50_FLOSS", label: "50m Retten mit Flossen", excelKey: "50m retten mit flossen", drKey: "50m Retten mit Flossen" }
    ],
    "15/16": [
      { id: "E1516_200_HIND", label: "200m Hindernisschwimmen", excelKey: "200m hindernis", drKey: "200m Hindernis" },
      { id: "E1516_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" },
      { id: "E1516_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E1516_100_KOMB", label: "100m komb. Rettungsübung", excelKey: "100m komb rettungs", drKey: "100m Kombi" },
      { id: "E1516_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten", drKey: "100m Retten" },
      { id: "E1516_200_SUPER", label: "200m Super-Lifesaver", excelKey: "200m super lifesaver", drKey: "200m Superlifesaver" }
    ],
    "17/18": [
      { id: "E1718_200_HIND", label: "200m Hindernisschwimmen", excelKey: "200m hindernis", drKey: "200m Hindernis" },
      { id: "E1718_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" },
      { id: "E1718_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E1718_100_KOMB", label: "100m komb. Rettungsübung", excelKey: "100m komb rettungs", drKey: "100m Kombi" },
      { id: "E1718_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten", drKey: "100m Retten" },
      { id: "E1718_200_SUPER", label: "200m Super-Lifesaver", excelKey: "200m super lifesaver", drKey: "200m Superlifesaver" }
    ],
    Offen: [
      { id: "EO_200_HIND", label: "200m Hindernisschwimmen", excelKey: "200m hindernis", drKey: "200m Hindernis" },
      { id: "EO_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" },
      { id: "EO_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "EO_100_KOMB", label: "100m komb. Rettungsübung", excelKey: "100m komb rettungs", drKey: "100m Kombi" },
      { id: "EO_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten", drKey: "100m Retten" },
      { id: "EO_200_SUPER", label: "200m Super-Lifesaver", excelKey: "200m super lifesaver", drKey: "200m Superlifesaver" }
    ],
    "25": [
      { id: "E25_100_HIND", label: "100m Hindernisschwimmen", excelKey: "100m hindernis", drKey: "100m Hindernis" },
      { id: "E25_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E25_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten mit flossen", drKey: "100m Retten mit Flossen" },
      { id: "E25_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" }
    ],
    "30": [
      { id: "E30_100_HIND", label: "100m Hindernisschwimmen", excelKey: "100m hindernis", drKey: "100m Hindernis" },
      { id: "E30_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E30_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten mit flossen", drKey: "100m Retten mit Flossen" },
      { id: "E30_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" }
    ],
    "35": [
      { id: "E35_100_HIND", label: "100m Hindernisschwimmen", excelKey: "100m hindernis", drKey: "100m Hindernis" },
      { id: "E35_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E35_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten mit flossen", drKey: "100m Retten mit Flossen" },
      { id: "E35_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" }
    ],
    "40": [
      { id: "E40_100_HIND", label: "100m Hindernisschwimmen", excelKey: "100m hindernis", drKey: "100m Hindernis" },
      { id: "E40_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E40_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten mit flossen", drKey: "100m Retten mit Flossen" },
      { id: "E40_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" }
    ],
    "45": [
      { id: "E45_100_HIND", label: "100m Hindernisschwimmen", excelKey: "100m hindernis", drKey: "100m Hindernis" },
      { id: "E45_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E45_100_FLOSS", label: "100m Retten mit Flossen", excelKey: "100m retten mit flossen", drKey: "100m Retten mit Flossen" },
      { id: "E45_100_LIFE", label: "100m Lifesaver", excelKey: "100m lifesaver", drKey: "100m Lifesaver" }
    ],
    "50": [
      { id: "E50_100_HIND", label: "100m Hindernisschwimmen", excelKey: "100m hindernis", drKey: "100m Hindernis" },
      { id: "E50_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E50_50_FLOSS", label: "50m Retten mit Flossen", excelKey: "50m retten mit flossen", drKey: "50m Retten mit Flossen" }
    ],
    "55": [
      { id: "E55_100_HIND", label: "100m Hindernisschwimmen", excelKey: "100m hindernis", drKey: "100m Hindernis" },
      { id: "E55_50_RETT", label: "50m Retten", excelKey: "50m retten", drKey: "50m Retten" },
      { id: "E55_50_FLOSS", label: "50m Retten mit Flossen", excelKey: "50m retten mit flossen", drKey: "50m Retten mit Flossen" }
    ],
    "60": [
      { id: "E60_50_FREE", label: "50m Freistilschwimmen", excelKey: "50m freistilschwimmen", drKey: "50m Freistilschwimmen" },
      { id: "E60_50_KOMB", label: "50m komb. Schwimmen", excelKey: "50m komb schwimmen", drKey: "50m Kombiniertes Schwimmen" },
      { id: "E60_25_PUPPE", label: "25m Schleppen einer Puppe", excelKey: "25m schleppen puppe", drKey: "25m Schleppen einer Puppe" }
    ],
    "65": [
      { id: "E65_50_FREE", label: "50m Freistilschwimmen", excelKey: "50m freistilschwimmen", drKey: "50m Freistilschwimmen" },
      { id: "E65_50_KOMB", label: "50m komb. Schwimmen", excelKey: "50m komb schwimmen", drKey: "50m Kombiniertes Schwimmen" },
      { id: "E65_25_PUPPE", label: "25m Schleppen einer Puppe", excelKey: "25m schleppen puppe", drKey: "25m Schleppen einer Puppe" }
    ],
    "70": [
      { id: "E70_50_FREE", label: "50m Freistilschwimmen", excelKey: "50m freistilschwimmen", drKey: "50m Freistilschwimmen" },
      { id: "E70_50_KOMB", label: "50m komb. Schwimmen", excelKey: "50m komb schwimmen", drKey: "50m Kombiniertes Schwimmen" },
      { id: "E70_25_PUPPE", label: "25m Schleppen einer Puppe", excelKey: "25m schleppen puppe", drKey: "25m Schleppen einer Puppe" }
    ],
    "75": [
      { id: "E75_50_FREE", label: "50m Freistilschwimmen", excelKey: "50m freistilschwimmen", drKey: "50m Freistilschwimmen" },
      { id: "E75_50_KOMB", label: "50m komb. Schwimmen", excelKey: "50m komb schwimmen", drKey: "50m Kombiniertes Schwimmen" },
      { id: "E75_25_PUPPE", label: "25m Schleppen einer Puppe", excelKey: "25m schleppen puppe", drKey: "25m Schleppen einer Puppe" }
    ],
    "80": [
      { id: "E80_50_FREE", label: "50m Freistilschwimmen", excelKey: "50m freistilschwimmen", drKey: "50m Freistilschwimmen" },
      { id: "E80_50_KOMB", label: "50m komb. Schwimmen", excelKey: "50m komb schwimmen", drKey: "50m Kombiniertes Schwimmen" },
      { id: "E80_25_PUPPE", label: "25m Schleppen einer Puppe", excelKey: "25m schleppen puppe", drKey: "25m Schleppen einer Puppe" }
    ],
    "85": [
      { id: "E85_50_FREE", label: "50m Freistilschwimmen", excelKey: "50m freistilschwimmen", drKey: "50m Freistilschwimmen" },
      { id: "E85_50_KOMB", label: "50m komb. Schwimmen", excelKey: "50m komb schwimmen", drKey: "50m Kombiniertes Schwimmen" },
      { id: "E85_25_PUPPE", label: "25m Schleppen einer Puppe", excelKey: "25m schleppen puppe", drKey: "25m Schleppen einer Puppe" }
    ],
    "90": [
      { id: "E90_50_FREE", label: "50m Freistilschwimmen", excelKey: "50m freistilschwimmen", drKey: "50m Freistilschwimmen" },
      { id: "E90_50_KOMB", label: "50m komb. Schwimmen", excelKey: "50m komb schwimmen", drKey: "50m Kombiniertes Schwimmen" },
      { id: "E90_25_PUPPE", label: "25m Schleppen einer Puppe", excelKey: "25m schleppen puppe", drKey: "25m Schleppen einer Puppe" }
    ]
  },
  Mannschaft: {
    "12": [
      { id: "M12_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M12_4x25_RUECK", label: "4×25m Rückenlage ohne Arme", excelKey: "4*25m rueckenlage ohne arme" },
      { id: "M12_4x25_GURT", label: "4×25m Gurtretterstaffel", excelKey: "4*25m gurtretterstaffel" },
      { id: "M12_4x25_RETT", label: "4×25m Rettungsstaffel", excelKey: "4*25m rettungsstaffel" }
    ],
    "13/14": [
      { id: "M1314_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M1314_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M1314_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M1314_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    "15/16": [
      { id: "M1516_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M1516_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M1516_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M1516_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    "17/18": [
      { id: "M1718_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M1718_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M1718_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M1718_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    Offen: [
      { id: "MO_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "MO_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "MO_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "MO_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    "100": [
      { id: "M100_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M100_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M100_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M100_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    "120": [
      { id: "M120_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M120_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M120_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M120_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    "140": [
      { id: "M140_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M140_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M140_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M140_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    "170": [
      { id: "M170_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M170_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M170_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M170_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    "200": [
      { id: "M200_4x50_HIND", label: "4×50m Hindernisstaffel", excelKey: "4*50m hindernisstaffel" },
      { id: "M200_4x25_PUPPE", label: "4×25m Puppenstaffel", excelKey: "4*25m puppenstaffel" },
      { id: "M200_4x50_GURT", label: "4×50m Gurtretterstaffel", excelKey: "4*50m gurtretterstaffel" },
      { id: "M200_4x50_RETT", label: "4×50m Rettungsstaffel", excelKey: "4*50m rettungsstaffel" }
    ],
    "240": [
      { id: "M240_4x50_FREE", label: "4×50m Freistilstaffel", excelKey: "4*50m freistilstaffel" },
      { id: "M240_4x25_RUECK", label: "4×25m Rückenlage ohne Arme", excelKey: "4*25m rueckenlage ohne arme" },
      { id: "M240_4x25_RETT", label: "4×25m Rettungsstaffel", excelKey: "4*25m rettungsstaffel" }
    ],
    "280+": [
      { id: "M280_4x50_FREE", label: "4×50m Freistilstaffel", excelKey: "4*50m freistilstaffel" },
      { id: "M280_4x25_RUECK", label: "4×25m Rückenlage ohne Arme", excelKey: "4*25m rueckenlage ohne arme" },
      { id: "M280_4x25_RETT", label: "4×25m Rettungsstaffel", excelKey: "4*25m rettungsstaffel" }
    ]
  }
};

PR_DISCIPLINES.Einzel.Junioren = PR_DISCIPLINES.Einzel["17/18"];
PR_DISCIPLINES.Mannschaft.Junioren = PR_DISCIPLINES.Mannschaft["17/18"];

function prGetDisciplines(mode, ak) {
  const m = PR_DISCIPLINES[mode];
  if (!m) return [];
  return m[ak] || [];
}

function prFormatPoints(points) {
  if (!isFinite(points)) return "";
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(points) + " P";
}

function prSanitizeTimeDigits(value) {
  return String(value || "")
    .replace(/\D+/g, "")
    .slice(0, 6);
}

function prFormatTimeDigits(digits) {
  const d = prSanitizeTimeDigits(digits);

  if (!d) return "";
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, -2)},${d.slice(-2)}`;
  return `${d.slice(0, -4)}:${d.slice(-4, -2)},${d.slice(-2)}`;
}

function prNormalizeTimeInputValue(value) {
  return prFormatTimeDigits(value);
}

function prCalcNationalPoints(timeSec, recSec) {
  if (!recSec || !timeSec || !isFinite(timeSec) || !isFinite(recSec)) return 0;
  const ratio = timeSec / recSec;
  if (ratio >= 5) return 0;
  if (ratio < 2) {
    return 467 * Math.pow(ratio, 2) - 2001 * ratio + 2534;
  }
  if (ratio <= 5) {
    return 2000 / 3 - (400 / 3) * ratio;
  }
  return 0;
}

function prUpdateDisciplineRecordDisplay() {
  const cells = document.querySelectorAll(".pr-disc-name");

  cells.forEach(cell => {
    const baseLabel = cell.dataset.baseLabel || cell.textContent;
    const rec = cell.dataset.recDisplay || "";
    cell.textContent = rec ? `${baseLabel} (${rec})` : baseLabel;
  });
}

function prCreateCalculatorTableMarkup() {
  return `
    <section class="pr-table-wrapper">
      <div id="pr-loading" class="pr-loading">Rekordwerte werden initialisiert …</div>
      <table id="discipline-table" class="pr-table" hidden>
        <thead>
          <tr>
            <th id="pr-discipline-header">Disziplin</th>
            <th id="pr-time-header">Zeit</th>
            <th id="pr-points-header">Punkte</th>
          </tr>
        </thead>
        <tbody></tbody>
        <tfoot>
          <tr class="pr-summary-row">
            <td colspan="2" id="pr-summary-label">Gesamt 3-Kampf / 4-Kampf</td>
            <td id="pr-total-combined"></td>
          </tr>
        </tfoot>
      </table>
    </section>
  `;
}

async function prRenderCurrentSelection() {
  const loading = document.getElementById("pr-loading");
  const table = document.getElementById("discipline-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const totalCombined = document.getElementById("pr-total-combined");

  if (tbody) tbody.innerHTML = "";
  if (totalCombined) totalCombined.textContent = "";

  const modeElem = document.getElementById("pr-mode");
  const ageElem = document.getElementById("pr-age");
  const genderElem = document.getElementById("pr-gender");
  if (!modeElem || !ageElem || !genderElem) return;

  const mode = modeElem.value;
  const ak = ageElem.value;
  const gender = genderElem.value;
  const rule = prGetRule();

  if (rule === "International" && mode === "Einzel") {
    await prEnsureRecordsWorkbook();
  }

  prUpdateSummaryLabel();
  prUpdatePointsHeader();

  const list = prGetDisciplines(mode, ak);

  if (!list.length) {
    if (tbody) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.textContent = prT("noDisc");
      row.appendChild(cell);
      tbody.appendChild(row);
    }
  } else {
    list.forEach(disc => {
      const tr = document.createElement("tr");
      tr.dataset.disciplineId = disc.id;
      tr.dataset.pointsDe = "0";

      const tdName = document.createElement("td");
      tdName.className = "pr-disc-name";
      const discLabel = prGetDisciplineLabel(disc);
      tdName.dataset.baseLabel = discLabel;
      tdName.textContent = discLabel;
      tr.appendChild(tdName);

      const tdInput = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "pr-time-input";
      input.placeholder = "m:ss,cc";
      input.autocomplete = "off";
      input.inputMode = "numeric";
      input.maxLength = 8;
      tdInput.appendChild(input);
      tr.appendChild(tdInput);

      let recSeconds = null;
      const useNationalRecords = rule === "National";

      if (useNationalRecords) {
        if (prNationalRecords.latestYear != null) {
          recSeconds = prGetNationalRecordSeconds(
            prNationalRecords.latestYear,
            mode,
            ak,
            gender,
            disc
          );
        }
      } else {
        if (prRecords.latestYear != null) {
          recSeconds = prGetDRRecordSeconds(prRecords.latestYear, ak, gender, disc);
        }
      }

      if (recSeconds != null) {
        tr.dataset.recSeconds = String(recSeconds);
        tdName.dataset.recDisplay = prFormatSeconds(recSeconds);
      } else {
        tr.dataset.recSeconds = "";
        tdName.dataset.recDisplay = "";
      }

      const tdPointsDe = document.createElement("td");
      tdPointsDe.className = "pr-points-de";
      tr.appendChild(tdPointsDe);

      if (tbody) tbody.appendChild(tr);

      input.addEventListener("input", () => {
        const formattedValue = prNormalizeTimeInputValue(input.value);

        if (input.value !== formattedValue) {
          input.value = formattedValue;
        }

        prRecalcRowPoints(tr);
        prUpdateTotalPointsDe();
      });
    });
  }

  table.hidden = false;
  if (loading) loading.style.display = "none";

  prUpdateDisciplineRecordDisplay();
  prUpdateTotalPointsDe();
}

function prRecalcRowPoints(tr) {
  const input = tr.querySelector(".pr-time-input");
  const pointsCell = tr.querySelector(".pr-points-de");
  if (!input || !pointsCell) return;

  const recSeconds = parseFloat(tr.dataset.recSeconds || "");
  const timeSec = prParseTimeString(input.value);

  if (!input.value || !recSeconds || isNaN(timeSec)) {
    pointsCell.textContent = "";
    tr.dataset.pointsDe = "0";
    return;
  }

  const pts = prCalcNationalPoints(timeSec, recSeconds);
  tr.dataset.pointsDe = pts > 0 ? String(pts) : "0";
  pointsCell.textContent = pts > 0 ? prFormatPoints(pts) : "0,00 P";
}

function prUpdateTotalPointsDe() {
  const table = document.getElementById("discipline-table");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
  const totalCell = document.getElementById("pr-total-combined");

  if (!totalCell) return;

  const entries = rows.map(row => {
  const cell = row.querySelector(".pr-points-de");
  const val = parseFloat(row.dataset.pointsDe || "0");
  return { row, cell, val: isNaN(val) ? 0 : val };
});

  entries.forEach(e => {
    if (e.cell) {
      e.cell.classList.remove("pr-points-de-top3", "pr-points-de-top4", "pr-points-de-top5-6");
    }
  });

  const valsSorted = entries
    .map(e => e.val)
    .filter(v => v > 0)
    .sort((a, b) => b - a);

  if (!valsSorted.length) {
    totalCell.innerHTML = "";
    return;
  }

  const total3 = valsSorted.slice(0, 3).reduce((a, b) => a + b, 0);
  const total4 = valsSorted.slice(0, 4).reduce((a, b) => a + b, 0);

  const total3Text = total3 > 0 ? prFormatPoints(total3) : "0,00 P";
  const total4Text = total4 > 0 ? prFormatPoints(total4) : "0,00 P";

  totalCell.innerHTML = `
    <span class="pr-total-part">${total3Text}</span>
    <span class="pr-total-separator"> / </span>
    <span class="pr-total-part">${total4Text}</span>
  `;
  const entriesSorted = entries.slice().sort((a, b) => b.val - a.val);

  entriesSorted.slice(0, 3).forEach(e => {
  if (e.cell && e.val > 0) {
      e.cell.classList.add("pr-points-de-top3");
    }
  });

  if (entriesSorted.length > 3 && entriesSorted[3].cell && entriesSorted[3].val > 0) {
    entriesSorted[3].cell.classList.add("pr-points-de-top4");
  }

  entriesSorted.slice(4, 6).forEach(e => {
    if (e.cell && e.val > 0) {
      e.cell.classList.add("pr-points-de-top5-6");
    }
  });
}