document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Rettungssport</h1>
    </section>

    <section class="intro">
      <div class="container">
        <h2>Willkommen beim Lifesaving Team Baden</h2>
        <p>
          Lifesaving verbindet Rettungsschwimmen, Sport und Sicherheit im Wasser.
          Auf dieser Seite findest du zentrale Einstiege zu Kursen, Engagement, Lehrgängen
          sowie Möglichkeiten, den Rettungssport zu unterstützen.
        </p>
      </div>
    </section>

    <section class="home-links" aria-label="Athletenprofile">
      <div class="container">
        <div class="home-cards">

          <a class="home-card" href="./athleten.html">
            <img class="home-card__img" src="./png/hintergrund4.JPG" alt="" loading="lazy" decoding="async">

            <div class="home-card__overlay">
              <div class="home-card__kicker">Dein Athletenprofil</div>

              <div class="home-card__box home-card__box--main">
                Infos aus Wettkämpfen
              </div>

              <div class="home-card__box home-card__box--more">
                Betzeiten, Informationen und deine Entwicklung – kompakt auf einen Blick.
              </div>
            </div>
          </a>


          <a class="home-card" href="./punkterechner.html"
            aria-label="Punkterechner">
            <img class="home-card__img" src="./png/hintergrund5.JPG" alt=""
                loading="lazy" decoding="async">

            <div class="home-card__overlay">
              <div class="home-card__kicker">DLRG Punkterechner</div>

              <div class="home-card__box home-card__box--main">
                national und internationale Punkte
              </div>

              <div class="home-card__box home-card__box--more">
                Errechne dir deine Punkte aus Zeiten. Egal ob national (nach deutschem Rekord) oder international (nach Weltrekord).
              </div>
            </div>
          </a>

          <a class="home-card" href="./kaderstatus.html"
            aria-label="Kaderstatus">
            <img class="home-card__img" src="./png/hintergrund2.jpg" alt=""
                loading="lazy" decoding="async">

            <div class="home-card__overlay">
              <div class="home-card__kicker">Kaderstatus</div>

              <div class="home-card__box home-card__box--main">
                Der Landeskader auf einen Blick
              </div>

              <div class="home-card__box home-card__box--more">
                Die Liste der aktuellen Landeskaderathleten. Erhalte einen Überblick über die Kaderkriterien und prüfe deinen Staus.
              </div>
            </div>
          </a>

          <a class="home-card" href="./rekorde.html"
            aria-label="Rekorde und Bestenlisten">
            <img class="home-card__img" src="./png/hintergrund3.jpg" alt=""
                loading="lazy" decoding="async">

            <div class="home-card__overlay">
              <div class="home-card__kicker">Rekorde & Bestenlisten</div>

              <div class="home-card__box home-card__box--main">
                Landesverbände, Bezirke und Ortsgruppen
              </div>

              <div class="home-card__box home-card__box--more">
                Hier findest du spannende Analysen und kannst dir Bestenlisten für deine Gliederungen erstellen lassen.
              </div>
            </div>
          </a>


        </div>
      </div>
    </section>
  `;
});
