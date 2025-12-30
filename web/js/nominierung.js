function setInitialImage(imgEl, url) {
  return new Promise((resolve) => {
    const pre = new Image();
    pre.onload = () => {
      // Initial: sauber ohne Animation / ohne Klassenreste
      imgEl.classList.remove("yr-swipe-exit", "yr-swipe-enter", "yr-swipe-active");
      imgEl.removeAttribute("style"); // wichtig: keine Inline-Overrides
      imgEl.src = url;
      resolve();
    };
    pre.onerror = () => resolve();
    pre.src = url;
  });
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
      href: "#Bodensee Pokal",
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
  ];

  main.innerHTML = `
    <section class="nom-hero" aria-label="Nominierungen">
      <div class="nom-hero__inner">
        <h1>Nominierungen</h1>
      </div>
    </section>

    <section class="updates" aria-label="Aktuelles">
      <div class="container">
        <h2>Aktuelles</h2>
        <ul class="updates__list">
          <li>Erste Inhalte folgen.</li>
        </ul>
      </div>
    </section>

    <section class="intro">
      <div class="container">
        <h2>Inhalte</h2>
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
  imgs.forEach((img) => startYearRotator(img));
}

async function startYearRotator(imgEl) {
  const folder = (imgEl.dataset.folder || "").trim();
  if (!folder) return;

  const minYear = toInt(imgEl.dataset.minYear, 2000);
  const maxYear = toInt(imgEl.dataset.maxYear, new Date().getFullYear());
  const interval = toInt(imgEl.dataset.interval, 10000);

  const exts = [".jpg"];

  // 1) verfügbare URLs in absteigender Reihenfolge sammeln
  const urls = [];
  for (let y = maxYear; y >= minYear; y--) {
    const url = await firstExistingUrl(folder, y, exts);
    if (url) urls.push(url);
  }

  if (!urls.length) return;

  // 2) mit höchstem Jahr starten
  await setInitialImage(imgEl, urls[0]);

  // 3) alle 10s nächst kleineres, dann wieder von oben
  if (urls.length === 1) return;

  let idx = 0;
  window.setInterval(async () => {
    idx = (idx + 1) % urls.length;
    await swapImage(imgEl, urls[idx]);
  }, interval);
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
