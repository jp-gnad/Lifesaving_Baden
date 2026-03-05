const DATA_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test%20(1).xlsx";
const DATA_SHEET = "Tabelle2";

const CONFIG_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx";
const CONFIG_SHEET = "LK";
const CONFIG_TABLE_NAME = "LK_konfig";

const BRIDGE_URL = "PZ_tabellen.js";

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("content");
  if (!root) return;

  const seal = (v) =>
    Array.from(String(v))
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) + ((i % 3) + 1)))
      .join("");

  const tick = () =>
    Number(new Intl.DateTimeFormat("de-DE", { year: "numeric" }).format(new Date()));

  const stage0 = () => {
    root.innerHTML = `
      <section class="hero">
        <h1>Qualifikation Landeskader</h1>
      </section>

      <section class="updates">
        <h2>Zugang</h2>
        <div class="pz-gate">  
          <p id="line-a" class="pz-statusline">Bitte Freigabecode eingeben.</p>
          <div style="display:flex;flex-wrap:wrap;align-items:center;">
            <input id="field-a" type="password" inputmode="numeric" autocomplete="off" placeholder="Eingabe..." style="padding:.5rem .75rem;min-width:140px;">
            <button id="act-a" type="button" style="padding:.5rem .75rem;cursor:pointer;">Öffnen</button>
          </div>
        </div>
      </section>
    `;
    wire0();
  };

  const stage1 = () => {
    root.innerHTML = `
      <section class="hero">
        <h1>Qualifikation Landeskader</h1>
      </section>

      <section class="updates">
        <h2>Alle erreichten Kadernormen</h2>
        <p>Alle offiziellen Pflichtzeiten, Ausschreibung und weitere Infos zu den DEM findest du auf der <a href="https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/" target="_blank" rel="noopener noreferrer">Homepage</a> der DLRG.</p>
        <div id="pflichtzeiten-root" class="pz-root">
          <p id="pflichtzeiten-status" class="pz-statusline">Lade Pflichtzeiten aus Excel …</p>
        </div>
      </section>
    `;
  };

  const sync0 = () =>
    new Promise((ok, no) => {
      if (typeof initPflichtzeitenTabellen === "function") {
        ok();
        return;
      }

      const s = document.createElement("script");
      s.src = BRIDGE_URL;
      s.async = true;

      s.onload = () => {
        if (typeof initPflichtzeitenTabellen === "function") {
          ok();
        } else {
          no(new Error("Engine fehlt"));
        }
      };

      s.onerror = () => no(new Error("Script konnte nicht geladen werden"));
      document.head.appendChild(s);
    });

  const boot0 = async () => {
    stage1();
    const line = document.getElementById("pflichtzeiten-status");

    try {
      await sync0();
    } catch (e) {
      console.error(e);
      if (line) line.textContent = "Fehler: Tabellen-Engine konnte nicht geladen werden.";
      return;
    }

    try {
      initPflichtzeitenTabellen(CONFIG_SHEET, CONFIG_TABLE_NAME, {
        mountId: "pflichtzeiten-root",
        statusId: "pflichtzeiten-status",
        dataExcelUrl: DATA_EXCEL_URL,
        dataSheet: DATA_SHEET,
        configExcelUrl: CONFIG_EXCEL_URL,
      });
    } catch (e) {
      console.error(e);
      if (line) line.textContent = "Fehler beim Starten der Tabellen.";
    }
  };

  const wire0 = () => {
    const input = document.getElementById("field-a");
    const btn = document.getElementById("act-a");
    const line = document.getElementById("line-a");
    if (!input || !btn || !line) return;

    const go = async () => {
      const raw = String(input.value || "").trim();
      const ref = String(tick());

      if (seal(raw) !== seal(ref)) {
        line.textContent = "Code ungültig.";
        input.value = "";
        input.focus();
        return;
      }

      line.textContent = "Freigabe erteilt …";
      btn.disabled = true;
      input.disabled = true;
      await boot0();
    };

    btn.addEventListener("click", go);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    input.focus();
  };

  stage0();
});