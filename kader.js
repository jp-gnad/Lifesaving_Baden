// kader.js

// Hilfsfunktion: Sekunden → "m:ss,CC"
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return "-";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const centis = Math.round((seconds - Math.floor(seconds)) * 100);
  return `${minutes}:${secs.toString().padStart(2, "0")},${centis
    .toString()
    .padStart(2, "0")}`;
}

// Formel für Kaderzeiten
function berechneZeit(punkte, wrZeit) {
  const faktor = 2001 / 934;
  const inner = faktor * faktor + (punkte - 2534) / 467;
  if (!isFinite(inner) || inner < 0) return NaN; // ungültig → markiere als NaN
  const wurzelTeil = Math.sqrt(inner);
  const erg = (faktor - wurzelTeil) * wrZeit;
  return erg;
}

// Reihenfolge-Mapping: jede Tabellenzeile → passender WR-Datensatz
const kaderMapping = [
  { altersklasse: "Youth", geschlecht: "Weiblich" },  // U17 weiblich
  { altersklasse: "Youth", geschlecht: "Männlich" },  // U17 männlich
  { altersklasse: "Youth", geschlecht: "Weiblich" },  // 17/18 weiblich
  { altersklasse: "Youth", geschlecht: "Männlich" },  // 17/18 männlich
  { altersklasse: "Open",  geschlecht: "Weiblich" },  // Offen weiblich
  { altersklasse: "Open",  geschlecht: "Männlich" },  // Offen männlich
];

// Tabelle erstellen (unverändert)
const kaderTable = document.getElementById("kaderTable");

kaderTable.innerHTML = `
  <table>
    <thead>
      <tr>
        <th>AK</th>
        <th>Geschlecht</th>
        <th>50m Retten</th>
        <th>100m Retten</th>
        <th>100m Kombi</th>
        <th>100m Lifesaver</th>
        <th>200m Superlifesaver</th>
        <th>200m Hindernis</th>
        <th>Punkte</th>
      </tr>
    </thead>
    <tbody>
      <!-- Juniorenkader (4 Zeilen) -->
      <tr>
        <td rowspan="2">U17</td>
        <td class="weiblich">Weiblich</td>
        <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
        <td><input type="number" min="400" max="1000" value="680"></td>
      </tr>
      <tr>
        <td class="maennlich">Männlich</td>
        <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
        <td><input type="number" min="400" max="1000" value="680"></td>
      </tr>
      <tr>
        <td rowspan="2">17/18</td>
        <td class="weiblich">Weiblich</td>
        <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
        <td><input type="number" min="400" max="1000" value="725"></td>
      </tr>
      <tr>
        <td class="maennlich">Männlich</td>
        <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
        <td><input type="number" min="400" max="1000" value="725"></td>
      </tr>

      <!-- Badenkader (2 Zeilen) -->
      <tr>
        <td rowspan="2">Offen</td>
        <td class="weiblich">Weiblich</td>
        <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
        <td><input type="number" min="400" max="1000" value="750"></td>
      </tr>
      <tr>
        <td class="maennlich">Männlich</td>
        <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
        <td><input type="number" min="400" max="1000" value="750"></td>
      </tr>
    </tbody>
  </table>
`;

// Tabelle mit Zeiten befüllen (robuste Ermittlung der 6 Zeit-Zellen)
function fuelleKaderTabelle() {
  const tbody = document.querySelector("#kaderTable table tbody");
  if (!tbody) return;

  const rows = [...tbody.querySelectorAll("tr")];

  rows.forEach((tr, index) => {
    const input = tr.querySelector("input[type='number']");
    if (!input) return;

    // Begrenze Input auf 4 Zeichen
    input.addEventListener("input", () => {
      if (input.value.length > 4) {
  input.value = input.value.slice(0, 4);
} else if (input.value.length > 3 && parseInt(input.value) > 1100) {
  input.value = input.value.slice(0, 3);
}
    });

    // mapping für diese Zeile (1:1 Reihenfolge)
    const mapping = kaderMapping[index];
    const wr = (typeof wrDaten !== "undefined")
      ? wrDaten.find(
          (d) =>
            d.altersklasse === mapping.altersklasse &&
            d.geschlecht === mapping.geschlecht
        )
      : undefined;

    if (!wr) {
      console.warn(`Kein WR gefunden für Zeile ${index}`, mapping);
      return;
    }

    // Geschlechts-td finden und dann die nächsten td's bis zur Punkte-td sammeln
    const genderTd = tr.querySelector(".weiblich, .maennlich");
    const inputTd = input.closest("td");
    if (!genderTd || !inputTd) {
      console.warn("Struktur unerwartet in Zeile", index);
      return;
    }

    const timeTds = [];
    let td = genderTd.nextElementSibling;
    while (td && td !== inputTd && timeTds.length < 6) {
      timeTds.push(td);
      td = td.nextElementSibling;
    }

    // Falls nicht genau 6 gefunden wurden, logge das (zur Diagnose) und fülle/trimme
    if (timeTds.length !== 6) {
      console.warn(`Erwartet 6 Zeit-Zellen, gefunden ${timeTds.length} in Zeile ${index}`);
    }

    function updateZeiten() {
      const punkte = parseFloat(input.value);
      timeTds.forEach((tdCell, i) => {
        const raw = berechneZeit(punkte, wr.zeiten[i]);
        tdCell.textContent = isNaN(raw) ? "-" : formatTime(raw);
      });
    }

    // initial und bei Eingabe aktualisieren
    updateZeiten();
    input.addEventListener("input", updateZeiten);
  });
}

// Initialisierung (wird auf DOMContentLoaded ausgeführt)
document.addEventListener("DOMContentLoaded", fuelleKaderTabelle);


const richtzeit50m = parseFloat(document.querySelector("#kaderTable table tbody tr:nth-child(3) td:nth-child(3)").textContent.replace(",", "."));
