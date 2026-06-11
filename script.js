// ─── Código Apps Script que el usuario pegará ────────────────────────────────
// IMPORTANTE: usa JSONP para leer (evita CORS) y no-cors para escribir.
const APPS_SCRIPT_CODE = `
`;

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
let prospectosBase = [];
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

    prospectos = Array.isArray(respuesta) ? respuesta : [];
    prospectosBase = [...prospectos];

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
      .trim()
      .toLowerCase();

  const est = document.getElementById("filtro-estatus").value;

  const r = prospectosBase.filter((p) => {
    const nombre = String(p.nombre || "").toLowerCase();
    const telefono = String(p.tel || "").toLowerCase();
    const producto = String(p.tipo || "").toLowerCase();

    const coincideTexto =
      !q ||
      nombre.includes(q) ||
      telefono.includes(q) ||
      producto.includes(q);

    const coincideEstatus = !est || p.estatus === est;

    return coincideTexto && coincideEstatus;
  });

  prospectos = r;

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

function mesKeyDeRegistro(p) {
  const fecha = p.registro || p.fecha || "";
  const partes = fecha.split("/");

  if (partes.length !== 3) return "sin-fecha";

  return `${partes[2]}-${partes[1].padStart(2, "0")}`;
}

function etiquetaMes(fecha) {
  const partes = (fecha || "").split("/");

  if (partes.length !== 3) return "Sin fecha de registro";

  const [dia, mes, anio] = partes.map(Number);
  const fechaObj = new Date(anio, mes - 1, dia);

  return fechaObj.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

function agruparPorMes(rows) {
  return Object.entries(
    rows.reduce((acc, p) => {
      const key = mesKeyDeRegistro(p);
      const label = etiquetaMes(p.registro || p.fecha || "");

      if (!acc[key]) acc[key] = { label, items: [] };
      acc[key].items.push(p);
      return acc;
    }, {}),
  ).sort((a, b) => b[0].localeCompare(a[0]));
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

  const grupos = agruparPorMes(rows);

  w.innerHTML = `<div class="table-wrap">${grupos
    .map(
      ([key, grupo]) => `
      <section class="mes-group">
        <div class="mes-header">
          <h3>${esc(grupo.label)}</h3>
          <span>${grupo.items.length} prospecto${grupo.items.length === 1 ? "" : "s"}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Producto</th>
              <th>Estatus</th>
              <th>Seguimiento</th>
              <th>Registro</th>
              <th>Notas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>${grupo.items
            .map(
              (p) => `<tr>
                <td class="td-nombre">${esc(p.nombre)}</td>
                <td>${esc(p.tel)}</td>
                <td>${esc(p.tipo) || "—"}</td>
                <td><span class="badge ${badgeClass(p.estatus)}">${esc(p.estatus) || "—"}</span></td>
                <td>${esc(p.fecha) || "—"}</td>
                <td style="color:#6b6b67">${esc(p.registro) || "—"}</td>
                <td>${
                  p.notas
                    ? `<button class="btn btn-sm" onclick="verNota('${encodeURIComponent(p.nombre)}','${encodeURIComponent(p.notas)}')">Ver nota</button>`
                    : "—"
                }</td>
                <td>
                  <button class="btn btn-sm" onclick="editarProspecto('${p.id}')">✏️</button>
                  <button class="btn btn-sm" onclick="eliminarProspecto('${p.id}')">🗑️</button>
                </td>
              </tr>`,
            )
            .join("")}</tbody>
        </table>
      </section>`,
    )
    .join("")}</div>`;
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
