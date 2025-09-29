document.addEventListener("DOMContentLoaded", () => {
  const menuItems = document.querySelectorAll(".header-menu .menu-item");
  const underline = document.querySelector(".menu-underline");

  function moveUnderline(item) {
    underline.style.width = item.offsetWidth + "px";
    underline.style.left = item.offsetLeft + "px";
  }

  // Initial position auf active setzen
  const activeItem = document.querySelector(".header-menu .menu-item.active");
  if (activeItem) moveUnderline(activeItem);

  // Klick-Event für Menü
  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      menuItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      moveUnderline(item);
      // kein preventDefault -> Link öffnet die Seite normal
    });

  });

  // Optional: Unterstrich bei Hover verschieben (kann man auch weglassen)
    menuItems.forEach(item => {
      item.addEventListener("mouseenter", () => moveUnderline(item));
    });
    // Wenn Maus das Menü verlässt, zurück zum aktiven
    document.querySelector(".header-menu").addEventListener("mouseleave", () => {
      const activeItem = document.querySelector(".header-menu .menu-item.active");
      if (activeItem) moveUnderline(activeItem);
    });

  const header = document.querySelector(".header");
    const toggle = document.querySelector(".menu-toggle");
    const menu = document.getElementById("site-menu");

    if (toggle) {
      toggle.addEventListener("click", () => {
        const isOpen = header.classList.toggle("open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    }

    // Beim Klick auf einen Menüpunkt Mobile-Menü schließen (Navigation findet normal statt)
    if (menu) {
      menu.addEventListener("click", (e) => {
        if (e.target.matches("a.menu-item")) {
          header.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Bei Resize zurücksetzen, wenn wieder Desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 900 && header.classList.contains("open")) {
        header.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });

});


