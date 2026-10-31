// ─── Tabs ────────────────────────────────────────────────────────────────────
function cambiarTab(id, btn) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));

  if (btn) {
    btn.classList.add("active");
  } else {
    const targetBtn = document.getElementById("tab-" + id) || document.querySelector(`.tab[onclick*="'${id}'"]`);
    if (targetBtn) targetBtn.classList.add("active");
  }

  const panel = document.getElementById("panel-" + id);
  if (panel) panel.classList.add("active");

  // Al seleccionar una sección en específico, se actualiza en automático solo esa sección
  if (typeof actualizarSeccion === "function") {
    actualizarSeccion(id);
  }
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

window.cambiarTab = cambiarTab;
window.limpiarForm = limpiarForm;
window.cancelarEdicion = cancelarEdicion;
