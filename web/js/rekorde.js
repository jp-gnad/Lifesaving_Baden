document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Rekorde</h1>
    </section>

    <section class="updates">
      <h2>Aktuelles</h2>

      <div class="search-area" id="rekordeSearchRoot">
        <div class="search-bar" id="searchCombo" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="searchDropdown">
          <input id="recordSearch" type="text" inputmode="search" autocomplete="off" placeholder="Suchen..." aria-autocomplete="list" aria-controls="searchDropdown" />
          <button id="openBtn" type="button" disabled>Öffnen</button>
        </div>
        <ul id="searchDropdown" class="dropdown" role="listbox"></ul>
      </div>
    </section>
  `;

  if (typeof window.initRekordeSuche === "function") {
    window.initRekordeSuche({
      rootId: "rekordeSearchRoot",
      excelUrl: "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test (1).xlsx",
      sheetName: "Tabelle2",
      cols: { ortsgruppe: 13, LV_state: 14, BV_natio: 28 }
    });
  }
});
