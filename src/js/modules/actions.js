// --- Probar conexi�n ----------------------------------------------------------
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
  document.getElementById("titulo-acciones").textContent = `Acciones - ${prospecto.nombre}`;
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
  
}

function cerrarAccionesProspecto() {
  document.getElementById("modal-acciones")?.classList.remove("active");
  document.body.classList.remove("modal-open");
  
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
  if (!prospecto || prospecto.estatus !== "Cerrado") return toast("No se encontr� un cliente cerrado", "err");
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
  document.getElementById("titulo-nota").textContent = `Historial de ventas � ${prospecto.nombre}`;
  content.textContent = "Cargando historial...";
  document.getElementById("modal-nota").classList.add("active");
  document.body.classList.add("modal-open");
  try {
    const historial = await obtenerHistorialVentas(id);
    content.innerHTML = historial.length
      ? `<div class="table-wrap"><table><thead><tr><th>Fecha de cierre</th><th>Producto</th><th>Notas</th></tr></thead><tbody>${historial.map((venta) => `<tr><td>${esc(venta.fecha)}</td><td>${esc(venta.producto)}</td><td>${esc(venta.notas) || "�"}</td></tr>`).join("")}</tbody></table></div>`
      : "Todav�a no hay ventas registradas para este cliente.";
  } catch (exception) { content.textContent = "No se pudo cargar el historial."; }
}

async function probar() {
  try {
    const { count, error } = await agendaTable().select("id", { count: "exact", head: true });
    if (error) throw error;
    toast(`? Conexi�n exitosa � ${count || 0} registros encontrados`, "ok");
  } catch (e) {
    toast("No se pudo conectar con Supabase. Revisa el schema agendas.", "err");
  }
}

// --- editar modal ------------------------------------------------------
let prospectoEditarId = null;

function editarProspecto(id) {
  const p = prospectosBase.find((x) => String(x.id) === String(id));
  if (!p) return;

  cerrarAccionesProspecto();
  prospectoEditarId = String(p.id);

  // 0. Campos informativos cliente y teléfono (solo lectura con diseño formal acorde)
  const inputNombre = document.getElementById("f-edit-nombre");
  if (inputNombre) {
    inputNombre.value = p.nombre || "";
  }
  const inputTel = document.getElementById("f-edit-tel");
  if (inputTel) {
    inputTel.value = p.tel || "";
  }

  // 1. Fecha de seguimiento
  const inputFecha = document.getElementById("f-edit-fecha");
  if (inputFecha) {
    if (p.fecha) {
      const partes = String(p.fecha).split("/");
      if (partes.length === 3) {
        inputFecha.value = `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(p.fecha)) {
        inputFecha.value = p.fecha;
      } else {
        inputFecha.value = "";
      }
    } else {
      inputFecha.value = "";
    }
  }

  // 2. Tarjeta / producto
  const inputTipo = document.getElementById("f-edit-tipo");
  if (inputTipo) {
    inputTipo.value = p.tipo || "";
    if (typeof refrescarCustomSelect === "function") refrescarCustomSelect("f-edit-tipo");
  }

  // 3. Estatus
  const inputEstatus = document.getElementById("f-edit-estatus");
  if (inputEstatus) {
    inputEstatus.value = p.estatus || "Interesado";
    if (typeof refrescarCustomSelect === "function") refrescarCustomSelect("f-edit-estatus");
  }

  // 4. Notas
  const inputNotas = document.getElementById("f-edit-notas");
  if (inputNotas) {
    inputNotas.value = p.notas || "";
  }

  const errorP = document.getElementById("editar-prospecto-error");
  if (errorP) errorP.style.display = "none";

  document.getElementById("modal-editar")?.classList.add("active");
  document.body.classList.add("modal-open");
}

function cerrarEditarProspecto() {
  document.getElementById("modal-editar")?.classList.remove("active");
  document.body.classList.remove("modal-open");
  prospectoEditarId = null;
}

async function guardarEdicionProspecto() {
  if (!prospectoEditarId) return;

  const btn = document.getElementById("btn-actualizar-prospecto");
  const btnText = document.getElementById("btn-edit-text");
  const errorP = document.getElementById("editar-prospecto-error");
  if (errorP) errorP.style.display = "none";

  btn.disabled = true;
  if (btnText) btnText.innerHTML = '<span class="loader"></span> Actualizando...';

  try {
    const p = prospectosBase.find((x) => String(x.id) === prospectoEditarId);
    let fechaCierre = p?.fecha_cierre || null;
    const estatus = document.getElementById("f-edit-estatus").value;
    if (estatus === "Cerrado") {
      fechaCierre = fechaCierre || fechaHoyLocal();
    } else {
      fechaCierre = null;
    }

    const valores = {
      tipo: document.getElementById("f-edit-tipo").value,
      estatus: estatus,
      fecha: document.getElementById("f-edit-fecha").value || null,
      fecha_cierre: fechaCierre,
      notas: document.getElementById("f-edit-notas").value.trim(),
    };

    const { error } = await agendaTable().update(valores).eq("id", prospectoEditarId);
    if (error) throw error;

    toast("✓ Registro actualizado correctamente", "ok");
    cerrarEditarProspecto();

    // Actualizar secciones con los nuevos datos
    if (typeof actualizarTodasLasSecciones === "function") {
      await actualizarTodasLasSecciones({ mostrarNotificacion: false });
    } else if (typeof cargarLista === "function") {
      await cargarLista();
    }
  } catch (err) {
    console.error("Error al actualizar prospecto:", err);
    if (errorP) {
      errorP.textContent = "Error al actualizar el registro: " + (err.message || "Error de conexión");
      errorP.style.display = "block";
    }
    toast("No se pudo actualizar el registro", "err");
  } finally {
    btn.disabled = false;
    if (btnText) btnText.textContent = "Actualizar registro";
  }
}

document.getElementById("modal-editar")?.addEventListener("click", (event) => {
  if (event.target.id === "modal-editar") cerrarEditarProspecto();
});
// --- eliminar ------------------------------------------------------------
async function eliminarProspecto(id) {
  const prospecto = prospectosBase.find((item) => String(item.id) === String(id));
  if (!prospecto) return;
  prospectoEliminarId = id;
  document.getElementById("mensaje-confirmar-eliminacion").textContent =
    `�Deseas eliminar a ${prospecto.nombre}? Esta acci�n no se puede deshacer.`;
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

      // El borrado invalida el cach� del servidor: forzamos recarga real.
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
  
}

function cerrarNota() {
  document.body.classList.remove("modal-open");
  document.getElementById("modal-nota").classList.remove("active");
  
}

document.getElementById("modal-nueva-venta")?.addEventListener("click", (event) => { if (event.target.id === "modal-nueva-venta") cerrarNuevaVenta(); });

document.getElementById("modal-nota").addEventListener("click", (event) => {
  if (event.target.id === "modal-nota") cerrarNota();
});

// --- Init ---------------------------------------------------------------------



window.editarProspecto = editarProspecto;
window.cerrarEditarProspecto = cerrarEditarProspecto;
window.guardarEdicionProspecto = guardarEdicionProspecto;
