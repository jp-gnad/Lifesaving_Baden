document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="records-page">
      <h1>Rekorde</h1>
      <p class="hint">Daten werden aus <code>./data/rekorde.json</code> geladen.</p>

      <div id="status" class="status" role="status" aria-live="polite">Lade…</div>

      <div class="table-wrap">
        <table class="records" aria-describedby="status">
          <thead>
            <tr>
              <th>Disziplin</th>
              <th>AK</th>
              <th>Geschlecht</th>
              <th>Zeit/Weite</th>
              <th>Athlet</th>
              <th>Verein</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody id="records-body"></tbody>
        </table>
      </div>
    </section>
  `;

  const statusEl = document.getElementById("status");
  const tbody = document.getElementById("records-body");

  function renderTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">Keine Einträge vorhanden.</td></tr>`;
      statusEl.textContent = "0 Einträge";
      return;
    }

    const html = rows.map(r => {
      const {
        discipline = "-",
        age = "-",
        gender = "-",
        performance = "-",
        athlete = "-",
        club = "-",
        date = "-"
      } = r || {};

      const d = typeof date === "string" && date.includes("-")
        ? new Date(date + "T00:00:00")
        : null;
      const dateStr = d && !isNaN(d) ? d.toLocaleDateString("de-DE") : date;

      return `
        <tr>
          <td>${escapeHtml(discipline)}</td>
          <td>${escapeHtml(age)}</td>
          <td>${escapeHtml(gender)}</td>
          <td class="mono">${escapeHtml(performance)}</td>
          <td>${escapeHtml(athlete)}</td>
          <td>${escapeHtml(club)}</td>
          <td>${escapeHtml(dateStr)}</td>
        </tr>
      `;
    }).join("");

    tbody.innerHTML = html;
    statusEl.textContent = `${rows.length} Einträge`;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadRecords() {
    try {
      const res = await fetch("./data/rekorde.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderTable(data);
    } catch (err) {
      // Fallback-Demozeilen, damit die Seite „lebt“, wenn es noch keine Daten gibt.
      renderTable([
        {
          discipline: "50 m Manikin Carry",
          age: "Offen",
          gender: "W",
          performance: "36,45",
          athlete: "Maxi Muster",
          club: "DLRG Musterstadt",
          date: "2024-06-15"
        },
        {
          discipline: "100 m Lifesaver",
          age: "Offen",
          gender: "M",
          performance: "54,20",
          athlete: "Jan Beispiel",
          club: "SLS Musterverein",
          date: "2023-11-02"
        }
      ]);
      statusEl.innerHTML = `Konnte <code>./data/rekorde.json</code> nicht laden. Zeige Demo-Daten.`;
      console.warn("rekorde.json konnte nicht geladen werden:", err);
    }
  }

  loadRecords();
});
