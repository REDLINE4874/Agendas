
// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, tipo) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = tipo === "ok" ? "ok" : "err";
  t.style.display = "block";
  clearTimeout(t._t);
  t._t = setTimeout(() => (t.style.display = "none"), 3500);
}

function copiarTelefono(valor = "") {
  const texto = String(valor || document.getElementById("f-tel")?.value || "").trim();

  if (!texto) {
    toast("No hay un número para copiar", "err");
    return;
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(texto)
      .then(() => toast("✓ Número copiado al portapapeles", "ok"))
      .catch(() => fallbackCopy(texto));
    return;
  }

  fallbackCopy(texto);
}

function fallbackCopy(texto) {
  const temp = document.createElement("textarea");
  temp.value = texto;
  temp.setAttribute("readonly", "");
  temp.style.position = "fixed";
  temp.style.opacity = "0";
  document.body.appendChild(temp);
  temp.select();
  try {
    document.execCommand("copy");
    toast("✓ Número copiado al portapapeles", "ok");
  } catch (e) {
    toast("No se pudo copiar el número", "err");
  } finally {
    document.body.removeChild(temp);
  }
}


