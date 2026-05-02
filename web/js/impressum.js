document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <article class="imprint">
      <h1>Impressum</h1>

      <section>
        <h2>Angaben gemaess &sect; 5 TMG</h2>
        <p>
          <strong>Name:</strong> <span class="placeholder">Jan-Philipp Gnad</span><br>
          <strong>Adresse:</strong> <span class="placeholder">Am Zollstock 36, 76228 Karlsruhe</span><br>
          <strong>E-Mail:</strong> <span class="placeholder">jp.gnad@web.de</span><br>
          <strong>Telefon:</strong> <span class="placeholder">+49 (0)1575 4047493</span>
        </p>
      </section>

      <section>
        <h2>Verantwortlich fuer den Inhalt nach &sect; 18 Abs. 2 MStV</h2>
        <p>
          <span class="placeholder">Jan-Philipp Gnad, Am Zollstock 36</span>
        </p>
      </section>

      <section>
        <h2>Hosting</h2>
        <p>
          Technische Bereitstellung ueber GitHub Pages (GitHub, Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA).
        </p>
      </section>

      <section>
        <h2>Hinweis zur Einordnung</h2>
        <p>
          Dieses Projekt, diese Internetseite sowie die zugrunde liegenden Daten, Auswertungen und Strukturen sind ein rein privates Vorhaben.
          Es besteht keine direkte organisatorische, redaktionelle oder offizielle Verbindung zum DLRG Landesverband Baden e. V.
          oder zu anderen Gliederungen der DLRG, sofern dies nicht ausdruecklich separat kenntlich gemacht ist.
        </p>
      </section>

      <section>
        <h2>Haftung fuer Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemaess &sect; 7 Abs. 1 TMG fuer eigene Inhalte auf diesen Seiten nach den allgemeinen
          Gesetzen verantwortlich. Nach &sect;&sect; 8 bis 10 TMG sind wir jedoch nicht verpflichtet, uebermittelte oder gespeicherte
          fremde Informationen zu ueberwachen oder nach Umstaenden zu forschen, die auf eine rechtswidrige Taetigkeit hinweisen.
          Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben
          hiervon unberuehrt. Eine diesbezuegliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
          Rechtsverletzung moeglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
        </p>
      </section>

      <section>
        <h2>Haftung fuer Links</h2>
        <p>
          Unser Angebot enthaelt Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb
          koennen wir fuer diese fremden Inhalte auch keine Gewaehr uebernehmen. Fuer die Inhalte der verlinkten Seiten ist
          stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Eine permanente inhaltliche Kontrolle
          der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
          Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
        </p>
      </section>

      <section>
        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.
          Beitraege Dritter sind als solche gekennzeichnet. Die Vervielfaeltigung, Bearbeitung, Verbreitung und jede Art der
          Verwertung ausserhalb der Grenzen des Urheberrechtes beduerfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          Downloads und Kopien dieser Seite sind nur fuer den privaten, nicht kommerziellen Gebrauch gestattet, soweit nicht anders geregelt.
        </p>
      </section>

      <section>
        <h2>Bildnachweise</h2>
        <p>
          <span class="placeholder">DLRG - Steph Dittschar</span><br>
          <span class="placeholder">DLRG - Daniel Reinelt</span><br>
          <span class="placeholder">DLRG - Toma Unverzagt</span><br>
          <span class="placeholder">DLRG - Denis Foemer</span><br>
          <span class="placeholder">GettyImages - Matthias Hangst</span><br>
        </p>
      </section>

      <section>
        <h2>Verbraucherstreitbeilegung/OS-Plattform</h2>
        <p>
          Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <p class="asof">Letzte Aktualisierung: ${new Date().toLocaleDateString("de-DE")}</p>
    </article>
  `;
});
