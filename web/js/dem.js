const DATA_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test%20(1).xlsx";
const DATA_SHEET = "Tabelle2";

const CONFIG_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx";
const CONFIG_SHEET = "DEM";
const CONFIG_TABLE_NAME = "DEM_konfig";

document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Deutsche Einzelstrecken Meisterschaften</h1>
    </section>

    <section class="updates">
      <h2>Infos zum Wettkampf</h2>
      <p>Alle offiziellen Pflichtzeiten, Ausschreibung und weitere Infos zu den DEM findest du auf der <a href="https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/" target="_blank" rel="noopener noreferrer">Homepage</a> der DLRG.</p>
      <h2>Alle erreichten Pflichtzeiten</h2>
      <div id="pflichtzeiten-root" class="pz-root">
        <p id="pflichtzeiten-status" class="pz-statusline">Lade Pflichtzeiten aus Excel …</p>
      </div>
    </section>
  `;

  if (typeof initPflichtzeitenTabellen !== "function") {
    console.error("PZ_tabellen.js ist nicht geladen oder initPflichtzeitenTabellen fehlt.");
    const status = document.getElementById("pflichtzeiten-status");
    if (status) status.textContent = "Fehler: Tabellen-Engine nicht geladen.";
    return;
  }

  initPflichtzeitenTabellen(CONFIG_SHEET, CONFIG_TABLE_NAME, {
    mountId: "pflichtzeiten-root",
    statusId: "pflichtzeiten-status",
    dataExcelUrl: DATA_EXCEL_URL,
    dataSheet: DATA_SHEET,
    configExcelUrl: CONFIG_EXCEL_URL,
  });
});
