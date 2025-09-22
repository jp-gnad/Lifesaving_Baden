// athleten.js

const EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/BadenBank_Light/main/test.xlsx";


// Tabelle erstellen (kaderArray muss übergeben werden, weil die Filter es brauchen)
function erstelleAthletenTabelle(athletenDaten, kaderArray) {
  const container = document.getElementById("athletenTableContainer");
  const existingTable = container.querySelector("table");
  if (existingTable) existingTable.remove();

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>Kader</th>
      <th style="width: 45px; padding: 0; border: none;"></th>
      <th colspan="1">Athlet</th>
      <th>Kriterien</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  athletenDaten.forEach(eintrag => {
    const tr = document.createElement("tr");

    // Kader
    const tdKader = document.createElement("td");
    tdKader.textContent = eintrag.kader;
    tr.appendChild(tdKader);

    // Cap
    const tdCap = document.createElement("td");

    tdCap.style.textAlign = "center"; 
    
    const img = document.createElement("img");

    const ortsgruppe = eintrag.ortsgruppe || "placeholder";
    const bildName = `Cap-${ortsgruppe}_smal.png`;
    const encodedBildName = encodeURIComponent(bildName);

    img.src = `https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/images/${encodedBildName}`;
    
    img.style.width = "35px";
    img.style.height = "auto";
    img.alt = `Cap von ${eintrag.ortsgruppe}`;

    // Fallback bei Ladefehler
    img.onerror = () => {
      img.onerror = null;
      img.src = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/images/Cap-Baden_light.png";
    };

    tdCap.appendChild(img);
    tr.appendChild(tdCap);

    // Name + OG
    const tdName = document.createElement("td");
    
    // Geschlecht für Klassennamen
    const geschlechtNorm = (eintrag.geschlecht || "").toString().toLowerCase();
    tdName.className = geschlechtNorm === "w" ? "weiblich" : "maennlich";
    
    // Name + Jahrgang
    tdName.textContent = `${eintrag.name} (${eintrag.jahrgang})`;
    tdName.style.fontSize = "16px"; // Schriftgröße erhöht
    
    // Ortsgruppe anzeigen
    if (eintrag.ortsgruppe) {
      const ortDiv = document.createElement("div");
      ortDiv.textContent = `DLRG ${eintrag.ortsgruppe}`;
      ortDiv.style.fontSize = "10px"; // vorher 8px → jetzt +2
      ortDiv.style.color = "#555555";
    
      tdName.appendChild(document.createElement("br"));
      tdName.appendChild(ortDiv);
    }
    
    tr.appendChild(tdName);


    // Kriterien-Zelle (wird nur mit den bestanden Disziplinen befüllt)
    const tdKriterien = document.createElement("td");
    let kriterienHtml = "";

    // Prüfe Existenz der Filterfunktionen bevor aufgerufen wird (sicherer)
    if (typeof filterZeit_50retten === "function" && filterZeit_50retten(eintrag, kaderArray)) {
      kriterienHtml += `<div>50 m Retten: ${eintrag.zeit_50retten}</div>`;
    }
    if (typeof filterZeit_100retten === "function" && filterZeit_100retten(eintrag, kaderArray)) {
      kriterienHtml += `<div>100 m Retten: ${eintrag.zeit_100retten}</div>`;
    }
    if (typeof filterZeit_100kombi === "function" && filterZeit_100kombi(eintrag, kaderArray)) {
      kriterienHtml += `<div>100 m Kombi: ${eintrag.zeit_100kombi}</div>`;
    }
    if (typeof filterZeit_100LS === "function" && filterZeit_100LS(eintrag, kaderArray)) {
      kriterienHtml += `<div>100 m Lifesaver: ${eintrag.zeit_100LS}</div>`;
    }
    if (typeof filterZeit_200SLS === "function" && filterZeit_200SLS(eintrag, kaderArray)) {
      kriterienHtml += `<div>200 m Superlifesaver: ${eintrag.zeit_200SLS}</div>`;
    }
    if (typeof filterZeit_200H === "function" && filterZeit_200H(eintrag, kaderArray)) {
      kriterienHtml += `<div>200 m Hindernis: ${eintrag.zeit_200H}</div>`;
    }

    tdKriterien.innerHTML = kriterienHtml || "-";
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
    mindestensZweiFilterErfüllt(eintrag, kaderArray) &&
    filterAktuellesJahr(eintrag)
  );
}


/* ===========================
   Sekundär-Filter
   =========================== */

// Aktuelles Jahr - Filter
function filterAktuellesJahr(eintrag) {
  if (!eintrag.jahr) return false;

  const jsDate = excelDateToJSDate(Number(eintrag.jahr));
  const aktuellesJahr = new Date().getFullYear();
  return jsDate.getFullYear() === aktuellesJahr;
}


// Altersklasse-Filter
function filterAltersklasse(eintrag) {
  const jahrgang = String(eintrag.jahrgang).padStart(2, "0");
  return ["07", "08"].includes(jahrgang);
}


function mindestensZweiFilterErfüllt(eintrag, kaderArray) {
  const filterErgebnisse = {
    "50m Retten": filterZeit_50retten(eintrag, kaderArray),
    "100m Retten": filterZeit_100retten(eintrag, kaderArray),
    "100m Kombi": filterZeit_100kombi(eintrag, kaderArray),
    "100m LS": filterZeit_100LS(eintrag, kaderArray),
    "200m SLS": filterZeit_200SLS(eintrag, kaderArray),
    "200m Hindernis": typeof filterZeit_200H === "function" 
                        ? filterZeit_200H(eintrag, kaderArray) 
                        : false
  };

  const erfolgreicheFilter = Object.keys(filterErgebnisse).filter(key => filterErgebnisse[key]);

  // Gruppierte Ausgabe
  console.group(`Athlet: ${eintrag.name} (${eintrag.jahrgang})`);
  Object.entries(filterErgebnisse).forEach(([disziplin, result]) => {
    if (result) {
      console.log(`✅ ${disziplin} bestanden`);
    } else {
      console.log(`❌ ${disziplin} nicht bestanden`);
    }
  });
  console.groupEnd();

  return erfolgreicheFilter.length >= 2;
}


// Zeit-Filter: 50m Retten 
function filterZeit_50retten(eintrag, kaderArray) {
  const zeit_50retten = parseTimeToSeconds(eintrag.zeit_50retten);
  if (isNaN(zeit_50retten)) return false;

  let richtzeit_50retten;
  if (eintrag.geschlecht === "m") {
    richtzeit_50retten = kaderArray[3][0];
  } else if (eintrag.geschlecht === "w") {
    richtzeit_50retten = kaderArray[2][0];
  } else {
    return false;
  }
  
  return zeit_50retten <= richtzeit_50retten;
}

// Zeit-Filter: 100m Retten
function filterZeit_100retten(eintrag, kaderArray) {
  const zeit_100retten = parseTimeToSeconds(eintrag.zeit_100retten);
  if (isNaN(zeit_100retten)) return false;

  let richtzeit_100retten;
  if (eintrag.geschlecht === "m") {
    richtzeit_100retten = kaderArray[3][1];
  } else if (eintrag.geschlecht === "w") {
    richtzeit_100retten = kaderArray[2][1];
  } else {
    return false;
  }
  
  return zeit_100retten <= richtzeit_100retten;
}

// Zeit-Filter: 100m Kombi
function filterZeit_100kombi(eintrag, kaderArray) {
  const zeit_100kombi = parseTimeToSeconds(eintrag.zeit_100kombi);
  if (isNaN(zeit_100kombi)) return false;

  let richtzeit_100kombi;
  if (eintrag.geschlecht === "m") {
    richtzeit_100kombi = kaderArray[3][2];
  } else if (eintrag.geschlecht === "w") {
    richtzeit_100kombi = kaderArray[2][2];
  } else {
    return false;
  }
  
  return zeit_100kombi <= richtzeit_100kombi;
}

// Zeit-Filter: 100m LS
function filterZeit_100LS(eintrag, kaderArray) {
  const zeit_100LS = parseTimeToSeconds(eintrag.zeit_100LS);
  if (isNaN(zeit_100LS)) return false;

  let richtzeit_100LS;
  if (eintrag.geschlecht === "m") {
    richtzeit_100LS = kaderArray[3][3];
  } else if (eintrag.geschlecht === "w") {
    richtzeit_100LS = kaderArray[2][3];
  } else {
    return false;
  }
  
  return zeit_100LS <= richtzeit_100LS;
}

// Zeit-Filter: 200 SLS
function filterZeit_200SLS(eintrag, kaderArray) {
  const zeit_200SLS = parseTimeToSeconds(eintrag.zeit_200SLS);
  if (isNaN(zeit_200SLS)) return false;

  let richtzeit_200SLS;
  if (eintrag.geschlecht === "m") {
    richtzeit_200SLS = kaderArray[3][4];
  } else if (eintrag.geschlecht === "w") {
    richtzeit_200SLS = kaderArray[2][4];
  } else {
    return false;
  }
  
  return zeit_200SLS <= richtzeit_200SLS;
}

// Zeit-Filter: 200 Hindernis
function filterZeit_200H(eintrag, kaderArray) {
  const zeit_200H = parseTimeToSeconds(eintrag.zeit_200H);
  if (isNaN(zeit_200H)) return false;

  let richtzeit_200H;
  if (eintrag.geschlecht === "m") {
    richtzeit_200H = kaderArray[3][5];
  } else if (eintrag.geschlecht === "w") {
    richtzeit_200H = kaderArray[2][5];
  } else {
    return false;
  }
  
  return zeit_200H <= richtzeit_200H;
}

/* ===========================
   Hilfsfunktionen
   =========================== */

function excelDateToJSDate(serial) {
  // Excel zählt ab 1900-01-01, aber in JS ist 1970 das Basisjahr
  const utc_days = Math.floor(serial - 25569); // 25569 = 1970-01-01
  const utc_value = utc_days * 86400; // Sekunden
  const date_info = new Date(utc_value * 1000); // ms
  return date_info;
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
  const zeit_100rettenRaw = row[7];
  const zeit_100kombiRaw = row[6];
  const zeit_100LSRaw = row[3];
  const zeit_200SLSRaw = row[5];
  const zeit_200HRaw = row[8];
  const jahrRaw = row[9];

  if (!name || !geschlecht || !jahrgangRaw) return;

  const jahrgang = String(jahrgangRaw).padStart(2, "0");

  const eintrag = {
    name,
    geschlecht,
    jahrgang,
    kriterium,
    ortsgruppe,
    zeit_50retten: zeit_50rettenRaw,
    zeit_100retten: zeit_100rettenRaw,
    zeit_100kombi: zeit_100kombiRaw,
    zeit_100LS: zeit_100LSRaw,
    zeit_200SLS: zeit_200SLSRaw,
    zeit_200H: zeit_200HRaw,
    jahr: jahrRaw
  };

  if (!alleFilterErfüllt(eintrag, kaderArray)) return;

  const kader = "17/18";

  // Zeiten in Sekunden umwandeln
  const neueZeit_50retten = parseTimeToSeconds(zeit_50rettenRaw);  
  const neueZeit_100retten = parseTimeToSeconds(zeit_100rettenRaw);
  const neueZeit_100kombi = parseTimeToSeconds(zeit_100kombiRaw);
  const neueZeit_100LS = parseTimeToSeconds(zeit_100LSRaw);
  const neueZeit_200SLS = parseTimeToSeconds(zeit_200SLSRaw);
  const neueZeit_200H = parseTimeToSeconds(zeit_200HRaw);



  if (athletenMap.has(name)) {
    // Fall 1: Athlet existiert schon
    const vorhandener = athletenMap.get(name);
    const alteZeit_50retten = parseTimeToSeconds(vorhandener.zeit_50retten);
    const alteZeit_100retten = parseTimeToSeconds(vorhandener.zeit_100retten);
    const alteZeit_100kombi = parseTimeToSeconds(vorhandener.zeit_100kombi);
    const alteZeit_100LS = parseTimeToSeconds(vorhandener.zeit_100LS);
    const alteZeit_200SLS = parseTimeToSeconds(vorhandener.zeit_200SLS);
    const alteZeit_200H = parseTimeToSeconds(vorhandener.zeit_200H);

    // bessere 50m retten Zeit übernehmen
    if (!isNaN(neueZeit_50retten) && (isNaN(alteZeit_50retten) || neueZeit_50retten < alteZeit_50retten)) {
      vorhandener.zeit_50retten = zeit_50rettenRaw;
    }

    // bessere 100m retten Zeit übernehmen
    if (!isNaN(neueZeit_100retten) && (isNaN(alteZeit_100retten) || neueZeit_100retten < alteZeit_100retten)) {
      vorhandener.zeit_100retten = zeit_100rettenRaw;
    }

    // bessere 100m kombi Zeit übernehmen
    if (!isNaN(neueZeit_100kombi) && (isNaN(alteZeit_100kombi) || neueZeit_100kombi < alteZeit_100kombi)) {
      vorhandener.zeit_100kombi = zeit_100kombiRaw;
    }

    // bessere 100m LS Zeit übernehmen
    if (!isNaN(neueZeit_100LS) && (isNaN(alteZeit_100LS) || neueZeit_100LS < alteZeit_100LS)) {
      vorhandener.zeit_100LS = zeit_100LSRaw;
    }

    // bessere 200 SLS Zeit übernehmen
    if (!isNaN(neueZeit_200SLS) && (isNaN(alteZeit_200SLS) || neueZeit_200SLS < alteZeit_200SLS)) {
      vorhandener.zeit_200SLS = zeit_200SLSRaw;
    }

    // bessere 200 Hindernis Zeit übernehmen
    if (!isNaN(neueZeit_200H) && (isNaN(alteZeit_200H) || neueZeit_200H < alteZeit_200H)) {
      vorhandener.zeit_200H = zeit_200HRaw;
    }

  } else {
    // Fall 2: Athlet neu
    athletenMap.set(name, {
      kader,
      name: eintrag.name,
      geschlecht: eintrag.geschlecht,
      jahrgang: eintrag.jahrgang,
      ortsgruppe: eintrag.ortsgruppe,
      zeit_50retten: zeit_50rettenRaw,
      zeit_100retten: zeit_100rettenRaw,
      zeit_100kombi: zeit_100kombiRaw,
      zeit_100LS: zeit_100LSRaw,
      zeit_200SLS: zeit_200SLSRaw,
      zeit_200H: zeit_200HRaw
    });
  }
});
  const athletenDaten = Array.from(athletenMap.values());
erstelleAthletenTabelle(athletenDaten, kaderArray); 
} 
// Klick-Event am existierenden HTML-Button
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("aktualisierenBtn"); 
  if (!button) return; button.addEventListener("click", () => {
    ladeAthleten().catch(err => console.error("Fehler beim Laden der Excel:", err)); 
  }); 
});


















