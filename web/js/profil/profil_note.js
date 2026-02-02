(function (global) {
  const ProfileNote = {};

  const h = (tag, props = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  };

  function createAthProfileNote() {
    return h(
      "div",
      { class: "ath-profile-section muted" },
      h("p", {}, "Die Datenbank erfasst nur Einzel-Pool-Wettkämpfe von Badischen Schwimmerinnen und Schwimmern im Rettungssport."),
      h("p", {}, "Staffeln und Freigewässer sind nicht enthalten."),
      h("p", {}, "Platzierungen sind noch nicht alle eingetragen."),
      h("p", {}, "Sollten Fehler oder neue Ergebnisse gefunden werden, wenden sie sich bitte an jan-philipp.gnad@dlrg.org")
    );
  }

  ProfileNote.createAthProfileNote = createAthProfileNote;

  global.ProfileNote = ProfileNote;
})(window);
