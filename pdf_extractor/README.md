# PDF Extractor Scaffold

Dieses Teilprojekt liefert eine belastbare Grundlage fuer einen spaeteren PDF-Daten-Extractor fuer Wettkampfprotokolle aus Schwimmen und Rettungssport. Die aktuelle Version ist bewusst noch kein produktiver Endparser fuer konkrete PDFs, sondern eine erweiterbare Pipeline mit klaren Schnittstellen, Logging, Review-Ausgabe und Platzhalterparsern.

## Architektur in Kurzform

Der Workflow ist bewusst schichtenartig aufgebaut:

1. `loader.py`
   - findet einzelne PDFs oder ganze Ordner
   - liest Dokumente seitenweise ein
   - sammelt Basisinformationen wie Text, Seitenrotation und Bildanteil
   - versucht bei textbasierten Tabellen-PDFs zuerst layout-erhaltende Textextraktion, damit Spaltenzeilen parserfreundlich bleiben
2. `classifier.py`
   - erkennt pro Seite grob `text`, `image`, `mixed` oder `empty`
   - leitet aus Schluesselbegriffen einen vorlaeufigen Dokumenttyp ab
3. `preprocess.py`
   - korrigiert bekannte Seitenrotationen
   - bereitet OCR-Bilder vor
   - sieht optional Deskew vor
4. `ocr.py`
   - kapselt den OCR-Fallback ueber Tesseract
   - faellt kontrolliert aus, wenn OCR lokal noch nicht installiert ist
5. `parsers/`
   - enthaelt die Parser-Schnittstelle und austauschbare Parserklassen
   - enthaelt jetzt einen konkreten Parser fuer textbasierte `JAuswertung`-Ergebnislisten im Rettungssport
   - faellt fuer unbekannte Formate weiterhin auf generische Platzhalterlogik zurueck
6. `normalize.py`
   - vereinheitlicht vorlaeufige Werte wie Datum, Zeit und DQ-Status
7. `exporters.py`
   - schreibt pro PDF-Protokoll eine strukturierte Excel-Datei (`.xlsx`)
   - kann optional JSON als Zwischenformat ablegen
   - erzeugt ein separates Review-CSV fuer unsichere Stellen
8. `workflow.py`
   - orchestriert den Gesamtprozess und haelt die Module lose gekoppelt

## Vorgeschlagene Projektstruktur

```text
pdf_extractor/
├── .gitignore
├── README.md
├── requirements.txt
├── output/
│   └── .gitkeep
├── sample_data/
│   └── .gitkeep
├── src/
│   ├── main.py
│   └── lifesaving_pdf_extractor/
│       ├── __init__.py
│       ├── classifier.py
│       ├── config.py
│       ├── exporters.py
│       ├── loader.py
│       ├── logging_setup.py
│       ├── models.py
│       ├── normalize.py
│       ├── ocr.py
│       ├── preprocess.py
│       ├── tables.py
│       ├── workflow.py
│       └── parsers/
│           ├── __init__.py
│           ├── base_parser.py
│           ├── generic_parser.py
│           ├── lifesaving_parser.py
│           ├── registry.py
│           └── swim_parser.py
└── tests/
    ├── __init__.py
    ├── test_classifier.py
    ├── test_exporters.py
    └── test_normalize.py
```

## Aktueller Ablauf

```text
PDF-Datei / Ordner
    -> Loader
    -> Seitenklassifikation
    -> Vorverarbeitung / Rotation / OCR-Fallback
    -> Parser-Registry
    -> Parser
    -> Normalisierung
    -> Excel je Protokoll / JSON / Review-Datei
```

## Vorlaeufige Annahmen

- Die Exportfelder sind absichtlich nur vorlaeufig.
- Die Klassifikation arbeitet derzeit nur mit groben Schluesselbegriffen, nicht mit finalen Layoutregeln.
- OCR ist als Fallback vorgesehen, setzt lokal aber eine Tesseract-Installation voraus.
- Deskew ist vorbereitet, aber optional und erst mit echten Scan-Beispielen sinnvoll feinzujustieren.
- Tabellenextraktion ist architektonisch vorbereitet, aber noch nicht konkret implementiert, weil die echten Tabellenlayouts noch fehlen.

## Erste Nutzung

1. Abhaengigkeiten installieren:

```bash
pip install -r requirements.txt
```

2. Beispielaufruf fuer einen Ordner mit PDFs:

```bash
python src/main.py sample_data --output-dir output --json
```

3. Beispielaufruf fuer eine einzelne Datei:

```bash
python src/main.py sample_data\beispiel.pdf --output-dir output --force-ocr
```

Wenn die eingebaute Textschicht eines PDFs schlecht ist, kann stattdessen OCR-only sinnvoller sein:

