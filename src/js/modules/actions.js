// ─── Probar conexión ──────────────────────────────────────────────────────────
async function probar() {
  const cfg = guardarCfg();
  if (!cfg.url) {
    toast("Ingresa primero la URL del script", "err");
    return;
  }
  try {
    const data = await jsonp(cfg.url, { accion: "listar" });
    toast(
      `✓ Conexión exitosa — ${Array.isArray(data) ? data.length + " registros encontrados" : "OK"}`,
      "ok",
    );
  } catch (e) {
    toast(
      'No se pudo conectar. Verifica la URL y que el acceso sea "Cualquier usuario".',
      "err",
    );
  }
}

// ─── Copiar código ────────────────────────────────────────────────────────────
function copiarCodigo() {
  navigator.clipboard
    .writeText(APPS_SCRIPT_CODE)
    .then(() => toast("Código copiado al portapapeles", "ok"))
    .catch(() => toast("No se pudo copiar, selecciónalo manualmente", "err"));
}
// ─── editar ────────────────────────────────────────────────────────────
function editarProspecto(id) {
  const p = prospectos.find((x) => x.id == id);

  if (!p) return;

  document.getElementById("f-nombre").value = p.nombre;
  document.getElementById("f-tel").value = p.tel;
  document.getElementById("f-tipo").value = p.tipo;
  document.getElementById("f-estatus").value = p.estatus;
 if (p.fecha) {

  const partes = p.fecha.split("/");

  if (partes.length === 3) {

    document.getElementById("f-fecha").value =
      `${partes[2]}-${partes[1]}-${partes[0]}`;

  }

}
  document.getElementById("f-notas").value = p.notas;

  editandoId = p.id;

  document.getElementById("btn-text").textContent = "Actualizar prospecto";

  const btnNuevo = document.querySelectorAll(".tab")[0];
  cambiarTab("nuevo", btnNuevo);
}
// ─── eliminar ────────────────────────────────────────────────────────────
async function eliminarProspecto(id) {
  const cfg = obtenerCfg();
  if (!confirm("¿Deseas eliminar este prospecto?")) {
    return;
  }

  try {
    const r = await jsonp(cfg.url, {
      accion: "eliminar",
      id,
    });

    if (r.ok) {
      toast("Prospecto eliminado", "ok");

      // El borrado invalida el caché del servidor: forzamos recarga real.
      await cargarLista();
    } else {
      toast("No se pudo eliminar", "err");
    }
  } catch (e) {
    toast("Error al eliminar", "err");
  }
}

// ─── modal notas ─────────────────────────────────────────────────────────────────────
function verNota(nombre, nota) {
  document.body.classList.add("modal-open");

  document.getElementById("titulo-nota").textContent =
    " " + decodeURIComponent(nombre);

  document.getElementById("modal-texto").textContent =
    decodeURIComponent(nota);

  document.getElementById("modal-nota").classList.add("active");
  document.querySelector(".app")?.classList.add("modal-shifted");
}

function cerrarNota() {
  document.body.classList.remove("modal-open");
  document.getElementById("modal-nota").classList.remove("active");
  document.querySelector(".app")?.classList.remove("modal-shifted");
}

document.getElementById("modal-nota").addEventListener("click", (event) => {
  if (event.target.id === "modal-nota") cerrarNota();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
cargarCfg();

