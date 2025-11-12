document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Willkommen</h1>
      <p>Dies ist die Startseite des Projekts „Lifesaving Baden“.</p>
    </section>

    <section class="updates">
      <h2>Aktuelles</h2>
      <ul>
        <li>Erste Inhalte folgen.</li>
      </ul>
    </section>
  `;
});
