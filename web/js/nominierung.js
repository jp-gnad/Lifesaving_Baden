// 1) setInitialImage so anpassen, dass es Erfolg zurückgibt (true/false)
function setInitialImage(imgEl, url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const pre = new Image();
    let done = false;

    const t = window.setTimeout(() => {
      if (done) return;
      done = true;
      resolve(false);
    }, timeoutMs);

    pre.onload = () => {
      if (done) return;
      done = true;
      window.clearTimeout(t);

      // sauber ohne Animation / ohne Klassenreste
      imgEl.classList.remove("yr-swipe-exit", "yr-swipe-enter", "yr-swipe-active");
      imgEl.removeAttribute("style");
      // für Above-the-fold: nicht künstlich verzögern
      imgEl.loading = "eager";
      imgEl.decoding = "async";
      imgEl.setAttribute("fetchpriority", "high");

      imgEl.src = url;
      resolve(true);
    };

    pre.onerror = () => {
      if (done) return;
      done = true;
      window.clearTimeout(t);
      resolve(false);
    };

    pre.src = url;
  });
}

// optional: Browser ruhig arbeiten lassen (statt UI zu blocken)
function idleYield() {
  return new Promise((r) => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => r(), { timeout: 800 });
    } else {
      setTimeout(() => r(), 0);
    }
  });
}

// optional: in den Cache vorladen, damit spätere Swaps sofort sind
function preloadImage(url) {
  const img = new Image();
  img.decoding = "async";
  img.loading = "eager";
  img.src = url;
}



// nominierung.js
document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  const NOM_CARDS = [
    {
      href: "./deutschlandpokal.html",
      kicker: "int. Deutschlandpokal (DP)",
      main: "Nominierungsrichtlinien & Liste",
      more: "Du möchtest einemal teil der Badischen Auswahlmannschaft für den Deutschlandpokal sein? Versuche die Kriterien zu erfüllen und dich in der Liste hoch zu schwimmen!",
      aria: "Deutschland Pokal",
      rotator: {
        folder: "./png/DP-Team/",
        minYear: 2000,
        maxYear: new Date().getFullYear() + 1,
        intervalMs: 15000,
      },
    },
    {
      href: "./bodenseepokal.html",
      kicker: "Bodensee Pokal (BP)",
      main: "Nominierungsrichtlinien & Liste",
      more: "Du möchtest einemal teil der Badischen Auswahlmannschaft für den Bodensee Pokal sein? Versuche die Kriterien zu erfüllen und dich in der Liste hoch zu schwimmen!",
      aria: "Junioren Rettungspokal",

      rotator: {
        folder: "./png/BP-Team/",
        minYear: 2000,
        maxYear: new Date().getFullYear() + 1,
        intervalMs: 15000
      },
    },
    {
      href: "./juniorenrettungspokal.html",
      kicker: "Junioren Rettungspokal (JRP)",
      main: "Nominierungsrichtlinien & Liste",
      more: "Du möchtest einemal teil der Badischen Auswahlmannschaft für den Junioren Rettungspokal sein? Versuche die Kriterien zu erfüllen und dich in der Liste hoch zu schwimmen!",
      aria: "Junioren Rettungspokal",

      rotator: {
        folder: "./png/JRP-Team/",
        minYear: 2000,
        maxYear: new Date().getFullYear() + 1,
        intervalMs: 15000
      },
    },
    {
      href: "./dem.html",
      kicker: "Deutsche Einzelstrecken Meisterschaften (DEM)",
      main: "Erreichte Pflichtzeiten in Baden",
      more: "Die DEM gehören zu den höchsten und wichtigsten Wettkämpfen im Rettungssport. Teilnahmeberechtigt sind nur die besten Schwimmer deutschlands.",
      aria: "Deutsche Einzelstrecken Meisterschaften",

      img: "./png/hintergrund9.jpg",
    },
  ];

  main.innerHTML = `
    <section class="nom-hero" aria-label="Nominierungen_Wettkämpfe">
      <div class="nom-hero__inner">
        <h1>Wettkämpfe / Nominierungen</h1>
      </div>
    </section>

    <section class="updates" aria-label="Aktuelles">
      <div class="container">
        <h2>Wettkämpfe finden</h2>
        <p>Auf diesen Internetseiten findest du eine Übersicht zu einem Großteil der nationalen und internationalen Wettkämpfe.</p>

        <ul class="updates__list">
          <li>
            <a href="https://www.dlrg.de/mitmachen/rettungssport/nationale-und-internationale-wettkaempfe/" target="_blank" rel="noopener noreferrer">
              DLRG Bundesverband
            </a>
          </li>
          <li>
            <a href="https://baden.dlrg.de/mitmachen/rettungssport/wettkaempfe/" target="_blank" rel="noopener noreferrer">
              DLRG Landesverband Baden
            </a>
          </li>
          <li>
            <a href="https://rettungssport.com/wettkaempfe/" target="_blank" rel="noopener noreferrer">
              Rettungssport.com
            </a>
          </li>
          <li>
            <a href="https://sport.ilsf.org/calendar" target="_blank" rel="noopener noreferrer">
              International Life Saving Federation (ILS)
            </a>
          </li>
        </ul>
      </div>
    </section>

    <section class="intro">
      <div class="container">
        <h2>Aktuelle Nominierungen</h2>
      </div>
    </section>

    <section class="home-links" aria-label="Nominierung Inhalte">
      <div class="container">
        <div class="home-cards">
          ${NOM_CARDS.map((c) => {
            const isRotator = !!c.rotator;
            const imgSrc = (c.imgFallback || c.img || "");
            const rot = c.rotator || {};
            const rotAttrs = isRotator
              ? `data-year-rotator="1"
                 data-folder="${rot.folder}"
                 data-min-year="${rot.minYear}"
                 data-max-year="${rot.maxYear}"
                 data-interval="${rot.intervalMs}"`
              : "";

            return `
              <a class="home-card" href="${c.href}" aria-label="${c.aria}">
                <img class="home-card__img"
                     src="${imgSrc}"
                     alt=""
                     loading="lazy"
                     decoding="async"
                     ${rotAttrs}>
                <div class="home-card__overlay">
                  <div class="home-card__kicker">${c.kicker}</div>
                  <div class="home-card__box home-card__box--main">${c.main}</div>
                  <div class="home-card__box home-card__box--more">${c.more}</div>
                </div>
              </a>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;

  initYearRotators();
});

