const hoy = new Date().toISOString().split("T")[0];
const inputFecha = document.getElementById("f-fecha");
if (inputFecha) inputFecha.value = hoy;
if (typeof renderHoy === "function") renderHoy();

// Si al cargar app.js ya existe una sesión autenticada recuperada,
// asegurar que se actualicen todas las secciones.
if (window.SUPABASE_AUTH_CLIENT?.auth) {
  window.SUPABASE_AUTH_CLIENT.auth.getSession().then(({ data }) => {
    if (data?.session?.user && typeof window.actualizarTodasLasSecciones === "function") {
      window.actualizarTodasLasSecciones();
    }
  });
}
