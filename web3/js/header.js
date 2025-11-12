document.addEventListener("DOMContentLoaded", () => {
  const headerEl = document.getElementById("site-header");
  if (!headerEl) return;

  headerEl.innerHTML = `
    <div class="hdr-bg">
      <div class="hdr-container">
        <a class="brand" href="Startseite.html">
          <img class="brand-logo" src="./svg/logo.svg" alt="" aria-hidden="true">
          <span class="brand-title">Lifesaving Baden</span>
        </a>
      </div>
    </div>

    <div class="hdr-nav-wrap">
      <nav aria-label="Hauptnavigation" class="hdr-nav">
        <ul class="nav">
          <li><a href="Punkterechner.html">Punkterechner</a></li>
          <li><a href="Rekorde.html">Rekorde</a></li>
          <li><a href="Kaderstatus.html">Kaderstatus</a></li>
          <li><a href="Athleten.html">Athleten</a></li>
        </ul>
      </nav>
    </div>
  `;

  // aktiven Menüpunkt markieren
  const current = location.pathname.toLowerCase();
  headerEl.querySelectorAll(".nav a").forEach((a) => {
    const target = (a.getAttribute("href") || "").toLowerCase();
    if (current.endsWith("/" + target) || current.endsWith(target)) {
      a.classList.add("active");
    }
  });
});
