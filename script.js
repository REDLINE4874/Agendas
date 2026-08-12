// ─── Código Apps Script que el usuario pegará ────────────────────────────────
// IMPORTANTE: usa JSONP para leer (evita CORS) y no-cors para escribir.
const APPS_SCRIPT_CODE = `
`;

const DEFAULT_SCRIPT_URL = "";
const DEFAULT_SHEET_NAME = "Prospectos";

const codeBlock = document.getElementById("code-block");
if (codeBlock) {
  codeBlock.textContent = APPS_SCRIPT_CODE;
}

let prospectos = [];
let prospectosBase = [];
let editandoId = null;

function obtenerCfg() {
  if (!window.agendaCfg) {
    window.agendaCfg = { url: DEFAULT_SCRIPT_URL, sheet: DEFAULT_SHEET_NAME };
  }
  return window.agendaCfg;
}

function setupCustomSelects() {
  document.querySelectorAll('.custom-select-wrap').forEach((wrap) => {
    const button = wrap.querySelector('.custom-select');
    const input = wrap.querySelector('input[type="hidden"]');
    const menu = wrap.querySelector('.custom-select__menu');
    const options = wrap.querySelectorAll('.custom-option');
    const valueSpan = button?.querySelector('.custom-select__value');

    if (!button || !input || !menu || !valueSpan) return;

    if (!document.__customSelectGlobalBound) {
      document.__customSelectGlobalBound = true;
      document.addEventListener('click', (event) => {
        document.querySelectorAll('.custom-select-wrap.active').forEach((activeWrap) => {
          if (!activeWrap.contains(event.target)) {
            activeWrap.classList.remove('active');
            const aBtn = activeWrap.querySelector('.custom-select');
            if (aBtn) aBtn.setAttribute('aria-expanded', 'false');
          }
        });
      });
    }

    const updateSelection = () => {
      const current = input.value || '';
      let label = button.getAttribute('data-placeholder') || '';
      options.forEach((opt) => {
        opt.classList.toggle('is-selected', opt.getAttribute('data-value') === current);
        if (opt.getAttribute('data-value') === current) label = opt.textContent;
      });
      valueSpan.textContent = label || button.getAttribute('data-placeholder') || '';
      button.setAttribute('aria-expanded', 'false');
      wrap.classList.remove('active');
    };

    if (!wrap.dataset.selectBound) {
      wrap.dataset.selectBound = 'true';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        document.querySelectorAll('.custom-select-wrap.active').forEach((activeWrap) => {
          if (activeWrap !== wrap) {
            activeWrap.classList.remove('active');
            const aBtn = activeWrap.querySelector('.custom-select');
            if (aBtn) aBtn.setAttribute('aria-expanded', 'false');
          }
        });
        const isOpen = wrap.classList.toggle('active');
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    options.forEach((opt) => {
      if (opt.dataset.bound === 'true') return;
      opt.dataset.bound = 'true';
      opt.addEventListener('click', () => {
        const value = opt.getAttribute('data-value') || '';
        input.value = value;
        updateSelection();
        if (input.id === 'filtro-estatus' || input.id === 'filtro-mes') {
          filtrar();
        }
      });
    });

    updateSelection();
  });
}

document.addEventListener('DOMContentLoaded', setupCustomSelects);

// ─── Config (localStorage) ────────────────────────────────────────────────────
function cargarCfg() {
  const cfg = obtenerCfg();
  try {
    const s = localStorage.getItem("agenda_cfg");
    if (s) {
      const parsed = JSON.parse(s);
      Object.assign(cfg, parsed);
    }
  } catch (e) {}

  if (!cfg.url) cfg.url = DEFAULT_SCRIPT_URL;
  if (!cfg.sheet) cfg.sheet = DEFAULT_SHEET_NAME;

  const urlInput = document.getElementById("cfg-url");
  const sheetInput = document.getElementById("cfg-sheet");
  if (urlInput) {
    urlInput.value = cfg.url || DEFAULT_SCRIPT_URL;
  }
  if (sheetInput) {
    sheetInput.value = cfg.sheet || DEFAULT_SHEET_NAME;
  }

  try {
    localStorage.setItem("agenda_cfg", JSON.stringify(cfg));
  } catch (e) {}
}
function guardarCfg() {
  const cfg = obtenerCfg();
  const urlInput = document.getElementById("cfg-url");
  const sheetInput = document.getElementById("cfg-sheet");
  if (urlInput) cfg.url = urlInput.value.trim();
  if (sheetInput) cfg.sheet = sheetInput.value.trim() || "Prospectos";
  try {
    localStorage.setItem("agenda_cfg", JSON.stringify(cfg));
  } catch (e) {}
  return cfg;
}

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
  if (id === "lista" || id === "hoy") cargarLista();
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
  const cfg = obtenerCfg();
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
async function cargarLista() {
  const cfg = obtenerCfg();

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
    actualizarFiltroMes(prospectosBase);
    filtrar();
    renderHoy();

  } catch (e) {

    console.error(e);

    renderTabla([]);

  }

}

