
// ─── Código Apps Script que el usuario pegará ────────────────────────────────
// IMPORTANTE: usa JSONP para leer (evita CORS) y no-cors para escribir.
const APPS_SCRIPT_CODE = `// Pega este código en Apps Script y despliégalo como Aplicación Web
// Acceso: Cualquier usuario (Anyone, even anonymous)

const HOJA = "Prospectos";

function doGet(e) {
  const accion   = e.parameter.accion   || "listar";
  const callback = e.parameter.callback || "";   // JSONP callback

  let resultado;
  if (accion === "guardar") {
    resultado = guardar(e.parameter);
  } else {
    resultado = listar();
  }

  const json = JSON.stringify(resultado);

  // Si viene un callback, devolver JSONP; si no, JSON plano
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
    sheet.appendRow(["ID","Nombre","Teléfono","Producto","Estatus","Seguimiento","Notas","Fecha registro"]);
    sheet.getRange(1,1,1,8).setFontWeight("bold").setBackground("#185FA5").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  const id  = new Date().getTime().toString();
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  sheet.appendRow([id, p.nombre||"", p.tel||"", p.tipo||"", p.estatus||"", p.fecha||"", p.notas||"", hoy]);
  return { ok: true };
}

function listar() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(HOJA);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const filas = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  return filas
    .filter(r => r[1])
    .map(r => ({ id:r[0], nombre:r[1], tel:r[2], tipo:r[3], estatus:r[4], fecha:r[5], notas:r[6], registro:r[7] }));
}`;

document.getElementById('code-block').textContent = APPS_SCRIPT_CODE;

// ─── Config (localStorage) ────────────────────────────────────────────────────
let cfg = { url: '', sheet: 'Prospectos' };
function cargarCfg() {
  try { const s = localStorage.getItem('agenda_cfg'); if (s) cfg = JSON.parse(s); } catch(e){}
  document.getElementById('cfg-url').value = cfg.url || '';
  document.getElementById('cfg-sheet').value = cfg.sheet || 'Prospectos';
}
function guardarCfg() {
  cfg.url = document.getElementById('cfg-url').value.trim();
  cfg.sheet = document.getElementById('cfg-sheet').value.trim() || 'Prospectos';
  try { localStorage.setItem('agenda_cfg', JSON.stringify(cfg)); } catch(e){}
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, tipo) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = tipo === 'ok' ? 'ok' : 'err';
  t.style.display = 'block';
  clearTimeout(t._t);
  t._t = setTimeout(() => t.style.display = 'none', 3500);
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
function cambiarTab(id, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');
  if (id === 'lista') cargarLista();
}

// ─── Formulario ──────────────────────────────────────────────────────────────
function limpiarForm() {
  ['f-nombre','f-tel','f-tipo','f-notas','f-fecha'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-estatus').value = 'Interesado';
  document.getElementById('f-nombre').focus();
}

// ─── JSONP helper (única forma confiable de leer de Apps Script sin CORS) ─────
function jsonp(url, params) {
  return new Promise((resolve, reject) => {
    const cbName = '_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => {
      delete window[cbName];
      script.remove();
      reject(new Error('timeout'));
    }, 10000);

    window[cbName] = (data) => {
      clearTimeout(timeout);
      delete window[cbName];
      script.remove();
      resolve(data);
    };

    const allParams = new URLSearchParams({ ...params, callback: cbName });
    const script = document.createElement('script');
    script.src = url + '?' + allParams.toString();
    script.onerror = () => { clearTimeout(timeout); delete window[cbName]; reject(new Error('script error')); };
    document.head.appendChild(script);
  });
}

