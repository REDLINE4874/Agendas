// ─── Tabs ────────────────────────────────────────────────────────────────────
function cambiarTab(id, btn) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("panel-" + id).classList.add("active");
  if (id === "lista" || id === "compartidos" || id === "hoy" || id === "reventa") {
    renderHoy();
    if (id === "lista") renderTabla(prospectos);
    if (id === "compartidos") renderCompartidos();
    if (id === "reventa") renderReventa();
  }
  if (id === "general") cargarAgendaGeneral();
}

// ─── Formulario ──────────────────────────────────────────────────────────────
function limpiarForm() {
  ["f-nombre", "f-tel", "f-tipo", "f-notas", "f-fecha"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );

  document.getElementById("f-estatus").value = "Interesado";
  refrescarCustomSelect("f-tipo");
  refrescarCustomSelect("f-estatus");

  editandoId = null;

  document.getElementById("btn-text").textContent = "Guardar prospecto";
  const cancelar = document.getElementById("btn-cancelar");
  if (cancelar) cancelar.hidden = true;

  document.getElementById("f-nombre").focus();
}

function cancelarEdicion() {
  if (editandoId === null) return;
  limpiarForm();
  cambiarTab("lista", document.getElementById("tab-lista"));
  toast("Edición cancelada; no se guardaron los cambios.", "ok");
}

