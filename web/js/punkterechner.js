function prCreateHeroMarkup() {
  return `
    <section class="pr-search-area" aria-label="Athletensuche">
      <div id="pr-ath-search-slot"></div>
    </section>
    <section class="hero">
      <div class="hero-head">
        <h1 id="pr-page-title">Punkterechner</h1>
        <div id="pr-hero-mode" class="hero-meta pr-hero-mode" role="group" aria-label="${prT("modeLabel")}">
          <button
            id="pr-hero-mode-individual"
            class="pr-hero-mode-option is-selected"
            type="button"
            data-pr-hero-mode="Einzel"
            aria-pressed="true"
          >${prT("modeIndividual")}</button>
          <span class="pr-hero-mode-separator" aria-hidden="true">・</span>
          <button
            id="pr-hero-mode-team"
            class="pr-hero-mode-option"
            type="button"
            data-pr-hero-mode="Mannschaft"
            aria-pressed="false"
          >${prT("modeTeam")}</button>
        </div>
        <p id="pr-hero-info" class="hero-info pr-hero-info">${prT("heroInfoNational")}</p>
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
