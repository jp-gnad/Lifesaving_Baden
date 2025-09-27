(function () {
  // Globaler State (Default: Badenkader)
  window.currentSelection = window.currentSelection || "Badenkader";

  function filterTable(selected) {
    window.currentSelection = selected;
    const rows = document.querySelectorAll("#kader-container table tr");

    rows.forEach((row, index) => {
      if (index === 0) return; // Header nicht filtern

      const status = row.dataset?.kaderstatus || "";
      const aktuellesAlter = parseInt(row.dataset?.aktuellesalter || "0", 10);

      let sichtbar = false;

      if (selected === "Badenkader") {
        sichtbar = (status === "Badenkader");
      } else if (selected === "Juniorenkader") {
        sichtbar = (status === "Juniorenkader") ||
                   (status === "Badenkader" && aktuellesAlter < 19);
      }

      row.style.display = sichtbar ? "" : "none";
      applyZebraStripes();
    });
  }

  // Exponiere eine Funktion, die der Tabellen-Code nach dem Rendern aufrufen kann
  window.applyKaderFilter = () => filterTable(window.currentSelection);

  function buildUI() {
    const switchContainer = document.getElementById("switch-container");
    if (!switchContainer) return;

    // Button-Gruppe
    const btnGroup = document.createElement("div");
    btnGroup.className = "btn-group";

    const btnBK = document.createElement("button");
    btnBK.textContent = "Badenkader";

    const btnJK = document.createElement("button");
    btnJK.textContent = "Juniorenkader";

    btnGroup.appendChild(btnBK);
    btnGroup.appendChild(btnJK);
    switchContainer.innerHTML = ""; // vorsorglich leeren
    switchContainer.appendChild(btnGroup);

    // aktiven Button markieren
    function setActive(which) {
      const isBK = which === "Badenkader";
      btnBK.classList.toggle("active", isBK);
      btnJK.classList.toggle("active", !isBK);
    }

    // Klick-Handler
    btnBK.addEventListener("click", () => {
      setActive("Badenkader");
      filterTable("Badenkader");
    });
    btnJK.addEventListener("click", () => {
      setActive("Juniorenkader");
      filterTable("Juniorenkader");
    });

    // Initial entsprechend currentSelection
    setActive(window.currentSelection);
    filterTable(window.currentSelection);
  }

  // UI bauen, wenn DOM bereit
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }
})();
