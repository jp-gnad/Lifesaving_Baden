document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="squad-page">
      <h1>Kaderstatus</h1>
      <p class="hint">Datenquelle: <code>./data/kader.json</code></p>

      <form class="filters" aria-label="Filter">
        <input id="q" class="search" type="search" placeholder="Name oder Verein" autocomplete="off" />
        <select id="fStatus" title="Status">
          <option value="">Alle Status</option>
        </select>
        <select id="fYear" title="Jahr">
          <option value="">Alle Jahre</option>
        </select>
      </form>

      <div id="status" class="status" role="status" aria-live="polite">Lade…</div>

      <div class="table-wrap">
        <table class="squad" aria-describedby="status">
          <thead>
            <tr>
              <th>Athlet</th>
              <th>Geschl.</th>
              <th>AK</th>
              <th>Verein</th>
              <th>Status</th>
              <th>Jahr</th>
              <th>Notiz</th>
            </tr>
          </thead>
          <tbody id="squad-body"></tbody>
        </table>
      </div>
    </section>
  `;

  const statusEl = document.getElementById("status");
  const tbody = document.getElementById("squad-body");
  const q = document.getElementById("q");
  const fStatus = document.getElementById("fStatus");
  const fYear = document.getElementById("fYear");

  /** Zustand */
  let allRows = [];

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderOptions() {
    // Status-Optionen
    const statuses = Array.from(new Set(allRows.map(r => r.status).filter(Boolean))).sort();
    fStatus.innerHTML = `<option value="">Alle Status</option>` + statuses.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");

    // Jahr-Optionen (absteigend)
    const years = Array.from(new Set(allRows.map(r => r.year).filter(y => Number.isFinite(Number(y)))))
      .map(Number).sort((a,b)=>b-a);
    fYear.innerHTML = `<option value="">Alle Jahre</option>` + years.map(y => `<option value="${y}">${y}</option>`).join("");
  }

  function applyFilters() {
    const term = (q.value || "").trim().toLowerCase();
    const st = fStatus.value;
    const yr = fYear.value;

    let rows = allRows.slice();

    if (st) rows = rows.filter(r => (r.status || "") === st);
    if (yr) rows = rows.filter(r => String(r.year || "") === yr);

    if (term) {
      rows = rows.filter(r => {
        const hay = `${r.athlete || ""} ${r.club || ""}`.toLowerCase();
        return hay.includes(term);
      });
    }

    // Sortierung: Jahr desc, Status asc, Name asc
    rows.sort((a, b) => {
      const y = (b.year || 0) - (a.year || 0);
      if (y !== 0) return y;
      const s = String(a.status || "").localeCompare(String(b.status || ""), "de");
      if (s !== 0) return s;
      return String(a.athlete || "").localeCompare(String(b.athlete || ""), "de");
    });

    return rows;
  }

  function renderTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty">Keine Einträge vorhanden.</td></tr>`;
      statusEl.textContent = "0 Einträge";
      return;
    }

    const html = rows.map(r => {
      const athlete = escapeHtml(r.athlete ?? "-");
      const gender = escapeHtml(r.gender ?? "-");
      const age    = escapeHtml(r.age ?? "-");
      const club   = escapeHtml(r.club ?? "-");
      const status = escapeHtml(r.status ?? "-");
      const year   = escapeHtml(r.year ?? "-");
      const note   = escapeHtml(r.note ?? "");

      return `
        <tr>
          <td>${athlete}</td>
          <td>${gender}</td>
          <td>${age}</td>
          <td>${club}</td>
          <td>${status}</td>
          <td class="mono">${year}</td>
          <td>${note}</td>
        </tr>
      `;
    }).join("");

    tbody.innerHTML = html;
    statusEl.textContent = `${rows.length} Einträge`;
  }

  function refresh() {
    renderTable(applyFilters());
  }

  async function loadData() {
    try {
      const res = await fetch("./data/kader.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Ungültiges Format (erwarte Array).");
      allRows = data;
    } catch (err) {
      // Demo-Fallback
      allRows = [
        {
          athlete: "Maxi Muster",
          gender: "W",
          age: "U18",
          club: "DLRG Musterstadt",
          status: "Landeskader",
          year: 2025,
          note: "Pool & Ocean"
        },
        {
          athlete: "Jan Beispiel",
          gender: "M",
          age: "Offen",
          club: "SLS Musterverein",
          status: "Perspektivkader",
          year: 2024,
          note: ""
        }
      ];
      statusEl.innerHTML = `Konnte <code>./data/kader.json</code> nicht laden. Zeige Demo-Daten.`;
      console.warn("kader.json konnte nicht geladen werden:", err);
    }

    renderOptions();
    refresh();
  }

  // Events
  q.addEventListener("input", refresh);
  fStatus.addEventListener("change", refresh);
  fYear.addEventListener("change", refresh);

  loadData();
});
