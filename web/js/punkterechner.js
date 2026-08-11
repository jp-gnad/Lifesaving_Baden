function prCreateHeroMarkup() {
  return `
    <section class="pr-search-area" aria-label="Athletensuche">
      <div id="pr-ath-search-slot"></div>
    </section>
    <section class="hero">
      <div class="hero-head">
        <h1 id="pr-page-title">Punkterechner</h1>
      </div>
    </section>
  `;
}

function prCreateSourceNoteMarkup() {
  return `
    <section class="pr-source-note">
      <p>
        <img class="pr-source-note-icon" src="./assets/svg/icon_info.svg" alt="" aria-hidden="true">
        <span class="pr-source-note-content">
          <span id="pr-source-note-text">${prT("sourceNote")}</span>
          <a
            id="pr-source-note-link"
            href="https://www.dennisfabri.de/rettungssport/punkterechner.html"
            target="_blank"
            rel="noopener noreferrer"
          >${prT("sourceLinkText")}</a>.
        </span>
      </p>
    </section>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const main = document.getElementById("content");
  if (!main) return;

  main.innerHTML = `
    ${prCreateHeroMarkup()}
    ${prCreateControlsMarkup()}
    ${prCreateCalculatorTableMarkup()}
    ${prCreateSourceNoteMarkup()}
  `;

  prApplyLanguage();
  prInitControlsDisclosure();

  window.prEnsureIlsRecords({ force: true }).catch(error => {
    console.warn("ILS-Weltrekorde konnten beim Seitenaufruf nicht geladen werden:", error);
  });

  prEnsureNationalRecords()
    .then(() => {
      if (prNationalRecords.latestYear != null) {
        prSetInfo("nationalLoaded", { latestYear: prNationalRecords.latestYear });
      } else {
        prSetInfo("loadFail");
      }
    })
    .catch(error => {
      console.error(error);
      prSetInfo("loadError");
    })
    .finally(() => {
      prInitEvents();
      prRenderCurrentSelection();
    });
});
