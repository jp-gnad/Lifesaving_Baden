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

### 3. Quick Fixes

- Der Fehler mit der undefinierten Variable `exts` in `web/js/profil.js` wurde behoben.
- In `web/js/profil/profil_head.js` wurde der Fallback-Dateiname `Cap-BA.svg` korrigiert.
- Mehrere HTML-Dateien verwenden jetzt eine echte Manifest-Datei unter `web/site.webmanifest`.
- Mehrere Seitentitel wurden korrigiert, damit Browser-Tab und PWA-Metadaten zur jeweiligen Seite passen.

### 4. Datenhaltung

- Die Daten werden weiterhin direkt aus der Excel-Datei gelesen.
- Es wurde bewusst keine JSON-Konvertierung beibehalten.
- Alle dafuer angelegten Build- und JSON-Artefakte wurden wieder entfernt.

### 5. Offener Folgepunkt

- `trainingsplaene.html` ist aktuell bewusst nur eine saubere Zwischenloesung. Die Seite ist verlinkt und erreichbar, enthaelt aber noch keine echten Trainingsinhalte.
