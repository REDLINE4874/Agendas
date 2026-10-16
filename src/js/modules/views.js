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
              <td class="phone-cell">
                <span>${esc(p.tel)}</span>
                <button type="button" class="copy-phone-row" data-phone="${esc(p.tel)}" onclick="copiarTelefono(this.dataset.phone)"><span class="material-symbols-rounded">content_copy</span></button>
              </td>
              <td>${esc(p.tipo) || "—"}</td>
              <td><span class="badge ${badgeClass(p.estatus)}">${esc(p.estatus) || "—"}</span></td>
              <td>${esc(p.fecha) || "—"}</td>
              <td>${
                p.notas
                  ? `<button class="btn btn-sm" onclick="verNota('${encodeURIComponent(p.nombre)}','${encodeURIComponent(p.notas)}')"><span class="material-symbols-rounded icono-20">note_stack</span></button>`
                  : "—"
              }</td>
              <td class="acciones-cell">
                <div class="acciones">
                  <button class="btn btn-sm" onclick="editarProspecto('${p.id}')"><span class="material-symbols-rounded icono-20">border_color</span></button>
                  <button class="btn btn-sm" onclick="eliminarProspecto('${p.id}')"><span class="material-symbols-rounded icono-20">delete</span></button>
                </div>
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
                <td class="phone-cell">
                  <span>${esc(p.tel)}</span>
                  <button type="button" class="copy-phone-row" data-phone="${esc(p.tel)}" onclick="copiarTelefono(this.dataset.phone)"><span class="material-symbols-rounded ">content_copy</span></button>
                </td>
                <td>${esc(p.tipo) || "—"}</td>
                <td><span class="badge ${badgeClass(p.estatus)}">${esc(p.estatus) || "—"}</span></td>
                <td>${esc(p.fecha) || "—"}</td>
                <td class="td-registro">${esc(p.registro) || "—"}</td>
                <td>${
                  p.notas
                    ? `<button class="btn btn-sm" onclick="verNota('${encodeURIComponent(p.nombre)}','${encodeURIComponent(p.notas)}')"><span class="material-symbols-rounded icono-20">note_stack</span></button>`
                    : "—"
                }</td>
                <td class="acciones-cell">
                  <div class="acciones">
                    <button class="btn btn-sm" onclick="editarProspecto('${p.id}')"><span class="material-symbols-rounded icono-20">border_color</span></button>
                    <button class="btn btn-sm" onclick="eliminarProspecto('${p.id}')"><span class="material-symbols-rounded icono-20">delete</span></button>
                  </div>
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


