# Datenschema und Datenquellen

Diese Datei dokumentiert die wichtigsten Laufzeitdaten der Anwendung. Schwerpunkt ist der aktuelle Ist-Zustand, nicht ein Zielmodell.

## Uebersicht der Datenquellen

| Quelle | Pfad | Zweck | Hauptnutzer |
| --- | --- | --- | --- |
| Haupt-Workbook | `web/data/test (1).xlsx` | Wettkampf- und Athletendaten | Athleten, Profil, Clubs, Punkterechner, Kaderstatus, Wettbewerbsseiten |
| Rekord-/Konfig-Workbook | `web/data/records_kriterien.xlsx` | Rekorde, Referenzwerte, Konfigurationstabellen, Kaderkalender | Punkterechner, Profil-LSC, Kaderstatus, DP/BP/JRP/DEM, Landeskader |
| Legacy-Fallback | `web/data/top10.json` | Teilweise statische Athleten-Top-10 | `web/js/athleten/ath_top10.js` |
| Dokumentbibliothek | `content/Infoschreiben/` | PDF-Infoschreiben | `web/js/info.js` ueber `DocumentLibraryPage` |
| Dokumentbibliothek | `content/kaderkriterien/` | PDF-Kaderrichtlinien | `web/js/kriterien.js` ueber `DocumentLibraryPage` |

## Primare Faktentabelle: `Tabelle2`

Ein grosser Teil der Anwendung behandelt `Tabelle2` in `web/data/test (1).xlsx` als fachliche Single Source of Truth.

Die folgende Spaltenbelegung ist aus dem aktuellen Code abgeleitet, vor allem aus `web/js/profil.js`, `web/js/athleten/ath_data_smal.js`, `web/js/0_gadges/PZ_tabellen.js` und `web/js/0_gadges/Punkte_tabellen.js`.

| Index | Interner Name | Bedeutung |
| --- | --- | --- |
| 0 | `gender` | Geschlecht |
| 1 | `name` | Athletenname |
| 2 | `lsc` | LSC-Wert aus Excel |
| 3 | `z_100l` | Zeit 100m Lifesaver |
| 4 | `z_50r` | Zeit 50m Retten |
| 5 | `z_200s` | Zeit 200m Super-Lifesaver |
| 6 | `z_100k` | Zeit 100m Kombi |
| 7 | `z_100r` | Zeit 100m Retten |
| 8 | `z_200h` | Zeit 200m Hindernis |
| 9 | `excelDate` | Wettkampfdatum als Excel-Serienwert |
| 10 | `meet_name` | Wettkampfname |
| 11 | `yy2` | Jahrgang in zweistelliger Form |
| 12 | `ortsgruppe` | Ortsgruppe / Vereinseinheit |
| 13 | `LV_state` | Landesverband |
| 14 | `p_mehrkampf` | Platzierung Mehrkampf |
| 15 | `p_100l` | Platzierung 100m Lifesaver |
| 16 | `p_50r` | Platzierung 50m Retten |
| 17 | `p_200s` | Platzierung 200m Super-Lifesaver |
| 18 | `p_100k` | Platzierung 100m Kombi |
| 19 | `p_100r` | Platzierung 100m Retten |
| 20 | `p_200h` | Platzierung 200m Hindernis |
| 21 | `pool` | Beckenlaenge |
| 22 | `regelwerk` | Regelwerk national/international |
| 23 | `land` | Land |
| 24 | `startrecht` | Startrecht, z. B. `OG`, `LV`, `BV`, `BZ` |
| 25 | `wertung` | Wertungsart |
| 26 | `vorlaeufe` | Vorlaeufe / Kennzeichnung Vorlauf |
| 27 | `BV_natio` | Bundesverband / Nationalzuordnung |

## Was aus `Tabelle2` heute gebaut wird

### Athletenbereich

- Suchindex fuer Athleten
- Uebersichtsstatistiken
- Top-10-Listen
- Profilgrunddaten
- Wettkampfverlauf pro Athlet

### Profilbereich

- Athletenkopf
- Wettkampf- und Leistungsdaten
- LSC-Historie
- neu berechneter LSC inklusive Herleitung

### Clubsbereich

- Gruppierung nach Ortsgruppe, Landesverband und Bundesverband
- Clubsuche
- Club-Top-10
- Club-Detailansichten

### Punkterechner

