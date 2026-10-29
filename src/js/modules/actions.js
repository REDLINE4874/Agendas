// --- Probar conexión ----------------------------------------------------------
let prospectoNuevaVentaId = null;
let botonOrigenNuevaVenta = null;
let accionesProspectoId = null;
let prospectoEliminarId = null;

function abrirAccionesProspecto(idCodificado) {
  const id = decodeURIComponent(idCodificado);
  const prospecto = prospectosBase.find((item) => String(item.id) === id);
  const lista = document.getElementById("lista-acciones");
  if (!prospecto || !lista) return;
  accionesProspectoId = id;
  document.getElementById("titulo-acciones").textContent = `Acciones · ${prospecto.nombre}`;
  const acciones = [];
  if (prospecto.access === "owner") {
    acciones.push('<button class="btn btn-primary" type="button" data-modal-action="share" data-id="' + id + '"><span class="material-symbols-rounded icono-20">person_add</span>Compartir registro</button>');
    const publico = generalProspectoIds?.has(String(id));
    acciones.push('<button class="btn" type="button" data-modal-action="agenda" data-id="' + id + '" data-remove="' + publico + '"><span class="material-symbols-rounded icono-20">' + (publico ? "public_off" : "public") + '</span>' + (publico ? "Retirar de agenda general" : "Publicar en agenda general") + '</button>');
  }
  if (prospecto.access === "owner" || prospecto.access === "edit") {
    acciones.push('<button class="btn" type="button" data-modal-action="edit" data-id="' + id + '"><span class="material-symbols-rounded icono-20">border_color</span>Editar registro</button>');
  }
  if (prospecto.access === "owner") {
    acciones.push('<button class="btn btn-danger" type="button" data-modal-action="delete" data-id="' + id + '"><span class="material-symbols-rounded icono-20">delete</span>Eliminar registro</button>');
  }
  if (!acciones.length) acciones.push('<p class="text-muted">Este registro es de solo lectura.</p>');
  lista.innerHTML = '<div class="modal-actions-grid">' + acciones.join("") + '</div>';
  document.getElementById("modal-acciones").classList.add("active");
  document.body.classList.add("modal-open");
  document.querySelector(".app")?.classList.add("modal-shifted");
}

function cerrarAccionesProspecto() {
  document.getElementById("modal-acciones")?.classList.remove("active");
  document.body.classList.remove("modal-open");
  document.querySelector(".app")?.classList.remove("modal-shifted");
  accionesProspectoId = null;
}

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-modal-action]");
  if (action) {
    const id = action.dataset.id;
    if (action.dataset.modalAction === "share") {
      cerrarAccionesProspecto();
      abrirCompartirProspecto(id);
      return;
    }
    if (action.dataset.modalAction === "agenda") (action.dataset.remove === "true" ? retirarDeAgendaGeneral : publicarEnAgendaGeneral)(id);
    if (action.dataset.modalAction === "edit") editarProspecto(id);
    if (action.dataset.modalAction === "delete") {
      cerrarAccionesProspecto();
      eliminarProspecto(id);
      return;
    }
    cerrarAccionesProspecto();
    return;
  }
  if (event.target.id === "modal-acciones") cerrarAccionesProspecto();
});

document.getElementById("modal-confirmar-eliminacion")?.addEventListener("click", (event) => {
  if (event.target.id === "modal-confirmar-eliminacion") cancelarEliminacion();
});

