/*
 * record.js
 * Erzeugt zwei Boxen im #records-container:
 *  1) .records-box                  – Standard-Box (grau, full-bleed)
 *  2) .records-box.records-box--image – Bild-Box mit Overlay
 * Bindet records_style.css nach, falls noch nicht vorhanden.
 */
(() => {
  const STYLESHEET_HREF = "records_style.css";
  const MOUNT_ID = "records-container";

  function ensureRecordsStylesheet() {
    const hasSheet = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .some((el) => typeof el.href === "string" && el.href.includes(STYLESHEET_HREF));
    if (!hasSheet) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = STYLESHEET_HREF;
      link.media = "all";
      document.head.appendChild(link);
    }
  }

  function createBox({ id, classes, title, content }) {
    if (document.getElementById(id)) return;

    const section = document.createElement("section");
    section.id = id;
    section.className = classes;
    section.setAttribute("role", "region");
    section.setAttribute("aria-label", title);

    const h2 = document.createElement("h2");
    h2.className = "records-box__title";
    h2.textContent = title;

    const body = document.createElement("div");
    body.className = "records-box__content";
    body.textContent = content;

    section.append(h2, body);

    const mount = document.getElementById(MOUNT_ID) || document.body;
    mount.appendChild(section);
  }

  function init() {
    try {
      ensureRecordsStylesheet();

      
      // Unten: Bild-Box
      createBox({
        id: "records-box-image",
        classes: "records-box records-box--image",
        title: "REKORDE",
      });

      // Oben: Standard-Box
      createBox({
        id: "records-box",
        classes: "records-box",
        title: "Rekorde",
        content: "Inhalte der Standard-Box."
      });

      // Reihenfolge ändern? Einfach die beiden createBox-Aufrufe vertauschen.
    } catch (err) {
      console.error("[record.js] Initialisierung fehlgeschlagen:", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
