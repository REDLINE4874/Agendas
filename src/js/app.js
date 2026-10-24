const hoy = new Date().toISOString().split("T")[0];
document.getElementById("f-fecha").value = hoy;
renderHoy();
// La carga de datos se inicia desde site-auth.js únicamente después de
// recuperar una sesión autenticada.

// El refresco de la vista se hace de forma manual o al guardar/editar
// un prospecto, sin actualización automática cada minuto.

