// ------------------------
// DATA
// ------------------------
const WIDE_SLIDES = [
  {
    title: "Rettungssport",
    text: "Willkommen auf der inoffiziellen Internetseite des Lifesaving Team Badens. Hier findest du nützliche Informationen rund um den Rettungssport in Baden.",
    img: "./png/hintergrund1.JPG",
    bgY: "50%",
  },
  {
    title: "Kalender",
    text: "Aktueller Jahresplan vom Landeskader Baden",
    img: "./png/karussel/bild3.jpg",
    cta: { label: "Mehr Infos!", href: "./kalender.html" },
    bgY: "50%",
  },
  {
    title: "Infoschreiben",
    text: "Aktuelles Jahres Infoschreiben vom Landeskader Baden",
    img: "./png/karussel/bild5.JPG",
    cta: { label: "Mehr Infos!", href: "./info.html" },
    bgY: "50%",
  },
  {
    title: "Dopingprävention",
    text: "Auch in der DLRG wird Leistungssport betrieben und obwohl die Rettungssportler ihren Sport als Amateure ausüben, unterliegen sie den Anti-Doping-Regeln der NADA (Nationale Antidoping Agentur) und der WADA (Welt Antidoping Agentur).",
    img: "./png/karussel/bild4.jpg",
    cta: {
      label: "Mehr Infos!",
      href: "https://www.dlrg.de/mitmachen/rettungssport/kader/dopingpraevention/",
    },
    bgY: "50%",
  },
  {
    title: "Lifesaving World Championships",
    text: "Die LWC finden 2026 vom 25. Nov bis 13. Dec in Port Elizabeth / Südafrika statt. Du hast Interesse aber keine Ahnung wie das Abläuft? Frag bei uns nach! Wir versuchen zusammen als Baden etwas zu organisieren.",
    img: "./png/karussel/bild6.JPG",
    // YouTube Background (Video-ID aus https://www.youtube.com/watch?v=bm8cO1HoZGk)
    yt: { id: "bm8cO1HoZGk", start: 0, delayMs: 2000 },
    cta: { label: "Mehr Infos!", href: "https://lifesaving2026.com/" },
    bgY: "35%",
  },
];

// ------------------------
// YouTube IFrame API Loader
// ------------------------
let ytApiPromise = null;

function loadYouTubeAPI() {
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });

  return ytApiPromise;
}

