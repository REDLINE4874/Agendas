
// ─── JSONP helper (única forma confiable de leer de Apps Script sin CORS) ─────
function jsonp(url, params, timeoutMs) {
  return new Promise((resolve, reject) => {
    const cbName =
      "_cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => {
      delete window[cbName];
      script.remove();
      reject(new Error("timeout"));
    }, timeoutMs || 20000); // 20s: da margen al cold start de Apps Script

    window[cbName] = (data) => {
      clearTimeout(timeout);
      delete window[cbName];
      script.remove();
      resolve(data);
    };

    const allParams = new URLSearchParams({ ...params, callback: cbName });
    const script = document.createElement("script");
    script.src = url + "?" + allParams.toString();
    script.onerror = () => {
      clearTimeout(timeout);
      delete window[cbName];
      reject(new Error("script error"));
    };
    document.head.appendChild(script);
  });
}

async function guardarProspecto() {
  const cfg = obtenerCfg();
  const nombre = document.getElementById("f-nombre").value.trim();
  const tel = document.getElementById("f-tel").value.trim();
  if (!nombre || !tel) {
    toast("El nombre y teléfono son obligatorios", "err");
    return;
  }
  if (!cfg.url) {
    toast("Primero configura la URL del Apps Script", "err");
    cambiarTab("config", document.querySelectorAll(".tab")[2]);
    return;
  }

  const btn = document.getElementById("btn-guardar");
  const btnTxt = document.getElementById("btn-text");
  btn.disabled = true;
  btnTxt.innerHTML = '<span class="loader"></span> Guardando...';

  try {
    const data = await jsonp(cfg.url, {
      accion: editandoId ? "editar" : "guardar",
      id: editandoId,
      nombre,
      tel,
      tipo: document.getElementById("f-tipo").value,
      estatus: document.getElementById("f-estatus").value,
      fecha: document.getElementById("f-fecha").value,
      notas: document.getElementById("f-notas").value.trim(),
    });
    if (data && data.ok) {
      toast(
        editandoId
          ? "✓ Prospecto actualizado"
          : "✓ Prospecto guardado correctamente",
        "ok",
      );

      limpiarForm();

      // El guardado invalida el caché del servidor, así que forzamos
      // una recarga real en vez de usar la versión "fresca" en memoria.
      await cargarLista();
    } else {
      toast("El script respondió con un error", "err");
    }
  } catch (e) {
    toast("Error de conexión. Revisa la URL del script.", "err");
  } finally {
    btn.disabled = false;
    btnTxt.textContent = "Guardar prospecto";
  }
}

// ─── Lista ───────────────────────────────────────────────────────────────────
async function cargarLista() {
  const cfg = obtenerCfg();

  if (!cfg.url) {
    renderTabla([]);
    return;
  }

  if (cargandoLista) return;

  cargandoLista = true;
  mostrarCargaLista();
  setBotonesActualizacionEstado(true);
  toast("Actualizando prospectos...", "ok");

  try {

    const respuesta = await jsonp(
      cfg.url,
      { accion: "listar" }
    );

    console.log("LISTAR:", respuesta);

    prospectos = Array.isArray(respuesta) ? respuesta : [];
    prospectosBase = [...prospectos];
    actualizarFiltroMes(prospectosBase);
    filtrar();
    renderHoy();
    toast("✓ Prospectos actualizados correctamente", "ok");

  } catch (e) {

    console.error(e);

    toast("No se pudo conectar con la hoja de cálculo", "err");
    renderTabla([]);

  } finally {
    cargandoLista = false;
    setBotonesActualizacionEstado(false);
  }

}

// Solo vuelve a pintar la vista sin consultar el backend; la recarga real
// ocurre solo cuando el usuario fuerza la actualización o guarda un prospecto.

