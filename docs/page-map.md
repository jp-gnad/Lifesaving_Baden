# Seitenkarte

Diese Datei ordnet jede HTML-Seite ihrem fachlichen Zweck, ihren Hauptskripten und ihren wichtigsten Datenabhaengigkeiten zu.

## Globale Hinweise

- Fast alle Seiten laden `web/js/header.js`, `web/js/note.js` und `web/js/particles_snow.js`.
- `web/index.html` ist nur ein Redirect auf `web/startseite.html`.
- Der relevante Code pro Seite liegt meist in der zuletzt geladenen seitenspezifischen JS-Datei.

## Hauptnavigation

| Seite | Zweck | Hauptskripte | Daten/Abhaengigkeiten | Hinweise |
| --- | --- | --- | --- | --- |
| `web/index.html` | Redirect auf die Startseite | Inline-Redirect | keine | Kein eigener Fachcode |
| `web/startseite.html` | Startseite mit Hero-Carousel und Einstiegskarten | `web/js/startseite.js`, `web/js/startseite/startseite_content.js`, `web/js/startseite/startseite_carousel.js` | statische Inhalte, MP4 aus GitHub Raw | `web/js/header.js` zeigt die reale Navigation |
| `web/punkterechner.html` | Punkterechner mit Historie, Chart und Athletenuebernahme | `web/js/punkterechner.js`, `web/js/punkterechner/` | `Chart.js`, `ExcelLoader`, `Tabelle2`, `records_kriterien.xlsx` | zentraler datengetriebener Bereich |
| `web/wettkaempfe.html` | Landing-Page fuer Wettbewerbe | `web/js/wettkaempfe.js` | statische Karten + Bildrotation | verweist auf DP, BP, JRP und DEM |
| `web/clubs.html` | Clubs-Overview mit Suche und Top-10 | `web/js/clubs.js`, `web/js/clubs/clubs_data.js`, `web/js/clubs/clubs_search.js`, `web/js/clubs/clubs_top10.js` | `ExcelLoader`, `Tabelle2` | nutzt eigene Datenaufbereitung fuer Gliederungen |
| `web/athleten.html` | Athletensuche, Statistiken und Top-10 | `web/js/athleten.js`, `web/js/athleten/ath_data_smal.js`, `web/js/athleten/ath_search.js`, `web/js/athleten/ath_top10.js` | `ExcelLoader`, `Tabelle2`, teilweise `top10.json` | nutzt bereits `profil_lsc.js` fuer Live-Top-10 |
| `web/landeskader.html` | Uebersicht zum Landeskader mit Termin-Karussell | `web/js/landeskader.js`, `web/js/0_gadges/info_karussel.js` | `records_kriterien.xlsx`, Sheet `LK Kalender` | liest Termine direkt aus Excel |

## Unterseiten aus der Hauptnavigation

| Seite | Zweck | Hauptskripte | Daten/Abhaengigkeiten | Hinweise |
| --- | --- | --- | --- | --- |
| `web/profil.html` | Detailprofil eines Athleten | `web/js/profil.js`, `web/js/profil/profil_head.js`, `web/js/profil/profil_tabs.js`, `web/js/profil/profil_lsc.js`, `web/js/profil/profil_tabs_charts.js`, `web/js/profil/profil_note.js` | `ExcelLoader`, `Tabelle2`, `records_kriterien.xlsx` | einer der komplexesten Bereiche |
| `web/clubs_profil.html` | Detailansicht einer Gliederung | `web/js/clubs/clubs_profil.js`, `web/js/clubs/clubs_data.js`, `web/js/clubs/clubs_search.js` | `ExcelLoader`, `Tabelle2` | eigene Zielseite fuer OG/LV/BV |
| `web/kaderstatus.html` | Passwort-geschuetzte Live-Kaderqualifikationen | `web/js/kaderstatus.js`, `web/js/0_gadges/PW.js`, `web/js/0_gadges/Qualli_tabellen.js` | `Tabelle2`, `records_kriterien.xlsx` | Kadernormen, keine Platzierungen |
| `web/kriterien.html` | Bibliothek fuer Kaderrichtlinien | `web/js/shared/document_library.js`, `web/js/kriterien.js` | GitHub API auf `content/kaderkriterien/`, `localStorage` Cache | relativ sauber abstrahiert |
| `web/trainingsplaene.html` | Platzhalterseite fuer Trainingsinhalte | `web/js/trainingsplaene.js` | keine | aktuell Zwischenloesung |

