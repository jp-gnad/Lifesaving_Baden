document.addEventListener("DOMContentLoaded", () => {
  const athletenContainer = document.getElementById("athletenTableContainer");
  if (!athletenContainer) return;

  // Wrapper für Button (optional, für Styling)
  const btnWrapper = document.createElement("div");
  btnWrapper.style.position = "absolute";
  btnWrapper.style.top = "0";
  btnWrapper.style.left = "0";

  // Button erstellen (nur Icon)
  const button = document.createElement("button");
  button.id = "aktualisierenBtn";
  button.textContent = "⟳"; // nur Icon
  button.style.color = "white";
  button.style.padding = "5px 8px";   // kompakt
  button.style.border = "0px solid #ccc";
  button.style.borderRadius = "4px";
  button.style.backgroundColor = "#555555";
  button.style.cursor = "pointer";
  button.style.fontSize = "16px";     // Icon gut sichtbar
  button.style.lineHeight = "1";

  // Hover-Effekt
  button.addEventListener("mouseenter", () => {
    button.style.backgroundColor = "#333333";
  });
  button.addEventListener("mouseleave", () => {
    button.style.backgroundColor = "#555555";
  });

  // Button in Wrapper packen
  btnWrapper.appendChild(button);

  // Container als Positionierungsreferenz
  athletenContainer.style.position = "relative";

  // Wrapper direkt in den Athleten-Container einfügen
  athletenContainer.appendChild(btnWrapper);

  button.addEventListener("click", () => {
    ladeAthleten().catch(err => console.error(err));
});


});
