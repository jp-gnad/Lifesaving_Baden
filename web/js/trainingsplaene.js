document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Trainingspläne</h1>
    </section>

    <section class="updates">
      <h2>In Vorbereitung</h2>
      <ul>
        <li>Die Seite ist jetzt sauber verlinkt und kann künftig mit Trainingsinhalten gefüllt werden.</li>
        <li>Bis zur Veröffentlichung findest du wichtige Kaderinformationen auf der Landeskader-Seite.</li>
        <li><a href="./landeskader.html">Zum Landeskader</a></li>
      </ul>
    </section>
  `;
});
