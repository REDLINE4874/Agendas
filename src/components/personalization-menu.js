(() => {
  const menu = document.getElementById("personalizationMenu");
  const toggle = document.getElementById("personalizationToggle");
  const panel = document.getElementById("personalizationPanel");
  if (!menu || !toggle || !panel) return;

  function setOpen(isOpen, restoreFocus = false) {
    panel.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen && restoreFocus) toggle.focus();
  }

  toggle.addEventListener("click", () => setOpen(panel.hidden));

  document.addEventListener("click", (event) => {
    if (panel.hidden || event.composedPath().includes(menu)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false, true);
  });
})();
