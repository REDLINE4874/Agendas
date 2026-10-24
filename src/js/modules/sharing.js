function agendaRpc(nombre, parametros = {}) {
  return window.SUPABASE_AUTH_CLIENT.schema("agendas").rpc(nombre, parametros);
}

function prospectoPropio(id) {
  return (prospectosBase || []).find((p) => String(p.id) === String(id) && p.access === "owner");
}

let generalProspectoIds = new Set();
let prospectoCompartirId = null;

function actualizarSelectProspectos() {
  if (typeof setupCustomSelects === "function") setupCustomSelects();
}

function abrirCompartirProspecto(id) {
  const prospecto = prospectoPropio(id);
  if (!prospecto) return toast("Solo puedes compartir tus propios prospectos", "err");
  prospectoCompartirId = String(id);
  const usuario = document.getElementById("share-usuario");
  if (usuario) usuario.value = "";
  setupCustomSelects();
  cargarUsuariosCompartir();
  document.getElementById("modal-compartir")?.classList.add("active");
  document.body.classList.add("modal-open");
  cargarAccesosProspecto();
  document.getElementById("share-usuario")?.focus();
}

function cerrarCompartirProspecto() {
  document.getElementById("modal-compartir")?.classList.remove("active");
  document.body.classList.remove("modal-open");
  prospectoCompartirId = null;
}

async function cargarUsuariosCompartir() {
  const input = document.getElementById("share-usuario");
  const menu = input?.closest(".custom-select-wrap")?.querySelector(".custom-select__menu");
  if (!input || !menu) return;
  menu.innerHTML = '<button type="button" class="custom-option" data-value="">Cargando usuarios...</button>';
  setupCustomSelects();
  const { data, error } = await agendaRpc("list_shareable_users");
  if (error) {
    menu.innerHTML = '<button type="button" class="custom-option" data-value="">No se pudieron cargar los usuarios</button>';
  } else {
    menu.innerHTML = data?.length
      ? data.map((user) => `<button type="button" class="custom-option" data-value="${esc(user.username)}">${esc(user.username)}</button>`).join("")
      : '<button type="button" class="custom-option" data-value="">No hay otros usuarios registrados</button>';
  }
  input.value = "";
  setupCustomSelects();
}

async function cargarAccesosProspecto() {
  const id = prospectoCompartirId;
  const contenedor = document.getElementById("share-list");
  if (!id || !contenedor) return;
  const { data, error } = await agendaRpc("list_prospecto_shares", { target_prospecto_id: id });
  if (error) { contenedor.innerHTML = `<p class="text-muted">${esc(error.message)}</p>`; return; }
  contenedor.innerHTML = data?.length
    ? data.map((share) => `<div class="share-row"><span>${esc(share.recipient_username || "Usuario")} · ${share.permission === "edit" ? "Puede editar" : "Solo lectura"}</span><button class="btn btn-sm" type="button" onclick="quitarAccesoProspecto('${esc(id)}','${esc(share.recipient_id)}')">Quitar acceso</button></div>`).join("")
    : '<p class="text-muted">Este cliente no está compartido.</p>';
}

async function compartirProspecto() {
  const prospectoId = prospectoCompartirId;
  const usuario = document.getElementById("share-usuario")?.value.trim();
  const permiso = document.getElementById("share-permiso")?.value || "view";
  if (!prospectoId || !usuario) return toast("Selecciona un cliente e indica el usuario", "err");
  const { error } = await agendaRpc("share_prospecto_with_username", { target_prospecto_id: prospectoId, target_username: usuario, target_permission: permiso });
  if (error) return toast(error.message, "err");
  document.getElementById("share-usuario").value = "";
  toast("✓ Registro compartido", "ok");
  cargarAccesosProspecto();
}

async function quitarAccesoProspecto(prospectoId, recipientId) {
  const { error } = await agendaRpc("revoke_prospecto_share", { target_prospecto_id: prospectoId, target_recipient_id: recipientId });
  if (error) return toast(error.message, "err");
  toast("Acceso retirado", "ok");
  cargarAccesosProspecto();
}

async function publicarEnAgendaGeneral(prospectoId) {
  prospectoId = prospectoId || document.getElementById("general-prospecto")?.value;
  if (!prospectoId) return toast("No hay un prospecto propio para publicar", "err");
  const { error } = await agendaRpc("publish_prospecto_general", { target_prospecto_id: prospectoId });
  if (error) return toast(error.message, "err");
  toast("✓ Cliente publicado en la agenda general", "ok");
  await cargarAgendaGeneral();
  await cargarLista();
}

async function retirarDeAgendaGeneral(prospectoId) {
  const { error } = await agendaRpc("remove_prospecto_from_general", { target_prospecto_id: prospectoId });
  if (error) return toast(error.message, "err");
  toast("Cliente retirado de la agenda general", "ok");
  await cargarAgendaGeneral();
  await cargarLista();
}

async function cargarAgendaGeneral() {
  const contenedor = document.getElementById("general-list");
  if (!contenedor) return;
  const { data, error } = await agendaRpc("list_general_prospectos");
  if (error) { contenedor.innerHTML = `<p class="text-muted">${esc(error.message)}</p>`; return; }
  generalProspectoIds = new Set((data || []).map((p) => String(p.id)));
  contenedor.innerHTML = data?.length
    ? `<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Teléfono</th><th>TDC</th><th>Status</th><th>Fecha seguimiento</th><th>Comentario</th><th>Fecha registro</th><th>Fecha cierre</th><th>Publicado por</th><th>Acciones</th></tr></thead><tbody>${data.map((p) => `<tr><td class="td-nombre">${esc(p.nombre)}</td><td>${esc(p.tel)}</td><td>${esc(p.tipo) || "—"}</td><td>${esc(p.estatus) || "—"}</td><td>${esc(formatoFecha(p.fecha)) || "—"}</td><td class="td-notas">${esc(p.notas) || "—"}</td><td>${esc(formatoFecha(p.created_at)) || "—"}</td><td>${esc(formatoFecha(p.fecha_cierre)) || "—"}</td><td>${esc(p.owner_username) || "Usuario"}</td><td>${p.is_owner ? `<button class="btn btn-sm" type="button" onclick="retirarDeAgendaGeneral('${esc(p.id)}')">Retirar</button>` : "—"}</td></tr>`).join("")}</tbody></table></div>`
    : '<div class="empty"><p>No hay clientes públicos todavía</p><small>Los clientes publicados por cualquier usuario aparecerán aquí.</small></div>';
  if (data?.length) {
    contenedor.querySelectorAll("td.td-notas").forEach((celda) => {
      const nota = celda.textContent.trim();
      if (!nota || nota === "—") return;
      celda.textContent = "";
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "btn btn-sm";
      boton.title = "Ver notas";
      boton.innerHTML = '<span class="material-symbols-rounded icono-20">note_stack</span>';
      boton.addEventListener("click", () => verNota(encodeURIComponent("Notas del cliente"), encodeURIComponent(nota)));
      celda.appendChild(boton);
    });
  }
}

document.addEventListener("click", (event) => {
  if (event.target.id === "modal-compartir") cerrarCompartirProspecto();
});