## Wettbewerbsseiten

| Seite | Zweck | Hauptskripte | Daten/Abhaengigkeiten | Hinweise |
| --- | --- | --- | --- | --- |
| `web/deutschlandpokal.html` | Wettbewerbseite mit Historienkarussell und Nominierungsliste | `web/js/shared/competition_page.js`, `web/js/0_gadges/PW.js`, `web/js/0_gadges/picture_karussel.js`, `web/js/0_gadges/Punkte_tabellen.js`, `web/js/deutschlandpokal.js` | `Tabelle2`, `records_kriterien.xlsx`, Bilder aus `web/assets/png/DP-Team/` | Passwort-Gate aktuell deaktiviert |
| `web/bodenseepokal.html` | Wettbewerbseite mit Historienkarussell und Nominierungsliste | `web/js/shared/competition_page.js`, `web/js/0_gadges/PW.js`, `web/js/0_gadges/picture_karussel.js`, `web/js/0_gadges/Punkte_tabellen.js`, `web/js/bodenseepokal.js` | `Tabelle2`, `records_kriterien.xlsx`, Bilder aus `web/assets/png/BP-Team/` | Passwort-Gate aktiv |
| `web/juniorenrettungspokal.html` | Wettbewerbseite mit Historienkarussell und Pflichtzeiten | `web/js/shared/competition_page.js`, `web/js/0_gadges/PW.js`, `web/js/0_gadges/picture_karussel.js`, `web/js/0_gadges/PZ_tabellen.js`, `web/js/juniorenrettungspokal.js` | `Tabelle2`, `records_kriterien.xlsx`, Bilder aus `web/assets/png/JRP-Team/` | nutzt Pflichtzeiten-Engine statt Punkte-Engine |
| `web/dem.html` | Uebersicht aller erreichten DEM-Pflichtzeiten | `web/js/dem.js`, `web/js/0_gadges/PZ_tabellen.js` | `Tabelle2`, `records_kriterien.xlsx` | einfache Seite, aber fachlich wichtig |

## Dokumente, Info und einfache Seiten

| Seite | Zweck | Hauptskripte | Daten/Abhaengigkeiten | Hinweise |
| --- | --- | --- | --- | --- |
| `web/info.html` | Bibliothek fuer Infoschreiben | `web/js/shared/document_library.js`, `web/js/info.js` | GitHub API auf `content/Infoschreiben/`, `localStorage` Cache | strukturell analog zu `kriterien.html` |
| `web/kalender.html` | Kalender-Platzhalter | `web/js/kalender.js` | keine | aktuell nur Dummy-Inhalt |
| `web/datenschutz.html` | Datenschutzseite | `web/js/datenschutz.js` | keine | eher statischer Inhalt |
| `web/impressum.html` | Impressumsseite | `web/js/impressum.js` | keine | eher statischer Inhalt |

## Seitengruppen nach Codefamilien

### Shared-Page-Muster

- `DocumentLibraryPage`
  - `web/info.html`
  - `web/kriterien.html`

- `CompetitionPage`
  - `web/deutschlandpokal.html`
  - `web/bodenseepokal.html`
  - `web/juniorenrettungspokal.html`

### Excel-getriebene Hauptbereiche

- `web/athleten.html`
- `web/profil.html`
- `web/clubs.html`
- `web/clubs_profil.html`
- `web/punkterechner.html`
- `web/kaderstatus.html`
- `web/landeskader.html`
- `web/dem.html`
- Wettbewerbsseiten mit Nominierungs-/Pflichtzeitentabellen

## Fuer KI: sinnvollste Einstiegspunkte nach Fragestellung

- "Welche Seite macht was?" -> `web/js/header.js` und diese Datei
- "Wo wird Inhalt gerendert?" -> jeweilige Bootstrap-Datei wie `web/js/athleten.js`
- "Woher kommen die Daten?" -> `web/js/shared/excel_loader.js` und `docs/data-schema.md`
- "Welche Seiten nutzen dieselbe Basis?" -> `web/js/shared/document_library.js` und `web/js/shared/competition_page.js`
