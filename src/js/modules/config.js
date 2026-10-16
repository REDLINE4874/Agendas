// ─── Config (localStorage) ────────────────────────────────────────────────────
function cargarCfg() {
  const cfg = obtenerCfg();
  try {
    const s = localStorage.getItem("agenda_cfg");
    if (s) {
      const parsed = JSON.parse(s);
      Object.assign(cfg, parsed);
    }
  } catch (e) {}

  if (!cfg.url) cfg.url = DEFAULT_SCRIPT_URL;
  if (!cfg.sheet) cfg.sheet = DEFAULT_SHEET_NAME;

  const urlInput = document.getElementById("cfg-url");
  const sheetInput = document.getElementById("cfg-sheet");
  if (urlInput) {
    urlInput.value = cfg.url || DEFAULT_SCRIPT_URL;
  }
  if (sheetInput) {
    sheetInput.value = cfg.sheet || DEFAULT_SHEET_NAME;
  }

  try {
    localStorage.setItem("agenda_cfg", JSON.stringify(cfg));
  } catch (e) {}
}
function guardarCfg() {
  const cfg = obtenerCfg();
  const urlInput = document.getElementById("cfg-url");
  const sheetInput = document.getElementById("cfg-sheet");
  if (urlInput) cfg.url = urlInput.value.trim();
  if (sheetInput) cfg.sheet = sheetInput.value.trim() || "Prospectos";
  try {
    localStorage.setItem("agenda_cfg", JSON.stringify(cfg));
  } catch (e) {}
  return cfg;
}

