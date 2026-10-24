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

function accionesProspecto(p) {
  return `<button class="btn btn-sm action-menu-button" title="Ver acciones" onclick="abrirAccionesProspecto('${encodeURIComponent(String(p.id))}')"><span class="material-symbols-rounded icono-20">more_vert</span><span class="sr-only">Ver acciones</span></button>`;
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
                  ${accionesProspecto(p)}
                </div>
              </td>
            </tr>`,
          )
          .join("")}</tbody>
      </table>
    </div>
  `;
}

function fechaDisponibleReventa(p) {
  const fechaBase = parseFechaProspecto(p.fecha_cierre || p.registro);
  if (!fechaBase) return null;
  const diaOriginal = fechaBase.getDate();
  const fechaDisponible = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 3, 1);
  const ultimoDia = new Date(fechaDisponible.getFullYear(), fechaDisponible.getMonth() + 1, 0).getDate();
  fechaDisponible.setDate(Math.min(diaOriginal, ultimoDia) + 5);
  return fechaDisponible;
}

function actualizarBadgeReventa(cantidad) {
  const badge = document.getElementById("badge-reventa");
  if (!badge) return;
  badge.textContent = cantidad > 99 ? "99+" : String(cantidad);
  badge.style.display = cantidad > 0 ? "inline-flex" : "none";
}

function esProspectoCerrado(p) {
  return String(p.estatus || "").trim().toLocaleLowerCase("es-MX") === "cerrado";
}

function renderReventa() {
  const contenedor = document.getElementById("tabla-reventa-wrap");
  if (!contenedor) return;
  const hoy = inicioDeHoy();
  const cerrados = (Array.isArray(prospectosBase) ? prospectosBase : [])
    .filter(esProspectoCerrado)
    .map((p) => ({ prospecto: p, disponibleDesde: fechaDisponibleReventa(p) }));
  const elegibles = cerrados
    .filter(({ disponibleDesde }) => disponibleDesde && disponibleDesde <= hoy)
    .sort((a, b) => a.disponibleDesde - b.disponibleDesde);
  actualizarBadgeReventa(elegibles.length);
  const resumen = document.getElementById("reventa-resumen");
  if (resumen) {
    const esperando = cerrados.filter(({ disponibleDesde }) => disponibleDesde && disponibleDesde > hoy).length;
    resumen.textContent = `${elegibles.length} cliente${elegibles.length === 1 ? "" : "s"} disponible${elegibles.length === 1 ? "" : "s"} para reventa · ${esperando} aún dentro del plazo`;
  }
  if (!elegibles.length) {
    contenedor.innerHTML = '<div class="empty"><p>Aún no hay clientes disponibles para reventa</p><small>Se muestran prospectos cerrados al cumplir 3 meses y 5 días desde el cierre.</small></div>';
    return;
  }
  contenedor.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Teléfono</th><th>Producto</th><th>Fecha de cierre</th><th>Disponible desde</th><th>Acciones</th></tr></thead><tbody>${elegibles.map(({ prospecto: p, disponibleDesde }) => `<tr>
    <td class="td-nombre">${esc(p.nombre)}</td><td class="phone-cell"><span>${esc(p.tel)}</span><button type="button" class="copy-phone-row" data-phone="${esc(p.tel)}" onclick="copiarTelefono(this.dataset.phone)"><span class="material-symbols-rounded">content_copy</span></button></td>
    <td>${esc(p.tipo) || "—"}</td><td>${esc(p.fecha_cierre) || esc(p.registro) || "—"}</td><td>${disponibleDesde.toLocaleDateString("es-MX")}</td>
    <td class="acciones-cell"><div class="acciones"><button class="btn btn-sm" title="Registrar nueva venta" onclick="abrirNuevaVenta('${encodeURIComponent(String(p.id))}')"><span class="material-symbols-rounded icono-20">add_shopping_cart</span></button><button class="btn btn-sm" title="Historial de ventas" onclick="verHistorialVentas('${encodeURIComponent(String(p.id))}')"><span class="material-symbols-rounded icono-20">history</span></button></div></td>
  </tr>`).join("")}</tbody></table></div>`;
}

function renderCompartidos() {
  const compartidos = (prospectosBase || []).filter((p) => p.access !== "owner");
  renderTabla(compartidos, "tabla-compartidos-wrap", { compartidos: true });
}

function renderTabla(rows, targetId = "tabla-wrap", options = {}) {
  console.log("renderTabla:", rows);

  const w = document.getElementById(targetId);

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
        <p>${options.compartidos ? "No tienes registros compartidos" : "Sin resultados"}</p>
        <small>${options.compartidos ? "Cuando otro usuario comparta un cliente contigo aparecerá aquí." : "Prueba con otros filtros o agrega un nuevo prospecto."}</small>
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
              ${options.compartidos ? "<th>Compartido por</th>" : ""}
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
                ${options.compartidos ? `<td>${esc(p.owner_username) || "Usuario"}</td>` : ""}
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
                    ${accionesProspecto(p)}
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


