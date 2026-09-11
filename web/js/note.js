document.addEventListener("DOMContentLoaded", () => {
  const footer = document.getElementById("site-footer");
  if (!footer) return;

  if (footer.dataset.footerVariant === "dark") {
    footer.innerHTML = `
      <svg class="footer-dark-filter-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="footer-ffss-grayscale" color-interpolation-filters="sRGB">
            <feColorMatrix type="matrix" values="
              0.15 0.15 0.70 0 0
              0.15 0.15 0.70 0 0
              0.15 0.15 0.70 0 0
              0    0    0    1 0" />
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude="1.1" exponent="0.85" offset="0.02" />
              <feFuncG type="gamma" amplitude="1.1" exponent="0.85" offset="0.02" />
              <feFuncB type="gamma" amplitude="1.1" exponent="0.85" offset="0.02" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div class="footer-dark-social-row">
        <nav class="footer-dark-social-links" aria-label="Lifesaving Baden in sozialen Netzwerken">
          <a class="footer-dark-social-link"
             href="https://www.facebook.com/p/DLRG-Team-Baden-100066777226581/?locale=de_DE"
             target="_blank" rel="noopener noreferrer"
             aria-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.03 4.39 11.03 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.69.24 2.69.24v2.98h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
            </svg>
          </a>

          <a class="footer-dark-social-link"
             href="https://www.youtube.com/@dlrgbaden"
             target="_blank" rel="noopener noreferrer"
             aria-label="YouTube">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M23.5 6.2a3.01 3.01 0 0 0-2.12-2.13C19.5 3.56 12 3.56 12 3.56s-7.5 0-9.38.51A3.01 3.01 0 0 0 .5 6.2 31.38 31.38 0 0 0 0 12a31.38 31.38 0 0 0 .5 5.8 3.01 3.01 0 0 0 2.12 2.13c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.01 3.01 0 0 0 2.12-2.13A31.38 31.38 0 0 0 24 12a31.38 31.38 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.26 3.6-6.26 3.6Z" />
            </svg>
          </a>

          <a class="footer-dark-social-link"
             href="https://www.instagram.com/lifesaving_baden/"
             target="_blank" rel="noopener noreferrer"
             aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5.25" />
              <circle cx="12" cy="12" r="4.35" />
              <circle class="footer-dark-social-link__instagram-dot" cx="17.55" cy="6.45" r="1.15" />
            </svg>
          </a>
        </nav>
      </div>

      <div class="footer-dark-divider" aria-hidden="true"></div>

      <nav class="footer-dark-legal" aria-label="Rechtliche Hinweise">
        <a href="datenschutz.html">Datenschutz</a>
        <a href="impressum.html">Impressum</a>
      </nav>

      <nav class="footer-dark-affiliations" aria-label="Verbände">
        <a class="footer-dark-affiliation-logo footer-dark-affiliation-logo--gr"
           href="https://www.reddingsbrigade.nl/wij/wat-wij-doen/lifesavingsport/"
           target="_blank" rel="noopener noreferrer"
           aria-label="Reddingsbrigade Lifesavingsport">
          <img src="./assets/png/reddingsbrigade.png"
               alt=""
               aria-hidden="true"
               draggable="false">
        </a>

        <a class="footer-dark-affiliation-logo footer-dark-affiliation-logo--oewr"
           href="https://www.rettungssport.at/"
           target="_blank" rel="noopener noreferrer"
           aria-label="Österreichischer Rettungssport">
          <img src="./assets/png/oewr-logo.png"
               alt=""
               aria-hidden="true"
               draggable="false">
        </a>

        <a class="footer-dark-affiliation-logo footer-dark-affiliation-logo--slrg"
           href="https://www.slrg.ch/de/sport"
           target="_blank" rel="noopener noreferrer"
           aria-label="SLRG Sport">
          <img src="./assets/png/slrg-logo.png"
               alt=""
               aria-hidden="true"
               draggable="false">
        </a>

        <a class="footer-dark-affiliation-logo footer-dark-affiliation-logo--ffss"
           href="https://www.ffss.fr/public/843-sauvetage-sportif.php"
           target="_blank" rel="noopener noreferrer"
           aria-label="FFSS Sauvetage Sportif">
          <img class="footer-dark-affiliation-image footer-dark-affiliation-image--muted"
               src="./assets/png/ffss-logo.png"
               alt=""
               aria-hidden="true"
               draggable="false">
          <img class="footer-dark-affiliation-image footer-dark-affiliation-image--color"
               src="./assets/png/ffss-logo.png"
               alt=""
               aria-hidden="true"
               draggable="false">
        </a>

        <a class="footer-dark-affiliation-logo footer-dark-affiliation-logo--ils"
           href="https://www.ilsf.org/"
           target="_blank" rel="noopener noreferrer"
           aria-label="International Life Saving Federation">
          <img src="./assets/png/ils-logo.png"
               alt=""
               aria-hidden="true"
               draggable="false">
        </a>
        <a class="footer-dark-affiliation-logo footer-dark-affiliation-logo--dlrg"
           href="https://www.dlrg.de/mitmachen/rettungssport/"
           target="_blank" rel="noopener noreferrer"
           aria-label="DLRG Bundesverband">
          <svg viewBox="40 24 1120 220" aria-hidden="true" focusable="false">
            <path fill-rule="evenodd" d="M60 44h189c40 0 60 20 60 61v58c0 41-20 61-60 61H60V44Zm88 48v84h44c20 0 30-10 30-29v-26c0-19-10-29-30-29h-44Zm210-48h88v132h115v48H358V44Zm241 0h197c33 0 52 16 52 44v8c0 23-13 35-51 36 34 2 51 17 51 44v48h-88v-48c0-18-10-28-29-28h-44v76h-88V44Zm88 32v40h48c18 0 27-7 27-20v-4c0-11-9-16-27-16h-48Zm250-32h152c33 0 51 18 51 52h-86c0-14-9-20-26-20h-27c-16 0-23 8-23 23v70c0 15 8 23 24 23h30c16 0 24-8 24-23v-21h-42v-33h126v109H937c-30 0-47-19-47-50V94c0-31 18-50 47-50Z" />
          </svg>
        </a>
      </nav>
    `;

    const affiliationRow = footer.querySelector(".footer-dark-affiliations");
    [
      ".footer-dark-affiliation-logo--dlrg",
      ".footer-dark-affiliation-logo--ils",
      ".footer-dark-affiliation-logo--gr",
      ".footer-dark-affiliation-logo--ffss",
      ".footer-dark-affiliation-logo--oewr",
      ".footer-dark-affiliation-logo--slrg"
    ].forEach((selector) => {
      const logo = affiliationRow?.querySelector(selector);
      if (logo) affiliationRow.append(logo);
    });

    return;
  }

  const year = new Date().getFullYear();

  footer.innerHTML = `
    <!-- TOP (grau) -->
    <div class="footer-top">
      <div class="footer-container">
        <p class="footer-copy">© ${year} Lifesaving Baden</p>

        <div class="footer-social" aria-label="Lifesaving Team Baden in sozialen Netzwerken">
          <div class="footer-social-title">Lifesaving Team Baden in sozialen Netzwerken</div>

          <div class="footer-social-icons">
            <a class="footer-icon"
               href="https://www.facebook.com/p/DLRG-Team-Baden-100066777226581/?locale=de_DE"
               target="_blank" rel="noopener noreferrer"
               aria-label="Facebook">
              <img src="./assets/png/icons/facebook.png" alt="Facebook">
            </a>

            <a class="footer-icon"
               href="https://www.instagram.com/lifesaving_baden/"
               target="_blank" rel="noopener noreferrer"
               aria-label="Instagram">
              <img src="./assets/png/icons/insta.png" alt="Instagram">
            </a>

            <a class="footer-icon"
               href="https://www.youtube.com/@dlrgbaden"
               target="_blank" rel="noopener noreferrer"
               aria-label="YouTube">
              <img src="./assets/png/icons/youtube.png" alt="YouTube">
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- BAND (schwarz) -->
    <div class="footer-band" aria-hidden="true">
      <div class="footer-container footer-band-inner">
        <img class="footer-elk" src="./assets/png/icons/elch.png" alt="">
      </div>
    </div>

    <!-- BOTTOM (grau) -->
    <div class="footer-bottom">
      <div class="footer-container">
        <nav aria-label="Fußnavigation" class="footnav">
          <a href="datenschutz.html">Datenschutz</a>
          <a href="impressum.html">Impressum</a>
        </nav>

        <div class="footer-affiliations" aria-label="Verbände">
          <a href="https://www.dlrg.de/mitmachen/rettungssport/"
             target="_blank" rel="noopener noreferrer"
             class="footer-aff-link">Bundesverband</a>

          <a href="https://baden.dlrg.de/mitmachen/rettungssport/"
             target="_blank" rel="noopener noreferrer"
             class="footer-aff-link">Landesverband Baden e.V.</a>
        </div>
      </div>
    </div>
  `;
});
