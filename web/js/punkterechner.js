function prCreateHeroMarkup() {
  return `
    <section class="hero">
      <button id="pr-lang-switch" class="pr-lang-switch" type="button">
        <img id="pr-lang-switch-icon" src="./svg/Großbritannien.svg" alt="English">
        <span id="pr-lang-switch-text">English</span>
      </button>
      <h1 id="pr-page-title">Punkterechner</h1>
    </section>
  `;
}

function prCreateSourceNoteMarkup() {
  return `
    <section class="pr-source-note">
      <p>
        <span id="pr-source-note-text">${prT("sourceNote")}</span>
        <a
          id="pr-source-note-link"
          href="https://www.dennisfabri.de/rettungssport/punkterechner.html"
          target="_blank"
          rel="noopener noreferrer"
        >${prT("sourceLinkText")}</a>.
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

  if (typeof XLSX === "undefined") {
    prSetInfo("xlsxMissing");
    prInitEvents();
    prRenderCurrentSelection();
    return;
  }

  Promise.all([
    prEnsureNationalRecords(),
    prEnsureRecordsWorkbook()
  ])
    .then(() => {
      if (prNationalRecords.latestYear != null) {
        prSetInfo("nationalLoaded", { latestYear: prNationalRecords.latestYear });
      } else {
        prSetInfo("loadFail");
      }
      prInitEvents();
      prRenderCurrentSelection();
    })
    .catch(err => {
      console.error(err);
      prSetInfo("loadError");
      prInitEvents();
      prRenderCurrentSelection();
    });
});