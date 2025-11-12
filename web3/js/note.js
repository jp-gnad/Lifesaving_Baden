document.addEventListener("DOMContentLoaded", () => {
  const footer = document.getElementById("site-footer");
  if (!footer) return;

  const year = new Date().getFullYear();

  footer.innerHTML = `
    <div class="footer-inner">
      <p>© ${year} Lifesaving Baden</p>
      <nav aria-label="Fußnavigation" class="footnav">
        <a href="Datenschutz.html">Datenschutz</a>
        <span aria-hidden="true">·</span>
        <a href="Impressum.html">Impressum</a>
        <span aria-hidden="true">·</span>
        <a href="Infos.html">Infos</a>
      </nav>
    </div>
  `;
});
