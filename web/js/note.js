document.addEventListener("DOMContentLoaded", () => {
  const footer = document.getElementById("site-footer");
  if (!footer) return;

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
              <img src="./png/icons/facebook.png" alt="Facebook">
            </a>

            <a class="footer-icon"
               href="https://www.instagram.com/lifesaving_baden/"
               target="_blank" rel="noopener noreferrer"
               aria-label="Instagram">
              <img src="./png/icons/insta.png" alt="Instagram">
            </a>

            <a class="footer-icon"
               href="https://www.youtube.com/@dlrgbaden"
               target="_blank" rel="noopener noreferrer"
               aria-label="YouTube">
              <img src="./png/icons/youtube.png" alt="YouTube">
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- BAND (schwarz) -->
    <div class="footer-band" aria-hidden="true">
      <div class="footer-container footer-band-inner">
        <img class="footer-elk" src="./png/icons/elch.png" alt="">
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
