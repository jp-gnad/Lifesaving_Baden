document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  const today = new Date();
  const asOf = today.toLocaleDateString("de-DE");

  main.innerHTML = `
    <article class="privacy">
      <h1>Datenschutzerklärung</h1>
      <p class="hint">Diese Seite informiert gemäß Art. 13, 14 DSGVO über die Verarbeitung personenbezogener Daten.</p>

      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          <strong>Name:</strong> <span class="placeholder">Jan-Philipp Gnad</span><br>
          <strong>Adresse:</strong> <span class="placeholder">Am Zollstock 36, 76228 Karlsruhe</span><br>
          <strong>E-Mail:</strong> <span class="placeholder">jan-philipp.gnad@dlrg.org</span><br>
          <strong>Telefon:</strong> <span class="placeholder">+49 (0)1575 4047493</span>
        </p>
      </section>

      <section>
        <h2>2. Hosting (GitHub Pages)</h2>
        <p>
          Diese Website wird bei GitHub Pages gehostet. Anbieter ist GitHub, Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA.
          Beim Aufruf der Seiten verarbeitet GitHub u. a. IP-Adresse, Datum/Uhrzeit, URL, Referrer, User-Agent und ggf. Fehlercodes in Server-Logs.
          Die Verarbeitung erfolgt zur technischen Bereitstellung und Sicherheit der Website (Art. 6 Abs. 1 lit. f DSGVO).
          Es kann zu Datenübermittlungen in Drittländer (USA) kommen; hierfür werden nach Anbieterangaben u. a. EU-Standardvertragsklauseln genutzt.
        </p>
      </section>

      <section>
        <h2>3. Bereitgestellte Inhalte & Quellen</h2>
        <p>
          Athletenprofile und Leistungsdaten werden aus <strong>öffentlich zugänglichen Ergebnislisten</strong> und Verbands-/Vereinsveröffentlichungen übernommen.
          Verarbeitete Datenkategorien können insbesondere Namen, Jahrgänge/Altersklassen, Vereine, Disziplinen, Leistungen/Zeiten, Wettkampforte und -daten umfassen.
          Zweck ist die sportbezogene Information und Archivierung (Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse an Berichterstattung über den Rettungssport).
          Betroffene können aus Gründen, die sich aus ihrer besonderen Situation ergeben, jederzeit <strong>Widerspruch</strong> gegen diese Verarbeitung einlegen (Art. 21 DSGVO).
        </p>
      </section>

      <section>
        <h2>4. Kommunikation</h2>
        <p>
          Bei Kontakt per E-Mail werden die Angaben zur Bearbeitung der Anfrage und für Anschlussfragen verarbeitet (Art. 6 Abs. 1 lit. b oder f DSGVO).
          Die Daten werden gelöscht, sobald die Anfrage abschließend bearbeitet ist und keine Aufbewahrungspflichten entgegenstehen.
        </p>
      </section>

      <section>
        <h2>5. Cookies, lokale Speicherung & Analyse</h2>
        <ul class="plain">
          <li><strong>Cookies:</strong> Es werden keine eigenen Cookies gesetzt.</li>
          <li><strong>Local Storage/Session Storage:</strong> Es können lokale Einstellungen (z. B. Filter, Ansicht) im Browser gespeichert werden (Art. 6 Abs. 1 lit. f DSGVO). Sie können dies im Browser jederzeit löschen.</li>
          <li><strong>Analyse-/Tracking-Dienste:</strong> Es werden keine externen Analysetools eingesetzt.</li>
        </ul>
      </section>

      <section>
        <h2>6. Empfänger & Drittlandübermittlung</h2>
        <p>
          Empfänger von Nutzungsdaten ist der Hosting-Dienstleister GitHub (s. o.). Eine Drittlandübermittlung (USA) ist möglich.
          Rechtsgrundlage sind Art. 44 ff. DSGVO i. V. m. geeigneten Garantien (z. B. EU-Standardvertragsklauseln). Weitere Empfänger bestehen nur,
          sofern dies gesetzlich vorgeschrieben ist.
        </p>
      </section>

      <section>
        <h2>7. Speicherdauer</h2>
        <p>
          Server-Logs werden durch den Hosting-Anbieter für einen begrenzten Zeitraum zur Sicherheit vorgehalten.
          Inhalte (z. B. Ergebnisdaten) werden gespeichert, solange der Zweck der Dokumentation und Information besteht oder bis ein wirksamer Widerspruch eingeht.
        </p>
      </section>

      <section>
        <h2>8. Rechte der betroffenen Personen</h2>
        <p>
          Ihnen stehen die Rechte auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18),
          Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21 DSGVO) zu. Zudem besteht ein Beschwerderecht bei einer
          Datenschutzaufsichtsbehörde, z. B. am Wohnsitz oder in dem Bundesland des Verantwortlichen.
        </p>
      </section>

      <section>
        <h2>9. Pflicht zur Bereitstellung</h2>
        <p>
          Die Bereitstellung von Nutzungsdaten ist für die Auslieferung der Website technisch erforderlich. Ohne Bereitstellung ist ein Aufruf nicht möglich.
        </p>
      </section>

      <section>
        <h2>10. Änderungen dieser Erklärung</h2>
        <p>
          Wir passen diese Hinweise an, sobald sich Rechtslage, der eingesetzte Dienstleister oder die Datenverarbeitung ändert.
        </p>
      </section>

      <p class="asof">Stand: ${asOf}</p>
    </article>
  `;
});
