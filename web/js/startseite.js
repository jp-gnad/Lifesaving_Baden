document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  if (!window.StartseiteContent || typeof window.StartseiteContent.render !== "function") {
    console.error("StartseiteContent konnte nicht geladen werden.");
    return;
  }

  if (!window.StartseiteCarousel || typeof window.StartseiteCarousel.init !== "function") {
    console.error("StartseiteCarousel konnte nicht geladen werden.");
    return;
  }

  window.StartseiteContent.render(main);
  window.StartseiteCarousel.init();
});