- Athleten-Suche fuer automatische Uebernahme
- historische Ergebnisdaten fuer Verlaufstabelle und Chart
- Kombination mit Rekordwerten aus `records_kriterien.xlsx`

### Wettbewerbs- und Kaderseiten

- Pflichtzeitenlisten
- Nominierungslisten
- Qualifikationslisten

## Sekundaere Datenquelle: `records_kriterien.xlsx`

Dieses Workbook erfuellt mehrere Rollen gleichzeitig.

### 1. Rekord- und Referenzwerte

Wird unter anderem genutzt von:

- `web/js/punkterechner/punkterechner_data_collection.js`
- `web/js/profil/profil_lsc.js`

Relevante Sheets laut aktuellem Code:

- `DR`
- `WR-Open`
- `WR-Youth`
- `WR-Team-Open`
- `WR-Team-Youth`

### 2. Konfiguration fuer Wettbewerbs- und Kaderseiten

Wird unter anderem genutzt von:

- `web/js/bodenseepokal.js`
- `web/js/deutschlandpokal.js`
- `web/js/juniorenrettungspokal.js`
- `web/js/dem.js`
- `web/js/kaderstatus.js`

Relevante Konfigurationsbereiche laut aktuellem Code:

- Sheet `BP`, Tabelle `BP_konfig`
- Sheet `DP`, Tabelle `DP_konfig`
- Sheet `JRP`, Tabelle `JRP_konfig`
- Sheet `DEM`, Tabelle `DEM_konfig`
- Sheet `LK`, Tabelle `LK_konfig`

### 3. Kaderkalender

Wird genutzt von:

- `web/js/landeskader.js`

Relevantes Sheet:

- `LK Kalender`

## JSON-Quelle: `top10.json`

`web/data/top10.json` ist keine vollstaendige Single Source of Truth mehr. Aktuell gilt:

- Einige Athleten-Top-10 werden bereits live aus Excel-Daten berechnet.
- Andere Gruppen greifen noch auf `top10.json` zurueck.

Damit existiert fuer Top-10-Daten momentan ein Mischbetrieb aus Live-Berechnung und Legacy-JSON.

## Caching und Persistenz

### In-Memory

- `web/js/shared/excel_loader.js`
  - cached Workbooks pro Seitenaufruf in einer `Map`

### `localStorage`

- `web/js/shared/document_library.js`
  - cached die GitHub-Verzeichnislisten fuer PDF-Bibliotheken
- `web/js/punkterechner/punkterechner_controls.js`
  - speichert die aktuelle Sprache des Punkterechner-UI

## Wichtige Risiken beim Aendern der Daten

### Spaltenindizes sind mehrfach dupliziert

Die Mappings fuer `Tabelle2` sind aktuell auf mehrere Module verteilt, z. B.:

- `web/js/profil.js`
- `web/js/athleten/ath_data_smal.js`
- `web/js/clubs/clubs_data.js`
- `web/js/clubs/clubs_top10.js`
- `web/js/punkterechner/punkterechner_athlete_search.js`
- `web/js/0_gadges/PZ_tabellen.js`
- `web/js/0_gadges/Punkte_tabellen.js`

Eine Schemaaenderung an `Tabelle2` ist deshalb fast nie lokal.

### Dateinamen sind Teil der Laufzeitkonfiguration

Vor allem `web/data/test (1).xlsx` ist in mehreren Stellen hart verdrahtet. Ein blosses Umbenennen der Datei wuerde den Laufzeitcode brechen, solange die URLs nicht zentralisiert bzw. mitgezogen werden.

### Excel-Struktur ist Teil der Fachlogik

Nicht nur Inhalte, sondern auch:

- Sheetnamen
- Tabellen-/Named-Range-Namen
- Spaltenpositionen

sind aktuell Teil des Codes.

## Empfehlung fuer spaetere Strukturverbesserung

Falls das Datenschema spaeter robuster werden soll, sind diese Schritte am wertvollsten:

1. Ein zentrales `schema.js` oder `data-schema.js` fuer alle Spaltenmappings.
2. Sprechendere Dateinamen fuer Excel-Dateien.
3. Trennung zwischen Rohdaten, Konfiguration und abgeleiteten JSON-Artefakten.
4. Optional ein kleiner Build-Schritt fuer validierte, KI-freundliche JSON-Ausgaben.