function fechaLocalInput(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function abrirNuevaVenta(idCodificado) {
  const id = decodeURIComponent(idCodificado);
  const prospecto = prospectosBase.find((item) => String(item.id) === id);
  if (!prospecto || prospecto.estatus !== "Cerrado") return toast("No se encontró un cliente cerrado", "err");
  prospectoNuevaVentaId = id;
  botonOrigenNuevaVenta = document.activeElement;
  document.getElementById("nueva-venta-cliente").textContent = `Cliente: ${prospecto.nombre}`;
  const fecha = document.getElementById("venta-fecha");
  fecha.value = fechaLocalInput();
  fecha.max = fecha.value;
  document.getElementById("venta-producto").value = prospecto.tipo || "";
  refrescarCustomSelect("venta-producto");
  document.getElementById("venta-notas").value = "";
  document.getElementById("nueva-venta-error").style.display = "none";
  document.getElementById("modal-nueva-venta").classList.add("active");
  document.body.classList.add("modal-open");
  fecha.focus();
}

function cerrarNuevaVenta() {
  document.getElementById("modal-nueva-venta").classList.remove("active");
  document.body.classList.remove("modal-open");
  prospectoNuevaVentaId = null;
  if (botonOrigenNuevaVenta?.isConnected) botonOrigenNuevaVenta.focus();
  botonOrigenNuevaVenta = null;
}

async function guardarNuevaVenta() {
  const fecha = document.getElementById("venta-fecha");
  const producto = document.getElementById("venta-producto");
  const error = document.getElementById("nueva-venta-error");
  const button = document.getElementById("btn-registrar-venta");
  if (!prospectoNuevaVentaId || !fecha.value || !producto.value) return;
  button.disabled = true;
  button.textContent = "Registrando...";
  try {
    const result = await enviarNuevaVenta({ id: prospectoNuevaVentaId, fecha: fecha.value, tipo: producto.value, notas: document.getElementById("venta-notas").value.trim() });
    if (!result.ok) { error.textContent = result.error || "No se pudo registrar la venta."; error.style.display = "block"; return; }
    cerrarNuevaVenta();
    toast("? Nueva venta registrada; el plazo vuelve a iniciar.", "ok");
    await cargarLista();
  } catch (exception) {
    console.error(exception);
    error.textContent = "No se pudo registrar la venta.";
    error.style.display = "block";
  } finally {
    button.disabled = false;
    button.textContent = "Registrar venta";
  }
}

async function verHistorialVentas(idCodificado) {
  const id = decodeURIComponent(idCodificado);
  const prospecto = prospectosBase.find((item) => String(item.id) === id);
  if (!prospecto) return;
  const content = document.getElementById("modal-texto");
  document.getElementById("titulo-nota").textContent = `Historial de ventas · ${prospecto.nombre}`;
  content.textContent = "Cargando historial...";
  document.getElementById("modal-nota").classList.add("active");
  document.body.classList.add("modal-open");
  try {
    const historial = await obtenerHistorialVentas(id);
    content.innerHTML = historial.length
      ? `<div class="table-wrap"><table><thead><tr><th>Fecha de cierre</th><th>Producto</th><th>Notas</th></tr></thead><tbody>${historial.map((venta) => `<tr><td>${esc(venta.fecha)}</td><td>${esc(venta.producto)}</td><td>${esc(venta.notas) || "—"}</td></tr>`).join("")}</tbody></table></div>`
      : "Todavía no hay ventas registradas para este cliente.";
  } catch (exception) { content.textContent = "No se pudo cargar el historial."; }
}

async function probar() {
  try {
    const { count, error } = await agendaTable().select("id", { count: "exact", head: true });
    if (error) throw error;
    toast(`? Conexión exitosa — ${count || 0} registros encontrados`, "ok");
  } catch (e) {
    toast("No se pudo conectar con Supabase. Revisa el schema agendas.", "err");
  }
}

// --- editar ------------------------------------------------------------
function editarProspecto(id) {
  const p = prospectosBase.find((x) => x.id == id);

  if (!p) return;

  document.getElementById("f-nombre").value = p.nombre;
  document.getElementById("f-tel").value = p.tel;
  document.getElementById("f-tipo").value = p.tipo;
  document.getElementById("f-estatus").value = p.estatus;
  refrescarCustomSelect("f-tipo");
  refrescarCustomSelect("f-estatus");
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
  const cancelar = document.getElementById("btn-cancelar");
  if (cancelar) cancelar.hidden = false;

  const btnNuevo = document.getElementById("tab-nuevo");
  cambiarTab("nuevo", btnNuevo);
}
// --- eliminar ------------------------------------------------------------
async function eliminarProspecto(id) {
  const prospecto = prospectosBase.find((item) => String(item.id) === String(id));
  if (!prospecto) return;
  prospectoEliminarId = id;
  document.getElementById("mensaje-confirmar-eliminacion").textContent =
    `¿Deseas eliminar a ${prospecto.nombre}? Esta acción no se puede deshacer.`;
  document.getElementById("modal-confirmar-eliminacion").classList.add("active");
  document.body.classList.add("modal-open");
}

function cancelarEliminacion() {
  prospectoEliminarId = null;
  document.getElementById("modal-confirmar-eliminacion")?.classList.remove("active");
  document.body.classList.remove("modal-open");
}

async function confirmarEliminacion() {
  const id = prospectoEliminarId;
  cancelarEliminacion();
  if (!id) return;

  try {
    const user = await usuarioActual();
    const { error } = await agendaTable().delete().eq("id", id);
    if (!error) {
      toast("Prospecto eliminado", "ok");

      // El borrado invalida el caché del servidor: forzamos recarga real.
      await cargarLista();
    } else toast("No se pudo eliminar", "err");
  } catch (e) {
    toast("Error al eliminar", "err");
  }
}

// --- modal notas ---------------------------------------------------------------------
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

// --- Init ---------------------------------------------------------------------

