document.addEventListener("DOMContentLoaded", () => {
  const footer = document.getElementById("site-footer");
  if (!footer) return;

  const year = new Date().getFullYear();

  footer.innerHTML = `
    <div class="footer-inner">
      <p>© ${year} Lifesaving Baden</p>
      <nav aria-label="Fußnavigation" class="footnav">
        <a href="datenschutz.html">Datenschutz</a>
        <span aria-hidden="true">·</span>
        <a href="impressum.html">Impressum</a>
      </nav>
    </div>
  `;
});
