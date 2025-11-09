const EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/test (1).xlsx";

    // =====================
    // HILFSFUNKTIONEN (aus vorher)
    // =====================
    let PFLICHTZEITEN = {
      weiblich: { U17: {}, U19: {}, Offen: {} },
      maennlich: { U17: {}, U19: {}, Offen: {} }
    };

    function normWk(s) {
      return (s || "").toString().toLowerCase()
        .normalize("NFKD").replace(/\p{Diacritic}/gu,"")
        .replace(/[–—−]/g, "-").replace(/\s+/sg," ").trim();
    }
    function minNum(a, b) { return a == null ? b : (b == null ? a : Math.min(a, b)); }

    // nutzt deine Ranks:
    function pickBetter(a, b) {
      if (!a) return b;
      if (!b) return a;
      const ar = (STATUS_RANK[a.kader || ""] || 0), br = (STATUS_RANK[b.kader || ""] || 0);
      if (ar !== br) return ar > br ? a : b;
      const ai = (COLOR_RANK[a.icon] || 0), bi = (COLOR_RANK[b.icon] || 0);
      if (ai !== bi) return ai > bi ? a : b;
      if ((a.reqPlatz ?? 1e9) !== (b.reqPlatz ?? 1e9)) return (a.reqPlatz < b.reqPlatz) ? a : b;
      if ((a.achieved ?? 1e9) !== (b.achieved ?? 1e9)) return (a.achieved < b.achieved) ? a : b;
      return a;
    }


    // === Anmeldungen (nur aktuelles Jahr) ===
    let ANMELDUNGEN = {}; // { [jahr]: Set<lowerName> }

    function istAngemeldet(name, jahr) {
      const set = ANMELDUNGEN[jahr];
      if (!set) return false;
      const key = (name || "").toString().trim().toLowerCase();
      return set.has(key);
    }

    async function ladeAnmeldungen(aktuellesJahr) {
      const res = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      const jahr = aktuellesJahr; // nur aktuelles Jahr relevant
      const ws = wb.Sheets[jahr.toString()];
      const set = new Set();

      if (ws) {
        // L17:L500 lesen (Namenliste)
        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1, range: "L17:L500", defval: null, blankrows: false
        });
        for (const r of rows) {
          const name = (r[0] ?? "").toString().trim();
          if (name) set.add(name.toLowerCase());
        }
      }

      ANMELDUNGEN[jahr] = set;
      console.log(`Anmeldungen ${jahr}:`, set.size, "Namen");
    }


    function berechneKaderBis(person, aktuellesJahr) {
      const anyGreen = [person.Icon_Time, person.Icon_Comp, person.Icon_Ocean, person.Icon_Coach]
        .some(c => c === "green");
      const year = anyGreen ? (aktuellesJahr + 1) : aktuellesJahr;
      return `31.12.${year}`;
    }


    function parsePflichtzeit(zeitRaw) {
      if (!zeitRaw) return null;
      let str = zeitRaw.toString().trim().replace(",", ".");
      const sekunden = parseFloat(str);
      return isNaN(sekunden) ? null : sekunden;
    }

    // === Entfernen (Blacklist) ===
    let SONDERREGELN_ENTFERNEN = {}; // { [jahr]: Set<lowerName> }

    function istEntferntImJahr(name, jahr) {
      const set = SONDERREGELN_ENTFERNEN[jahr];
      if (!set) return false;
      const key = (name || "").toString().trim().toLowerCase();
      return set.has(key);
    }

    async function ladeSonderregelnEntfernen(aktuellesJahr) {
      const res = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      // Nur aktuelles Jahr relevant (Anforderung)
      const jahr = aktuellesJahr;
      const ws = wb.Sheets[jahr.toString()];
      const set = new Set();
      if (ws) {
        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1, range: "H17:J500", defval: null, blankrows: false
        });
        for (const r of rows) {
          const name = (r[0] ?? "").toString().trim();
          const kriterium = (r[1] ?? "").toString().trim().toLowerCase();
          if (!name) continue;
          if (kriterium === "entfernen") {
            set.add(name.toLowerCase());
          }
        }
      }
      SONDERREGELN_ENTFERNEN[jahr] = set;
      console.log(`Entfernen-Liste ${jahr}:`, set.size, "Namen");
    }


    // === global:
    let SONDERREGELN_TRAINER = {}; // { [jahr]: Map(lowerName -> { kader: "Badenkader"|"Juniorenkader"|"" }) }

    function findeSonderregelTrainer(name, jahr) {
      const m = SONDERREGELN_TRAINER[jahr];
      return m ? (m.get((name || "").toString().trim().toLowerCase()) || null) : null;
    }

    async function ladeSonderregelnTrainer(aktuellesJahr) {
      const res = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      for (const jahr of [aktuellesJahr, aktuellesJahr - 1]) {
        const ws = wb.Sheets[jahr.toString()];
        if (!ws) { SONDERREGELN_TRAINER[jahr] = new Map(); continue; }

        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1, range: "H17:J500", defval: null, blankrows: false
        });

        const map = new Map();
        for (const r of rows) {
          const name = (r[0] ?? "").toString().trim();
          const kriterium = (r[1] ?? "").toString().trim().toLowerCase();
          const kader = (r[2] ?? "").toString().trim();
          if (!name) continue;
          if (kriterium !== "sondernominierung") continue;
          map.set(name.toLowerCase(), { kader });
        }

        // ⬇️ WICHTIG: Ergebnis speichern!
        SONDERREGELN_TRAINER[jahr] = map;
        console.log(`Sonderregeln Trainer ${jahr}:`, map.size, "Einträge");
      }
    }



    // === global:
    let SONDERREGELN_OCEAN = {}; // { [jahr]: Map(lowerName -> { kader: "Badenkader"|"Juniorenkader"|"" }) }

    // Helfer:
    function findeSonderregelOcean(name, jahr) {
      const m = SONDERREGELN_OCEAN[jahr];
      return m ? (m.get((name || "").toString().trim().toLowerCase()) || null) : null;
    }

    async function ladeSonderregelnOcean(aktuellesJahr) {
      const res = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      for (const jahr of [aktuellesJahr, aktuellesJahr - 1]) {
        const ws = wb.Sheets[jahr.toString()];
        if (!ws) { SONDERREGELN_OCEAN[jahr] = new Map(); continue; }

        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1, range: "H17:J500", defval: null, blankrows: false
        });

        const map = new Map();
        for (const r of rows) {
          const name = (r[0] ?? "").toString().trim();
          const kriterium = (r[1] ?? "").toString().trim().toLowerCase();
          const kader = (r[2] ?? "").toString().trim();
          if (!name) continue;
          if (kriterium !== "ocean") continue;
          map.set(name.toLowerCase(), { kader });
        }

        // ⬇️ WICHTIG: Ergebnis speichern!
        SONDERREGELN_OCEAN[jahr] = map;
        console.log(`Sonderregeln Ocean ${jahr}:`, map.size, "Einträge");
      }
    }


    // === Prioritäten / Merge-Regeln ===
    const STATUS_RANK = { "": 0, "Juniorenkader": 1, "Badenkader": 2 };
    function promoteStatus(current = "", incoming = "") {
      // Regeln:
      // "" bleibt bei "" = ""
      // "" -> Juniorenkader/Badenkader: übernehmen
      // Juniorenkader -> Badenkader: hochstufen
      // Badenkader bleibt immer Badenkader
      if (!incoming) return current;
      return (STATUS_RANK[incoming] || 0) > (STATUS_RANK[current] || 0) ? incoming : current;
    }

    const COLOR_RANK = { "": 0, grey: 0, yellow: 1, green: 2 };
    function hoechsteFarbe(alt = "", neu = "") {
      return (COLOR_RANK[neu] || 0) > (COLOR_RANK[alt] || 0) ? neu : alt;
    }


    async function ladePflichtzeiten(aktuellesJahr) {
      const response = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
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
    }

    let PLATZIERUNGS_KRITERIEN = {};

    async function ladePlatzierungsKriterien(aktuellesJahr) {
      const res = await fetch("https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/data/records_kriterien.xlsx");
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      const jahre = [aktuellesJahr, aktuellesJahr - 1];

      for (const jahr of jahre) {
        const ws = wb.Sheets[jahr.toString()];
        if (!ws) { PLATZIERUNGS_KRITERIEN[jahr] = []; continue; }

        // 1) Used Range großzügig setzen – macht uns unabhängig von Excel-!ref
        ws["!ref"] = "A1:Z500";

        // 2) Ganzes Raster holen
        const grid = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: null,
          blankrows: false
        });

        // 3) Header-Zeile der Platzierungsnormen finden (erste Spalte "Wettkampf")
        const headerRow = grid.findIndex(r =>
          r && r[0] && r[0].toString().trim().toLowerCase() === "wettkampf"
        );
        if (headerRow === -1) { PLATZIERUNGS_KRITERIEN[jahr] = []; continue; }

        // 4) Ab der nächsten Zeile bis zur ersten Leerzeile einlesen
        const out = [];
        for (let i = headerRow + 1; i < grid.length; i++) {
          const r = grid[i];
          if (!r) continue;
          const wk = (r[0] ?? "").toString().trim();
          if (!wk) continue; // statt break
          out.push({
            wettkampf: r[0].toString().trim(),
            minAlter: parseInt(r[1], 10),
            maxAlter: parseInt(r[2], 10),
            platzierung: parseInt(r[3], 10),
            wertung: (r[4] ?? "").toString().trim(),
            kader: (r[5] ?? "").toString().trim()
          });
        }

        PLATZIERUNGS_KRITERIEN[jahr] = out;
      }
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
    

    function berechneAlter(jahrRaw, jahrgangRaw) {
      // Nur "null"/"undefined"/"" abfangen – 0 ist erlaubt!
      if (jahrRaw == null || jahrgangRaw == null || jahrgangRaw === "") return null;

      // Excel-Seriennummer -> Datum (einheitlich, -1 Tag Korrektur)
      const excelBase = new Date(Date.UTC(1900, 0, 1));
      const wettkampfDatum = new Date(excelBase.getTime() + (jahrRaw - 1) * 24*60*60*1000);
      const jahrWettkampf = wettkampfDatum.getUTCFullYear();

      // "JJ" -> Zahl (00..99)
      let jahrgang = parseInt(jahrgangRaw, 10);
      if (Number.isNaN(jahrgang)) return null;

      // In Jahrhundert heben (1900er starten, dann bei Bedarf +100)
      jahrgang += 1900;
      while (jahrWettkampf - jahrgang > 100) jahrgang += 100;

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

    function pruefePlatzierungsKriterienAusComps(person, aktuellesJahr) {
      let best = null;

      for (const comp of person.comps.values()) {
        const liste = PLATZIERUNGS_KRITERIEN[comp.jahr] || [];
        const wk = normWk(comp.wettkampf);

        // nur passende Zeilen (Wettkampf + Altersfenster)
        const matched = liste.filter(k =>
          normWk(k.wettkampf) === wk &&
          comp.age != null &&
          Number.isFinite(k.minAlter) && Number.isFinite(k.maxAlter) &&
          comp.age >= k.minAlter && comp.age <= k.maxAlter &&
          (k.wertung === "Mehrkampf" || k.wertung === "Einzelkampf")
        );

        for (const k of matched) {
          const req = parseInt(k.platzierung, 10);
          const platz = (k.wertung === "Mehrkampf") ? comp.mehr : comp.einz;
          console.log(`[Kriterium] ${person.ortsgruppe ? person.ortsgruppe + ' | ' : ''}${person?.name || ''} | ${comp.wettkampf} ${comp.jahr} | ${k.wertung} Platz=${platz} ≤ ${req} | Kader=${k.kader}`);

          if (Number.isFinite(platz) && Number.isFinite(req) && platz <= req) {
            const icon = (comp.jahr === aktuellesJahr) ? "green" : "yellow";
            best = pickBetter(best, { icon, kader: k.kader, reqPlatz: req, achieved: platz });
          }
        }
      }

      return best ? { icon: best.icon, kader: best.kader } : { icon: "", kader: "" };
    }





    function bestimmeKaderstatus(matrix, alter) {
      function countFilled(yIndex, zIndex) {
        let count = 0;
        for (let x = 0; x < 6; x++) {
          if (matrix[x][yIndex][zIndex] !== null) count++;
        }
        return count;
      }

      // Badenkader (unverändert)
      if (
        countFilled(2, 1) >= 2 ||               // Offen, aktuelles Jahr
        countFilled(2, 0) >= 2 ||               // Offen, Vorjahr
        (countFilled(1, 0) >= 2 && alter === 19) // U19 im Vorjahr + jetzt 19
      ) {
        return "Badenkader";
      }

      // Juniorenkader: nur wenn < 19!
      if (
        alter < 19 && (
          countFilled(1, 1) >= 2 || // U19, aktuelles Jahr
          countFilled(0, 1) >= 2 || // U17, aktuelles Jahr
          countFilled(0, 0) >= 2 || // U17, Vorjahr
          countFilled(1, 0) >= 2    // U19, Vorjahr
        )
      ) {
        return "Juniorenkader";
      }

      return "";
    }

    function applyZebraStripes() {
      const rows = document.querySelectorAll("#kader-container table tr");
      let visibleIndex = 0;

      rows.forEach((row, index) => {
        if (index === 0) return; // Header auslassen

        if (row.style.display === "none") {
          row.classList.remove("odd", "even");
          return;
        }

        // abwechselnd odd/even
        row.classList.remove("odd", "even");
        row.classList.add(visibleIndex % 2 === 0 ? "even" : "odd");
        visibleIndex++;
      });
    }


    (async function main() {
      const aktuellesJahr = 2025;

      await Promise.all([
        ladePflichtzeiten(aktuellesJahr),
        ladePlatzierungsKriterien(aktuellesJahr),
        ladeSonderregelnOcean(aktuellesJahr),
        ladeSonderregelnTrainer(aktuellesJahr),
        ladeSonderregelnEntfernen(aktuellesJahr),
        ladeAnmeldungen(aktuellesJahr)
      ]);

      const datenbank = await ladeExcelUndVerarbeite();
      const result = verarbeiteDatenbank(datenbank, aktuellesJahr);

      // Tabelle bauen
      baueKaderTabelle(result, aktuellesJahr);

      // Optional: Debug-Ausgabe
      console.log("===== Ergebnisse =====");
      for (const [name, daten] of result.entries()) {
        console.log("Name:", name,
          "Geschlecht:", daten.geschlecht,
          "| Jahrgang:", daten.jahrgang,
          "| Alter:", daten.alter,
          "| Aktuelles Alter:", daten.aktuellesAlter,
          "| Ortsgruppe:", daten.ortsgruppe,
          "| Landesverband:", daten.landesverband,
          "| Letzter Wettkampf:", formatDatum(daten.datumLetzterStart),
          "| Icon_Time:", daten.Icon_Time,
          "| Icon_Comp:", daten.Icon_Comp,
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
      const excludeSet = SONDERREGELN_ENTFERNEN[aktuellesJahr] || new Set();

      for (const eintrag of datenbank) {
        // NEU: Entfernen-Regel (nur aktuelles Jahr)
        const nameKey = (eintrag.name || "").toString().trim().toLowerCase();
        if (excludeSet.has(nameKey)) {
          continue;
        }

        if (eintrag.jahr < aktuellesJahr - 1) continue;
        if (eintrag.wettkampf && eintrag.wettkampf.substring(0, 3).toUpperCase() === "OMS") continue;
        if (eintrag.landesverband && eintrag.landesverband.toUpperCase() !== "BA") continue;


        if (!personenMap.has(eintrag.name)) {
          const angemeldet = istAngemeldet(eintrag.name, aktuellesJahr);

          personenMap.set(eintrag.name, {
            matrix: createEmptyMatrix(),
            geschlecht: eintrag.geschlecht,
            alter: eintrag.alter,
            aktuellesAlter: eintrag.aktuellesAlter,
            jahrgang: eintrag.jahrgang,
            ortsgruppe: eintrag.ortsgruppe,
            landesverband: eintrag.landesverband,
            datumLetzterStart: eintrag.datum,

            Icon_Time: "",
            Icon_Comp: "",
            Icon_Ocean: "",
            Icon_Coach: "",
            Kaderstatus: "",

            angemeldet,
            Status_Anmeldung: angemeldet ? "angemeldet" : "",

            comps: new Map()
          });
        }

        // ✅ ab hier existiert person garantiert
        const person = personenMap.get(eintrag.name);

        // Wettkampf-Key (pro Jahr & Wettkampf)
        const compKey = `${eintrag.jahr}||${normWk(eintrag.wettkampf)}`;
        let comp = person.comps.get(compKey);
        if (!comp) {
          comp = {
            jahr: eintrag.jahr,
            wettkampf: eintrag.wettkampf,
            age: eintrag.alter,
            mehr: null,
            einz: null
          };
          person.comps.set(compKey, comp);
        }

        // Plätze sammeln (Minimum je Art)
        const mk = parseInt(eintrag.mehrkampfPlatzierung, 10);
        if (Number.isFinite(mk) && mk >= 1) comp.mehr = minNum(comp.mehr, mk);

        const ek = parseInt(eintrag.einzelkampfPlatzierung, 10);
        if (Number.isFinite(ek) && ek >= 1) comp.einz = minNum(comp.einz, ek);

        // Debug (optional)
        console.log(`[COMPS] ${eintrag.name} | ${eintrag.wettkampf} ${eintrag.jahr} | mehr=${comp.mehr} | einz=${comp.einz}`);


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

        // Nach dem eventuellen Schreiben in person.matrix:
        person.Icon_Time = bestimmeIconTime(person.matrix);

        // Zeit-basierter Status ermitteln und NUR hochstufen
        const timesStatus = bestimmeKaderstatus(person.matrix, person.aktuellesAlter);
        const beforeTimes = person.Kaderstatus;
        person.Kaderstatus = promoteStatus(person.Kaderstatus, timesStatus);


        // --- Ocean-Sonderregel (aktuelles Jahr vs. Vorjahr) ---
        let oceanColor = "";   // "" | "yellow" | "green"
        let oceanKader = "";   // "" | "Juniorenkader" | "Badenkader"

        const srPrev = findeSonderregelOcean(eintrag.name, aktuellesJahr - 1);
        if (srPrev) { oceanColor = "yellow"; oceanKader = srPrev.kader || ""; }

        const srCurr = findeSonderregelOcean(eintrag.name, aktuellesJahr);
        if (srCurr) { oceanColor = "green"; oceanKader = srCurr.kader || oceanKader; } // green > yellow

        if (oceanColor) {
          person.Icon_Ocean = hoechsteFarbe(person.Icon_Ocean, oceanColor);
          person.Kaderstatus = promoteStatus(person.Kaderstatus, oceanKader); // nie downgraden
          console.log(`[${eintrag.name}] OceanSonderregel`, { oceanColor, oceanKader, Kaderstatus: person.Kaderstatus });
        }


        // --- Trainer/Coach-Sonderregel (aktuelles Jahr vs. Vorjahr) ---
        let coachColor = "";   // "" | "yellow" | "green"
        let coachKader = "";   // "" | "Juniorenkader" | "Badenkader"

        const trPrev = findeSonderregelTrainer(eintrag.name, aktuellesJahr - 1);
        if (trPrev) { coachColor = "yellow"; coachKader = trPrev.kader || ""; }

        const trCurr = findeSonderregelTrainer(eintrag.name, aktuellesJahr);
        if (trCurr) { coachColor = "green"; coachKader = trCurr.kader || coachKader; } // green > yellow

        if (coachColor) {
          person.Icon_Coach = hoechsteFarbe(person.Icon_Coach, coachColor);   // green > yellow > ""
          person.Kaderstatus = promoteStatus(person.Kaderstatus, coachKader);  // nie downgraden
          console.log(`[${eintrag.name}] TrainerSonderregel`, { coachColor, coachKader, Kaderstatus: person.Kaderstatus });
        }


      }

      for (const [name, person] of personenMap.entries()) {
        const compRes = pruefePlatzierungsKriterienAusComps(person, aktuellesJahr);
        person.Icon_Comp = hoechsteFarbe(person.Icon_Comp, compRes.icon || "");
        person.Kaderstatus = promoteStatus(person.Kaderstatus, compRes.kader || "");
        // Debug:
        console.log(`[Comp-Ergebnis] ${name}`, compRes, 'aus', Array.from(person.comps.values()));
      }


      return personenMap;
    }

    function baueKaderTabelle(result, aktuellesJahr) {
      // Ergebnis in Array überführen, filtern und sortieren
      const personenArray = Array.from(result.entries())
        .filter(([_, p]) => p.Kaderstatus !== "")
        .sort((a, b) => {
          const [nameA, pA] = a;
          const [nameB, pB] = b;
          const gA = pA.geschlecht === "weiblich" ? 0 : 1;
          const gB = pB.geschlecht === "weiblich" ? 0 : 1;
          if (gA !== gB) return gA - gB;
          const ogA = (pA.ortsgruppe || "").toString().trim();
          const ogB = (pB.ortsgruppe || "").toString().trim();
          const cmpOG = ogA === "" && ogB !== "" ? 1
                      : ogB === "" && ogA !== "" ? -1
                      : ogA.localeCompare(ogB, "de", { sensitivity: "base" });
          if (cmpOG !== 0) return cmpOG;
          return nameA.localeCompare(nameB, "de", { sensitivity: "base" });
        });

      // Container holen
      const container = document.getElementById("kader-container");
      if (!container) {
        console.error('#kader-container nicht gefunden – Tabelle kann nicht erzeugt werden.');
        return;
      }
      container.innerHTML = ""; // ggf. vorherige Ausgabe leeren

      // Tabelle + Head
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const trHead = document.createElement("tr");
      trHead.innerHTML = `
        <th></th>
        <th>Sportler / Ortsgruppe</th>
        <th colspan="4" style="text-align:center;">Kriterien</th>
        <th style="text-align:center;">Status</th>
      `;
      thead.appendChild(trHead);
      table.appendChild(thead);

      // Zeilen
      const tbody = document.createElement("tbody");
      for (const [name, person] of personenArray) {
        const tr = document.createElement("tr");
        tr.dataset.kaderstatus = person.Kaderstatus;
        tr.dataset.aktuellesalter = person.aktuellesAlter;
        const farbe = person.geschlecht === "maennlich" ? "#1e90ff" : "#ff69b4";

        // 1) Cap
        const tdCap = document.createElement("td");
        tdCap.style.textAlign = "right";
        const imgCap = document.createElement("img");
        const ortsgruppe = person.ortsgruppe || "placeholder";
        imgCap.src = `./svg/${encodeURIComponent(`Cap-${ortsgruppe}.svg`)}`;
        imgCap.style.width = "35px";
        imgCap.alt = `Cap von ${person.ortsgruppe}`;
        imgCap.onerror = () => { imgCap.onerror = null; imgCap.src = `./svg/Cap-Baden_light.svg`; };
        tdCap.appendChild(imgCap);
        tr.appendChild(tdCap);

        // 2) Name/Zusatz
        const tdName = document.createElement("td");
        tdName.innerHTML = `
          <span style="color:${farbe}; font-weight:bold;">
            ${name} (${person.jahrgang})
          </span><br>
          <small style="color: rgb(68, 68, 69); font-weight: bold;">
            DLRG ${person.ortsgruppe || ""}
          </small>
        `;
        tr.appendChild(tdName);

        // 3) Icon_Time
        const tdIcon_time = document.createElement("td");
        tdIcon_time.style.textAlign = "center";
        const imgIcon_time = document.createElement("img");
        const icon1 = person.Icon_Time === "green" ? "icon_time_green.svg"
                    : person.Icon_Time === "yellow" ? "icon_time_yellow.svg"
                    : "icon_time_grey.svg";
        imgIcon_time.src = `https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/${encodeURIComponent(icon1)}`;
        imgIcon_time.style.width = "35px";
        tdIcon_time.appendChild(imgIcon_time);
        tr.appendChild(tdIcon_time);

        // 4) Icon_Comp
        const tdIcon_comp = document.createElement("td");
        tdIcon_comp.style.textAlign = "center";
        const imgIcon_comp = document.createElement("img");
        const icon2 = person.Icon_Comp === "green" ? "icon_medal_green.svg"
                    : person.Icon_Comp === "yellow" ? "icon_medal_yellow.svg"
                    : "icon_medal_grey.svg";
        imgIcon_comp.src = `https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/${encodeURIComponent(icon2)}`;
        imgIcon_comp.style.width = "35px";
        tdIcon_comp.appendChild(imgIcon_comp);
        tr.appendChild(tdIcon_comp);

        // 5) Icon_Ocean
        const tdIcon_ocean = document.createElement("td");
        tdIcon_ocean.style.textAlign = "center";
        const imgIcon_ocean = document.createElement("img");
        const icon3 = person.Icon_Ocean === "green" ? "icon_ocean_green.svg"
                    : person.Icon_Ocean === "yellow" ? "icon_ocean_yellow.svg"
                    : "icon_ocean_grey.svg";
        imgIcon_ocean.src = `https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/${encodeURIComponent(icon3)}`;
        imgIcon_ocean.style.width = "35px";
        tdIcon_ocean.appendChild(imgIcon_ocean);
        tr.appendChild(tdIcon_ocean);

        // 6) Icon_Coach
        const tdIcon_coach = document.createElement("td");
        tdIcon_coach.style.textAlign = "center";
        const imgIcon_coach = document.createElement("img");
        const icon4 = person.Icon_Coach === "green" ? "icon_trainer_green.svg"
                    : person.Icon_Coach === "yellow" ? "icon_trainer_yellow.svg"
                    : "icon_trainer_grey.svg";
        imgIcon_coach.src = `https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/${encodeURIComponent(icon4)}`;
        imgIcon_coach.style.width = "35px";
        tdIcon_coach.appendChild(imgIcon_coach);
        tr.appendChild(tdIcon_coach);

        // 7) Status-Zelle mit Tooltip (grün/gelb)
        const tdStatus = document.createElement("td");
        tdStatus.classList.add("status-cell");
        const wrapper = document.createElement("div");
        wrapper.className = "status-wrapper";
        const icon = document.createElement("img");
        icon.className = "status-icon";
        icon.src = person.angemeldet
          ? "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/icon_status_green.svg"
          : "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web2/svg/icon_status_yellow.svg";
        icon.alt = person.angemeldet ? "Status: angemeldet" : "Anmeldung erforderlich";
        icon.style.width = "27.5px";
        icon.setAttribute("tabindex", "0");
        icon.setAttribute("aria-haspopup", "true");
        icon.setAttribute("aria-expanded", "false");

        // Tooltip
        const tooltip = document.createElement("div");
        tooltip.className = "status-tooltip";
        tooltip.setAttribute("role", "tooltip");
        tooltip.setAttribute("aria-hidden", "true");
        tooltip.textContent = person.angemeldet
          ? `Kaderberechtigt bis ${berechneKaderBis(person, aktuellesJahr)}`
          : "Anmeldung erforderlich";
        document.body.appendChild(tooltip);

        function positionTooltip() {
          const margin = 8;
          const r = icon.getBoundingClientRect();
          tooltip.style.visibility = "hidden";
          tooltip.classList.add("is-visible");
          const tW = tooltip.offsetWidth, tH = tooltip.offsetHeight;
          let left = r.right + margin;
          let top  = Math.round(r.top + r.height / 2 - tH / 2);
          tooltip.classList.remove("left");
          if (left + tW > window.innerWidth - 8) {
            left = r.left - margin - tW;
            tooltip.classList.add("left");
          }
          if (top < 8) top = 8;
          if (top + tH > window.innerHeight - 8) top = window.innerHeight - tH - 8;
          tooltip.style.left = `${left}px`;
          tooltip.style.top  = `${top}px`;
          tooltip.style.visibility = "";
        }
        function hide() {
          tooltip.classList.remove("is-visible");
          tooltip.setAttribute("aria-hidden", "true");
          icon.setAttribute("aria-expanded", "false");
          document.removeEventListener("click", onDocClick);
          document.removeEventListener("keydown", onKey);
          window.removeEventListener("scroll", onScrollOrResize, true);
          window.removeEventListener("resize", onScrollOrResize);
          if (window.__closeOpenStatusTooltip === hide) window.__closeOpenStatusTooltip = null;
        }
        function show() {
          if (window.__closeOpenStatusTooltip && window.__closeOpenStatusTooltip !== hide) {
            window.__closeOpenStatusTooltip();
          }
          positionTooltip();
          tooltip.classList.add("is-visible");
          tooltip.setAttribute("aria-hidden", "false");
          icon.setAttribute("aria-expanded", "true");
          document.addEventListener("click", onDocClick);
          document.addEventListener("keydown", onKey);
          window.addEventListener("scroll", onScrollOrResize, true);
          window.addEventListener("resize", onScrollOrResize);
          window.__closeOpenStatusTooltip = hide;
        }
        const onDocClick = (e) => { if (!wrapper.contains(e.target) && !tooltip.contains(e.target)) hide(); };
        const onKey = (e) => { if (e.key === "Escape") hide(); };
        const onScrollOrResize = () => { if (tooltip.classList.contains("is-visible")) positionTooltip(); };
        icon.addEventListener("click", (e) => { e.stopPropagation(); tooltip.classList.contains("is-visible") ? hide() : show(); });
        icon.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tooltip.classList.contains("is-visible") ? hide() : show(); } });

        wrapper.appendChild(icon);
        tdStatus.appendChild(wrapper);

        // ⬇️ NEU: Kaderstatus als Text/Badge darunter
        const badge = document.createElement("div");
        badge.className = "kader-badge";
        badge.textContent = person.Kaderstatus || "";  // "Badenkader", "Juniorenkader" oder ""

        tr.appendChild(tdStatus);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      container.appendChild(table);

      if (window.applyKaderFilter) window.applyKaderFilter();
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

      // gezielt Tabelle2 nehmen, falls vorhanden, sonst erstes Blatt
      let sheetName = "Tabelle2";
      if (!workbook.Sheets[sheetName]) {
        // Fallback, falls der Name sich mal ändert oder das Blatt nicht existiert
        sheetName = workbook.SheetNames[0];
      }
      console.log("Verwendetes Sheet:", sheetName);

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Datenbank aufbauen
      const datenbank = [];
      // ⬇️ WICHTIG: wir haben KEINE Überschrift in Zeile 1 → bei Index 0 anfangen
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Spalte B (Index 1) = Name muss belegt sein
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
        const landesverband = row[13] || "";
        const mehrkampfPlatzierung = row[14];

        const parsePlatz = v => {
          const n = parseInt(v, 10);
          return Number.isFinite(n) && n >= 1 ? n : null;
        };
        const einzelPlaetze = [row[15], row[16], row[17], row[18], row[19], row[20]];
        const einzelkampfPlatzierung = einzelPlaetze.reduce((min, v) => {
          const n = parsePlatz(v);
          return n !== null && (min === null || n < min) ? n : min;
        }, null);

        // Excel-Datum -> Datum
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

        let jahrgangNum = parseInt(jahrgangRaw, 10);
        if (isNaN(jahrgangNum)) {
          jahrgangNum = null;
        } else {
          jahrgangNum += 1900;
          while (new Date().getFullYear() - jahrgangNum > 100) {
            jahrgangNum += 100;
          }
        }

        for (const d of disziplinen) {
          const zeit = parseZeit(d.zeit);
          if (zeit !== null) {
            datenbank.push({
              name,
              geschlecht,
              alter,
              aktuellesAlter: jahrgangNum ? new Date().getFullYear() - jahrgangNum : null,
              jahrgang,
              disziplin: d.nr,
              jahr,
              zeit,
              ortsgruppe,
              landesverband,
              datum: wettkampfDatum,
              wettkampf: wettkampfName,
              mehrkampfPlatzierung,
              einzelkampfPlatzierung,
            });
          }
        }
      }

      console.log("Excel geladen, Einträge:", datenbank.length);
      return datenbank;

    }


  