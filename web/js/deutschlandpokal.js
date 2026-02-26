const CONFIG_EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/records_kriterien.xlsx";
const CONFIG_SHEET = "DP";
const CONFIG_TABLE_NAME = "DP_konfig";

const DATA_EXCEL_URL = "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/utilities/test%20(1).xlsx";
const DATA_SHEET = "Tabelle2";

const PICTURE_KARUSSEL_SRC = "/juniorenrettungspokal/picture_karussel.js";
const PUNKTE_TABELLE_SRC = "/bodenseepokal/Punkte_tabelle.js";

const DP_FOLDER = "./png/DP-Team/";
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
    bgPos: "center 65%",
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
  "2017": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://baden.dlrg-jugend.de/wir/news/detailansicht/deutschlandpokal-2017-234-n/",
    },
    bgPos: "center 50%",
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
  "2011": {
    text: "LV-Gesamtwertung: 7. Platz",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.durlacher.de/start/neuigkeiten-archiv/artikel/2011/dezember/15/schwimmer-der-dlrg-durlach-auch-international-erfolgreich",
    },
    bgPos: "center 30%",
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
          <h2>Deutschlandpokal</h2>
          <p>Keine Jahresbilder im Ordner <code>${DP_FOLDER}</code> gefunden.</p>
        </div>
      </section>
    `;
    return;
  }

  try {
    await ensurePunkteTabelleScript();
    await window.initBodenseePunkteTabelle({
      mountId: "dp-list",
      configExcelUrl: CONFIG_EXCEL_URL,
      configSheet: CONFIG_SHEET,
      configTableName: CONFIG_TABLE_NAME,
      dataExcelUrl: DATA_EXCEL_URL,
      dataSheet: DATA_SHEET,
    });
  } catch (e) {
    console.error(e);
    const mount = document.getElementById("dp-list");
    if (mount) {
      mount.innerHTML = `<p class="info-status info-error">Nominierungsliste konnte nicht geladen werden.</p>`;
    }
  }
});

function renderShell(main) {
  main.innerHTML = `
    <section class="wide-carousel" aria-label="Deutschlandpokal Rückblick">
      <div class="wide-carousel__viewport" data-wide-carousel tabindex="0">
        <div class="wide-carousel__slides">
          <article class="wide-carousel__slide wide-carousel__slide--center" style="background:#111">
            <div class="wide-carousel__content">
              <h2>Deutschlandpokal</h2>
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
          <p class="info-status">Lade Nominierungsliste…</p>
        </div>
      </section>
    </section>
  `;
}

function ensurePictureKarusselScript() {
  if (typeof window.initPictureKarussel === "function") return Promise.resolve();
  return ensureScript(PICTURE_KARUSSEL_SRC, () => typeof window.initPictureKarussel === "function", "picture_karussel_init_missing");
}

function ensurePunkteTabelleScript() {
  if (typeof window.initBodenseePunkteTabelle === "function") return Promise.resolve();
  return ensureScript(PUNKTE_TABELLE_SRC, () => typeof window.initBodenseePunkteTabelle === "function", "punkte_tabelle_init_missing");
}

function ensureScript(src, validateFn, missingErrCode) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.querySelectorAll("script[data-module-src]")).find(
      (el) => el.dataset.moduleSrc === src
    );

    const onLoadCheck = () => {
      if (validateFn()) resolve();
      else reject(new Error(missingErrCode));
    };

    if (existing) {
      if (validateFn()) {
        resolve();
        return;
      }
      existing.addEventListener("load", onLoadCheck, { once: true });
      existing.addEventListener("error", () => reject(new Error(`script_load_failed:${src}`)), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.defer = true;
    s.dataset.moduleSrc = src;
    s.onload = onLoadCheck;
    s.onerror = () => reject(new Error(`script_load_failed:${src}`));
    document.head.appendChild(s);
  });
}