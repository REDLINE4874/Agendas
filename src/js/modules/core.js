// Gestión de estado de prospectos y secciones.
// Al seleccionar una sección en específico se actualiza en automático únicamente esa sección.
// Al iniciar sesión se actualizan todas las secciones.

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
      <small>Cargando información desde Supabase.</small>
    </div>
  `;

  if (contenedor) contenedor.innerHTML = loader;
  if (contenedorHoy) contenedorHoy.innerHTML = loader;
}
