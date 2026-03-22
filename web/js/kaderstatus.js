const LEGACY_REMOTE_BASE = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities";

const DATA_EXCEL_URL =
  window.location.protocol === "file:"
    ? `${LEGACY_REMOTE_BASE}/test%20(1).xlsx`
    : "./data/test (1).xlsx";
const DATA_SHEET = "Tabelle2";

const CONFIG_EXCEL_URL =
  window.location.protocol === "file:"
    ? `${LEGACY_REMOTE_BASE}/records_kriterien.xlsx`
    : "./data/records_kriterien.xlsx";
const CONFIG_SHEET = "LK";
const CONFIG_TABLE_NAME = "LK_konfig";

const BRIDGE_URL = "Qualli_tabellen.js";

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("content");
  if (!root) return;

  const stage0 = () => {
    if (!window.PWGate || typeof window.PWGate.open !== "function") {
      root.innerHTML = `
        <section class="hero">
          <h1>Live Kader-Quallifikationen</h1>
        </section>
        <section class="updates">
          <h2>Zugang</h2>
          <p class="pz-statusline">Fehler: PW.js konnte nicht geladen werden.</p>
        </section>
      `;
      return;
    }

    window.PWGate.open({
      mount: root,
      heroHtml: `
        <section class="hero">
          <h1>Live Kader-Quallifikationen</h1>
        </section>
      `,
      message: "Bitte Freigabecode eingeben.",
      placeholder: "Eingabe...",
      buttonText: "Öffnen",
      invalidText: "Eingabe ungültig.",
      grantedText: "Freigabe erteilt …",
      onSuccess: boot0
    });
  };

  const stage1 = () => {
    root.innerHTML = `
      <section class="hero">
        <h1>Live Kader-Quallifikationen</h1>
      </section>
      <section class="updates">
        <h2>Erreichten Kadernormen 2026 für 2027</h2>
        <p>Die Listen berücksichtigen derzeit nur erbrachte Leistungen über Normzeiten. Keine Platzierungen! Diese Liste ist nicht offiziell und kann fehlerhaft sein. Über die folgenden Links finden Sie offizielle Informationen zum <a href="https://baden.dlrg.de/mitmachen/rettungssport/kader/" target="_blank" rel="noopener noreferrer">Landeskader</a> und <a href="https://www.dlrg.de/mitmachen/rettungssport/kader/" target="_blank" rel="noopener noreferrer">Bundeskader</a>.</p>
        <div id="Normzeiten-root" class="pz-root">
          <p id="Normzeiten-status" class="pz-statusline">Lade Normzeiten aus Excel …</p>
        </div>
      </section>
    `;
  };

  const sync0 = () =>
    new Promise((ok, no) => {
      if (typeof initNormzeitenTabellen === "function") {
        ok();
        return;
      }

      const s = document.createElement("script");
      s.src = BRIDGE_URL;
      s.async = true;

      s.onload = () => {
        if (typeof initNormzeitenTabellen === "function") {
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
    const line = document.getElementById("Normzeiten-status");

    try {
      await sync0();
    } catch (e) {
      console.error(e);
      if (line) line.textContent = "Fehler: Tabellen-Engine konnte nicht geladen werden.";
      return;
    }

    try {
      initNormzeitenTabellen(CONFIG_SHEET, CONFIG_TABLE_NAME, {
        mountId: "Normzeiten-root",
        statusId: "Normzeiten-status",
        dataExcelUrl: DATA_EXCEL_URL,
        dataSheet: DATA_SHEET,
        configExcelUrl: CONFIG_EXCEL_URL
      });
    } catch (e) {
      console.error(e);
      if (line) line.textContent = "Fehler beim Erstellen der Tabellen.";
    }
  };

  stage0();
}); 
