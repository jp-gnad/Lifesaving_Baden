// athleten.js

const EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/BadenBank_Light/main/test.xlsx";




// Tabelle erstellen
function erstelleAthletenTabelle(athletenDaten) {
  const container = document.getElementById("athletenTableContainer");
  const existingTable = container.querySelector("table");
  if (existingTable) existingTable.remove();

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Kader</th>
      <th>Name</th>
      <th>Kriterien</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  athletenDaten.forEach(eintrag => {
    const tr = document.createElement("tr");

    const tdKader = document.createElement("td");
    tdKader.textContent = eintrag.kader;
    tr.appendChild(tdKader);

    const tdName = document.createElement("td");
    tdName.className = eintrag.geschlecht.toLowerCase() === "w" ? "weiblich" : "maennlich";
    tdName.textContent = `${eintrag.name} (${eintrag.jahrgang})`;

    if (eintrag.ortsgruppe) {
      const ortDiv = document.createElement("div");
      ortDiv.textContent = `DLRG ${eintrag.ortsgruppe}`;
      ortDiv.style.fontSize = "8px";
      ortDiv.style.color = "#555555";
      tdName.appendChild(document.createElement("br"));
      tdName.appendChild(ortDiv);
    }

    tr.appendChild(tdName);

    const tdKriterien = document.createElement("td");
    tdKriterien.textContent = eintrag.kriterium || "-";
    tr.appendChild(tdKriterien);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}






// Hilfsfunktion: verschiedene Zeitformate in Sekunden (float) umwandeln
function parseTimeToSeconds(input) {
  if (input === undefined || input === null) return NaN;
  let s = String(input).trim();
  if (s === "" || s === "-" || s.toLowerCase() === "nan") return NaN;

  s = s.replace(/\s+/g, "");

  if (s.includes(":")) {
    const parts = s.split(":");
    const minPart = parts.shift();
    const secPart = parts.join(":");
    const minutes = parseInt(minPart.replace(/\D/g, ""), 10);
    const seconds = parseFloat(secPart.replace(",", ".").replace(/[^0-9.]/g, ""));
    if (isNaN(minutes) || isNaN(seconds)) return NaN;
    return minutes * 60 + seconds;
  }

  const sec = parseFloat(s.replace(",", ".").replace(/[^0-9.]/g, ""));
  return isNaN(sec) ? NaN : sec;
}

// Kader-Tabelle als 2D-Array auslesen (liefert Zahlen in Sekunden, 2 Dezimalstellen)
function getKaderArray() {
  const tbody = document.querySelector("#kaderTable tbody");
  if (!tbody) return [];

  const rows = [...tbody.querySelectorAll("tr")];
  const array2D = [];

  rows.forEach((tr, rowIndex) => {
    const rowValues = [];
    const tds = tr.querySelectorAll("td");

    if (rowIndex % 2 === 0) {
      for (let i = 2; i <= 7; i++) {
        const raw = tds[i]?.textContent ?? "";
        const seconds = parseTimeToSeconds(raw);
        rowValues.push(Number.isFinite(seconds) ? Number(seconds.toFixed(2)) : 0);
      }
    } else {
      for (let i = 1; i <= 6; i++) {
        const raw = tds[i]?.textContent ?? "";
        const seconds = parseTimeToSeconds(raw);
        rowValues.push(Number.isFinite(seconds) ? Number(seconds.toFixed(2)) : 0);
      }
    }

    array2D.push(rowValues);
  });

  console.log("Kader-Array (array2D):", array2D);
  return array2D;
}








/* ===========================
   Filterfunktionen
   =========================== */

// MAIN-FILTER: prüft, ob alle Bedingungen erfüllt sind
function alleFilterErfüllt(eintrag, kaderArray) {
  return (
    filterAltersklasse(eintrag) &&
    filterZeit_50retten(eintrag, kaderArray)
  );
}


/* ===========================
   Sekundär-Filter
   =========================== */

// Altersklasse-Filter
function filterAltersklasse(eintrag) {
  const jahrgang = String(eintrag.jahrgang).padStart(2, "0");
  return ["07", "08"].includes(jahrgang);
}

// Zeit-Filter
function filterZeit_50retten(eintrag, kaderArray) {
  const zeit_50retten = parseFloat(eintrag.zeit_50retten?.toString().replace(",", "."));
  if (isNaN(zeit_50retten)) return false;

  let richtzeit_50retten;
  if (eintrag.geschlecht === "m") {
    richtzeit_50retten = kaderArray[1][2];
  } else if (eintrag.geschlecht === "w") {
    richtzeit_50retten = kaderArray[1][3];
  } else {
    return false;
  }

  console.log(`Name: ${eintrag.name}, 50m-Zeit: ${zeit_50retten}, richtzeit_50retten: ${richtzeit_50retten}`);
  return zeit_50retten <= richtzeit_50retten;
}

// Excel laden, filtern und vorbereiten
async function ladeAthleten() {
  const kaderArray = getKaderArray();
  if (!kaderArray.length) {
    console.error("Kader-Array konnte nicht gelesen werden!");
    return;
  }

  const response = await fetch(EXCEL_URL);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const athletenMap = new Map();

  jsonData.reverse().forEach((row, index) => {
    if (index === 0) return;

    const geschlecht = row[0]?.toString().toLowerCase();
    const name = row[1];
    const jahrgangRaw = row[11];
    const kriterium = row[2];
    const ortsgruppe = row[12];
    const zeit_50rettenRaw = row[4];

    if (!name || !geschlecht || !jahrgangRaw || !zeit_50rettenRaw) return;

    const jahrgang = String(jahrgangRaw).padStart(2, "0");

    const eintrag = {
      name,
      geschlecht,
      jahrgang,
      kriterium,
      ortsgruppe,
      zeit_50retten: zeit_50rettenRaw
    };

    if (!alleFilterErfüllt(eintrag, kaderArray)) return;

    const kader = "17/18";
    athletenMap.set(name, { kader, ...eintrag });
  });

  const athletenDaten = Array.from(athletenMap.values());
  erstelleAthletenTabelle(athletenDaten);
}

// Klick-Event am existierenden HTML-Button
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("aktualisierenBtn");
  if (!button) return;

  button.addEventListener("click", () => {
    ladeAthleten().catch(err => console.error("Fehler beim Laden der Excel:", err));
  });
});


