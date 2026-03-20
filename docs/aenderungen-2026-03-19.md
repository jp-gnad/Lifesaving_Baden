## Aenderungen vom 2026-03-19

Diese Anpassungen wurden direkt im Projekt umgesetzt.

### 1. Einstieg und Navigation

- `web/index.html` leitet jetzt direkt auf `startseite.html` weiter, damit der Web-Root nicht leer bleibt.
- Der Header-Link `Trainingsplaene` zeigt nicht mehr auf `#`, sondern auf `trainingsplaene.html`.
- Die Landeskader-Kachel zeigt ebenfalls auf `trainingsplaene.html`.
- Fuer `trainingsplaene.html` wurde eine kleine Platzhalterseite angelegt, damit kein toter Link mehr vorhanden ist.

### 2. Gemeinsame Helfer

- Die Logik fuer `info.js` und `kriterien.js` wurde in `web/js/shared/document_library.js` gebuendelt.
- Die gemeinsame Struktur fuer `deutschlandpokal.js`, `bodenseepokal.js` und `juniorenrettungspokal.js` wurde in `web/js/shared/competition_page.js` gebuendelt.
- Die Seitendateien selbst enthalten jetzt nur noch ihre jeweilige Konfiguration und fachliche Besonderheiten.

### 3. Aufteilung grosser JS-Dateien

- `web/js/profil/profil_tabs.js` wurde entlastet. Die Chart-Logik liegt jetzt in `web/js/profil/profil_tabs_charts.js`.
- `web/profil.html` bindet die neue Chart-Datei explizit ein.
- `web/js/startseite.js` wurde in einen kleinen Bootstrap reduziert.
- Die Startseiten-Inhalte liegen jetzt in `web/js/startseite/startseite_content.js`.
- Die Carousel-Logik liegt jetzt in `web/js/startseite/startseite_carousel.js`.
- Beim Split der Startseite wurde ausserdem der fehlende Helfer `startAuto()` im Carousel sauber ersetzt.

### 4. Quick Fixes

- Der Fehler mit der undefinierten Variable `exts` in `web/js/profil.js` wurde behoben.
- In `web/js/profil/profil_head.js` wurde der Fallback-Dateiname `Cap-BA.svg` korrigiert.
- Mehrere HTML-Dateien verwenden jetzt eine echte Manifest-Datei unter `web/site.webmanifest`.
- Mehrere Seitentitel wurden korrigiert, damit Browser-Tab und PWA-Metadaten zur jeweiligen Seite passen.

### 5. Datenhaltung

- Die Daten werden weiterhin direkt aus der Excel-Datei gelesen.
- Es wurde bewusst keine JSON-Konvertierung beibehalten.
- Alle dafuer angelegten Build- und JSON-Artefakte wurden wieder entfernt.

### 6. Offener Folgepunkt

- `trainingsplaene.html` ist aktuell bewusst nur eine saubere Zwischenloesung. Die Seite ist verlinkt und erreichbar, enthaelt aber noch keine echten Trainingsinhalte.

### 7. Clubs neu aufgebaut