// ------------------------
// RENDER
// ------------------------
document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="wide-carousel" aria-label="Highlights">
      <div class="wide-carousel__viewport" data-wide-carousel>
        <div class="wide-carousel__slides">
          ${WIDE_SLIDES.map((s, i) => `
            <article
              class="wide-carousel__slide ${i === 0 ? "wide-carousel__slide--center is-active" : ""}"
              style="background-image:url('${s.img}'); --bg-y:${s.bgY ?? "50%"};"
              role="group"
              aria-roledescription="Folie"
              aria-label="${i + 1} von ${WIDE_SLIDES.length}"
              aria-hidden="${i === 0 ? "false" : "true"}"
              data-has-yt="${s.yt ? "1" : "0"}"
              data-yt-id="${s.yt?.id ?? ""}"
              data-yt-start="${s.yt?.start ?? 0}"
              data-yt-delay="${s.yt?.delayMs ?? 2000}"
            >
              ${s.yt ? `<div class="wide-carousel__yt" aria-hidden="true"></div>` : ``}

              <div class="wide-carousel__content">
                <h2>${s.title}</h2>
                <p>${s.text}</p>
                ${s.cta ? `<a class="wide-carousel__cta" href="${s.cta.href}">${s.cta.label}</a>` : ``}
              </div>
            </article>
          `).join("")}
        </div>

        <button class="wide-carousel__nav wide-carousel__nav--prev" type="button" aria-label="Vorherige Folie"></button>
        <button class="wide-carousel__nav wide-carousel__nav--next" type="button" aria-label="Nächste Folie"></button>

        <div class="wide-carousel__dots" role="tablist" aria-label="Folie auswählen">
          ${WIDE_SLIDES.map((_, i) => `
            <button class="wide-carousel__dot ${i === 0 ? "is-active" : ""}" type="button" role="tab"
                    aria-label="Folie ${i + 1}"
                    aria-selected="${i === 0 ? "true" : "false"}"
                    data-slide="${i}">
            </button>
          `).join("")}
        </div>
      </div>
    </section>

    <section class="intro">
      <div class="container">
        <h2>Willkommen beim Lifesaving Team Baden</h2>
      </div>
    </section>

    <section class="home-links" aria-label="Athletenprofile">
      <div class="container">
        <div class="home-cards">

          <a class="home-card" href="./athleten.html" aria-label="Dein Athletenprofil">
            <img class="home-card__img" src="./png/hintergrund4.JPG" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">Dein Athletenprofil</div>
              <div class="home-card__box home-card__box--main">Infos aus Wettkämpfen</div>
              <div class="home-card__box home-card__box--more">
                Bestzeiten, Informationen und deine Entwicklung – kompakt auf einen Blick.
              </div>
            </div>
          </a>

          <a class="home-card" href="./punkterechner.html" aria-label="DLRG Punkterechner">
            <img class="home-card__img" src="./png/hintergrund5.JPG" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">DLRG Punkterechner</div>
              <div class="home-card__box home-card__box--main">National und internationale Punkte</div>
              <div class="home-card__box home-card__box--more">
                Errechne dir deine Punkte aus Zeiten – national (deutscher Rekord) oder international (Weltrekord).
              </div>
            </div>
          </a>

          <a class="home-card" href="./nominierung.html" aria-label="Wettkämpfe und Nominierung">
            <img class="home-card__img" src="./png/karussel/bild2.jpg" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">Wettkämpfe &amp; Nominierung</div>
              <div class="home-card__box home-card__box--main">Aktuelle Nominierungslisten und Richtlinien</div>
              <div class="home-card__box home-card__box--more">
                Niminierungsrichtlinien & Listen für DP, JRP, BP, sowie Pflichtzeiten für die DEM.
              </div>
            </div>
          </a>

          <a class="home-card" href="./landeskader.html" aria-label="Landeskader">
            <img class="home-card__img" src="./png/hintergrund2.jpg" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">Landeskader</div>
              <div class="home-card__box home-card__box--main">Der Landeskader auf einen Blick</div>
              <div class="home-card__box home-card__box--more">
                Liste aktueller Landeskaderathleten, Kriterien und Prüfung deines Status.
              </div>
            </div>
          </a>

          <a class="home-card" href="./rekorde.html" aria-label="Rekorde und Bestenlisten">
            <img class="home-card__img" src="./png/hintergrund3.jpg" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">Rekorde &amp; Bestenlisten</div>
              <div class="home-card__box home-card__box--main">Landesverbände, Bezirke und Ortsgruppen</div>
              <div class="home-card__box home-card__box--more">
                Analysen und Bestenlisten für deine Gliederungen – individuell erstellbar.
              </div>
            </div>
          </a>

        </div>
      </div>
    </section>
  `;

  initWideCarousel();
});

// ------------------------
// CAROUSEL LOGIC
// ------------------------
function initWideCarousel() {
  const root = document.querySelector("[data-wide-carousel]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll(".wide-carousel__slide"));
  const dots = Array.from(root.querySelectorAll(".wide-carousel__dot"));
  const count = dots.length;

  const prevBtn = root.querySelector(".wide-carousel__nav--prev");
  const nextBtn = root.querySelector(".wide-carousel__nav--next");

  let index = 0;
  let autoTimer = null;
  let resizeTimer = null;

  // --- YouTube per slide ---
  const ytState = new WeakMap(); // slideEl -> { player, ready, start }
  let videoTimer = null;

  const stopAuto = () => {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
  };

  const startAuto = () => {
    stopAuto();
    autoTimer = setInterval(() => goTo(index + 1), 10000);
  };

  const readPxVar = (name, fallback) => {
    const v = getComputedStyle(root).getPropertyValue(name).trim();
    const num = parseFloat(v);
    return Number.isFinite(num) ? num : fallback;
  };

  const fitHeight = () => {
    const active = slides[index];
    if (!active) return;

    const content = active.querySelector(".wide-carousel__content");
    if (!content) return;

    requestAnimationFrame(() => {
      const minH = readPxVar("--wide-min-h", 260);
      const maxH = readPxVar("--wide-max-h", 560);
      const desired = content.scrollHeight;
      const h = Math.max(minH, Math.min(maxH, desired));
      root.style.height = `${h}px`;
    });
  };

  async function ensureYT(slideEl) {
    const has = slideEl.dataset.hasYt === "1";
    if (!has) return null;

    let state = ytState.get(slideEl);
    if (state) return state;

    const holder = slideEl.querySelector(".wide-carousel__yt");
    if (!holder) return null;

    const videoId = slideEl.dataset.ytId;
    const start = parseInt(slideEl.dataset.ytStart || "0", 10) || 0;

    // eindeutige ID für YT.Player
    if (!holder.id) holder.id = `ytbg-${Math.random().toString(36).slice(2)}`;

    const YT = await loadYouTubeAPI();

    let readyResolve;
    const ready = new Promise((r) => (readyResolve = r));

    const player = new YT.Player(holder.id, {
      host: "https://www.youtube-nocookie.com",
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        loop: 1,
        playlist: videoId,
        start,
        origin: window.location.origin,
      },
      events: {
        onReady: (e) => {
          try {
            e.target.mute();      // Autoplay i.d.R. nur stumm
            e.target.pauseVideo();
          } catch {}
          readyResolve();
        },
      },
    });

    state = { player, ready, start };
    ytState.set(slideEl, state);
    return state;
  }

  async function playYT(slideEl) {
    const state = await ensureYT(slideEl);
    if (!state) return;

    await state.ready;
    try {
      state.player.mute();
      state.player.seekTo(state.start, true);
      state.player.playVideo();
      slideEl.classList.add("is-video-on"); // Video sichtbar machen (CSS opacity)
    } catch {
      // wenn Autoplay blockiert bleibt Bild sichtbar
    }
  }

  function stopYT(slideEl) {
    slideEl.classList.remove("is-video-on");
    const state = ytState.get(slideEl);
    if (!state) return;
    try {
      state.player.pauseVideo();
    } catch {}
  }

  function updateVideoForActiveSlide() {
    if (videoTimer) clearTimeout(videoTimer);

    // alle nicht aktiven Videos stoppen
    slides.forEach((s, i) => {
      if (i !== index) stopYT(s);
    });

    const active = slides[index];
    if (!active) return;

    if (active.dataset.hasYt === "1") {
      const delay = parseInt(active.dataset.ytDelay || "2000", 10) || 2000;

      // im Hintergrund laden
      ensureYT(active);

      // nach Delay einblenden + starten
      videoTimer = setTimeout(() => playYT(active), delay);
    }
  }

  const update = () => {
    slides.forEach((s, i) => {
      const active = i === index;
      s.classList.toggle("is-active", active);
      s.setAttribute("aria-hidden", active ? "false" : "true");
    });

    dots.forEach((d, i) => {
      const active = i === index;
      d.classList.toggle("is-active", active);
      d.setAttribute("aria-selected", active ? "true" : "false");
    });

    fitHeight();
    updateVideoForActiveSlide();
  };

  const goTo = (i) => {
    index = (i + count) % count;
    update();
  };

  const manualGo = (dir) => {
    goTo(index + dir);
    startAuto();
  };

  // Dots click
  root.querySelector(".wide-carousel__dots")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".wide-carousel__dot");
    if (!btn) return;
    const i = Number(btn.dataset.slide);
    if (!Number.isFinite(i)) return;
    goTo(i);
    startAuto();
  });

  // Swipe (Touch)
  let startX = 0;
  let startY = 0;
  let touching = false;

  const swipeThresholdPx = () => Math.max(50, Math.round(root.clientWidth * 0.15));

  root.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touching = true;
      startX = t.clientX;
      startY = t.clientY;
      stopAuto();
    },
    { passive: true }
  );

  root.addEventListener(
    "touchend",
    (e) => {
      const t = e.changedTouches && e.changedTouches[0];
      if (!t || !touching) return;
      touching = false;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= swipeThresholdPx()) {
        manualGo(dx < 0 ? +1 : -1);
      } else {
        startAuto();
      }
    },
    { passive: true }
  );

  root.addEventListener(
    "touchcancel",
    () => {
      touching = false;
      startAuto();
    },
    { passive: true }
  );

  // Prev/Next zones
  prevBtn?.addEventListener("click", () => manualGo(-1));
  nextBtn?.addEventListener("click", () => manualGo(+1));

  // Keyboard
  root.setAttribute("tabindex", "0");
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      manualGo(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      manualGo(+1);
    }
  });

  // Resize
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitHeight, 80);
  });

  // Pause autoplay on hover/focus
  root.addEventListener("mouseenter", stopAuto);
  root.addEventListener("mouseleave", startAuto);
  root.addEventListener("focusin", stopAuto);
  root.addEventListener("focusout", startAuto);

  startAuto();
  update();
}
