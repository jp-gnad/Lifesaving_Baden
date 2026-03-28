(function (global) {
  const StartseiteContent = {};
  const HERO_VIDEO_SRC =
    window.location.protocol === "file:"
      ? "https://raw.githubusercontent.com/jp-gnad/Lifesaving_Baden/main/web/assets/MP4/LWC_2024.mp4"
      : "./assets/MP4/LWC_2024.mp4";

  const WIDE_SLIDES = [
    {
      title: "Willkommen beim Lifesaving Team Baden",
      meta: "DLRG ・ Landeskader Baden ・ Leistungssport",
      text: "Willkommen auf der inoffiziellen Internetseite des Lifesaving Team Badens. Hier findest du nuetzliche Informationen rund um den Rettungssport in Baden.",
      icon: { src: "./assets/png/icons/Baden2.png", href: "https://baden.dlrg.de/mitmachen/rettungssport/", alt: "DLRG Rettungssport" },
      img: "./assets/png/hintergrund1.JPG",
      bgY: "50%",
    },
    {
      title: "Kalender",
      meta: "DLRG ・ Wettkaempfe ・ Landeskader ・ Bundeskader",
      text: "Uebersicht zu den wichtigsten Wettkampfterminen sowie Massnahmen vom Landes- und Bundeskader.",
      img: "./assets/png/karussel/bild3.jpg",
      cta: { label: "Mehr Informationen", href: "./kalender.html" },
      bgY: "25%",
    },
    {
      title: "Infoschreiben",
      meta: "DLRG ・ Neuigkeiten ・ Landeskader ・ Rettungssport",
      text: "Aktuelles Jahres-Infoschreiben vom Landeskader Baden.",
      img: "./assets/png/karussel/bild5.JPG",
      cta: { label: "Mehr Informationen", href: "./info.html" },
      bgY: "50%",
    },
    {
      title: "Dopingpraevention",
      meta: "NADA ・ WADA ・ Sport ・ Sicher und sauber",
      text: "Auch in der DLRG wird Leistungssport betrieben. Deshalb gelten fuer Rettungssportler die Anti-Doping-Regeln von NADA und WADA.",
      img: "./assets/png/karussel/bild4.jpg",
      icon: { src: "./assets/png/icons/nada.png", href: "https://lifesaving2026.com/", alt: "DLRG Rettungssport" },
      cta: {
        label: "Mehr Informationen",
        href: "https://www.dlrg.de/mitmachen/rettungssport/kader/dopingpraevention/",
      },
      bgY: "50%",
    },
    {
      title: "Lifesaving World Championships",
      meta: "ILS ・ Weltmeisterschaft ・ Lifesaving Sport ・ 2026",
      text: "Die LWC finden 2026 vom 25. Nov bis 13. Dez in Port Elizabeth / Suedafrika statt. Das groesste Highlight im Jahr.",
      img: "./assets/png/karussel/bild6.JPG",
      video: {
        src: HERO_VIDEO_SRC,
        delayMs: 2000,
      },
      icon: { src: "./assets/svg/events/LWC_big - 2026.svg", href: "https://lifesaving2026.com/", alt: "DLRG Rettungssport" },
      cta: { label: "Mehr Informationen", href: "https://lifesaving2026.com/" },
      bgY: "35%",
    },
  ];

  StartseiteContent.render = function render(main) {
    main.innerHTML = `
      <section class="wide-carousel" aria-label="Highlights">
        <div class="wide-carousel__viewport" data-wide-carousel>
          <div class="wide-carousel__slides">
            ${WIDE_SLIDES.map((slide, index) => `
              <article
                class="wide-carousel__slide ${index === 0 ? "wide-carousel__slide--center is-active" : ""}"
                style="background-image:url('${slide.img}'); --bg-y:${slide.bgY ?? "50%"};"
                role="group"
                aria-roledescription="Folie"
                aria-label="${index + 1} von ${WIDE_SLIDES.length}"
                aria-hidden="${index === 0 ? "false" : "true"}"
                data-has-video="${slide.video ? "1" : "0"}"
                data-video-delay="${slide.video?.delayMs ?? 2000}"
              >
                ${slide.video ? `
                  <div class="wide-carousel__video" aria-hidden="true">
                    <video muted playsinline preload="auto" crossorigin="anonymous">
                      <source src="${slide.video.src}" type="video/mp4">
                    </video>
                  </div>
                ` : ""}

                <div class="wide-carousel__content">
                  ${slide.icon ? `
                    <a class="wide-carousel__iconlink" href="${slide.icon.href}" aria-label="${slide.icon.alt ?? slide.title}">
                      <img class="wide-carousel__icon" src="${slide.icon.src}" alt="${slide.icon.alt ?? ""}" loading="lazy" decoding="async">
                    </a>
                  ` : ""}

                  <h2>${slide.title}</h2>
                  ${slide.meta ? `<div class="wide-carousel__meta">${slide.meta}</div>` : ""}
                  <p>${slide.text}</p>
                  ${slide.cta ? `<a class="wide-carousel__cta" href="${slide.cta.href}">${slide.cta.label}</a>` : ""}
                </div>
              </article>
            `).join("")}
          </div>

          <button class="wide-carousel__nav wide-carousel__nav--prev" type="button" aria-label="Vorherige Folie"></button>
          <button class="wide-carousel__nav wide-carousel__nav--next" type="button" aria-label="Naechste Folie"></button>

          <div class="wide-carousel__dots" role="tablist" aria-label="Folie auswaehlen">
            ${WIDE_SLIDES.map((_, index) => `
              <button class="wide-carousel__dot ${index === 0 ? "is-active" : ""}" type="button" role="tab"
                      aria-label="Folie ${index + 1}"
                      aria-selected="${index === 0 ? "true" : "false"}"
                      data-slide="${index}">
              </button>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="home-links" aria-label="Athletenprofile">
        <div class="container">
          <div class="home-cards">
            <a class="home-card" href="./athleten.html" aria-label="Dein Athletenprofil">
              <img class="home-card__img" src="./assets/png/Bild2.png" alt="" loading="lazy" decoding="async">
            </a>

            <a class="home-card" href="./punkterechner.html" aria-label="DLRG Punkterechner">
              <img class="home-card__img" src="./assets/png/Bild4.png" alt="" loading="lazy" decoding="async">
            </a>

            <a class="home-card" href="./wettkaempfe.html" aria-label="Wettkaempfe und Nominierung">
              <img class="home-card__img" src="./assets/png/Bild1.png" alt="" loading="lazy" decoding="async">
            </a>

            <a class="home-card" href="./landeskader.html" aria-label="Landeskader">
              <img class="home-card__img" src="./assets/png/Bild5.png" alt="" loading="lazy" decoding="async">
            </a>

            <a class="home-card" href="./clubs.html" aria-label="Clubs und Bestenlisten">
              <img class="home-card__img" src="./assets/png/Bild3.png" alt="" loading="lazy" decoding="async">
            </a>
          </div>
        </div>
      </section>
    `;
  };

  global.StartseiteContent = StartseiteContent;
})(window);
