// ─── Código Apps Script que el usuario pegará ────────────────────────────────
// IMPORTANTE: usa JSONP para leer (evita CORS) y no-cors para escribir.
const APPS_SCRIPT_CODE = `
`;

const DEFAULT_SCRIPT_URL = "";
const DEFAULT_SHEET_NAME = "Prospectos";

// El listado solo se actualiza por acción explícita del usuario o al
// guardar/editar un prospecto; no se recarga en segundo plano.
const codeBlock = document.getElementById("code-block");
if (codeBlock) {
  codeBlock.textContent = APPS_SCRIPT_CODE;
}

let prospectos = [];
let prospectosBase = [];
let editandoId = null;
let cargandoLista = false;

function setBotonesActualizacionEstado(cargando) {
  document.querySelectorAll('button[onclick*="cargarLista()"]').forEach((btn) => {
    btn.disabled = cargando;
    const textoBase = btn.dataset.originalText || btn.textContent.trim();
    if (!btn.dataset.originalText) btn.dataset.originalText = textoBase;
    btn.innerHTML = cargando
      ? '<span class="loader"></span> Actualizando...'
      : textoBase;
  });
}

function mostrarCargaLista() {
  const contenedor = document.getElementById("tabla-wrap");
  const contenedorHoy = document.getElementById("tabla-hoy-wrap");

  const loader = `
    <div class="loading-state">
      <div class="loading-state__spinner"></div>
      <p>Actualizando prospectos...</p>
      <small>Cargando información desde la hoja.</small>
    </div>
  `;

  if (contenedor) contenedor.innerHTML = loader;
  if (contenedorHoy) contenedorHoy.innerHTML = loader;
}

function obtenerCfg() {
  if (!window.agendaCfg) {
    window.agendaCfg = { url: DEFAULT_SCRIPT_URL, sheet: DEFAULT_SHEET_NAME };
  }
  return window.agendaCfg;
}


