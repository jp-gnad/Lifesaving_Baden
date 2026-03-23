const PAGES_WEB_BASE = "https://jp-gnad.github.io/Lifesaving_Baden/web";
const PAGES_ROOT_BASE = "https://jp-gnad.github.io/Lifesaving_Baden";
const LEGACY_REMOTE_BASE = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities";
const DATA_REMOTE_BASE = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/data";

const ENABLE_PW_GATE = true;

const JRP_FOLDER = "./assets/png/JRP-Team/";
const JRP_MIN_YEAR = 2000;
const JRP_MAX_YEAR = new Date().getFullYear() + 1;
const JRP_EXTS = [".jpg"];

const JRP_SLIDE_SETTINGS = {
  "2025": {
    text: "ausgefallen - FILCOW Cup",
    cta: { label: "Mehr Infos!", href: "https://www.liveheats.com/events/389513" },
    bgPos: "center 50%",
  },
  "2024": {
    text: "ausgefallen - offene LMS Freigewässer Sachsen-Anhalt",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg.de/newsdetails/offene-landesmeisterschaften-im-freigewaesser-118339-n/",
    },
    bgPos: "center 40%",
  },
  "2023": {
    text: "LV-Gesamtwertung: 11. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/team-baden-kann-mehr-als-nur-baden-107339-n/",
    },
    bgPos: "center 40%",
  },
  "2022": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: { label: "Mehr Infos!", href: "https://ba.dlrg.de/newsdetails/junioren-rettungspokal-2022-95316-n/" },
    bgPos: "center 45%",
  },
  "2019": {
    text: "LV-Gesamtwertung: 12. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/junioren-rettungspokal-291-n/",
    },
    bgPos: "center 45%",
  },
  "2018": {
    text: "LV-Gesamtwertung: 13. Platz",
    cta: { label: "Mehr Infos!", href: "https://sachsen-anhalt.dlrg.de/rettungssport/juniorenrettungspokal/jrp-2018/" },
    bgPos: "center 48%",
  },
  "2017": {
    text: "LV-Gesamtwertung: 13. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://emsbueren.dlrg.de/mitmachen/rettungssport/wettkaempfe-und-ergebnisse/wettkampfergebnisse-nach-jahren-details/junioren-rettungspokal-2017-teil-2-gold-282-n/",
    },
    bgPos: "center 55%",
  },
  "2016": {
    text: "LV-Gesamtwertung: 12. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://emsbueren.dlrg.de/mitmachen/rettungssport/wettkaempfe-und-ergebnisse/wettkampfergebnisse-nach-jahren-details/junioren-rettungspokal-2016-in-233-n/",
    },
    bgPos: "center 60%",
  },
  "2015": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://malsch.dlrg.de/fileadmin/groups/1070080/Informer/Informer_2015-07-08.-09.pdf",
    },
    bgPos: "center 30%",
  },
  "2013": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/junioren-rettungspokal-2013-18-n/",
    },
    bgPos: "center 30%",
  },
  "2011": {
    text: "LV-Gesamtwertung: 3. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.facebook.com/photo/?fbid=283788744993599&set=pb.100066777226581.-2207520000&locale=de_DE",
    },
    bgPos: "center 35%",
  },
  "2010": {
    text: "LV-Gesamtwertung: 11. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.facebook.com/photo/?fbid=283788841660256&set=pb.100066777226581.-2207520000&locale=de_DE",
    },
    bgPos: "center 55%",
  },
  "2007": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.dlrg.de/fileadmin/user_upload/DLRG.de/Fuer-Mitglieder/Verbandskommunikation/Lebensretter/Lebensretter_2007/LR3-07_west.pdf",
    },
    bgPos: "center 40%",
  },
};

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

const CONFIG_EXCEL_URLS =
  window.location.protocol === "file:"
    ? [
        `${PAGES_WEB_BASE}/data/records_kriterien.xlsx`,
        `${PAGES_ROOT_BASE}/data/records_kriterien.xlsx`,
        `${DATA_REMOTE_BASE}/records_kriterien.xlsx`,
        `${LEGACY_REMOTE_BASE}/records_kriterien.xlsx`
      ]
    : ["./data/records_kriterien.xlsx"];
const CONFIG_SHEET = "JRP";
const CONFIG_TABLE_NAME = "JRP_konfig";

function renderProtectedMarkup() {
  return `
    <section class="info-wrap" aria-label="Nominierungen">
      <section class="info-section" aria-labelledby="dp-list-title">
        <h2 id="dp-list-title">Aktuelle Nominierungsliste</h2>
        <p class="info-status">Die Live-Nominierungen können Fehler enthalten und sind nicht ausschlaggebend für die finale Nominierung.</p>
        <div id="dp-list" class="info-links">
          <div id="pflichtzeiten-root" class="pz-root">
            <p id="pflichtzeiten-status" class="pz-statusline">Lade Pflichtzeiten aus Excel …</p>
          </div>
        </div>
      </section>
    </section>
  `;
}

async function bootProtectedContent() {
  const status = document.getElementById("pflichtzeiten-status");

  try {
    await window.CompetitionPage.waitForGlobals("initPflichtzeitenTabellen");
    window.initPflichtzeitenTabellen(CONFIG_SHEET, CONFIG_TABLE_NAME, {
      mountId: "pflichtzeiten-root",
      statusId: "pflichtzeiten-status",
      dataExcelUrls: DATA_EXCEL_URLS,
      dataSheet: DATA_SHEET,
      configExcelUrls: CONFIG_EXCEL_URLS,
    });
  } catch (err) {
    console.error(err);
    if (status) {
      status.textContent = "Pflichtzeiten konnten nicht geladen werden.";
    }
  }
}

window.CompetitionPage.init({
  pageTitle: "Junioren Rettungspokal",
  carouselAriaLabel: "Junioren Rettungspokal Rückblick",
  protectedRootId: "jrp-protected",
  gate: {
    enabled: ENABLE_PW_GATE,
    message: "Bitte Freigabecode eingeben.",
    placeholder: "Eingabe...",
    buttonText: "Öffnen",
    invalidText: "Eingabe ungültig.",
    grantedText: "Freigabe erteilt …",
  },
  carousel: {
    folder: JRP_FOLDER,
    minYear: JRP_MIN_YEAR,
    maxYear: JRP_MAX_YEAR,
    exts: JRP_EXTS,
    slideSettings: JRP_SLIDE_SETTINGS,
    titleBase: "Junioren Rettungspokal",
  },
  renderProtectedMarkup,
  bootProtectedContent,
});
