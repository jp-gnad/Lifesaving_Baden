# Lifesaving Baden

Dieses Repository enthaelt die Quellbasis fuer eine statische Mehrseiten-Webseite rund um den Rettungssport in Baden. Der deploybare Web-Root liegt im Ordner `web/`; der Rest des Repos enthaelt Daten, Dokumente, Skripte und Arbeitsnotizen.

## Wichtiger Hinweis

Dieses Projekt, die Internetseite sowie die zugrunde liegenden Daten, Auswertungen und Strukturen sind ein rein privates Vorhaben.

Es besteht keine direkte organisatorische, redaktionelle oder offizielle Verbindung zum DLRG Landesverband Baden e. V. oder zu anderen Gliederungen der DLRG, sofern dies nicht ausdruecklich separat kenntlich gemacht ist.

Die README ist als schneller Einstieg fuer Menschen und KI gedacht. Sie beantwortet drei Fragen:

1. Wo liegt der eigentliche Webcode?
2. Welche Dateien sind die wichtigsten Einstiegspunkte?
3. Wie ist das Repo grob aufgebaut?

## Schnellstart

- Der Web-Root ist `web/`.
- `web/index.html` leitet direkt auf `web/startseite.html` weiter.
- Es gibt aktuell keinen Build-Prozess, keinen Bundler und kein `package.json`.
- Die Seite basiert auf statischem HTML, CSS und Vanilla-JavaScript.
- Viele Features laden ihre Daten clientseitig aus Excel-Dateien und externen URLs.
- Bei lokalem Arbeiten moeglichst nicht per `file://` oeffnen, weil Browser Excel-/JSON-Fetches aus Sicherheitsgruenden blockieren koennen.
- Stattdessen lokal per HTTP starten, z. B. mit `powershell -ExecutionPolicy Bypass -File .\scripts\start_local_server.ps1`, und dann `http://localhost:8000/...` aufrufen.

## Wichtigste Einstiegspunkte

- Globale Seitenelemente: `web/js/header.js`, `web/js/note.js`, `web/js/particles_snow.js`
- Gemeinsame Infrastruktur: `web/js/shared/excel_loader.js`, `web/js/shared/document_library.js`, `web/js/shared/competition_page.js`
- Hauptfeatures:
  - Startseite: `web/startseite.html`, `web/js/startseite.js`, `web/js/startseite/`
  - Athleten: `web/athleten.html`, `web/js/athleten.js`, `web/js/athleten/`
  - Profil: `web/profil.html`, `web/js/profil.js`, `web/js/profil/`
  - Clubs: `web/clubs.html`, `web/js/clubs.js`, `web/js/clubs/`
  - Punkterechner: `web/punkterechner.html`, `web/js/punkterechner.js`, `web/js/punkterechner/`

## Repo-Struktur

```text
.
|-- README.md
|-- content/
|-- docs/
|-- scripts/
|-- web/
|   |-- *.html
|   |-- assets/
|   |-- css/
|   |-- data/
|   |-- js/
|   `-- site.webmanifest
`-- tmp_chrome_profile/
```

## Arbeitsmodell im Repo

- Jede HTML-Seite bindet ihre CSS- und JS-Dateien manuell per `<link>` und `<script>` ein.
- Viele JS-Dateien registrieren ihre API explizit auf `window`.
- Seiten-Bootstrap-Dateien rendern den Inhalt zur Laufzeit in `#content`.
- Viele Seiten laden gemeinsame Inhalte und strukturierte Daten clientseitig zur Laufzeit.
- Es gibt bereits erste gemeinsame Basismodule, aber weiterhin einige grosse und stark gekoppelte Dateien.

## Empfohlene Lese-Reihenfolge

1. `README.md`
2. `docs/architecture.md`
3. `docs/page-map.md`
4. `docs/aenderungen-2026-03-19.md`

## Dokumentationspflege

Diese Dokumentation soll bei strukturellen Aenderungen bewusst mitgepflegt werden.

- `README.md` aktualisieren bei neuen Hauptbereichen, groesseren Umstrukturierungen oder geaenderten Einstiegspunkten.
- `docs/page-map.md` aktualisieren bei neuen HTML-Seiten, entfernten Seiten oder veraenderter Script-Zuordnung.
- `docs/architecture.md` aktualisieren bei neuen Shared-Modulen, geaenderten Datenfluessen oder groesseren Architekturentscheidungen.
- Kleine Text-, CSS- oder Bugfix-Aenderungen ohne Strukturwirkung muessen die Doku in der Regel nicht anpassen.

Arbeitsregel fuer dieses Repository:

Bei jeder strukturellen Aenderung sollen die betroffenen Doku-Dateien im selben Arbeitsschritt mit aktualisiert werden.

## Fuer KI besonders wichtig

- Der deploybare Code liegt fast komplett unter `web/`.
- `web/js/shared/excel_loader.js` ist der wichtigste Einstieg fuer Excel-basierte Datenfluesse.
- `web/js/header.js` definiert die reale Hauptnavigation der Seite.
- `web/js/profil/profil_tabs.js`, `web/js/0_gadges/PZ_tabellen.js` und `web/js/profil/profil_lsc.js` sind derzeit Hotspots mit hoher Komplexitaet.
- Script-Reihenfolge in den HTML-Dateien ist relevant, weil viele Module ueber `window.*` gekoppelt sind.
- Inhalte, Laufzeitdaten und Medien sind strukturell getrennt abgelegt.
- Beim Einstieg ignorieren:
  - `tmp_chrome_profile/` ist kein Quellcode.
  - `web/js/clubs/Textdokument (neu).txt`
  - `web/js/profil/Textdokument (neu).txt`
  - `web/css/athleten/Textdokument (neu).txt`

## Weitere Dokumente

- Architekturuebersicht: [docs/architecture.md](docs/architecture.md)
- Seitenkarte: [docs/page-map.md](docs/page-map.md)
- Letzte groessere Aenderungen: [docs/aenderungen-2026-03-19.md](docs/aenderungen-2026-03-19.md)