/* ===== Jahresbild-Rotation (2025, 2024, 2023, ...; fehlende Jahre werden übersprungen) ===== */

function initYearRotators() {
  const imgs = document.querySelectorAll('img[data-year-rotator="1"]');
  if (!imgs.length) return;

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        obs.unobserve(e.target);
        startYearRotator(e.target);
      }
    },
    { root: null, rootMargin: "250px 0px" } // etwas vor dem Sichtbereich starten
  );

  imgs.forEach((img) => io.observe(img));
}

// 3) Neu: erst neuestes Bild finden/anzeigen, danach Hintergrund-Scan
async function startYearRotator(imgEl) {
  const folder = (imgEl.dataset.folder || "").trim();
  if (!folder) return;

  const minYear = toInt(imgEl.dataset.minYear, 2000);
  const maxYear = toInt(imgEl.dataset.maxYear, new Date().getFullYear());
  const interval = toInt(imgEl.dataset.interval, 10000);

  const exts = [".jpg"];

  // A) Sofort: neuestes vorhandenes Bild finden (stoppt beim ersten Treffer)
  let foundYear = null;
  let firstUrl = null;

  outer:
  for (let y = maxYear; y >= minYear; y--) {
    for (const ext of exts) {
      const url = `${folder}${y}${ext}`;
      const ok = await setInitialImage(imgEl, url); // lädt genau dieses Bild
      if (ok) {
        foundYear = y;
        firstUrl = url;
        break outer;
      }
    }
    // kleine Entlastung fürs UI (optional)
    await idleYield();
  }

  if (!firstUrl) return;

  // B) URLs-Liste beginnt mit dem neuesten Bild
  const urls = [firstUrl];
  let idx = 0;

  // C) Rotation läuft, macht aber erst was, wenn mehr als 1 Bild bekannt ist
  const timer = window.setInterval(() => {
    if (urls.length < 2) return;
    idx = (idx + 1) % urls.length;
    swapImage(imgEl, urls[idx]);
  }, interval);

  // D) Hintergrund: ältere Jahre einsammeln (blockiert Initialanzeige nicht)
  (async () => {
    for (let y = foundYear - 1; y >= minYear; y--) {
      const url = await firstExistingUrl(folder, y, exts); // nutzt deine urlExists/probeByImage
      if (url) {
        urls.push(url);
        preloadImage(url); // optional: macht Swaps später schneller
      }
      await idleYield();
    }
  })();
}

