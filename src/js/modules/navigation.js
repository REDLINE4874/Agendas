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
  if (id === "lista" || id === "hoy") {
    renderHoy();
    if (id === "lista") renderTabla(prospectos);
  }
}

// ─── Formulario ──────────────────────────────────────────────────────────────
function limpiarForm() {
  ["f-nombre", "f-tel", "f-tipo", "f-notas", "f-fecha"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );

  document.getElementById("f-estatus").value = "Interesado";

  editandoId = null;

  document.getElementById("btn-text").textContent = "Guardar prospecto";

  document.getElementById("f-nombre").focus();
}

