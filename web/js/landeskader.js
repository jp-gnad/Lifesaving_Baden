document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  const KADER_CARDS = [
    {
      href: "./kaderstatus.html",
      img: "./png/hintergrund8.jpg",
      kicker: "Aktuelle Kaderliste",
      main: "Wie ist dein Kaderstatus?",
      more: "Liste aktueller Landeskaderathleten und diejenige, die die Kriterien erfüllt haben",
      aria: "Dein Athletenprofil",
    },
    {
      href: "./kriterien.html",
      img: "./png/hintergrund6.JPG",
      kicker: "Aktuelle Kaderrichtlinien",
      main: "Kriterien für den Landeskader",
      more: "Du willst in den Landeskader? Versuche die Kriterien zu erfüllen. Gerne kannst du uns auch immer ansprechen!",
      aria: "DLRG Punkterechner",
    },
    {
      href: "./trainingspläne.html",
      img: "./png/hintergrund7.jpg",
      kicker: "Trainingspläne",
      main: "Trainingspläne vom Landeskader Baden",
      more: "Du willst trainineren wie der Landeskader oder die Trainings nochmal nachschwimmen? Hier findest du die Trainingseinheiten der letzten Jahre.",
      aria: "Landeskader",
    },
  ];

  main.innerHTML = `
    <section class="kader-hero" aria-label="Landeskader Baden">
      <div class="kader-hero__inner">
        <h1>Landeskader Baden</h1>
      </div>
    </section>

    <section class="updates" aria-label="Termine">
      <div class="container">
        <h2>Termine & Kadertrainings</h2>
        <div id="termine-karussel"></div>
      </div>
    </section>

    <section class="intro" id="kader-inhalte">
      <div class="container">
        <h2>Inhalte</h2>
      </div>
    </section>

    <section class="home-links" aria-label="Landeskader Inhalte">
      <div class="container">
        <div class="home-cards">
          ${KADER_CARDS.map(
            (c) => `
              <a class="home-card" href="${c.href}" aria-label="${c.aria}">
                <img class="home-card__img" src="${c.img}" alt="" loading="lazy" decoding="async">
                <div class="home-card__overlay">
                  <div class="home-card__kicker">${c.kicker}</div>
                  <div class="home-card__box home-card__box--main">${c.main}</div>
                  <div class="home-card__box home-card__box--more">${c.more}</div>
                </div>
              </a>
            `
          ).join("")}
        </div>
      </div>
    </section>
  `;

  const container = document.getElementById("termine-karussel");
  if (!container) return;

  const TERMINE = [
    {
      date: "So, 15.02.26",
      text: "Didaktisch - methodische Grundlagen - Kurs 1-26",
      time: "09:00 - 18:00 Uhr",
      location: "Karlsruhe",
      buttonText: "Mehr erfahren",
      url: "#"
    },
    {
      date: "Sa, 21.02. bis\nSo, 22.02.26",
      text: "Sachkundiger für die Prüfung von Persönlicher Schutzausrüstung gegen Absturz (PSAgA)\nKurs 01-2026",
      time: "09:00 - 17:00 Uhr",
      location: "Karlsruhe",
      buttonText: "Mehr erfahren",
      url: "#"
    },
    {
      date: "Mi, 25.02.26",
      text: "Dialog SchwimmFidel",
      time: "18:30 - 21:00 Uhr",
      location: "Videokonferenz",
      buttonText: "Mehr erfahren",
      url: "#"
    },
    {
      date: "Sa, 28.02.26",
      text: "Personen- und vereinsbezogene Grundlagen - Kurs 1-26",
      time: "09:00 - 21:00 Uhr",
      location: "Karlsruhe",
      kader: "LK1",
      buttonText: "Mehr erfahren",
      url: "#"
    },
    {
      date: "Sa, 29.02.26",
      text: "Personen- und vereinsbezogene Grundlagen - Kurs 1-26",
      time: "09:00 - 21:00 Uhr",
      location: "Karlsruhe",
      buttonText: "Mehr erfahren",
      url: "#"
    }
  ];

  if (typeof window.initInfoKarussel !== "function") {
    container.innerHTML = `<ul class="updates__list"><li>Erste Inhalte folgen.</li></ul>`;
    return;
  }

  window.initInfoKarussel("#termine-karussel", TERMINE, {
    itemsPerPage: 4,
    buttonText: "Mehr erfahren"
  });
});
