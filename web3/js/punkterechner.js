document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  // Grundgerüst der Seite
  main.innerHTML = `
    <section class="tool">
      <h1>Punkterechner (Demo)</h1>
      <p class="hint">
        Beispielhafte Berechnung zur Funktionsprüfung der Seite. 
        Die Formel ist ein Platzhalter und kann später mit realen Tabellen/Regeln ersetzt werden.
      </p>

      <form class="calc" aria-describedby="calc-hint">
        <div class="grid">
          <label for="discipline">Disziplin</label>
          <select id="discipline" name="discipline">
            <option value="generic" selected>Allgemein (Demo)</option>
            <option value="50-manikin">50 m Manikin Carry</option>
            <option value="100-lifesaver">100 m Lifesaver</option>
            <option value="200-super">200 m Super Lifesaver</option>
          </select>

          <label for="time">Zeit</label>
          <input id="time" name="time" type="text" inputmode="numeric" 
                 placeholder="mm:ss,cc oder ss,cc" autocomplete="off" />

          <label for="age">Altersklasse (optional)</label>
          <input id="age" name="age" type="text" placeholder="z. B. AK 15/16" />
        </div>

        <div class="actions">
          <button type="submit" class="btn-primary">Berechnen</button>
          <button type="reset" class="btn-ghost">Zurücksetzen</button>
        </div>
        <p id="calc-hint" class="sr-only">Geben Sie die Zeit ein und starten Sie die Berechnung.</p>
      </form>

      <output id="result" class="result" aria-live="polite"></output>
    </section>
  `;

  const form = main.querySelector(".calc");
  const timeInput = form.querySelector("#time");
  const result = main.querySelector("#result");

  // Demo-Formel: Punkte sinken linear mit der Zeit
  // 1000 Punkte bei 0, minus 1 Punkt je 0,1 Sekunde. Untergrenze 0.
  function demoPointsFromMs(ms) {
    const points = Math.max(0, 1000 - ms / 100);
    return Math.round(points);
  }

  function parseTimeToMs(str) {
    // akzeptiert: "mm:ss,cc" | "mm:ss.sss" | "ss,cc" | "ss.sss" | "m:ss"
    if (!str) return NaN;
    const s = str.trim().replace(/\s+/g, "");

    // Komma → Punkt vereinheitlichen
    const norm = s.replace(",", ".");

    // Enthält Minuten?
    if (norm.includes(":")) {
      const [minStr, secStr] = norm.split(":");
      const min = Number(minStr);
      const sec = Number(secStr);
      if (!isFinite(min) || !isFinite(sec)) return NaN;
      return Math.round((min * 60 + sec) * 1000);
    } else {
      // Nur Sekunden
      const sec = Number(norm);
      if (!isFinite(sec)) return NaN;
      return Math.round(sec * 1000);
    }
  }

  function formatMs(ms) {
    if (!isFinite(ms) || ms < 0) return "-";
    const total = Math.round(ms);
    const minutes = Math.floor(total / 60000);
    const seconds = Math.floor((total % 60000) / 1000);
    const millis  = total % 1000;
    if (minutes > 0) {
      const secStr = String(seconds).padStart(2, "0");
      const msStr = String(millis).padStart(3, "0");
      // deutsche Schreibweise mit Komma
      return `${minutes}:${secStr},${msStr}`;
    } else {
      const sec = (total / 1000).toFixed(2).replace(".", ",");
      return `${sec}`;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const timeStr = timeInput.value;
    const ms = parseTimeToMs(timeStr);

    if (!isFinite(ms)) {
      result.innerHTML = `<div class="box box-error">Ungültiges Zeitformat. Beispiel: <code>1:23,45</code> oder <code>58,32</code>.</div>`;
      return;
    }

    const pts = demoPointsFromMs(ms);
    result.innerHTML = `
      <div class="box">
        <div class="row"><span class="label">Eingegebene Zeit:</span><span>${timeStr}</span></div>
        <div class="row"><span class="label">Interpretation:</span><span>${formatMs(ms)}</span></div>
        <div class="row total"><span class="label">Punkte (Demo):</span><span>${pts}</span></div>
      </div>
      <p class="footnote">Hinweis: Dies ist eine Platzhalter-Formel. Ersetze <code>demoPointsFromMs()</code> später durch die realen Regeln oder eine Tabellenlogik.</p>
    `;
  });

  form.addEventListener("reset", () => {
    result.textContent = "";
  });
});
