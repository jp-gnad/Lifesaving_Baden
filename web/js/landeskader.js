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
      date: "So, 22.02.26",
      text: "Kadertraining",
      time: "09:15 - 12:30 Uhr",
      location: "Fächerbad, Karlsruhe",
      kader: "LK1",
      buttonText: "zum Kalender",
    },
    {
      date: "So, 22.02.26",
      text: "Kadertraining",
      time: "11:30 - 15:45 Uhr",
      location: "Fächerbad, Karlsruhe",
      kader: "LK2",
      buttonText: "zum Kalender",
    },
    {
      date: "So, 12.04.26",
      text: "Kadertraining",
      time: "09:15 - 12:30 Uhr",
      location: "Fächerbad, Karlsruhe",
      kader: "LK1",
      buttonText: "zum Kalender",
    },
    {
      date: "So, 12.04.26",
      text: "Kadertraining + Beach Flags",
      time: "12:00 - 15:45 Uhr",
      location: "Fächerbad, Karlsruhe",
      kader: "LK2",
      buttonText: "zum Kalender",
    },
    {
      date: "Sa, 13.06.26",
      text: "Vorbereitungstraining JRP & LMS",
      time: "10:00 - 18:15 Uhr",
      location: "Buchtzigsee, Ettlingen & Fächerbad, Karlsruhe",
      kader: "LK2",
      buttonText: "zum Kalender",
    },
    {
      date: "So, 14.06.26",
      text: "Kadertraining",
      time: "12:45 - 16:00 Uhr",
      location: "Fächerbad, Karlsruhe",
      kader: "LK1",
      buttonText: "zum Kalender",
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
