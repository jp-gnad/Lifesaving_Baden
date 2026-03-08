(function (global) {
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const seal = (v) =>
    Array.from(String(v))
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) + ((i % 3) + 1)))
      .join("");

  const currentYear = () => String(new Date().getFullYear());

  const resolveMount = (mount) => {
    if (!mount) return null;
    if (typeof mount === "string") return document.getElementById(mount);
    return mount;
  };

  const safeFocus = (el) => {
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  };

  const open = (options = {}) => {
    const {
      mount,
      mountId,
      heroHtml = "",
      sectionClass = "updates",
      gateClass = "pz-gate",
      lineClass = "pz-statusline",
      title = "Zugang",
      introText = "Der Inhalt ist noch nicht öffentlich verfügbar und wird in kürze freigeschaltet.",
      message = "Bitte Freigabecode eingeben.",
      placeholder = "Eingabe...",
      buttonText = "Öffnen",
      invalidText = "Eingabe ungültig.",
      grantedText = "Freigabe erteilt …",
      errorText = "Fehler beim Öffnen.",
      inputType = "password",
      inputMode = "numeric",
      autocomplete = "off",
      inputStyle = "padding:.5rem .75rem;min-width:140px;",
      buttonStyle = "padding:.5rem .75rem;cursor:pointer;",
      rowStyle = "display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:0;",
      getExpectedValue = currentYear,
      transform = seal,
      compare,
      onSuccess,
      onInvalid,
      onError
    } = options;

    const root = resolveMount(mountId || mount);
    if (!root) throw new Error("PWGate: mount nicht gefunden");

    const uid = `pw-${Math.random().toString(36).slice(2, 10)}`;

    root.innerHTML = `
      ${heroHtml}
      <section class="${esc(sectionClass)}">
        <h2>${esc(title)}</h2>
        <p>${esc(introText)}</p>
        <div class="${esc(gateClass)}">
          <p id="${uid}-line" class="${esc(lineClass)}">${esc(message)}</p>
          <div style="${esc(rowStyle)}">
            <input id="${uid}-field" type="${esc(inputType)}" inputmode="${esc(inputMode)}" autocomplete="${esc(autocomplete)}" placeholder="${esc(placeholder)}" style="${esc(inputStyle)}">
            <button id="${uid}-act" type="button" style="${esc(buttonStyle)}">${esc(buttonText)}</button>
          </div>
        </div>
      </section>
    `;

    const input = document.getElementById(`${uid}-field`);
    const button = document.getElementById(`${uid}-act`);
    const line = document.getElementById(`${uid}-line`);

    if (!input || !button || !line) throw new Error("PWGate: Elemente fehlen");

    const isValid = (raw) => {
      const expected = String(getExpectedValue());
      if (typeof compare === "function") return !!compare(raw, expected, transform);
      return transform(String(raw).trim()) === transform(expected);
    };

    const go = async () => {
      const raw = String(input.value || "").trim();

      if (!isValid(raw)) {
        line.textContent = invalidText;
        input.value = "";
        safeFocus(input);
        if (typeof onInvalid === "function") onInvalid({ root, input, button, line, value: raw });
        return;
      }

      line.textContent = grantedText;
      button.disabled = true;
      input.disabled = true;

      try {
        if (typeof onSuccess === "function") {
          await onSuccess({ root, input, button, line, value: raw });
        }
      } catch (err) {
        console.error(err);
        line.textContent = errorText;
        button.disabled = false;
        input.disabled = false;
        safeFocus(input);
        if (typeof onError === "function") onError(err, { root, input, button, line, value: raw });
      }
    };

    button.addEventListener("click", go);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    safeFocus(input);

    return { root, input, button, line, go };
  };

  global.PWGate = { seal, currentYear, open };
})(window);