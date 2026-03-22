# Architekturuebersicht

Diese Datei beschreibt den aktuellen Ist-Zustand der Anwendung. Sie soll schnellen Einstieg ermoeglichen und ist bewusst nah an der vorhandenen Struktur gehalten.

## Architektur in einem Satz

Die Anwendung ist eine statische Mehrseiten-Webseite ohne Build-Schritt, bei der jede HTML-Seite ihre Abhaengigkeiten manuell laedt und ihre UI ueber Vanilla-JavaScript in den DOM rendert.

## Technischer Stack

- HTML fuer Seitenshells
- CSS pro Seite bzw. Feature
- Vanilla-JavaScript ohne Bundler
- Clientseitiges Laden von Excel-Dateien via `xlsx.full.min.js`
- Teilweise externe Datenquellen ueber `fetch()`
- PWA-Metadaten ueber `web/site.webmanifest`

## Hauptschichten

### 1. HTML-Seitenshells

Die HTML-Dateien unter `web/*.html` definieren:

- Metadaten
- Stylesheet-Reihenfolge
- Script-Reihenfolge
- Platzhalter wie `#site-header`, `#content`, `#site-footer`

Die eigentliche Fach-UI wird erst durch JavaScript erzeugt.

### 2. Globale Basismodule

Fast alle Seiten nutzen dieselben Grundbausteine:

- `web/js/header.js`
  - Rendert die Hauptnavigation und spiegelt die reale Seitenhierarchie.
- `web/js/note.js`
  - Gemeinsame Footer-/Hinweislogik.
- `web/js/particles_snow.js`
  - Globaler optischer Effekt.

### 3. Shared-Infrastruktur

`web/js/shared/` ist aktuell der wichtigste Wiederverwendungsbereich:

- `excel_loader.js`
  - Laedt `xlsx.full.min.js` bei Bedarf.
  - Kapselt Excel-URLs.
  - Bietet Workbook-Cache pro Seitenaufruf.
- `document_library.js`
  - Gemeinsames Geruest fuer PDF-Bibliotheken wie Infoschreiben und Kaderrichtlinien.
  - Nutzt GitHub API und `localStorage`-Cache.
- `competition_page.js`
  - Gemeinsames Geruest fuer Wettbewerbsseiten mit Bildkarussell, optionalem Passwort-Gate und geschuetztem Inhaltsbereich.

### 4. Feature-Bereiche

- `web/js/startseite/`
  - Startseiteninhalt und Hero-/Carousel-Logik
- `web/js/athleten/`
  - Athleten-Suche, Top-10, Datenaufbereitung
- `web/js/profil/`
  - Profilkopf, Tabs, Charts, LSC-Berechnung
- `web/js/clubs/`
  - Club-Daten, Suche, Profilansicht, Top-10
- `web/js/punkterechner/`
  - Rechnerlogik, Controls, Verlaufstabelle, Chart, Athletenuebernahme
- `web/js/0_gadges/`
  - Aeltere, aber zentrale generische Engines fuer Tabellen, Passwort-Gate und Karussells

### 5. Inhalte und Assets

- `web/assets/png/`, `web/assets/svg/`, `web/assets/fonts/`, `web/assets/MP4/`
  - Visuelle Assets
- `content/Infoschreiben/`, `content/kaderkriterien/`
  - PDF-Dokumente ausserhalb des Web-Roots
- `web/data/`
  - Excel-Dateien und JSON-Daten

## Laufzeitmodell

Typischer Ablauf einer Seite:

1. HTML-Seite bindet Basisskripte und Feature-Skripte in fester Reihenfolge ein.
2. Shared- oder Feature-Module registrieren ihre API auf `window`.
3. Die Seiten-Bootstrap-Datei reagiert auf `DOMContentLoaded`.
4. Sie rendert UI in `#content`.
5. Danach werden Daten geladen und Unterkomponenten gemountet.

## Wichtige Architekturmerkmale

### Script-Reihenfolge ist semantisch wichtig

Da viele Module ueber `window.*` gekoppelt sind, ist die Reihenfolge der `<script>`-Tags Teil der Architektur. Ein Modul kann fehlschlagen, obwohl sein Code korrekt ist, wenn die HTML-Reihenfolge nicht mehr stimmt.

### Seiten sind Konfiguration plus Bootstrap

Einige neuere Bereiche sind bereits besser strukturiert:

- `info.js` und `kriterien.js` konfigurieren nur noch `DocumentLibraryPage`.
- `deutschlandpokal.js`, `bodenseepokal.js` und `juniorenrettungspokal.js` konfigurieren `CompetitionPage`.
- `startseite.js` ist auf einen kleinen Bootstrap reduziert.

### Excel ist zentrale Laufzeitabhaengigkeit

Ein grosser Teil der Fachlogik arbeitet direkt auf Excel-Daten:

- Athleten
- Profil
- Clubs
- Punkterechner
- Kaderstatus
- Wettbewerbs- und Pflichtzeiten-Tabellen

Damit ist das Datenschema in `Tabelle2` faktisch ein Kernbestandteil der Anwendungsarchitektur.

## Architektur-Hotspots

Diese Dateien sind aktuell besonders relevant und risikobehaftet:

- `web/js/profil/profil_tabs.js`
  - Sehr grosse Datei mit viel UI-, Daten- und Eventlogik in einem Modul.
- `web/js/profil/profil_lsc.js`
  - Fachlich komplexe LSC-Berechnung mit hoher Kopplung an Datenschema und Rekordwerte.
- `web/js/0_gadges/PZ_tabellen.js`
  - Generische Pflichtzeiten-Engine mit Excel-Parsing und Renderlogik.
- `web/js/0_gadges/Qualli_tabellen.js`
  - Aehnlich zentral fuer den Kaderstatus.
- `web/js/0_gadges/Punkte_tabellen.js`
  - Kern fuer Nominierungslisten auf Wettbewerbsseiten.

## Wiederkehrende Muster

### Positiv

- Kleine HTML-Shells
- Erste Shared-Abstraktionen in `web/js/shared/`
- Feature-Ordner fuer mehrere Kernbereiche

### Aktuell noch aufwendig fuer KI und Wartung

- Viele globale `window`-Abhaengigkeiten
- Doppelte Helper wie `h(...)` in mehreren Dateien
- Mehrfach definierte Spalten-Mappings fuer `Tabelle2`
- Gemischte Verantwortung innerhalb einzelner Grossdateien
- Uneinheitliche Benennung aelterer Dateien und Ordner

## Wo man fuer Aenderungen typischerweise startet

- Navigation oder globale Seitelemente: `web/js/header.js`, `web/js/note.js`
- Datenfluss ueber Excel: `web/js/shared/excel_loader.js`
- Athleten und Profil: `web/js/athleten/`, `web/js/profil/`
- Clubs: `web/js/clubs/`
- Punkterechner: `web/js/punkterechner/`
- Wettbewerbsseiten: `web/js/shared/competition_page.js` plus `web/js/0_gadges/`
- Dokumentbibliotheken: `web/js/shared/document_library.js`
