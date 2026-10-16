const hoy = new Date().toISOString().split("T")[0];
document.getElementById("f-fecha").value = hoy;
renderHoy();
// Carga los datos una vez al iniciar para poder mostrar el contador de
// "Seguimiento hoy" en la pestaña, sin necesidad de que el usuario la abra.
if (obtenerCfg().url) {
  cargarLista();
}

// El refresco de la vista se hace de forma manual o al guardar/editar
// un prospecto, sin actualización automática cada minuto.

