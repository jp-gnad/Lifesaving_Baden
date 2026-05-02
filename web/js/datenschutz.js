document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  const asOf = new Date().toLocaleDateString("de-DE");

  main.innerHTML = `
    <article class="privacy">
      <h1>Datenschutzerklaerung</h1>
      <p class="hint">
        Diese Seite informiert gemaess Art. 13 und 14 DSGVO ueber die Verarbeitung personenbezogener Daten
        beim Aufruf und bei der Nutzung dieser Website.
      </p>

      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          <strong>Name:</strong> <span class="placeholder">Jan-Philipp Gnad</span><br>
          <strong>Adresse:</strong> <span class="placeholder">Am Zollstock 36, 76228 Karlsruhe</span><br>
          <strong>E-Mail:</strong> <span class="placeholder">jp.gnad@web.de</span><br>
          <strong>Telefon:</strong> <span class="placeholder">+49 (0)1575 4047493</span>
        </p>
      </section>

      <section>
        <h2>2. Allgemeine Hinweise zur Nutzung</h2>
        <p>
          Diese Website ist ein statisches Webangebot. Es gibt derzeit keine Registrierung, keinen geschlossenen Nutzerbereich,
          keine Kommentarfunktion und keinen Newsletter. Personenbezogene Daten werden insbesondere bei der technischen
          Auslieferung der Website, bei dem Abruf externer Ressourcen, bei der Anzeige oeffentlich zugaenglicher Sportdaten
          sowie bei einer Kontaktaufnahme per E-Mail verarbeitet.
        </p>
      </section>

      <section>
        <h2>3. Hosting ueber GitHub Pages</h2>
        <p>
          Diese Website wird ueber GitHub Pages bereitgestellt. Anbieter ist GitHub, Inc., 88 Colin P Kelly Jr St,
          San Francisco, CA 94107, USA. Beim Aufruf der Seiten koennen insbesondere IP-Adresse, Datum und Uhrzeit des Abrufs,
          aufgerufene URL, Referrer, Browserinformationen und technische Logdaten verarbeitet werden. Die Verarbeitung erfolgt
          zur technischen Bereitstellung, Stabilitaet und Sicherheit der Website auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
        </p>
      </section>

      <section>
        <h2>4. Externe technische Ressourcen und Drittanbieter</h2>
        <p>
          Die Website laedt je nach aufgerufener Unterseite zusaetzlich technische Bibliotheken, Daten oder Dokumentlisten
          von externen Quellen nach. Dazu koennen insbesondere GitHub-Dienste (z. B. <code>github.io</code>,
          <code>raw.githubusercontent.com</code> und <code>api.github.com</code>), das CDN <code>jsDelivr</code>
          sowie bei einzelnen Funktionen weitere externe Datenquellen gehoeren.
        </p>
        <p>
          Beim Abruf solcher externen Ressourcen erhalten die jeweiligen Anbieter regelmaessig zumindest die IP-Adresse,
          Browser- und Geraeteinformationen, den Zeitpunkt des Abrufs und die jeweils angeforderte Ressource; je nach Browser
          kann auch Referrer-Information uebermittelt werden. Die Verarbeitung erfolgt zur Bereitstellung der jeweils gewaehlten
          Funktion und auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
        </p>
        <p>
          Beispiele fuer aktuell technisch genutzte externe Quellen sind:
        </p>
        <ul class="plain">
          <li><strong>GitHub-Dienste:</strong> Auslieferung einzelner Daten, Dateien und Verzeichnisinformationen.</li>
          <li><strong>jsDelivr:</strong> Nachladen der Bibliothek <code>xlsx.full.min.js</code> fuer Excel-basierte Funktionen.</li>
          <li><strong>Externe Fachquelle im Punkterechner:</strong> Bei einzelnen Rechnerfunktionen koennen Daten von <code>dennisfabri.de</code> nachgeladen werden.</li>
        </ul>
      </section>

      <section>
        <h2>5. Athletenprofile, Ergebnisdaten und oeffentliche Quellen</h2>
        <p>
          Athletenprofile, Leistungsdaten und sportbezogene Informationen werden aus oeffentlich zugaenglichen Ergebnislisten,
          Verbands- und Vereinsveroeffentlichungen sowie vergleichbaren oeffentlichen Quellen uebernommen. Verarbeitet werden
          dabei je nach Einzelfall insbesondere Namen, Jahrgaenge oder Altersklassen, Vereine, Disziplinen, Zeiten, Platzierungen,
          Wettkampforte und Wettkampfdaten.
        </p>
        <p>
          Zweck der Verarbeitung ist die sportbezogene Information, Dokumentation und Archivierung. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. f DSGVO. Betroffene Personen koennen aus Gruenden, die sich aus ihrer besonderen Situation ergeben,
          gemaess Art. 21 DSGVO Widerspruch gegen die Verarbeitung einlegen.
        </p>
      </section>

      <section>
        <h2>6. Kommunikation per E-Mail</h2>
        <p>
          Bei einer Kontaktaufnahme per E-Mail werden die uebermittelten Angaben verarbeitet, um die Anfrage zu bearbeiten
          und Rueckfragen zu beantworten. Die Verarbeitung erfolgt je nach Inhalt der Anfrage auf Grundlage von
          Art. 6 Abs. 1 lit. b oder lit. f DSGVO. Die Daten werden geloescht, sobald die Anfrage abschliessend bearbeitet ist
          und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>
      </section>

      <section>
        <h2>7. Cookies, lokale Speicherung und vergleichbare Technologien</h2>
        <ul class="plain">
          <li>
            <strong>Cookies:</strong> Es werden nur technisch notwendige Cookies eingesetzt. Einwilligungsbeduerftige
            Tracking- oder Marketing-Cookies sind nach aktuellem technischen Stand nicht vorgesehen.
          </li>
          <li>
            <strong>Local Storage/Session Storage:</strong> Der Browser kann lokale Informationen speichern, z. B. fuer
            Spracheinstellungen, Ansichten, Filter oder einen technisch bedingten Cache einzelner Inhaltslisten. Diese Daten
            verbleiben grundsaetzlich auf Ihrem Endgeraet und koennen ueber die Browsereinstellungen geloescht werden.
          </li>
          <li>
            <strong>Rechtsgrundlage:</strong> Soweit ein Zugriff auf Ihr Endgeraet fuer technisch notwendige Zwecke erfolgt,
            beruht dieser auf &sect; 25 Abs. 2 TDDDG. Soweit dabei personenbezogene Daten verarbeitet werden, erfolgt dies
            auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
          </li>
          <li>
            <strong>Analyse und Tracking:</strong> Es werden nach aktuellem Stand keine bewusst eingebundenen externen
            Analyse- oder Marketingdienste eingesetzt.
          </li>
        </ul>
      </section>

      <section>
        <h2>8. Externe Links und Verweise</h2>
        <p>
          Diese Website enthaelt Links zu externen Websites und Diensten, darunter auch Angebote von Sportverbaenden,
          sozialen Netzwerken und sonstigen Drittanbietern. Beim Anklicken solcher Links verlassen Sie diese Website.
          Fuer die Datenverarbeitung auf den verlinkten Seiten sind ausschliesslich deren Betreiber verantwortlich.
        </p>
      </section>

      <section>
        <h2>9. Empfaenger und Drittlanduebermittlung</h2>
        <p>
          Empfaenger personenbezogener Daten koennen insbesondere technische Dienstleister sein, die fuer die Auslieferung
          von Website-Inhalten, Daten, Dokumenten oder Bibliotheken eingesetzt werden. Dazu koennen Anbieter in Drittstaaten,
          insbesondere in den USA, gehoeren. Soweit personenbezogene Daten in Drittlaender uebermittelt werden, erfolgt dies
          nach Anbieterangaben auf Grundlage geeigneter Garantien, insbesondere EU-Standardvertragsklauseln, soweit anwendbar.
        </p>
      </section>

      <section>
        <h2>10. Speicherdauer</h2>
        <p>
          Serverseitige Logdaten werden durch die jeweils eingesetzten technischen Anbieter nur so lange gespeichert, wie dies
          fuer den Betrieb, die Sicherheit und die Fehleranalyse erforderlich ist. Lokal im Browser gespeicherte Einstellungen
          oder Cache-Daten bleiben bestehen, bis sie automatisch ueberschrieben oder manuell geloescht werden. Oeffentlich
          bereitgestellte sportbezogene Inhalte werden gespeichert, solange der Zweck der Dokumentation und Information besteht
          oder bis ein wirksamer Widerspruch eingeht.
        </p>
      </section>

      <section>
        <h2>11. Rechte der betroffenen Personen</h2>
        <p>
          Ihnen stehen die Rechte auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Loeschung (Art. 17 DSGVO),
          Einschraenkung der Verarbeitung (Art. 18 DSGVO), Datenuebertragbarkeit (Art. 20 DSGVO) sowie Widerspruch
          (Art. 21 DSGVO) zu. Zudem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehoerde.
        </p>
      </section>

      <section>
        <h2>12. Pflicht zur Bereitstellung</h2>
        <p>
          Die Bereitstellung bestimmter technischer Nutzungsdaten, insbesondere der IP-Adresse und weiterer Verbindungsdaten,
          ist fuer die Auslieferung der Website und einzelner Funktionen technisch erforderlich. Ohne diese Daten kann die
          Website ganz oder teilweise nicht bereitgestellt werden.
        </p>
      </section>

      <section>
        <h2>13. Aenderungen dieser Datenschutzerklaerung</h2>
        <p>
          Diese Datenschutzerklaerung wird angepasst, wenn sich die Rechtslage, die eingesetzten Dienste oder die tatsaechliche
          Datenverarbeitung aendern. Massgeblich ist die jeweils auf dieser Seite veroeffentlichte Fassung.
        </p>
      </section>

      <p class="asof">Stand: ${asOf}</p>
    </article>
  `;
});
