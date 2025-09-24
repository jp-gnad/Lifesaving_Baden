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
    item.addEventListener("click", (e) => {
      e.preventDefault();

      menuItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      moveUnderline(item);
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
});