async function guardarProspecto() {
  const nombre = document.getElementById('f-nombre').value.trim();
  const tel    = document.getElementById('f-tel').value.trim();
  if (!nombre || !tel) { toast('El nombre y teléfono son obligatorios', 'err'); return; }
  if (!cfg.url) { toast('Primero configura la URL del Apps Script', 'err'); cambiarTab('config', document.querySelectorAll('.tab')[2]); return; }

  const btn = document.getElementById('btn-guardar');
  const btnTxt = document.getElementById('btn-text');
  btn.disabled = true;
  btnTxt.innerHTML = '<span class="loader"></span> Guardando...';

  try {
    const data = await jsonp(cfg.url, {
      accion:  'guardar',
      nombre,
      tel,
      tipo:    document.getElementById('f-tipo').value,
      estatus: document.getElementById('f-estatus').value,
      fecha:   document.getElementById('f-fecha').value,
      notas:   document.getElementById('f-notas').value.trim()
    });
    if (data && data.ok) {
      toast('✓ Prospecto guardado correctamente', 'ok');
      limpiarForm();
    } else {
      toast('El script respondió con un error', 'err');
    }
  } catch(e) {
    toast('Error de conexión. Revisa la URL del script.', 'err');
  } finally {
    btn.disabled = false;
    btnTxt.textContent = 'Guardar prospecto';
  }
}

// ─── Lista ───────────────────────────────────────────────────────────────────
let prospectos = [];

async function cargarLista() {
  if (!cfg.url) { renderTabla([]); return; }
  document.getElementById('tabla-wrap').innerHTML = '<div class="empty"><p>Cargando...</p></div>';
  try {
    prospectos = await jsonp(cfg.url, { accion: 'listar' });
    filtrar();
  } catch(e) {
    toast('No se pudo cargar la lista. Verifica la URL.', 'err');
    renderTabla([]);
  }
}

function filtrar() {
  const q   = (document.getElementById('buscador').value || '').toLowerCase();
  const est = document.getElementById('filtro-estatus').value;
  const r = prospectos.filter(p =>
    (!q  || (p.nombre||'').toLowerCase().includes(q) || (p.tel||'').includes(q)) &&
    (!est || p.estatus === est)
  );
  renderTabla(r);
}

function badgeClass(e) {
  return {Interesado:'badge-interesado','En proceso':'badge-proceso',Cerrado:'badge-cerrado',Perdido:'badge-perdido'}[e] || '';
}

function renderTabla(rows) {
  const w = document.getElementById('tabla-wrap');
  if (!rows.length) {
    w.innerHTML = `<div class="empty">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>
      <p>Sin resultados</p><small>Prueba con otros filtros o agrega un nuevo prospecto.</small>
    </div>`;
    return;
  }
  w.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>Nombre</th><th>Teléfono</th><th>Producto</th><th>Estatus</th><th>Seguimiento</th><th>Notas</th><th>Registro</th>
    </tr></thead>
    <tbody>${rows.map(p => `<tr>
      <td class="td-nombre">${esc(p.nombre)}</td>
      <td>${esc(p.tel)}</td>
      <td>${esc(p.tipo) || '—'}</td>
      <td><span class="badge ${badgeClass(p.estatus)}">${esc(p.estatus) || '—'}</span></td>
      <td>${esc(p.fecha) || '—'}</td>
      <td class="td-notas" title="${esc(p.notas)}">${esc(p.notas) || '—'}</td>
      <td style="color:#6b6b67">${esc(p.registro) || '—'}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Probar conexión ──────────────────────────────────────────────────────────
async function probar() {
  guardarCfg();
  if (!cfg.url) { toast('Ingresa primero la URL del script', 'err'); return; }
  try {
    const data = await jsonp(cfg.url, { accion: 'listar' });
    toast(`✓ Conexión exitosa — ${Array.isArray(data) ? data.length + ' registros encontrados' : 'OK'}`, 'ok');
  } catch(e) {
    toast('No se pudo conectar. Verifica la URL y que el acceso sea "Cualquier usuario".', 'err');
  }
}

// ─── Copiar código ────────────────────────────────────────────────────────────
function copiarCodigo() {
  navigator.clipboard.writeText(APPS_SCRIPT_CODE)
    .then(() => toast('Código copiado al portapapeles', 'ok'))
    .catch(() => toast('No se pudo copiar, selecciónalo manualmente', 'err'));
}

// ─── Init ─────────────────────────────────────────────────────────────────────
cargarCfg();
const hoy = new Date().toISOString().split('T')[0];
document.getElementById('f-fecha').value = hoy;
