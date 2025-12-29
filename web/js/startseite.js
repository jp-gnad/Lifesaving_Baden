const WIDE_SLIDES = [
  {
    title: "Rettungssport",
    text: "Willkommen auf der inoffiziellen Internetseite des Lifesaving Team Badens. Hier findest du nützliche Informationen rund um den Rettungssport in Baden.",
    img: "./png/hintergrund1.JPG",
  },
  {
    title: "Kalender",
    text: "Aktueller Jahresplan vom Landeskader Baden",
    img: "./png/karussel/bild3.jpg",
    cta: { label: "Mehr Infos!", href: "./kalender.html" }
  },
  {
    title: "Nominierungen",
    text: "Aktuelle Nominierungslisten für den Bodensee Pokal und Deutschland Pokal",
    img: "./png/karussel/bild2.jpg",
    cta: { label: "Mehr Infos!", href: "./nominierung.html" }
  },
  {
    title: "Infoschreiben",
    text: "Aktuelles Jahres Infoschreiben vom Landeskader Baden",
    img: "./png/karussel/bild5.JPG",
    cta: { label: "Mehr Infos!", href: "./info.html" }
  },
  {
    title: "Dopingprävention",
    text: "Auch in der DLRG wird Leistungssport betrieben und obwohl die Rettungssportler ihren Sport als Amateure ausüben, unterliegen sie den Anti-Doping-Regeln der NADA (Nationale Antidoping Agentur) und der WADA (Welt Antidoping Agentur).",
    img: "./png/karussel/bild4.jpg",
    cta: { label: "Mehr Infos!", href: "https://www.dlrg.de/mitmachen/rettungssport/kader/dopingpraevention/" }
  },
  {
    title: "Lifesaving World Championships",
    text: "Die LWC finden 2026 vom 25. Nov bis 13. Dec in Port Elizabeth / Südafrika statt. Du hast Interesse aber keine Ahnung wie das Abläuft? Frag bei uns nach! Wir versuchen zusammen als Baden etwas zu organisieren.",
    img: "./png/karussel/bild6.jpg",
    cta: { label: "Mehr Infos!", href: "https://lifesaving2026.com/" }
  },
];


document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="wide-carousel" aria-label="Highlights">
      <div class="wide-carousel__viewport" data-wide-carousel>
        <div class="wide-carousel__slides">
          ${WIDE_SLIDES.map(
            (s, i) => `
            <article class="wide-carousel__slide ${i === 0 ? "wide-carousel__slide--center" : ""}"
              style="background-image:url('${s.img}')"
              role="group" aria-roledescription="Folie"
              aria-label="${i + 1} von ${WIDE_SLIDES.length}">
              <div class="wide-carousel__content">
                <h2>${s.title}</h2>
                <p>${s.text}</p>
                ${s.cta ? `<a class="wide-carousel__cta" href="${s.cta.href}">${s.cta.label}</a>` : ``}
              </div>
            </article>
          `
          ).join("")}
        </div>

        <div class="wide-carousel__dots" role="tablist" aria-label="Folie auswählen">
          ${WIDE_SLIDES.map(
            (_, i) => `
            <button class="wide-carousel__dot" type="button" role="tab"
                    aria-label="Folie ${i + 1}"
                    aria-selected="${i === 0 ? "true" : "false"}"
                    data-slide="${i}">
            </button>
          `
          ).join("")}
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

          <a class="home-card" href="./kaderstatus.html" aria-label="Kaderstatus">
            <img class="home-card__img" src="./png/hintergrund2.jpg" alt="" loading="lazy" decoding="async">
            <div class="home-card__overlay">
              <div class="home-card__kicker">Kaderstatus</div>
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

function initWideCarousel() {
  const root = document.querySelector("[data-wide-carousel]");
  if (!root) return;

  const track = root.querySelector(".wide-carousel__slides");
  const slides = Array.from(root.querySelectorAll(".wide-carousel__slide"));
  const dots = Array.from(root.querySelectorAll(".wide-carousel__dot"));
  const count = dots.length;

  let index = 0;

  let autoTimer = null;

    const startAuto = () => {
      stopAuto();
      autoTimer = setInterval(() => goTo(index + 1), 10000);
    };

    const stopAuto = () => {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
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

  const update = () => {
    track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
    dots.forEach((d, i) => {
      const active = i === index;
      d.classList.toggle("is-active", active);
      d.setAttribute("aria-selected", active ? "true" : "false");
    });
    fitHeight();
  };

  const goTo = (i) => {
    index = (i + count) % count;
    update();
  };

  root.querySelector(".wide-carousel__dots")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".wide-carousel__dot");
    if (!btn) return;
    const i = Number(btn.dataset.slide);
    if (!Number.isFinite(i)) return;
    goTo(i);
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitHeight, 80);
  });

  root.addEventListener("mouseenter", stopAuto);
  root.addEventListener("mouseleave", startAuto);
  root.addEventListener("focusin", stopAuto);
  root.addEventListener("focusout", startAuto);

  startAuto();

  update();
}
