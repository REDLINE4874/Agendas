
// ─── Persistencia Supabase ───────────────────────────────────────────────────
function agendaTable() {
  return window.SUPABASE_AUTH_CLIENT.schema("agendas").from("prospectos");
}

function formatoFecha(fecha) {
  if (!fecha) return "";
  const [anio, mes, dia] = String(fecha).slice(0, 10).split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : "";
}

function mapProspecto(row) {
  return {
    ...row,
    fecha: formatoFecha(row.fecha),
    fecha_cierre: formatoFecha(row.fecha_cierre),
    registro: formatoFecha(row.created_at),
  };
}

async function usuarioActual() {
  const { data, error } = await window.SUPABASE_AUTH_CLIENT.auth.getUser();
  if (error || !data?.user) throw new Error("Sesión no disponible");
  return data.user;
}

function fechaHoyLocal() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

async function enviarNuevaVenta(venta) {
  const user = await usuarioActual();
  const { data: prospecto, error: prospectoError } = await agendaTable()
    .select("id, user_id, nombre, tel, tipo, estatus, fecha_cierre")
    .eq("id", venta.id).eq("user_id", user.id).single();
  if (prospectoError || !prospecto) return { ok: false, error: "No se encontró el prospecto." };
  if (prospecto.estatus !== "Cerrado") return { ok: false, error: "Solo se puede registrar una venta para un prospecto cerrado." };
  if (venta.fecha > fechaHoyLocal()) return { ok: false, error: "La fecha de cierre no puede ser futura." };

  if (prospecto.fecha_cierre) {
    const { count } = await window.SUPABASE_AUTH_CLIENT.schema("agendas").from("ventas")
      .select("id", { count: "exact", head: true }).eq("prospecto_id", prospecto.id).eq("user_id", user.id);
    if (!count) {
      await window.SUPABASE_AUTH_CLIENT.schema("agendas").from("ventas").insert({
        prospecto_id: prospecto.id, user_id: user.id, producto: prospecto.tipo || "",
        fecha_cierre: prospecto.fecha_cierre, notas: "Cierre anterior al registro del historial",
      });
    }
  }
  const { error: ventaError } = await window.SUPABASE_AUTH_CLIENT.schema("agendas").from("ventas").insert({
    prospecto_id: prospecto.id, user_id: user.id, producto: venta.tipo,
    fecha_cierre: venta.fecha, notas: venta.notas || "",
  });
  if (ventaError) return { ok: false, error: ventaError.message };
  const { error: updateError } = await agendaTable().update({ tipo: venta.tipo, fecha_cierre: venta.fecha })
    .eq("id", prospecto.id).eq("user_id", user.id);
  return updateError ? { ok: false, error: updateError.message } : { ok: true };
}

async function obtenerHistorialVentas(id) {
  const user = await usuarioActual();
  const { data, error } = await window.SUPABASE_AUTH_CLIENT.schema("agendas").from("ventas")
    .select("id, producto, fecha_cierre, notas")
    .eq("prospecto_id", id).eq("user_id", user.id)
    .order("fecha_cierre", { ascending: false });
  if (error) throw error;
  return (data || []).map((venta) => ({ ...venta, fecha: formatoFecha(venta.fecha_cierre) }));
}

