async function cargarListaSiHaceFalta() {
  filtrar();
  renderHoy();
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

