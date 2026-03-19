document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    <div id="rek-search-layer"></div>

    <section class="hero">
      <div class="container hero-content">
        <div class="hero-search-spacer" aria-hidden="true"></div>
        <div class="rek-hero-layout">
          <div id="rek-hero-avatar" class="rek-hero-avatar-wrap" aria-hidden="true"></div>
          <div class="rek-hero-copy">
            <p id="rek-hero-kicker" class="hero-kicker"></p>
            <h1 id="rek-hero-title">Clubs</h1>
            <p id="rek-hero-meta" class="hero-meta"></p>
          </div>
        </div>
      </div>
    </section>

    <section id="rekorde-profil-section">
      <div id="rekorde-profil-container"></div>
    </section>
  `;
});

(function () {
  const $ = (selector, root = document) => root.querySelector(selector);

  const h = (tag, props = {}, ...children) => {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(props || {})) {
      if (key === "class") el.className = value;
      else if (key === "dataset") Object.assign(el.dataset, value);
      else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
      else if (value !== false && value != null) el.setAttribute(key, value === true ? "" : value);
    }

    for (const child of children.flat()) {
      if (child == null) continue;
      el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }

    return el;
  };

  function getGroupIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return String(params.get("gliederung") || "").trim();
  }

  function setHero(group) {
    const avatarMount = $("#rek-hero-avatar");
    const kicker = $("#rek-hero-kicker");
    const title = $("#rek-hero-title");
    const meta = $("#rek-hero-meta");

    if (!group) {
      if (avatarMount) avatarMount.innerHTML = "";
      if (kicker) kicker.textContent = "Clubs";
      if (title) title.textContent = "Gliederung nicht gefunden";
      if (meta) meta.textContent = "";
      document.title = "Lifesaving Baden - Clubs";
      return;
    }

    if (avatarMount) {
      avatarMount.innerHTML = "";
      if (window.ClubsSearch && typeof window.ClubsSearch.renderAvatar === "function") {
        avatarMount.appendChild(window.ClubsSearch.renderAvatar(group, "xl", "rek-hero-avatar"));
      }
    }

    if (kicker) kicker.textContent = group.label || "Gliederung";
    if (title) title.textContent = group.name || "Clubs";
    if (meta) meta.textContent = group.subtitle || "";
    document.title = `Lifesaving Baden - ${group.name || "Clubs"}`;
  }

  function renderEmptyShell(group) {
    const mount = $("#rekorde-profil-container");
    if (!mount) return;

    mount.innerHTML = "";

    if (!group) {
      mount.appendChild(
        h(
          "section",
          { class: "rek-profile-error" },
          h("p", {}, "Die angefragte Gliederung konnte nicht gefunden werden.")
        )
      );
    }
  }

  function openGroup(group) {
    if (!group) return;

    setHero(group);
    renderEmptyShell(group);

    const url = new URL(window.location.href);
    url.searchParams.set("gliederung", String(group.id || ""));
    url.hash = "";
    history.replaceState(null, "", url.toString());
  }

  function renderApp() {
    const searchMount = $("#rek-search-layer");
    if (searchMount && window.ClubsSearch && typeof window.ClubsSearch.mount === "function") {
      searchMount.innerHTML = "";
      window.ClubsSearch.mount(searchMount, { openProfile: openGroup });
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    renderApp();
    await new Promise(requestAnimationFrame);

    try {
      if (!window.ClubsData || typeof window.ClubsData.loadGroupsAndStats !== "function") {
        throw new Error("ClubsData missing");
      }

      const { groups } = await window.ClubsData.loadGroupsAndStats({ sheetName: "Tabelle2" });

      if (window.ClubsSearch && typeof window.ClubsSearch.setGroups === "function") {
        window.ClubsSearch.setGroups(groups);
      }

      const requestedId = getGroupIdFromUrl();
      if (!requestedId) {
        setHero({ label: "Clubs", name: "Clubs", subtitle: "" });
        const mount = $("#rekorde-profil-container");
        if (mount) mount.innerHTML = "";
        return;
      }

      const hit = window.ClubsData.findGroupById(groups, requestedId);

      setHero(hit);
      renderEmptyShell(hit);
    } catch (err) {
      console.error("Clubs-Profil Boot-Fehler:", err);
      setHero(null);

      const mount = $("#rekorde-profil-container");
      if (mount) {
        mount.innerHTML = '<section class="rek-profile-error"><p>Fehler beim Laden der Daten.</p></section>';
      }

      if (window.ClubsSearch && typeof window.ClubsSearch.showError === "function") {
        window.ClubsSearch.showError("Fehler beim Laden der Daten.");
      }
    }
  });
})();
