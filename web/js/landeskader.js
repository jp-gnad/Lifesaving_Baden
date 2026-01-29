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
      dateStart: "22.02.26",
      dateEnd: "",
      text: "Kadertraining LK1",
      meta: "50m Bahn, Treffpunkt 9:15 im Foyer",
      timeStart: "09:15",
      timeEnd: "12:30",
      location: "Fächerbad, Karlsruhe",
      kader: "LK1"
    },
    {
      dateStart: "22.02.26",
      dateEnd: "",
      text: "Kadertraining LK2",
      meta: "Warm Up, 50m Bahn, Cool Down, Treffpunkt 11:30 im Foyer",
      timeStart: "11:30",
      timeEnd: "15:45",
      location: "Fächerbad, Karlsruhe",
      kader: "LK2"
    },
    {
      dateStart: "12.04.26",
      dateEnd: "",
      text: "Kadertraining LK1",
      meta: "50m Bahn, Treffpunkt 9:15 im Foyer",
      timeStart: "09:15",
      timeEnd: "12:30",
      location: "Fächerbad, Karlsruhe",
      kader: "LK1"
    },
    {
      dateStart: "12.04.26",
      dateEnd: "",
      text: "Kadertraining LK2",
      meta: "WarmUp, Beach Flags, 50m Bahn, Cool down, Treffpunkt: 12:00 Uhr im Foyer",
      timeStart: "12:00",
      timeEnd: "15:45",
      location: "Fächerbad, Karlsruhe",
      kader: "LK2"
    },
    {
      dateStart: "13.06.26",
      dateEnd: "",
      text: "Kadertraining LK2",
      meta: "JRP und LMS Vorbereitung. (Ocean & Pool)",
      timeStart: "10:00",
      timeEnd: "18:15",
      location: "Buchtzigsee, Ettlingen & Fächerbad, Karlsruhe",
      kader: "LK2"
    },
    {
      dateStart: "14.06.26",
      dateEnd: "",
      text: "Kadertraining LK1",
      meta: "50m Bahn, Treffpunkt 12:45 im Foyer",
      timeStart: "12:45",
      timeEnd: "16:00",
      location: "Fächerbad, Karlsruhe",
      kader: "LK1"
    },
    {
      dateStart: "26.06.26",
      dateEnd: "01.07.26",
      text: "Junioren Rettungspokal",
      meta: "(Nominierungswettkampf)",
      timeStart: "00:00",
      timeEnd: "23:59",
      location: "Paderborn/Lippstadt",
      kader: "LK2"
    },
    {
      dateStart: "04.07.26",
      dateEnd: "",
      text: "Trainingslehrgang LK3",
      meta: "Tageslehrgang für LK3 und deren Heimtrainer zu den neuen Disziplinen. (Noch nicht fix)",
      timeStart: "10:00",
      timeEnd: "18:00",
      location: "Hallenbad Oberhausen-Rheinhausen",
      kader: "LK3"
    },
    {
      dateStart: "25.07.26",
      dateEnd: "",
      text: "18. Bodensee Pokal",
      meta: "Internationaler Wettkampf für Baden, Württemberg, Bayern, Österreich, Schweiz. (Nominierungswettkampf)",
      timeStart: "00:00",
      timeEnd: "23:59",
      location: "Stuttgart, RheinNeckar Park",
      kader: "LK1 / LK2 / LK3"
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
