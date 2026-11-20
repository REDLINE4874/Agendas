(() => {
  const STORAGE_KEY = "agenda-visual-style";
  const NEW_BADGE_EXPIRES_AT = Date.parse("2026-11-27T05:22:41.483Z");
  const root = document.documentElement;
  let initialStyle = "brutalist";

  try {
    initialStyle = localStorage.getItem(STORAGE_KEY) === "soft" ? "soft" : "brutalist";
  } catch (error) {
    console.error("No se pudo recuperar el estilo visual guardado.", error);
  }

  root.dataset.visualStyle = initialStyle;

  function initializeNewBadge() {
    const badge = document.querySelector(".personalization-menu__new-badge");
    if (badge) badge.hidden = Date.now() >= NEW_BADGE_EXPIRES_AT;
  }

  function initializeToggle() {
    initializeNewBadge();
    const button = document.getElementById("visualStyleToggle");
    if (!button) return;

    function updateButton(style) {
      const isSoft = style === "soft";
      button.textContent = isSoft ? "Suave" : "Brutalista";
      button.setAttribute("aria-pressed", String(isSoft));
      button.setAttribute("aria-label", `Cambiar a estilo ${isSoft ? "brutalista" : "suave"}`);
      button.title = `Cambiar a estilo ${isSoft ? "brutalista" : "suave"}`;
    }

    updateButton(root.dataset.visualStyle);
    button.addEventListener("click", () => {
      const style = root.dataset.visualStyle === "soft" ? "brutalist" : "soft";
      root.dataset.visualStyle = style;
      updateButton(style);

      try {
        localStorage.setItem(STORAGE_KEY, style);
      } catch (error) {
        console.error("No se pudo guardar el estilo visual seleccionado.", error);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeToggle, { once: true });
  } else {
    initializeToggle();
  }
})();
