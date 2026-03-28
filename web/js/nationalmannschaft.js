const PAGES_WEB_BASE = "https://jp-gnad.github.io/Lifesaving_Baden/web";
const PAGES_ROOT_BASE = "https://jp-gnad.github.io/Lifesaving_Baden";
const LEGACY_REMOTE_BASE = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities";
const DATA_REMOTE_BASE = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/data";

const ENABLE_PW_GATE = false;

const CONFIG_EXCEL_URLS =
  window.location.protocol === "file:"
    ? [
        `${PAGES_WEB_BASE}/data/records_kriterien.xlsx`,
        `${PAGES_ROOT_BASE}/data/records_kriterien.xlsx`,
        `${DATA_REMOTE_BASE}/records_kriterien.xlsx`,
        `${LEGACY_REMOTE_BASE}/records_kriterien.xlsx`
      ]
    : ["./data/records_kriterien.xlsx"];
const CONFIG_SHEET = "Natio";
const CONFIG_TABLE_NAME = "Natio_konfig";

const DATA_EXCEL_URLS =
  window.location.protocol === "file:"
    ? [
        `${PAGES_WEB_BASE}/data/test (1).xlsx`,
        `${PAGES_ROOT_BASE}/data/test (1).xlsx`,
        `${DATA_REMOTE_BASE}/test (1).xlsx`,
        `${LEGACY_REMOTE_BASE}/test (1).xlsx`
      ]
    : ["./data/test (1).xlsx"];
const DATA_SHEET = "Tabelle2";

function renderProtectedMarkup() {
  return `
    <section class="info-wrap" aria-label="Nationalmannschaften">
      <section class="info-section" aria-labelledby="natio-info-title">
        <h2 id="natio-info-title">Infos zur Nationalmannschaft</h2>
        <p class="info-copy">
          Die zwei Punktbesten Mehrkämpfer*innen in den Pool-Disziplinen im Nominierungszeitraum können vorrangig nominiert werden.
          Siehe
          <a href="https://www.dlrg.de/mitmachen/rettungssport/kader/" target="_blank" rel="noopener noreferrer">Nominierungsrichtlinien der DLRG</a>.
        </p>
        <h2 id="natio-list-title">Alle Badischen 4-Kämpfler</h2>
        <div id="natio-list" class="info-links">
          <p class="info-status">Lade 4-Kampf-Liste…</p>
        </div>
      </section>
    </section>
  `;
}

async function bootProtectedContent() {
  const mount = document.getElementById("natio-list");
  if (!mount) return;

  try {
    await window.CompetitionPage.waitForGlobals("initBodenseePunkteTabelle");
    await window.initBodenseePunkteTabelle({
      mountId: "natio-list",
      configExcelUrls: CONFIG_EXCEL_URLS,
      configSheet: CONFIG_SHEET,
      configTableName: CONFIG_TABLE_NAME,
      dataExcelUrls: DATA_EXCEL_URLS,
      dataSheet: DATA_SHEET,
      pointsMode: "natio",
    });
  } catch (err) {
    console.error(err);
    mount.innerHTML = `<p class="info-status info-error">Die 4-Kampf-Liste konnte nicht geladen werden.</p>`;
  }
}

window.CompetitionPage.init({
  pageTitle: "Nationalmannschaften",
  carouselAriaLabel: "Nationalmannschaften Rückblick",
  protectedRootId: "natio-protected",
  gate: {
    enabled: ENABLE_PW_GATE,
    message: "Bitte Freigabecode eingeben.",
    placeholder: "Eingabe...",
    buttonText: "Öffnen",
    invalidText: "Eingabe ungültig.",
    grantedText: "Freigabe erteilt …",
  },
  carousel: {
    slides: [
      {
        year: 2024,
        img: "./assets/png/Natio-Team/2024.JPG",
        text: "Johanna Gnad - Junioren Europameisterschaft - Deutschland",
      },
      {
        year: 2023,
        img: "./assets/png/Natio-Team/2023.jpg",
        text: "Johanna Gnad - Junioren Europameisterschaft - Polen",
        bgPos: "center 45%",
      },
      {
        year: 2012,
        img: "./assets/png/Natio-Team/2012-1.jpg",
        text: "Maximilian Deppisch - Victorinox Cup - Schweiz",
        bgPos: "center 20%",
      },
      {
        year: 2012,
        img: "./assets/png/Natio-Team/2012-2.jpg",
        text: "Maximilian Deppisch - Arena Rescue - Frankreich",
        bgPos: "center 20%",
      },
      {
        year: 2011,
        img: "./assets/png/Natio-Team/2011.jpg",
        text: "Holger Schulz - Junioren Europameisterschaft - Dänemark",
        bgPos: "center 40%",
      },
    ],
    titleBase: "Nationalmannschaft",
  },
  renderProtectedMarkup,
  bootProtectedContent,
});