```bash
python src/main.py sample_data\beispiel.pdf --output-dir output --ocr-only
```

Die Excel-Ausgabe wird pro Quelldatei mit dem jeweiligen PDF-Dateinamen erzeugt. Zusaetzlich entstehen weiterhin `review_needed.csv` und optional `extracted_records.json`.

## Einfacher Start unter Windows

Wenn du den Extractor ohne Kommandozeile starten willst, kannst du im Ordner `pdf_extractor/` einfach:

- einmalig `setup_windows.bat` ausfuehren, um Python-Abhaengigkeiten zu installieren
- `start_scraper.bat` doppelklicken, oder
- `start_scraper.py` ausfuehren.

Wenn kein `input_path` uebergeben wird, oeffnet sich automatisch ein Dateiauswahldialog fuer ein PDF-Protokoll. Nach der Auswahl startet die Verarbeitung direkt, und die Ausgabe landet im Ordner `output/`.

Der Starter `start_scraper.py` verwendet inzwischen standardmaessig `--force-ocr`, solange du nicht explizit `--force-ocr`, `--disable-ocr` oder `--ocr-only` selbst uebergibst. Dadurch werden eingebetteter PDF-Text und OCR-Ergebnis zusammengefuehrt. Fuer besonders schlechte Textschichten kannst du weiterhin bewusst `--ocr-only` nutzen.

Unter Windows versucht der OCR-Service ausserdem automatisch die Standardinstallation unter `C:\Program Files\Tesseract-OCR\tesseract.exe` zu finden, auch wenn der Pfad noch nicht global gesetzt wurde.

## Welche Teile spaeter mit echten PDFs ergaenzt werden muessen

- `classifier.py`
  - bessere Dokumenttyp-Erkennung ueber echte Layoutmerkmale und Schluesselwoerter
- `preprocess.py`
  - echte Deskew-/Orientierungsstrategien passend zu realen Scans
- `parsers/*.py`
  - weitere konkrete Regeln pro Protokolltyp
  - spaetere Zeilen- oder Tabellenparser fuer Ergebnislisten
- `normalize.py`
  - Feldlogik verfeinern, sobald die finalen Excel-/Exportspalten feststehen
- `tests/`
  - Regressionstests mit echten anonymisierten Beispiel-PDFs

## Bereits konkret unterstuetzt

- Textbasierte `JAuswertung`-PDFs mit LMS-aehnlichem Aufbau:
  - Kopf mit `Ergebnisse - AK ...`
  - Ergebniszeilen mit `Pl / Name / Gliederung / Q-Gld / Jg / Punkte / Diff`
  - Disziplinreferenzen im Fussbereich ueber `Disziplin N`
- Textbasierte `JAuswertung`-Protokolle mit Masters-/Seniorenlayout:
  - Ergebniszeilen mit `Pl / Name / Gliederung / LV / Jg / Punkte / Diff`
  - variierende Disziplinbloecke je Altersklasse
  - zusaetzliche Statusseiten fuer `Nicht angetreten` und `Strafenliste`
- Einzelstrecken-Protokolle mit disziplinweisen Tabellen:
  - eigene Tabellen pro Disziplin und Runde wie `Vorlauf`, `Finale`, `A-Finale`
  - Export je Athlet/in und Runde
  - Mannschaftsdisziplinen wie `4x...` sowie `Line Throw` werden aktuell bewusst ignoriert

## Wie echte Beispiel-PDFs spaeter eingebunden werden sollen

Empfohlener Ausbaupfad:

1. PDFs nach `sample_data/raw/` legen und nach Typen sortieren, zum Beispiel `sample_data/raw/swim/` und `sample_data/raw/lifesaving/`.
2. Fuer jeden Protokolltyp 2 bis 5 repraesentative Beispiele sammeln:
   - textbasiert
   - gescannt
   - gedreht
   - unterschiedliche Layoutvarianten
3. Pro Typ einen Parser in `parsers/` verfeinern oder neue Parserklassen ergaenzen.
4. Pro neuem Format mindestens einen Regressionstest aufbauen.
5. Review-Datei nach jedem Lauf auswerten und Unsicherheitsregeln iterativ reduzieren.

## Hinweise zur OCR

- Python-Paket `pytesseract` allein reicht nicht; lokal muss zusaetzlich die Tesseract-Binary installiert sein.
- Fuer saubere OCR-Ergebnisse bei stark schiefen Scans ist spaeter wahrscheinlich OpenCV-gestuetztes Deskewing sinnvoll.
- Wenn ein PDF hauptsaechlich aus Bildseiten besteht und Tesseract fehlt, erzeugt der Extractor bewusst keine inhaltsarme Excel-Datei mehr, sondern nur einen klaren Review-Hinweis.
