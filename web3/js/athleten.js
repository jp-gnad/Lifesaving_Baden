document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <section class="athletes-page">
      <h1>Athleten</h1>
      <p class="hint">Datenquelle: <code>./data/athleten.json</code></p>

      <form class="filters" aria-label="Filter">
        <input id="q" class="search" type="search" placeholder="Name oder Verein" autocomplete="off" />
        <select id="fGender" title="Geschlecht">
          <option value="">Alle Geschlechter</option>
        </select>
        <select id="fClub" title="Verein">
          <option value="">Alle Vereine</option>
        </select>
        <select id="fStatus" title="Status">
          <option value="">Alle Status</option>
        </select>
      </form>

      <div id="status" class="status" role="status" aria-live="polite">Lade…</div>

      <div class="table-wrap">
        <table class="athletes" aria-describedby="status">
          <thead>
            <tr>
              <th>Athlet</th>
              <th>Geschl.</th>
              <th>AK/Jahrgang</th>
              <th>Verein</th>
              <th>Status</th>
              <th>Disziplinen</th>
            </tr>
          </thead>
          <tbody id="athletes-body"></tbody>
        </table>
      </div>
    </section>
  `;

  const statusEl = document.getElementById("status");
  const tbody = document.getElementById("athletes-body");
  const q = document.getElementById("q");
  const fGender = document.getElementById("fGender");
  const fClub = document.getElementById("fClub");
  const fStatus = document.getElementById("fStatus");

  let allRows = [];

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeDisciplines(v) {
    if (!v) return "";
    if (Array.isArray(v)) return v.join(", ");
    return String(v);
  }

  function akOrYear(r) {
    // Zeigt bevorzugt r.age (AK), sonst r.birthyear oder r.year
    const ak = r.age ?? r.ak ?? r.ageGroup;
    if (ak) return ak;
    const by = r.birthyear ?? r.born ?? r.yearOfBirth ?? r.year;
    return by ?? "-";
  }

  function renderOptions() {
    // Gender
    const genders = Array.from(new Set(allRows.map(r => r.gender).filter(Boolean))).sort();
    fGender.innerHTML = `<option value="">Alle Geschlechter</option>` +
      genders.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");

    // Vereine
    const clubs = Array.from(new Set(allRows.map(r => r.club).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"de"));
    fClub.innerHTML = `<option value="">Alle Vereine</option>` +
      clubs.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

    // Status
    const statuses = Array.from(new Set(allRows.map(r => r.status).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"de"));
    fStatus.innerHTML = `<option value="">Alle Status</option>` +
      statuses.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  }

  function applyFilters() {
    const term = (q.value || "").trim().toLowerCase();
    const g = fGender.value;
    const c = fClub.value;
    const s = fStatus.value;

    let rows = allRows.slice();

    if (g) rows = rows.filter(r => (r.gender || "") === g);
    if (c) rows = rows.filter(r => (r.club || "") === c);
    if (s) rows = rows.filter(r => (r.status || "") === s);

    if (term) {
      rows = rows.filter(r => {
        const hay = `${r.athlete || ""} ${r.club || ""}`.toLowerCase();
        return hay.includes(term);
      });
    }

    // Sortierung: Verein asc, Status asc, Name asc
    rows.sort((a, b) => {
      const c1 = String(a.club || "").localeCompare(String(b.club || ""), "de");
      if (c1 !== 0) return c1;
      const s1 = String(a.status || "").localeCompare(String(b.status || ""), "de");
      if (s1 !== 0) return s1;
      return String(a.athlete || "").localeCompare(String(b.athlete || ""), "de");
    });

    return rows;
  }

  function renderTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">Keine Einträge vorhanden.</td></tr>`;
      statusEl.textContent = "0 Einträge";
      return;
    }

    const html = rows.map(r => {
      const athlete = escapeHtml(r.athlete ?? r.name ?? "-");
      const gender = escapeHtml(r.gender ?? "-");
      const akyear = escapeHtml(akOrYear(r));
      const club   = escapeHtml(r.club ?? "-");
      const status = escapeHtml(r.status ?? "-");
      const discs  = escapeHtml(normalizeDisciplines(r.disciplines ?? r.discipline));

      return `
        <tr>
          <td>${athlete}</td>
          <td>${gender}</td>
          <td class="mono">${akyear}</td>
          <td>${club}</td>
          <td>${status}</td>
          <td>${discs}</td>
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
      const res = await fetch("./data/athleten.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Ungültiges Format (erwarte Array).");
      allRows = data;
    } catch (err) {
      // Demo-Daten, falls Datei noch nicht existiert
      allRows = [
        {
          athlete: "Maxi Muster",
          gender: "W",
          age: "U18",
          club: "DLRG Musterstadt",
          status: "Landeskader",
          disciplines: ["100 m Lifesaver", "200 m Super Lifesaver"]
        },
        {
          athlete: "Jan Beispiel",
          gender: "M",
          birthyear: 2003,
          club: "SLS Musterverein",
          status: "Perspektivkader",
          disciplines: ["50 m Manikin Carry"]
        }
      ];
      statusEl.innerHTML = `Konnte <code>./data/athleten.json</code> nicht laden. Zeige Demo-Daten.`;
      console.warn("athleten.json konnte nicht geladen werden:", err);
    }

    renderOptions();
    refresh();
  }

  // Events
  q.addEventListener("input", refresh);
  fGender.addEventListener("change", refresh);
  fClub.addEventListener("change", refresh);
  fStatus.addEventListener("change", refresh);

  loadData();
});