function mesLabel(key) {
  if (!key || key === "sin-fecha") return "Sin fecha";
  const [anio, mes] = key.split("-").map(Number);
  if (!anio || !mes) return key;
  const fecha = new Date(anio, mes - 1, 1);
  return fecha.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function actualizarFiltroMes(rows) {
  const wrap = document.querySelector('.custom-select-wrap[data-filter="mes"]');
  if (!wrap) return;
  const input = wrap.querySelector('input[type="hidden"]');
  const menu = wrap.querySelector('.custom-select__menu');
  const button = wrap.querySelector('.custom-select');
  const valueSpan = button?.querySelector('.custom-select__value');

  if (!input || !menu || !button || !valueSpan) return;

  const meses = Array.from(new Set((rows || []).map((p) => mesKeyDeRegistro(p)).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  menu.querySelectorAll('.custom-option').forEach((opt) => opt.remove());

  const opciones = [{ value: "", label: "Todos los meses" }, ...meses.map((key) => ({ value: key, label: mesLabel(key) }))];
  opciones.forEach(({ value, label }) => {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'custom-option';
    opt.setAttribute('data-value', value);
    opt.textContent = label;
    menu.appendChild(opt);
  });

  const current = input.value || '';
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const hasCurrentMonth = meses.includes(currentMonthKey);
  const chosen = opciones.find((opt) => opt.value === (current || (hasCurrentMonth ? currentMonthKey : "")));
  valueSpan.textContent = chosen ? chosen.label : 'Todos los meses';
  if (!chosen) {
    input.value = '';
  } else {
    input.value = chosen.value;
  }
  setupCustomSelects();
}

function filtrar() {

  if (!Array.isArray(prospectosBase)) {

    console.error(
      "prospectosBase no es un arreglo:",
      prospectosBase
    );

    renderTabla([]);

    return;
  }

  const q =
    (document.getElementById("buscador").value || "")
      .trim()
      .toLowerCase();

  const est = document.getElementById("filtro-estatus").value;
  const mes = document.getElementById("filtro-mes").value;

  const r = prospectosBase.filter((p) => {
    const nombre = String(p.nombre || "").toLowerCase();
    const telefono = String(p.tel || "").toLowerCase();
    const producto = String(p.tipo || "").toLowerCase();
    const keyMes = mesKeyDeRegistro(p);

    const coincideTexto =
      !q ||
      nombre.includes(q) ||
      telefono.includes(q) ||
      producto.includes(q);

    const coincideEstatus = !est || p.estatus === est;
    const coincideMes = !mes || keyMes === mes;

    return coincideTexto && coincideEstatus && coincideMes;
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

// ─── Seguimiento hoy ──────────────────────────────────────────────────────────
function parseFechaProspecto(fechaStr) {
  // fecha viene como DD/MM/YYYY desde el backend
  const partes = String(fechaStr || "").split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, anio] = partes.map(Number);
  if (!dia || !mes || !anio) return null;
  const d = new Date(anio, mes - 1, dia);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inicioDeHoy() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}

function esHoy(p) {
  const f = parseFechaProspecto(p.fecha);
  if (!f) return false;
  return f.getTime() === inicioDeHoy().getTime();
}

function actualizarBadgeHoy(cantidad) {
  const badge = document.getElementById("badge-hoy");
  if (!badge) return;
  if (cantidad > 0) {
    badge.textContent = cantidad > 99 ? "99+" : String(cantidad);
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

function renderHoy() {
  const w = document.getElementById("tabla-hoy-wrap");
  const label = document.getElementById("hoy-fecha-label");
  if (!w) return;

  const base = Array.isArray(prospectosBase) ? prospectosBase : [];
  // Únicamente prospectos cuya fecha de seguimiento es exactamente hoy.
  // "Mis prospectos" sigue siendo la base completa con todos los estatus.
  const deHoy = base.filter((p) => esHoy(p));

  if (label) {
    const hoyTxt = inicioDeHoy().toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    label.textContent = "Hoy es " + hoyTxt;
  }

  actualizarBadgeHoy(deHoy.length);

  if (!deHoy.length) {
    w.innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <p>Nada pendiente por hoy</p>
        <small>No hay prospectos con seguimiento programado para el día de hoy.</small>
      </div>
    `;
    return;
  }

  w.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Producto</th>
            <th>Estatus</th>
            <th>Seguimiento</th>
            <th>Notas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${deHoy
          .map(
            (p) => `<tr>
              <td class="td-nombre">${esc(p.nombre)}</td>
              <td>${esc(p.tel)}</td>
              <td>${esc(p.tipo) || "—"}</td>
              <td><span class="badge ${badgeClass(p.estatus)}">${esc(p.estatus) || "—"}</span></td>
              <td>${esc(p.fecha) || "—"}</td>
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
    </div>
  `;
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
                <td class="td-registro">${esc(p.registro) || "—"}</td>
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
function verNota(nombre, nota) {
  document.body.classList.add("modal-open");

  document.getElementById("titulo-nota").textContent =
    "📝 " + decodeURIComponent(nombre);

  document.getElementById("modal-texto").textContent =
    decodeURIComponent(nota);

  document.getElementById("modal-nota").classList.add("active");
}

function cerrarNota() {
  document.body.classList.remove("modal-open");
  document.getElementById("modal-nota").classList.remove("active");
}

document.getElementById("modal-nota").addEventListener("click", (event) => {
  if (event.target.id === "modal-nota") cerrarNota();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
cargarCfg();
const hoy = new Date().toISOString().split("T")[0];
document.getElementById("f-fecha").value = hoy;
renderHoy();
// Carga los datos una vez al iniciar para poder mostrar el contador de
// "Seguimiento hoy" en la pestaña, sin necesidad de que el usuario la abra.
if (obtenerCfg().url) {
  cargarLista();
}

// Revisa cada minuto si cambió el día (ej. dejaste la app abierta pasada la
// medianoche) y refresca automáticamente la pestaña "Seguimiento hoy".
let __diaActual = new Date().toDateString();
setInterval(() => {
  const diaAhora = new Date().toDateString();
  if (diaAhora !== __diaActual) {
    __diaActual = diaAhora;
    renderHoy();
  }
}, 60000);