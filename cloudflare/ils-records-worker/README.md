# ILS Records Worker

Dieser Cloudflare Worker liest die aktuelle offizielle Weltrekorduebersicht von
`https://sport.ilsf.org/records`, normalisiert deren Tabellenzeilen und liefert sie als CORS-faehiges JSON aus.
Erfolgreiche Antworten werden fuer 12 Stunden im Browser und bei Cloudflare zwischengespeichert.
Fehlerantworten werden nicht gecacht.

## Cloudflare-Dashboard

Den vollstaendigen Inhalt von `src/index.js` in den bereits vorhandenen Worker `ils-records` kopieren und
veroeffentlichen. Danach muss `https://ils-records.jp-gnad.workers.dev/` ein JSON-Objekt mit `records` liefern.

## Wrangler

Alternativ im Verzeichnis dieses Workers:

```powershell
npm install
npm run deploy
```

Der Worker verwendet fuer die aufbereiteten Rekorde den Cloudflare Cache. Nach 12 Stunden wird beim
naechsten Aufruf wieder die offizielle ILS-Seite abgefragt. Der Upstream-Aufruf selbst bleibt auf
`no-store`, damit eine Cache-Aktualisierung stets die aktuelle ILS-Seite liest.
