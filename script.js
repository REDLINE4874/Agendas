// ─── Código Apps Script que el usuario pegará ────────────────────────────────
// IMPORTANTE: usa JSONP para leer (evita CORS) y no-cors para escribir.
const APPS_SCRIPT_CODE = `// Pega este código en Apps Script y despliégalo como Aplicación Web
// Acceso: Cualquier usuario (Anyone, even anonymous)

const HOJA = "Prospectos";

function doGet(e) {

  const accion = e.parameter.accion || "listar";
  const callback = e.parameter.callback || "";

  let resultado;

  switch (accion) {

    case "guardar":
      resultado = guardar(e.parameter);
      break;

    case "editar":
      resultado = editar(e.parameter);
      break;

    case "eliminar":
      resultado = eliminar(e.parameter.id);
      break;

    default:
      resultado = listar();
  }

  const json = JSON.stringify(resultado);

  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function guardar(p) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(HOJA);

  if (!sheet) {

    sheet = ss.insertSheet(HOJA);

    sheet.appendRow([
      "ID",
      "Nombre",
      "Teléfono",
      "Producto",
      "Estatus",
      "Seguimiento",
      "Notas",
      "Fecha registro"
    ]);
  }

  const id = new Date().getTime().toString();

  const hoy = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "dd/MM/yyyy"
  );

  sheet.appendRow([
    id,
    p.nombre || "",
    p.tel || "",
    p.tipo || "",
    p.estatus || "",
    p.fecha || "",
    p.notas || "",
    hoy
  ]);

  return { ok: true };
}

function listar() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName(HOJA);

  if (!sheet || sheet.getLastRow() < 2) return [];

  const filas = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 8)
    .getValues();

  return filas.map(r => ({

  id: r[0],
  nombre: r[1],
  tel: r[2],
  tipo: r[3],
  estatus: r[4],

  fecha: r[5]
    ? Utilities.formatDate(
        new Date(r[5]),
        Session.getScriptTimeZone(),
        "dd/MM/yyyy"
      )
    : "",

  notas: r[6],

  registro: r[7]
    ? Utilities.formatDate(
        new Date(r[7]),
        Session.getScriptTimeZone(),
        "dd/MM/yyyy"
      )
    : ""

}));
}

function editar(p) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName(HOJA);

  const datos = sheet.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {

    if (String(datos[i][0]) === String(p.id)) {

      sheet.getRange(i + 1, 2).setValue(p.nombre);
      sheet.getRange(i + 1, 3).setValue(p.tel);
      sheet.getRange(i + 1, 4).setValue(p.tipo);
      sheet.getRange(i + 1, 5).setValue(p.estatus);
      sheet.getRange(i + 1, 6).setValue(p.fecha);
      sheet.getRange(i + 1, 7).setValue(p.notas);

      return { ok: true };
    }
  }

  return { ok: false };
}

function eliminar(id) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheet = ss.getSheetByName(HOJA);

  const datos = sheet.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {

    if (String(datos[i][0]) === String(id)) {

      sheet.deleteRow(i + 1);

      return { ok: true };
    }
  }

  return { ok: false };
}`;

document.getElementById("code-block").textContent = APPS_SCRIPT_CODE;

// ─── Config (localStorage) ────────────────────────────────────────────────────
let cfg = { url: "", sheet: "Prospectos" };
function cargarCfg() {
  try {
    const s = localStorage.getItem("agenda_cfg");
    if (s) cfg = JSON.parse(s);
  } catch (e) {}
  document.getElementById("cfg-url").value = cfg.url || "";
  document.getElementById("cfg-sheet").value = cfg.sheet || "Prospectos";
}
function guardarCfg() {
  cfg.url = document.getElementById("cfg-url").value.trim();
  cfg.sheet = document.getElementById("cfg-sheet").value.trim() || "Prospectos";
  try {
    localStorage.setItem("agenda_cfg", JSON.stringify(cfg));
  } catch (e) {}
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, tipo) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = tipo === "ok" ? "ok" : "err";
  t.style.display = "block";
  clearTimeout(t._t);
  t._t = setTimeout(() => (t.style.display = "none"), 3500);
}

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
  if (id === "lista") cargarLista();
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

