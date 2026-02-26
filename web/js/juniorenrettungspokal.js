const DP_FOLDER = "./png/JRP-Team/";
const DP_MIN_YEAR = 2000;
const DP_MAX_YEAR = new Date().getFullYear() + 1;
const DP_EXTS = [".jpg"];
const PICTURE_KARUSSEL_SRC = "/juniorenrettungspokal/picture_karussel.js";

const DP_SLIDE_SETTINGS = {
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

const DATA_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test%20(1).xlsx";
const DATA_SHEET = "Tabelle2";

const CONFIG_EXCEL_URL =
  "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx";
const CONFIG_SHEET = "JRP";
const CONFIG_TABLE_NAME = "JRP_konfig";

document.addEventListener("DOMContentLoaded", async () => {
  const main = document.getElementById("content");
  if (!main) return;

  renderShell(main);

  try {
    await ensurePictureKarusselScript();
    await window.initPictureKarussel({
      rootSelector: "[data-wide-carousel]",
      folder: DP_FOLDER,
      minYear: DP_MIN_YEAR,
      maxYear: DP_MAX_YEAR,
      exts: DP_EXTS,
      slideSettings: DP_SLIDE_SETTINGS,
    });
  } catch (e) {
    console.error(e);
    main.innerHTML = `
      <section class="intro">
        <div class="container">
          <h2>Junioren Rettungspokal</h2>
          <p>Keine Jahresbilder im Ordner <code>${DP_FOLDER}</code> gefunden.</p>
        </div>
      </section>
    `;
    return;
  }

  initDpNominationListTables();
});

function renderShell(main) {
  main.innerHTML = `
    <section class="wide-carousel" aria-label="Junioren Rettungspokal Rückblick">
      <div class="wide-carousel__viewport" data-wide-carousel tabindex="0">
        <div class="wide-carousel__slides">
          <article class="wide-carousel__slide wide-carousel__slide--center" style="background:#111">
            <div class="wide-carousel__content">
              <h2>Junioren Rettungspokal</h2>
              <p>Lade Bilder…</p>
            </div>
          </article>
        </div>

        <button class="wide-carousel__arrow wide-carousel__arrow--prev" type="button" aria-label="Vorherige Folie">
          <svg class="wide-carousel__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </button>

        <button class="wide-carousel__arrow wide-carousel__arrow--next" type="button" aria-label="Nächste Folie">
          <svg class="wide-carousel__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </button>
      </div>
    </section>

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

function ensurePictureKarusselScript() {
  if (typeof window.initPictureKarussel === "function") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-picture-karussel="${PICTURE_KARUSSEL_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (typeof window.initPictureKarussel === "function") resolve();
        else reject(new Error("picture_karussel_init_missing"));
      });
      existing.addEventListener("error", () => reject(new Error("picture_karussel_load_failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = PICTURE_KARUSSEL_SRC;
    script.defer = true;
    script.dataset.pictureKarussel = PICTURE_KARUSSEL_SRC;
    script.onload = () => {
      if (typeof window.initPictureKarussel === "function") resolve();
      else reject(new Error("picture_karussel_init_missing"));
    };
    script.onerror = () => reject(new Error("picture_karussel_load_failed"));
    document.head.appendChild(script);
  });
}

function initDpNominationListTables() {
  if (typeof initPflichtzeitenTabellen !== "function") {
    console.error("PZ_tabellen.js ist nicht geladen oder initPflichtzeitenTabellen fehlt.");
    return;
  }

  initPflichtzeitenTabellen(CONFIG_SHEET, CONFIG_TABLE_NAME, {
    mountId: "pflichtzeiten-root",
    statusId: "pflichtzeiten-status",
    dataExcelUrl: DATA_EXCEL_URL,
    dataSheet: DATA_SHEET,
    configExcelUrl: CONFIG_EXCEL_URL,
  });
}