async function guardarProspecto() {
  const nombre = document.getElementById("f-nombre").value.trim();
  const tel = document.getElementById("f-tel").value.trim();
  if (!nombre || !tel) {
    toast("El nombre y teléfono son obligatorios", "err");
    return;
  }
  const btn = document.getElementById("btn-guardar");
  const btnTxt = document.getElementById("btn-text");
  btn.disabled = true;
  btnTxt.innerHTML = '<span class="loader"></span> Guardando...';

  try {
    const user = await usuarioActual();
    let fechaCierre = null;
    if (document.getElementById("f-estatus").value === "Cerrado") {
      fechaCierre = fechaHoyLocal();
      if (editandoId) {
        const { data: anterior } = await agendaTable().select("fecha_cierre").eq("id", editandoId).single();
        fechaCierre = anterior?.fecha_cierre || fechaCierre;
      }
    }
    const valores = {
      nombre,
      tel,
      tipo: document.getElementById("f-tipo").value,
      estatus: document.getElementById("f-estatus").value,
      fecha: document.getElementById("f-fecha").value || null,
      fecha_cierre: fechaCierre,
      notas: document.getElementById("f-notas").value.trim(),
    };
    const consulta = editandoId
      ? agendaTable().update(valores).eq("id", editandoId)
      : agendaTable().insert({ ...valores, user_id: user.id });
    const { error } = await consulta;
    if (!error) {
      toast(
        editandoId
          ? "✓ Prospecto actualizado"
          : "✓ Prospecto guardado correctamente",
        "ok",
      );

      limpiarForm();

      // El guardado actualiza todas las secciones para reflejar cambios
      await actualizarTodasLasSecciones({ mostrarNotificacion: false });
    } else toast("No se pudo guardar el prospecto", "err");
  } catch (e) {
    toast("Error de conexión con Supabase", "err");
  } finally {
    btn.disabled = false;
    btnTxt.textContent = "Guardar prospecto";
  }
}

// ─── Gestión de datos y actualización por secciones ───────────────────────────
let promesaFetchProspectos = null;
let ultimaCargaProspectos = 0;

async function fetchProspectosBackend(forzar = false) {
  const ahora = Date.now();
  if (promesaFetchProspectos) {
    return promesaFetchProspectos;
  }
  // Si los datos se obtuvieron hace menos de 1.5s y no se fuerza, reutilizar
  if (!forzar && ahora - ultimaCargaProspectos < 1500 && prospectosBase.length > 0) {
    return prospectosBase;
  }

  promesaFetchProspectos = (async () => {
    try {
      if (!window.SUPABASE_AUTH_CLIENT) return [];
      const { data, error } = await window.SUPABASE_AUTH_CLIENT
        .schema("agendas")
        .rpc("list_visible_prospectos");
      if (error) throw error;
      // Mostrar los registros más recientes primero, usando la marca de tiempo
      // completa para ordenar también los prospectos creados el mismo día.
      prospectos = (data || [])
        .map(mapProspecto)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      prospectosBase = [...prospectos];
      ultimaCargaProspectos = Date.now();
      if (typeof actualizarSelectProspectos === "function") {
        actualizarSelectProspectos();
      }
      return prospectosBase;
    } finally {
      promesaFetchProspectos = null;
    }
  })();

  return promesaFetchProspectos;
}

// Actualiza en automático únicamente la sección específica seleccionada
async function actualizarSeccion(id, opciones = {}) {
  const { forzar = false } = opciones;

  switch (id) {
    case "hoy": {
      // 1. Render inmediato con datos existentes en memoria
      if (typeof renderHoy === "function") renderHoy();
      // 2. Consulta y actualización en segundo plano de la sección hoy
      try {
        await fetchProspectosBackend(forzar);
        if (typeof renderHoy === "function") renderHoy();
      } catch (err) {
        console.warn("Error al actualizar la sección hoy:", err);
      }
      break;
    }

    case "lista": {
      // 1. Filtrado y render inmediato de mis prospectos
      if (typeof filtrar === "function") filtrar();
      // 2. Consulta y actualización de mis prospectos
      try {
        await fetchProspectosBackend(forzar);
        if (typeof actualizarFiltroMes === "function") actualizarFiltroMes(prospectosBase);
        if (typeof filtrar === "function") filtrar();
      } catch (err) {
        console.warn("Error al actualizar la sección mis prospectos:", err);
      }
      break;
    }

    case "compartidos": {
      if (typeof renderCompartidos === "function") renderCompartidos();
      try {
        await fetchProspectosBackend(forzar);
        if (typeof renderCompartidos === "function") renderCompartidos();
      } catch (err) {
        console.warn("Error al actualizar la sección compartidos:", err);
      }
      break;
    }

    case "reventa": {
      if (typeof renderReventa === "function") renderReventa();
      try {
        await fetchProspectosBackend(forzar);
        if (typeof renderReventa === "function") renderReventa();
      } catch (err) {
        console.warn("Error al actualizar la sección reventa:", err);
      }
      break;
    }

    case "general": {
      // La agenda general solo requiere su propia consulta al servidor
      if (typeof cargarAgendaGeneral === "function") {
        try {
          await cargarAgendaGeneral();
        } catch (err) {
          console.warn("Error al actualizar la agenda general:", err);
        }
      }
      break;
    }

    case "nuevo": {
      // Preparar fecha actual en el formulario si está vacía
      const inputFecha = document.getElementById("f-fecha");
      if (inputFecha && !inputFecha.value) {
        inputFecha.value = fechaHoyLocal();
      }
      break;
    }

    default:
      break;
  }
}

