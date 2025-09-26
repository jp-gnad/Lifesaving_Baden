const EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/data/test (1).xlsx";

    // =====================
    // HILFSFUNKTIONEN (aus vorher)
    // =====================
    let PFLICHTZEITEN = {
      weiblich: { U17: {}, U19: {}, Offen: {} },
      maennlich: { U17: {}, U19: {}, Offen: {} }
    };

    function parsePflichtzeit(zeitRaw) {
      if (!zeitRaw) return null;
      let str = zeitRaw.toString().trim().replace(",", ".");
      const sekunden = parseFloat(str);
      return isNaN(sekunden) ? null : sekunden;
    }

    async function ladePflichtzeiten(aktuellesJahr) {
      const response = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/data/records_kriterien.xlsx");
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // aktuelles und vorheriges Jahr laden
      const jahre = [aktuellesJahr, aktuellesJahr - 1];

      for (const jahr of jahre) {
        const sheetName = jahr.toString();
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          // wenn das Arbeitsblatt fehlt → alles null
          PFLICHTZEITEN.weiblich.U17[jahr] = Array(6).fill(null);
          PFLICHTZEITEN.weiblich.U19[jahr] = Array(6).fill(null);
          PFLICHTZEITEN.weiblich.Offen[jahr] = Array(6).fill(null);

          PFLICHTZEITEN.maennlich.U17[jahr] = Array(6).fill(null);
          PFLICHTZEITEN.maennlich.U19[jahr] = Array(6).fill(null);
          PFLICHTZEITEN.maennlich.Offen[jahr] = Array(6).fill(null);
          continue;
        }

        // Bereich B2–M4 auslesen
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: "B2:M4" });

        // rows[0] = U17, rows[1] = U19, rows[2] = Offen
        // Spalten 0–5 = weiblich, Spalten 6–11 = männlich

        PFLICHTZEITEN.weiblich.U17[jahr] = rows[0].slice(0, 6).map(parsePflichtzeit);
        PFLICHTZEITEN.weiblich.U19[jahr] = rows[1].slice(0, 6).map(parsePflichtzeit);
        PFLICHTZEITEN.weiblich.Offen[jahr] = rows[2].slice(0, 6).map(parsePflichtzeit);

        PFLICHTZEITEN.maennlich.U17[jahr] = rows[0].slice(6, 12).map(parsePflichtzeit);
        PFLICHTZEITEN.maennlich.U19[jahr] = rows[1].slice(6, 12).map(parsePflichtzeit);
        PFLICHTZEITEN.maennlich.Offen[jahr] = rows[2].slice(6, 12).map(parsePflichtzeit);
      }

      console.log("Pflichtzeiten geladen:", PFLICHTZEITEN);
    }

    const AK_INDEX = { U17: 0, U19: 1, Offen: 2 };
    function getAltersklasse(alter) {
      if (alter < 17) return "U17";
      if (alter < 19) return "U19";
      return "Offen";
    }
    function createEmptyMatrix() {
      return Array.from({ length: 6 }, () =>
        Array.from({ length: 3 }, () =>
          Array.from({ length: 2 }, () => null)
        )
      );
    }
    function bessereZeit(alt, neu) {
      if (alt === null) return neu;
      return Math.min(alt, neu);
    }

    function berechneAlter(jahrRaw, jahrgangRaw) {
      if (!jahrRaw || !jahrgangRaw) return null;

      // Excel-Datum (row[9]) ist "Tage seit 1900"
      const excelBase = new Date(1900, 0, 1);
      const wettkampfDatum = new Date(excelBase.getTime() + (jahrRaw - 2) * 24 * 60 * 60 * 1000);
      const jahrWettkampf = wettkampfDatum.getFullYear();

      // Jahrgang aus "JJ"
      let jahrgang = parseInt(jahrgangRaw, 10);
      if (isNaN(jahrgang)) return null;
      jahrgang += 1900;

      // Wenn Differenz unrealistisch hoch, korrigieren
      while (jahrWettkampf - jahrgang > 100) {
        jahrgang += 100;
      }

      return jahrWettkampf - jahrgang;
    }

    // Beispiel: "1:05,23" → 65.23 Sekunden
    function parseZeit(zeitRaw) {
      if (!zeitRaw) return null;
      let str = zeitRaw.toString().trim();

      // Ersetze Komma durch Punkt
      str = str.replace(",", ".");

      // Minuten + Sekunden
      if (str.includes(":")) {
        const [minStr, secStr] = str.split(":");
        const minuten = parseInt(minStr, 10);
        const sekunden = parseFloat(secStr);
        return minuten * 60 + sekunden;
      }

      // Falls nur Sekunden
      const sekunden = parseFloat(str);
      return isNaN(sekunden) ? null : sekunden;
    }

    function formatZeit(sekunden) {
      if (sekunden === null) return "";
      const min = Math.floor(sekunden / 60);
      const rest = (sekunden % 60).toFixed(2).replace(".", ","); // 65.23 → "05,23"
      return `${min}:${rest.padStart(5, "0")}`;
    }

    function formatDatum(d) {
      if (!d) return "";
      return d.toISOString().split("T")[0]; // ergibt z. B. "2025-05-01"
    }

    function rundeZeit(zeit) {
      if (zeit === null) return null;
      return Math.round(zeit * 100) / 100; // auf 2 Nachkommastellen
    }

    function bestimmeIconTime(matrix) {
      // Zählhilfe
      function countFilled(yIndex, zIndex) {
        let count = 0;
        for (let x = 0; x < 6; x++) {
          if (matrix[x][yIndex][zIndex] !== null) {
            count++;
          }
        }
        return count;
      }

      // Green prüfen (aktuelles Jahr = zIndex 1)
      if (
        countFilled(2, 1) >= 2 || // Offen
        countFilled(1, 1) >= 2 || // U19
        countFilled(0, 1) >= 2    // U17
      ) {
        return "green";
      }

      // Yellow prüfen (letztes Jahr = zIndex 0)
      if (
        countFilled(2, 0) >= 2 || // Offen
        countFilled(1, 0) >= 2 || // U19
        countFilled(0, 0) >= 2    // U17
      ) {
        return "yellow";
      }

      return ""; // sonst leer
    }

    function bestimmeKaderstatus(matrix, alter) {
      function countFilled(yIndex, zIndex) {
        let count = 0;
        for (let x = 0; x < 6; x++) {
          if (matrix[x][yIndex][zIndex] !== null) {
            count++;
          }
        }
        return count;
      }

      // Badenkader
      if (
        countFilled(2, 1) >= 2 ||
        countFilled(2, 0) >= 2 ||
        (countFilled(1, 0) >= 2 && alter === 19)
      ) {
        return "Badenkader";
      }

      // Juniorenkader
      if (
        countFilled(1, 1) >= 2 ||
        countFilled(0, 1) >= 2 ||
        countFilled(0, 0) >= 2 ||
        (countFilled(1, 0) >= 2 && alter < 19)
      ) {
        return "Juniorenkader";
      }

      return "";
    }

    (async function main() {
      const aktuellesJahr = 2025; // oder dynamisch new Date().getFullYear()

      // 1. Pflichtzeiten laden
      await ladePflichtzeiten(aktuellesJahr);

      // 2. Sportler-Excel laden → gibt datenbank zurück
      const datenbank = await ladeExcelUndVerarbeite();

      // 3. Matrix aufbauen
      const result = verarbeiteDatenbank(datenbank, aktuellesJahr);

      // 4. Ausgabe
      console.log("===== Ergebnisse =====");
      for (const [name, daten] of result.entries()) {
        console.log("Name:", name);
        console.log(
          "Name:", name,
          "Geschlecht:", daten.geschlecht,
          "| Jahrgang:", daten.jahrgang,
          "| Alter:", daten.alter,
          "| Ortsgruppe:", daten.ortsgruppe,
          "| Letzter Wettkampf:", formatDatum(daten.datumLetzterStart),
          "| Icon_Time:", daten.Icon_Time,
          "| Kaderstatus:", daten.Kaderstatus
        );
        console.log("Matrix:", daten.matrix);
        console.log("----------------------");
      }
    })();


    // =====================
    // MATRIX LOGIK
    // =====================
    function verarbeiteDatenbank(datenbank, aktuellesJahr) {
      const personenMap = new Map();

      for (const eintrag of datenbank) {
        if (eintrag.jahr < aktuellesJahr - 1) continue;

        if (eintrag.wettkampf && eintrag.wettkampf.substring(0, 3).toUpperCase() === "OMS") {
          continue;
        }

        if (!personenMap.has(eintrag.name)) {
          personenMap.set(eintrag.name, {
            matrix: createEmptyMatrix(),
            geschlecht: eintrag.geschlecht,
            alter: eintrag.alter,
            jahrgang: eintrag.jahrgang,
            ortsgruppe: eintrag.ortsgruppe,
            datumLetzterStart: eintrag.datum
          });
        }

        const person = personenMap.get(eintrag.name);

        // Ortsgruppe ggf. aktualisieren, wenn neueres Datum
        if (eintrag.datum > person.datumLetzterStart) {
          person.ortsgruppe = eintrag.ortsgruppe;
          person.datumLetzterStart = eintrag.datum;
        }

        const jahrIndex = (eintrag.jahr === aktuellesJahr) ? 1 : 0;

        const norms = PFLICHTZEITEN[person.geschlecht];
        const normU17 = norms.U17[eintrag.jahr]?.[eintrag.disziplin - 1] ?? null;
        const normU19 = norms.U19[eintrag.jahr]?.[eintrag.disziplin - 1] ?? null;
        const normOffen = norms.Offen[eintrag.jahr]?.[eintrag.disziplin - 1] ?? null;

        const zeit = eintrag.zeit;

        // --- OFFEN ---
        if (zeit !== null && normOffen !== null && zeit <= normOffen) {
          person.matrix[eintrag.disziplin - 1][AK_INDEX.Offen][jahrIndex] =
            bessereZeit(person.matrix[eintrag.disziplin - 1][AK_INDEX.Offen][jahrIndex], zeit);
        }

        // --- U19 ---
        if (zeit !== null && normU19 !== null && zeit <= normU19 && eintrag.alter < 19) {
          person.matrix[eintrag.disziplin - 1][AK_INDEX.U19][jahrIndex] =
            bessereZeit(person.matrix[eintrag.disziplin - 1][AK_INDEX.U19][jahrIndex], zeit);
        }

        // --- U17 ---
        if (zeit !== null && normU17 !== null && zeit <= normU17 && eintrag.alter < 17) {
          person.matrix[eintrag.disziplin - 1][AK_INDEX.U17][jahrIndex] =
            bessereZeit(person.matrix[eintrag.disziplin - 1][AK_INDEX.U17][jahrIndex], zeit);
        }

        for (const [name, person] of personenMap.entries()) {
          person.Icon_Time = bestimmeIconTime(person.matrix);        // dein alter Code
          person.Kaderstatus = bestimmeKaderstatus(person.matrix, person.alter); // neu
        }


      }

      return personenMap;
    }



    // Hilfsfunktion: immer schnellste Zeit behalten
    function bessereZeit(alt, neu) {
      if (neu === null) return alt;
      if (alt === null) return rundeZeit(neu);
      return rundeZeit(Math.min(alt, neu));
    }


    // =====================
    // EXCEL LADEN
    // =====================
    async function ladeExcelUndVerarbeite() {
      const response = await fetch(EXCEL_URL);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      const datenbank = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[1]) continue;

        const geschlechtRaw = row[0]?.toString().toLowerCase();
        const geschlecht = geschlechtRaw === "m" ? "maennlich" : "weiblich";
        const name = row[1];
        const jahrgangRaw = row[11];
        const jahrgang = jahrgangRaw?.toString().padStart(2, "0");
        const jahrRaw = row[9];
        const alter = berechneAlter(jahrRaw, jahrgangRaw);
        const ortsgruppe = row[12] || "";
        const wettkampfName = row[10] ? row[10].toString() : "";

        // Excel-Datum -> korrektes Datum (UTC, Excel-Basis inkl. 1900-Bug-Korrektur)
        const excelBase = new Date(Date.UTC(1900, 0, 1));
        const wettkampfDatum = new Date(excelBase.getTime() + (jahrRaw - 1) * 24 * 60 * 60 * 1000);
        const jahr = wettkampfDatum.getUTCFullYear();

        const disziplinen = [
          { zeit: row[4], nr: 1 },
          { zeit: row[7], nr: 2 },
          { zeit: row[6], nr: 3 },
          { zeit: row[3], nr: 4 },
          { zeit: row[5], nr: 5 },
          { zeit: row[8], nr: 6 }
        ];

        for (const d of disziplinen) {
          const zeit = parseZeit(d.zeit);
          if (zeit !== null) {
            datenbank.push({
              name,
              geschlecht,
              alter,
              jahrgang,
              disziplin: d.nr,
              jahr,
              zeit,
              ortsgruppe,
              datum: wettkampfDatum,
              wettkampf: wettkampfName
            });
          }
        }
      }

      // --> Ab hier ERST verarbeiten, DANN sortieren & Tabelle bauen
      const aktuellesJahr = new Date().getFullYear();
      const result = verarbeiteDatenbank(datenbank, aktuellesJahr);

      // Personen mit Kaderstatus filtern & sortieren (Name -> Ort -> Geschlecht)
      const personenArray = Array.from(result.entries())
      .filter(([_, p]) => p.Kaderstatus !== "")
      .sort((a, b) => {
        const [nameA, pA] = a;
        const [nameB, pB] = b;

        // 1) Geschlecht: weiblich zuerst, dann männlich
        const gA = pA.geschlecht === "weiblich" ? 0 : 1;
        const gB = pB.geschlecht === "weiblich" ? 0 : 1;
        if (gA !== gB) return gA - gB;

        // 2) Ortsgruppe: A–Z (leer ans Ende)
        const ogA = (pA.ortsgruppe || "").toString().trim();
        const ogB = (pB.ortsgruppe || "").toString().trim();
        const cmpOG = ogA === "" && ogB !== "" ? 1
                  : ogB === "" && ogA !== "" ? -1
                  : ogA.localeCompare(ogB, "de", { sensitivity: "base" });
        if (cmpOG !== 0) return cmpOG;

        // 3) Name: A–Z
        return nameA.localeCompare(nameB, "de", { sensitivity: "base" });
      });

      // Tabelle erzeugen
      const container = document.getElementById("kader-container");
      const table = document.createElement("table");

      // Kopfzeile (1. Spalte leer, 2. Person, 3. Kaderstatus)
      const header = document.createElement("tr");
      header.innerHTML = "<th></th><th>Person</th><th>Kaderstatus</th>";
      table.appendChild(header);

      // Zeilen füllen
      for (const [name, person] of personenArray) {
        const tr = document.createElement("tr");
        const farbe = person.geschlecht === "maennlich" ? "blue" : "deeppink";

        tr.innerHTML = `
          <td></td>
          <td>
            <span style="color:${farbe}; font-weight:bold;">
              ${name} (${person.jahrgang})
            </span><br>
            <small>DLRG ${person.ortsgruppe || ""}</small>
          </td>
          <td>${person.Kaderstatus}</td>
        `;

        table.appendChild(tr);
      }

      container.appendChild(table);

      console.log("Excel geladen, Einträge:", datenbank.length);
      // Diese Funktion baut die Tabelle -> ein Return ist nicht zwingend nötig
      return datenbank; // neu
    }


  