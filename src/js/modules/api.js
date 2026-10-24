
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

      // El guardado invalida el caché del servidor, así que forzamos
      // una recarga real en vez de usar la versión "fresca" en memoria.
      await cargarLista();
    } else toast("No se pudo guardar el prospecto", "err");
  } catch (e) {
    toast("Error de conexión con Supabase", "err");
  } finally {
    btn.disabled = false;
    btnTxt.textContent = "Guardar prospecto";
  }
}

// ─── Lista ───────────────────────────────────────────────────────────────────
async function cargarLista() {
  if (cargandoLista) return;

  cargandoLista = true;
  mostrarCargaLista();
  setBotonesActualizacionEstado(true);
  toast("Actualizando prospectos...", "ok");

  try {

    const { data, error } = await window.SUPABASE_AUTH_CLIENT.schema("agendas").rpc("list_visible_prospectos");
    if (error) throw error;
    prospectos = (data || []).map(mapProspecto);
    prospectosBase = [...prospectos];
    if (typeof cargarAgendaGeneral === "function") await cargarAgendaGeneral();
    actualizarSelectProspectos();
    actualizarFiltroMes(prospectosBase);
    filtrar();
    if (typeof renderCompartidos === "function") renderCompartidos();
    renderHoy();
    renderReventa();
    toast("✓ Prospectos actualizados correctamente", "ok");

  } catch (e) {

    console.error(e);

    toast("No se pudo conectar con Supabase", "err");
    renderTabla([]);
    renderReventa();

  } finally {
    cargandoLista = false;
    setBotonesActualizacionEstado(false);
  }

}

// Solo vuelve a pintar la vista sin consultar el backend; la recarga real
// ocurre solo cuando el usuario fuerza la actualización o guarda un prospecto.

