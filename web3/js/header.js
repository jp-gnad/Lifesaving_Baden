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
        <button class="menu-toggle" aria-expanded="false" aria-controls="primary-menu" aria-label="Menü öffnen">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"></path>
          </svg>
        </button>
        <ul id="primary-menu" class="nav">
          <li><a href="Punkterechner.html">Punkterechner</a></li>
          <li><a href="Rekorde.html">Rekorde</a></li>
          <li><a href="Kaderstatus.html">Kaderstatus</a></li>
          <li><a href="Athleten.html">Athleten</a></li>
        </ul>
      </nav>
    </div>
  `;

  // Aktiven Menüpunkt markieren
  const current = location.pathname.toLowerCase();
  headerEl.querySelectorAll(".nav a").forEach((a) => {
    const target = (a.getAttribute("href") || "").toLowerCase();
    if (current.endsWith("/" + target) || current.endsWith(target)) {
      a.classList.add("active");
    }
  });

  // Mobile-Menu-Logik
  const nav = headerEl.querySelector(".hdr-nav");
  const toggle = headerEl.querySelector(".menu-toggle");
  const menu = headerEl.querySelector("#primary-menu");

  function closeMenu() {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
  function openMenu() {
    nav.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", () => {
    if (nav.classList.contains("open")) { closeMenu(); } else { openMenu(); }
  });

  // Schließen bei Klick außerhalb
  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target)) closeMenu();
  });

  // ESC schließt
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
});
