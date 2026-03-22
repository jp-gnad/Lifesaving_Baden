const LEGACY_REMOTE_BASE = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities";

const ENABLE_PW_GATE = false;

const CONFIG_EXCEL_URL =
  window.location.protocol === "file:"
    ? `${LEGACY_REMOTE_BASE}/records_kriterien.xlsx`
    : "./data/records_kriterien.xlsx";
const CONFIG_SHEET = "DP";
const CONFIG_TABLE_NAME = "DP_konfig";

const DATA_EXCEL_URL =
  window.location.protocol === "file:"
    ? `${LEGACY_REMOTE_BASE}/test%20(1).xlsx`
    : "./data/test (1).xlsx";
const DATA_SHEET = "Tabelle2";

const DP_FOLDER = "./assets/png/DP-Team/";
const DP_MIN_YEAR = 1994;
const DP_MAX_YEAR = new Date().getFullYear() + 1;
const DP_EXTS = [".jpg"];

const DP_SLIDE_SETTINGS = {
  "2025": {
    text: "LV-Gesamtwertung: 8. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg.de/mitmachen/rettungssport/news-detail/drei-badische-rekorde-in-warendorf-134005-n/",
    },
    bgPos: "center 25%",
  },
  "2024": {
    text: "LV-Gesamtwertung: 9. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/deutschlandpokal-2024/",
    },
    bgPos: "center 40%",
  },
  "2023": {
    text: "LV-Gesamtwertung: 9. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/internationaler-deutschlandpokal-2023/",
    },
    bgPos: "center 50%",
  },
  "2022": {
    text: "LV-Gesamtwertung: 5. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/deutschlandpokal-2022/ergebnisse-einzel/#:~:text=Ergebnisse%20Einzel%20%2D%20Deutschlandpokal%202022%20%7C%20DLRG%20e.V.",
    },
    bgPos: "center 25%",
  },
  "2019": {
    text: "LV-Gesamtwertung: 5. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/internationaler-deutschlandpokal-2019-312-n/",
    },
    bgPos: "center 35%",
  },
  "2018": {
    text: "AUSGEFALLEN",
    bgPos: "center 45%",
  },
  "2017": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/deutschlandpokal-2017-234-n/",
    },
    bgPos: "center 45%",
  },
  "2016": {
    text: "LV-Gesamtwertung: 4. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/erfolgreicher-deutschlandpokal-2016-199-n/",
    },
    bgPos: "center 15%",
  },
  "2015": {
    text: "LV-Gesamtwertung: 8. Platz",
    cta: { label: "Mehr Infos!", href: "https://www.youtube.com/watch?v=AwgeM_VwPOs" },
    bgPos: "center 30%",
  },
  "2014": {
    text: "LV-Gesamtwertung: 8. Platz",
    cta: { label: "Mehr Infos!", href: "https://www.badische-zeitung.de/verena-weis-knackt-rekord" },
    bgPos: "center 10%",
  },
  "2013": {
    text: "LV-Gesamtwertung: 5. Platz",
    cta: { label: "Mehr Infos!", href: "https://sachsen-anhalt.dlrg.de/rettungssport/deutschlandpokal/dp-2013/" },
    bgPos: "center 20%",
  },
  "2012": {
    text: "AUSGEFALLEN",
    bgPos: "center 30%",
  },
  "2011": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.durlacher.de/start/neuigkeiten-archiv/artikel/2011/dezember/15/schwimmer-der-dlrg-durlach-auch-international-erfolgreich",
    },
    bgPos: "center 30%",
  },
  "2008": {
    text: "AUSGEFALLEN",
    bgPos: "center 50%",
  },
  "2007": {
    text: "LV-Gesamtwertung: 9. Platz",
    bgPos: "center 50%",
  },
  "2005": {
    text: "AUSGEFALLEN",
    bgPos: "center 15%",
  },
  "2000": {
    text: "LV-Gesamtwertung: 11. Platz",
    bgPos: "center 15%",
  },
  "1997": {
    text: "Team Baden",
    bgPos: "center 50%",
  },
  "1996": {
    text: "ausgefallen: 2. Deutschland Treffen",
    bgPos: "center 20%",
  },
  "1995": {
    text: "Team Baden",
    bgPos: "center 30%",
  },
  "1994": {
    text: "Team Baden",
    bgPos: "center 30%",
  },
};

function renderProtectedMarkup() {
  return `
    <section class="info-wrap" aria-label="Nominierungen">
      <section class="info-section" aria-labelledby="dp-list-title">
        <h2 id="dp-list-title">Aktuelle Nominierungsliste</h2>
        <p class="info-status">Die Live-Nominierungen können Fehler enthalten und sind nicht ausschlaggebend für die finale Nominierung.</p>
        <div id="dp-list" class="info-links">
          <p class="info-status">Lade Nominierungsliste…</p>
        </div>
      </section>
    </section>
  `;
}

async function bootProtectedContent() {
  const mount = document.getElementById("dp-list");
  if (!mount) return;

  try {
    await window.CompetitionPage.waitForGlobals("initBodenseePunkteTabelle");
    await window.initBodenseePunkteTabelle({
      mountId: "dp-list",
      configExcelUrl: CONFIG_EXCEL_URL,
      configSheet: CONFIG_SHEET,
      configTableName: CONFIG_TABLE_NAME,
      dataExcelUrl: DATA_EXCEL_URL,
      dataSheet: DATA_SHEET,
    });
  } catch (err) {
    console.error(err);
    mount.innerHTML = `<p class="info-status info-error">Nominierungsliste konnte nicht geladen werden.</p>`;
  }
}

window.CompetitionPage.init({
  pageTitle: "Deutschlandpokal",
  carouselAriaLabel: "Deutschlandpokal Rückblick",
  protectedRootId: "dp-protected",
  gate: {
    enabled: ENABLE_PW_GATE,
    message: "Bitte Freigabecode eingeben.",
    placeholder: "Eingabe...",
    buttonText: "Öffnen",
    invalidText: "Eingabe ungültig.",
    grantedText: "Freigabe erteilt …",
  },
  carousel: {
    folder: DP_FOLDER,
    minYear: DP_MIN_YEAR,
    maxYear: DP_MAX_YEAR,
    exts: DP_EXTS,
    slideSettings: DP_SLIDE_SETTINGS,
    titleBase: "Deutschlandpokal",
  },
  renderProtectedMarkup,
  bootProtectedContent,
});
