// wr.js

// Hilfsfunktion: Sekunden → "m:ss,CC"
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const centis = Math.round((seconds - Math.floor(seconds)) * 100);
  return `${minutes}:${secs.toString().padStart(2, "0")},${centis.toString().padStart(2, "0")}`;
}

// Daten als Sekunden (float)
const wrDaten = [
  { kategorie: "WR", altersklasse: "Youth", geschlecht: "Weiblich", zeiten: [33.43, 49.33, 69.10, 57.09, 142.29, 123.89] },
  { kategorie: "WR", altersklasse: "Youth", geschlecht: "Männlich", zeiten: [28.88, 45.52, 59.64, 50.01, 127.07, 116.74] },
  { kategorie: "WR", altersklasse: "Open", geschlecht: "Weiblich", zeiten: [31.48, 49.30, 63.69, 54.77, 136.07, 121.88] },
  { kategorie: "WR", altersklasse: "Open", geschlecht: "Männlich", zeiten: [27.20, 43.29, 57.64, 47.68, 122.98, 111.73] }
];

// Tabelle erzeugen
function erstelleWrTabelle() {
  const container = document.getElementById("wrContainer");
  if (!container) return;

  const table = document.createElement("table");

  // Table Head
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>AK</th>
      <th>Geschlecht</th>
      <th>50m Retten</th>
      <th>100m Retten</th>
      <th>100m Kombi</th>
      <th>100m Lifesaver</th>
      <th>200m Superlifesaver</th>
      <th>200m Hindernis</th	>
    </tr>
  `;
  table.appendChild(thead);

  // Table Body
  const tbody = document.createElement("tbody");

  wrDaten.forEach((eintrag, index) => {
    const tr = document.createElement("tr");


    // Altersklasse zusammenfassen: erste 2 Zeilen = Youth, letzte 2 = Open
    if (index === 0 || index === 2) {
      const tdAltersklasse = document.createElement("td");
      tdAltersklasse.textContent = eintrag.altersklasse;
      tdAltersklasse.rowSpan = 2;
      tr.appendChild(tdAltersklasse);
    }

    // Geschlecht mit festen Klassen
    const tdGeschlecht = document.createElement("td");
    tdGeschlecht.textContent = eintrag.geschlecht;
    tdGeschlecht.className = eintrag.geschlecht.toLowerCase() === "weiblich" ? "weiblich" : "maennlich";
    tr.appendChild(tdGeschlecht);

    // Zeiten
    eintrag.zeiten.forEach(sec => {
      const tdZeit = document.createElement("td");
      tdZeit.textContent = formatTime(sec);
      tr.appendChild(tdZeit);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

// Tabelle erzeugen, wenn DOM fertig geladen ist
document.addEventListener("DOMContentLoaded", erstelleWrTabelle);
