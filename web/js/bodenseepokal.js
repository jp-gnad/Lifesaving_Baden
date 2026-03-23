const PAGES_WEB_BASE = "https://jp-gnad.github.io/Lifesaving_Baden/web";
const PAGES_ROOT_BASE = "https://jp-gnad.github.io/Lifesaving_Baden";
const LEGACY_REMOTE_BASE = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities";
const DATA_REMOTE_BASE = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/data";

const ENABLE_PW_GATE = true;

const CONFIG_EXCEL_URLS =
  window.location.protocol === "file:"
    ? [
        `${PAGES_WEB_BASE}/data/records_kriterien.xlsx`,
        `${PAGES_ROOT_BASE}/data/records_kriterien.xlsx`,
        `${DATA_REMOTE_BASE}/records_kriterien.xlsx`,
        `${LEGACY_REMOTE_BASE}/records_kriterien.xlsx`
      ]
    : ["./data/records_kriterien.xlsx"];
const CONFIG_SHEET = "BP";
const CONFIG_TABLE_NAME = "BP_konfig";

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

const BP_FOLDER = "./assets/png/BP-Team/";
const BP_MIN_YEAR = 1995;
const BP_MAX_YEAR = new Date().getFullYear() + 1;
const BP_EXTS = [".jpg"];

const BP_SLIDE_SETTINGS = {
  "2025": {
    text: "LV-Gesamtwertung: 2. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg.de/mitmachen/rettungssport/news-detail/bodensee-pokal-feiert-revival-131606-n/",
    },
    bgPos: "center 55%",
  },
  "2007": {
    text: "LV-Gesamtwertung: 2. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://malsch.dlrg.de/fileadmin/groups/1070080/Informer/Informer_2007-08.pdf",
    },
    bgPos: "center 30%",
  },
  "2004": {
    text: "LV-Gesamtwertung: 2. Platz",
    bgPos: "center 50%",
  },
  "2000": {
    text: "LV-Gesamtwertung: 1. Platz",
    bgPos: "center 20%",
  },
  "1996": {
    text: "LV-Gesamtwertung: Damen & Herren 2. Platz",
    bgPos: "center 50%",
  },
  "1995": {
    text: "Herrenmannschaft Baden 1",
    bgPos: "center 30%",
  },
};

function renderProtectedMarkup() {
  return `
    <section class="info-wrap" aria-label="Nominierungen">
      <section class="info-section" aria-labelledby="bp-list-title">
        <h2 id="bp-list-title">Aktuelle Nominierungsliste</h2>
        <p class="info-status">Die Live-Nominierungen können Fehler enthalten und sind nicht ausschlaggebend für die finale Nominierung.</p>
        <div id="bp-list" class="info-links">
          <p class="info-status">Lade Nominierungsliste…</p>
        </div>
      </section>
    </section>
  `;
}

async function bootProtectedContent() {
  const mount = document.getElementById("bp-list");
  if (!mount) return;

  try {
    await window.CompetitionPage.waitForGlobals("initBodenseePunkteTabelle");
    await window.initBodenseePunkteTabelle({
      mountId: "bp-list",
      configExcelUrls: CONFIG_EXCEL_URLS,
      configSheet: CONFIG_SHEET,
      configTableName: CONFIG_TABLE_NAME,
      dataExcelUrls: DATA_EXCEL_URLS,
      dataSheet: DATA_SHEET,
    });
  } catch (err) {
    console.error(err);
    mount.innerHTML = `<p class="info-status info-error">Nominierungsliste konnte nicht geladen werden.</p>`;
  }
}

window.CompetitionPage.init({
  pageTitle: "Bodensee Pokal",
  carouselAriaLabel: "Bodensee Pokal Rückblick",
  protectedRootId: "bp-protected",
  gate: {
    enabled: ENABLE_PW_GATE,
    message: "Bitte Freigabecode eingeben.",
    placeholder: "Eingabe...",
    buttonText: "Öffnen",
    invalidText: "Eingabe ungültig.",
    grantedText: "Freigabe erteilt …",
  },
  carousel: {
    folder: BP_FOLDER,
    minYear: BP_MIN_YEAR,
    maxYear: BP_MAX_YEAR,
    exts: BP_EXTS,
    slideSettings: BP_SLIDE_SETTINGS,
    titleBase: "Bodensee Pokal",
  },
  renderProtectedMarkup,
  bootProtectedContent,
});
