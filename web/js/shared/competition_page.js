(function (global) {
  const CompetitionPage = {};

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderCarouselShell(config, main) {
    main.innerHTML = `
      <section class="wide-carousel" aria-label="${escapeHtml(config.carouselAriaLabel)}">
        <div class="wide-carousel__viewport" data-wide-carousel tabindex="0">
          <div class="wide-carousel__slides">
            <article class="wide-carousel__slide wide-carousel__slide--center" style="background:#111">
              <div class="wide-carousel__content">
                <h2>${escapeHtml(config.pageTitle)}</h2>
                <p>${escapeHtml(config.loadingImagesText || "Lade Bilder…")}</p>
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

      <div id="${escapeHtml(config.protectedRootId)}"></div>
    `;
  }

  function renderCarouselError(config, main) {
    const usesExplicitSlides = Array.isArray(config.carousel?.slides) && config.carousel.slides.length > 0;
    const errorText = usesExplicitSlides
      ? "Keine gültigen Karussellbilder konfiguriert."
      : `Keine Jahresbilder im Ordner <code>${escapeHtml(config.carousel.folder)}</code> gefunden.`;

    main.innerHTML = `
      <section class="intro">
        <div class="container">
          <h2>${escapeHtml(config.pageTitle)}</h2>
          <p>${errorText}</p>
        </div>
      </section>
    `;
  }

  function renderGateError(config, mount) {
    mount.innerHTML = `
      <section class="info-wrap" aria-label="${escapeHtml(config.gateErrorAriaLabel || "Nominierungen")}">
        <section class="info-section">
          <p class="info-status info-error">${escapeHtml(config.gateErrorText || "PW.js konnte nicht geladen werden.")}</p>
        </section>
      </section>
    `;
  }

  function waitForGlobals(names, timeoutMs = 6000) {
    const list = (Array.isArray(names) ? names : [names]).filter(Boolean);

    if (!list.length) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const started = Date.now();

      const tick = () => {
        const missing = list.filter((name) => typeof global[name] !== "function");
        if (!missing.length) {
          resolve();
          return;
        }

        if (Date.now() - started >= timeoutMs) {
          reject(new Error(`globals_missing:${missing.join(",")}`));
          return;
        }

        setTimeout(tick, 50);
      };

      tick();
    });
  }

  async function initCarousel(config, main) {
    await waitForGlobals("initPictureKarussel");
    await global.initPictureKarussel({
      rootSelector: "[data-wide-carousel]",
      folder: config.carousel.folder,
      minYear: config.carousel.minYear,
      maxYear: config.carousel.maxYear,
      exts: config.carousel.exts,
      yearSuffixes: config.carousel.yearSuffixes,
      slides: config.carousel.slides,
      slideSettings: config.carousel.slideSettings,
      fallbackSlide: config.carousel.fallbackSlide,
      titleBase: config.carousel.titleBase
    });
  }

  async function mountProtectedContent(config) {
    const root = document.getElementById(config.protectedRootId);
    if (!root) return;

    root.innerHTML =
      typeof config.renderProtectedMarkup === "function"
        ? config.renderProtectedMarkup()
        : String(config.renderProtectedMarkup || "");

    if (typeof config.bootProtectedContent === "function") {
      await config.bootProtectedContent();
    }
  }

  async function initProtectedArea(config) {
    const root = document.getElementById(config.protectedRootId);
    if (!root) return;

    if (!config.gate?.enabled) {
      await mountProtectedContent(config);
      return;
    }

    if (!global.PWGate || typeof global.PWGate.open !== "function") {
      renderGateError(config, root);
      return;
    }

    global.PWGate.open({
      mountId: config.protectedRootId,
      message: config.gate.message || "Bitte Freigabecode eingeben.",
      placeholder: config.gate.placeholder || "Eingabe...",
      buttonText: config.gate.buttonText || "Öffnen",
      invalidText: config.gate.invalidText || "Eingabe ungültig.",
      grantedText: config.gate.grantedText || "Freigabe erteilt …",
      onSuccess: async () => {
        await mountProtectedContent(config);
      }
    });
  }

  CompetitionPage.waitForGlobals = waitForGlobals;

  CompetitionPage.init = function init(userConfig = {}) {
    const config = {
      loadingImagesText: "Lade Bilder…",
      ...userConfig
    };

    document.addEventListener("DOMContentLoaded", async () => {
      const main = document.getElementById("content");
      if (!main) return;

      renderCarouselShell(config, main);

      try {
        await initCarousel(config, main);
      } catch (err) {
        console.error(err);
        renderCarouselError(config, main);
        return;
      }

      try {
        await initProtectedArea(config);
      } catch (err) {
        console.error(err);
      }
    });
  };

  global.CompetitionPage = CompetitionPage;
})(window);