function toInt(v, fallback) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function firstExistingUrl(folder, year, exts) {
  for (const ext of exts) {
    const url = `${folder}${year}${ext}`;
    if (await urlExists(url)) return url;
  }
  return null;
}

async function urlExists(url) {
  // bevorzugt HEAD (sparsam), Fallback auf Image-Probe
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
    return res.ok;
  } catch {
    return await probeByImage(url, 3500);
  }
}

function probeByImage(url, timeoutMs) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;

    const t = window.setTimeout(() => {
      if (done) return;
      done = true;
      img.src = "";
      resolve(false);
    }, timeoutMs);

    img.onload = () => {
      if (done) return;
      done = true;
      window.clearTimeout(t);
      resolve(true);
    };

    img.onerror = () => {
      if (done) return;
      done = true;
      window.clearTimeout(t);
      resolve(false);
    };

    img.src = url;
  });
}
function swapImage(imgEl, url) {
  return new Promise((resolve) => {
    if (!imgEl || !url) return resolve();

    const current = imgEl.getAttribute("src") || "";
    if (current.endsWith(url)) return resolve();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      imgEl.src = url;
      return resolve();
    }

    if (imgEl.dataset.rotBusy === "1") return resolve();
    imgEl.dataset.rotBusy = "1";

    const pre = new Image();
    pre.onload = () => {
      const parent = imgEl.parentElement;
      if (!parent) {
        imgEl.dataset.rotBusy = "0";
        return resolve();
      }

      // Buffer (neu) – kommt von rechts rein
      const buffer = document.createElement("img");
      buffer.className = "home-card__img yr-swipe-enter";
      buffer.src = url;
      buffer.alt = "";
      buffer.decoding = "async";
      buffer.loading = "eager";

      parent.insertBefore(buffer, imgEl.nextSibling);

      // Startzustand sicher anwenden
      buffer.getBoundingClientRect();

      // Animation: alt nach links raus, neu von rechts rein
      imgEl.classList.add("yr-swipe-exit");
      requestAnimationFrame(() => buffer.classList.add("yr-swipe-active"));

      const finish = () => {
        // Wichtig: Cleanup OHNE Transition, sonst „wischt“ das alte Bild zurück
        const prevTransition = imgEl.style.transition;
        imgEl.style.transition = "none";

        // jetzt auf neues Bild umstellen und Exit-Klasse entfernen (snap ohne Animation)
        imgEl.src = url;
        imgEl.classList.remove("yr-swipe-exit");

        // reflow, dann Transition wieder aktivieren
        imgEl.getBoundingClientRect();
        imgEl.style.transition = prevTransition || "";

        buffer.remove();
        imgEl.dataset.rotBusy = "0";
        resolve();
      };

      let done = false;
      const onEnd = (e) => {
        if (done) return;
        if (e.propertyName !== "transform") return;
        done = true;
        buffer.removeEventListener("transitionend", onEnd);
        finish();
      };

      buffer.addEventListener("transitionend", onEnd);

      const fallbackMs = getMaxTransitionMs(buffer) + 80;

      window.setTimeout(() => {
        if (done) return;
        done = true;
        buffer.removeEventListener("transitionend", onEnd);
        finish();
      }, fallbackMs);

    };

    pre.onerror = () => {
      imgEl.dataset.rotBusy = "0";
      resolve();
    };

    function getMaxTransitionMs(el) {
  const cs = window.getComputedStyle(el);
  const durs = parseTimeList(cs.transitionDuration);
  const dels = parseTimeList(cs.transitionDelay);

  const n = Math.max(durs.length, dels.length);
  let max = 0;

  for (let i = 0; i < n; i++) {
    const d = durs[i % durs.length] || 0;
    const t = dels[i % dels.length] || 0;
    max = Math.max(max, d + t);
  }
  return max;
}

function parseTimeList(str) {
  // "0.65s, 420ms" -> [650, 420]
  return (str || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(v => {
      if (v.endsWith("ms")) return parseFloat(v);
      if (v.endsWith("s")) return parseFloat(v) * 1000;
      return parseFloat(v) || 0;
    });
}


    pre.src = url;
  });
}