// Actualiza todas las secciones (llamado al iniciar sesión o refresh manual global)
async function actualizarTodasLasSecciones(opciones = {}) {
  const { mostrarNotificacion = false } = opciones;
  if (cargandoLista) return;

  cargandoLista = true;
  setBotonesActualizacionEstado(true);

  if (mostrarNotificacion) {
    toast("Actualizando todas las secciones...", "ok");
  }

  try {
    // 1. Obtener prospectos y agenda general en paralelo
    const promesas = [fetchProspectosBackend(true)];
    if (typeof cargarAgendaGeneral === "function") {
      promesas.push(cargarAgendaGeneral());
    }
    await Promise.allSettled(promesas);

    // 2. Actualizar todas las secciones de la interfaz
    if (typeof actualizarSelectProspectos === "function") actualizarSelectProspectos();
    if (typeof actualizarFiltroMes === "function") actualizarFiltroMes(prospectosBase);
    if (typeof renderHoy === "function") renderHoy();
    if (typeof filtrar === "function") filtrar();
    if (typeof renderCompartidos === "function") renderCompartidos();
    if (typeof renderReventa === "function") renderReventa();

    const inputFecha = document.getElementById("f-fecha");
    if (inputFecha && !inputFecha.value) {
      inputFecha.value = fechaHoyLocal();
    }

    if (mostrarNotificacion) {
      toast("✓ Todas las secciones actualizadas", "ok");
    }
  } catch (e) {
    console.error("Error al actualizar todas las secciones:", e);
    if (mostrarNotificacion) {
      toast("No se pudo conectar con Supabase", "err");
    }
    if (typeof renderTabla === "function") renderTabla([]);
    if (typeof renderReventa === "function") renderReventa();
  } finally {
    cargandoLista = false;
    setBotonesActualizacionEstado(false);
  }
}

function limpiarTodasLasSecciones() {
  prospectos = [];
  prospectosBase = [];
  if (typeof renderHoy === "function") renderHoy();
  if (typeof renderTabla === "function") renderTabla([]);
  if (typeof renderCompartidos === "function") renderCompartidos();
  if (typeof renderReventa === "function") renderReventa();
  const generalList = document.getElementById("general-list");
  if (generalList) {
    generalList.innerHTML = '<div class="empty"><p>Inicia sesión para ver los clientes públicos</p></div>';
  }
}

async function cargarLista() {
  return actualizarTodasLasSecciones({ mostrarNotificacion: true });
}

window.fetchProspectosBackend = fetchProspectosBackend;
window.actualizarSeccion = actualizarSeccion;
window.actualizarTodasLasSecciones = actualizarTodasLasSecciones;
window.limpiarTodasLasSecciones = limpiarTodasLasSecciones;
window.cargarLista = cargarLista;
