document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="hero">
      <h1>Punkterechner</h1>
    </section>

    <section class="updates">
      <h2>Aktuelles</h2>
      <ul>
        <li>Erste Inhalte folgen.</li>
      </ul>
    </section>
  `;
});