// ─── JSONP helper (única forma confiable de leer de Apps Script sin CORS) ─────
function jsonp(url, params) {
  return new Promise((resolve, reject) => {
    const cbName =
      "_cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => {
      delete window[cbName];
      script.remove();
      reject(new Error("timeout"));
    }, 10000);

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

      cargarLista();
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
let prospectos = [];
let editandoId = null;

async function cargarLista() {

  if (!cfg.url) {
    renderTabla([]);
    return;
  }

  try {

    const respuesta = await jsonp(
      cfg.url,
      { accion: "listar" }
    );

    console.log("LISTAR:", respuesta);

    prospectos = respuesta;

    filtrar();

  } catch (e) {

    console.error(e);

    renderTabla([]);

  }

}

function filtrar() {

  if (!Array.isArray(prospectos)) {

    console.error(
      "prospectos no es un arreglo:",
      prospectos
    );

    renderTabla([]);

    return;
  }

  const q =
    (document.getElementById("buscador").value || "")
      .toLowerCase();

  const est =
    document.getElementById("filtro-estatus").value;

  const r = prospectos.filter(
    (p) =>
      (!q ||
        (p.nombre || "")
          .toLowerCase()
          .includes(q) ||
        (p.tel || "")
          .includes(q)) &&
      (!est || p.estatus === est)
  );

  renderTabla(r);

}

function badgeClass(e) {
  return (
    {
      Interesado: "badge-interesado",
      "En proceso": "badge-proceso",
      Cerrado: "badge-cerrado",
      Perdido: "badge-perdido",
    }[e] || ""
  );
}

function renderTabla(rows) {
  console.log("renderTabla:", rows);

  const w = document.getElementById("tabla-wrap");

  if (!Array.isArray(rows)) {

    console.error("renderTabla recibió:", rows);

    w.innerHTML = `
      <div class="empty">
        <p>Error al cargar prospectos</p>
      </div>
    `;

    return;
  }

  if (!rows.length) {

    w.innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"/>
          <path d="M8 12h8M12 8v8"/>
        </svg>
        <p>Sin resultados</p>
        <small>Prueba con otros filtros o agrega un nuevo prospecto.</small>
      </div>
    `;

    return;
  }
  w.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
  <th>Nombre</th>
  <th>Teléfono</th>
  <th>Producto</th>
  <th>Estatus</th>
  <th>Seguimiento</th>
  <th>Registro</th>
  <th>Notas</th>
  <th>Acciones</th>
</tr></thead>
    <tbody>${rows
      .map(
        (p) => `<tr>
      <td class="td-nombre">${esc(p.nombre)}</td>
      <td>${esc(p.tel)}</td>
      <td>${esc(p.tipo) || "—"}</td>
      <td><span class="badge ${badgeClass(p.estatus)}">${esc(p.estatus) || "—"}</span></td>
      <td>${esc(p.fecha) || "—"}</td>

<td style="color:#6b6b67">
  ${esc(p.registro) || "—"}
</td>

<td>

  ${
    p.notas
      ? `
      <button
        class="btn btn-sm"
        onclick="verNota(
  '${encodeURIComponent(p.nombre)}',
  '${encodeURIComponent(p.notas)}'
)">

        Ver nota

      </button>
      `
      : "—"
  }

</td>

<td>
  <button
    class="btn btn-sm"
    onclick="editarProspecto('${p.id}')">
    ✏️
  </button>

  <button
    class="btn btn-sm"
    onclick="eliminarProspecto('${p.id}')">
    🗑️
  </button>
</td>
    </tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Probar conexión ──────────────────────────────────────────────────────────
async function probar() {
  guardarCfg();
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
  document.getElementById("f-fecha").value = p.fecha;
  document.getElementById("f-notas").value = p.notas;

  editandoId = p.id;

  document.getElementById("btn-text").textContent = "Actualizar prospecto";

  const btnNuevo = document.querySelectorAll(".tab")[0];
  cambiarTab("nuevo", btnNuevo);
}
// ─── eliminar ────────────────────────────────────────────────────────────
async function eliminarProspecto(id) {
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

      cargarLista();
    } else {
      toast("No se pudo eliminar", "err");
    }
  } catch (e) {
    toast("Error al eliminar", "err");
  }
}
// ─── cambiar tema ────────────────────────────────────────────────────────────
function toggleTheme() {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "tema",
    document.body.classList.contains("dark") ? "dark" : "light",
  );
}

(function () {
  const tema = localStorage.getItem("tema");

  if (tema === "dark") {
    document.body.classList.add("dark");
  }
})();
// ─── modal notas ─────────────────────────────────────────────────────────────────────
function verNota(nombre, nota){

  document.getElementById("titulo-nota").textContent =
    "📝 " + decodeURIComponent(nombre);

  document.getElementById("modal-texto").textContent =
    decodeURIComponent(nota);

  document
    .getElementById("modal-nota")
    .classList.add("active");
}

function cerrarNota() {
  document.getElementById("modal-nota").classList.remove("active");
}

// ─── Init ─────────────────────────────────────────────────────────────────────
cargarCfg();
const hoy = new Date().toISOString().split("T")[0];
document.getElementById("f-fecha").value = hoy;