- `web/js/clubs.js` wurde auf einen sauberen Seiten-Bootstrap für den Bereich `Clubs` mit Übersicht und Such-Mount umgestellt.
- Die Datenlogik für die Clubs-Seite liegt jetzt in `web/js/clubs/clubs_data.js`.
- Die Suchoberfläche für Clubs liegt jetzt in `web/js/clubs/clubs_search.js` und orientiert sich grafisch am Athletenbereich.
- Für geöffnete Gliederungen gibt es jetzt eine eigene Zielseite `web/clubs_profil.html` mit dem Bootstrap `web/js/clubs/clubs_profil.js`.
- Die erste Clubs-Top-10 liegt in `web/js/clubs/clubs_top10.js` und nutzt bewusst die Athleten-Top-10-Optik.
- Für die Auswertung `Ortsgruppen mit den meisten Wettkämpfen` werden in `Tabelle2` der Excel-Datei Wettkampfname (`Spalte 10`), Wettkampfdaten (`Spalte 9`) und Ortsgruppe (`Spalte 12`) gelesen.
- Pro Ortsgruppe wird ein Wettkampf nur einmal gezählt, auch wenn mehrere Sportler derselben Ortsgruppe dort gestartet sind. Ettlingen und Wettersbach werden dabei gemeinsam als `Ettlingen/Wettersbach` behandelt.
- Zusätzlich gibt es jetzt die Clubs-Top-10 `Anzahl an Sportlern`: Eine Person wird pro Ortsgruppe genau einmal gezählt, auch wenn sie mehrfach für dieselbe Ortsgruppe gestartet ist.
- Ergänzt wurden außerdem die Clubs-Top-10 `Wettkämpfe im Ausland` und `Wettkämpfe auf 50m-Bahn`, beide wieder als eindeutige Wettkämpfe pro Ortsgruppe gezählt.
- Ergänzt wurde außerdem die Clubs-Top-10 `Startrecht Bundesverband`: Gezählt wird pro Ortsgruppe die eindeutige Kombination aus `Sportler-ID + Wettkampf`, sobald `Startrecht = BV` ist. Mehrere Zeilen derselben Person beim selben Wettkampf zählen dabei nur einmal.
- Ergänzt wurde außerdem die Clubs-Top-10 `Ø Wettkämpfe pro Sportler`: Pro Person wird gezählt, auf wie vielen eindeutigen Wettkämpfen sie für eine Ortsgruppe gestartet ist; diese Werte werden pro Ortsgruppe gemittelt. Starts für mehrere Ortsgruppen werden jeweils getrennt gewertet, Ettlingen und Wettersbach aber gemeinsam als `Ettlingen/Wettersbach`. Berücksichtigt werden nur Ortsgruppen mit mindestens 10 Sportlern.
- Unterstuetzt werden aktuell Ortsgruppen, Landesverbaende und Bundesverbaende. Bezirke bleiben vorerst bewusst unberuecksichtigt.

### 8. Punkterechner erweitert

- Die Verlaufstabelle `pr-past-table` wurde etwas groesser gesetzt, damit Jahreswerte und Punktsummen leichter lesbar sind.
- Die Reihenfolge im Punkterechner ist jetzt `discipline-table`, danach der Chart und danach `pr-past-table`.
- Neu hinzugekommen ist `web/js/punkterechner/punkterechner_chart.js`. Das Modul setzt zwischen Verlaufstabelle und Eingabetabelle einen Chart-Block.
- Der Chart visualisiert dieselben Jahresdaten wie `pr-past-table`, allerdings als einzelne Disziplinlinien statt als Summen.
- Die X-Achse zeigt die Jahre, die Y-Achse nutzt eine nichtlineare Skala mit den Stufen `0, 200, 400, 500, 600, 700, 800, 900, 1000, 1100`.
- Im Punkterechner ist jetzt zusaetzlich die Athleten-Suche im Stil der Athletenseite eingebunden. Eine Auswahl uebernimmt Bestzeiten direkt in den Rechner, setzt Geschlecht und passt die Altersklasse aus dem Jahrgang automatisch an. Fuer juengere Athleten werden passende Zeiten jetzt nicht mehr pauschal blockiert, sondern soweit moeglich disziplinspezifisch teilweise uebernommen.
- Bereits eingetragene Zeiten bleiben im Punkterechner jetzt auch beim Wechsel von Altersklasse, Geschlecht, Disziplinmodus oder Rekordwerten erhalten, soweit die Disziplin fachlich weiter zuordenbar ist.
- Im Punkterechner gibt es jetzt zusaetzlich die Auswahl `Wertung`. Standardmaessig ist `3-Kampf` aktiv. Die Footer-Summe in der Eingabetabelle und die Summenspalte der Verlaufstabelle folgen beide dieser Auswahl.

### 9. Excel-Anbindung zentralisiert

- Mit `web/js/shared/excel_loader.js` gibt es jetzt einen gemeinsamen Loader fuer Excel-Dateien, inklusive zentraler URL-Konfiguration, gemeinsamem XLSX-Laden und Workbook-Cache pro Seitenaufruf.
- Die Hauptbereiche `Athleten`, `Profil`, `Clubs` und die Rekordwert-Excel im `Punkterechner` verwenden jetzt diese gemeinsame Schicht statt eigener Workbook- und Fetch-Logik.
- Die Daten bleiben weiterhin direkt Excel-basiert; es wurden bewusst keine JSON-Zwischenschritte, kein `localStorage` und kein `sessionStorage` eingefuehrt.
