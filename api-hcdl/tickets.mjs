import { leerJson } from "./acceso.mjs";

const prioridades = new Set(["Baja", "Media", "Alta"]);
const estados = new Set(["Pendiente", "En atención", "En espera", "Resuelto"]);
const limpiar = (valor) => typeof valor === "string" ? valor.trim() : "";

export const recursoReportablePorColaborador = `(
  r.usuario_id = u.id OR (r.usuario_id IS NULL AND r.sector_actual_id IS NOT NULL)
)`;

export async function crearTicket(db, auth, cuenta, req, res, responder) {
  if (!auth.mismoOrigen(req)) {
    return responder(403, { error: "Origen no autorizado." });
  }
  const datos = await leerJson(req, res, responder);
  if (!datos) return;
  const esTI = cuenta.rol !== "solicitante";
  const usuarioId = esTI ? datos.usuarioId : cuenta.usuarioId;
  if (!Number.isInteger(usuarioId) || usuarioId < 1 || usuarioId > 2147483647) {
    return responder(400, { error: "Selecciona un colaborador válido." });
  }
  const titulo = limpiar(datos.titulo);
  const descripcion = limpiar(datos.descripcion);
  const prioridad = datos.prioridad;
  const individual = datos.recursoId;
  const recursos = esTI && datos.recursosIds !== undefined ? datos.recursosIds
    : individual == null ? [] : [individual];
  const idValido = (id) => Number.isInteger(id) && id > 0 && id <= 2147483647;
  if (!titulo || titulo.length > 160 || !descripcion || descripcion.length > 2000 ||
      !prioridades.has(prioridad) || !Array.isArray(recursos) || recursos.length > 50 ||
      !recursos.every(idValido) || new Set(recursos).size !== recursos.length) {
    return responder(400, { error: "Revisa el título, la descripción, la prioridad y los recursos." });
  }

  const { rows } = await db.query(`
    WITH creado AS (
      INSERT INTO ticket (titulo, descripcion, prioridad, usuario_id, sector_id, estado_id)
      SELECT $1, $2, $3, u.id, u.sector_id, e.id
      FROM usuario u CROSS JOIN estado_ticket e
      WHERE u.id = $4 AND u.activo AND e.nombre = 'Pendiente' AND (NOT $6::boolean OR u.visible)
        AND NOT EXISTS (
          SELECT 1 FROM unnest($5::integer[]) AS seleccionado(id)
          WHERE NOT EXISTS (
            SELECT 1 FROM recurso_asignacion_vigente r
            WHERE r.id = seleccionado.id AND r.visible
              AND ($6::boolean OR ${recursoReportablePorColaborador})
          )
        )
      RETURNING id, estado_id
    ), registrado AS (
      INSERT INTO historial_ticket (ticket_id, tipo_evento, estado_id, usuario_id, tecnico_id)
      SELECT id, 'creacion', estado_id, CASE WHEN $6::boolean THEN NULL ELSE $4 END, $7
      FROM creado
    ), vinculado AS (
      INSERT INTO ticket_recurso (ticket_id, recurso_id)
      SELECT creado.id, seleccionado.id FROM creado CROSS JOIN unnest($5::integer[]) AS seleccionado(id)
    )
    SELECT id FROM creado
  `, [titulo, descripcion, prioridad, usuarioId, recursos, esTI, cuenta.tecnicoId]);
  return rows.length ? responder(201, rows[0]) :
    responder(400, { error: esTI ? "Selecciona un colaborador activo y recursos visibles del inventario."
      : "Selecciona uno de tus recursos o un recurso visible de un sector sin asignación vigente." });
}

export async function cambiarEstado(db, auth, cuenta, id, req, res, responder) {
  if (cuenta.rol === "solicitante" || !auth.mismoOrigen(req)) {
    return responder(403, { error: "Este cambio requiere permisos de TI." });
  }
  const datos = await leerJson(req, res, responder);
  if (!datos) return;
  const estado = datos.estado;
  const observacion = limpiar(datos.observacion);
  if (!estados.has(estado) || observacion.length > 2000) {
    return responder(400, { error: "Revisa el estado y la observación." });
  }

  const { rows } = await db.query(`
    WITH autorizado AS (
      SELECT id, estado_id FROM ticket
      WHERE id = $1
      FOR UPDATE
    ), cambio AS (
      UPDATE ticket t
      SET estado_id = e.id,
          fecha_resolucion = CASE WHEN e.final THEN now() ELSE NULL END
      FROM autorizado a, estado_ticket e
      WHERE t.id = a.id AND e.nombre = $2 AND a.estado_id <> e.id
      RETURNING t.id, t.estado_id, e.final
    ), registrado AS (
      INSERT INTO historial_ticket (ticket_id, tipo_evento, estado_id, tecnico_id, observacion)
      SELECT id, CASE WHEN final THEN 'resolucion' ELSE 'actualizacion' END, estado_id, $3, $4
      FROM cambio
    )
    SELECT EXISTS(SELECT 1 FROM autorizado) AS permitido, EXISTS(SELECT 1 FROM cambio) AS modificado
  `, [id, estado, cuenta.tecnicoId, observacion || null]);
  if (!rows[0].permitido) return responder(404, { error: "Ticket no encontrado." });
  return responder(200, { modificado: rows[0].modificado });
}

export async function asignarTecnico(db, auth, cuenta, id, req, res, responder) {
  if (cuenta.rol === "solicitante" || !auth.mismoOrigen(req)) {
    return responder(403, { error: "La asignación requiere permisos de TI." });
  }
  const datos = await leerJson(req, res, responder);
  if (!datos) return;
  const tecnicoId = datos.tecnicoId;
  if (tecnicoId !== null &&
      (!Number.isInteger(tecnicoId) || tecnicoId < 1 || tecnicoId > 2147483647)) {
    return responder(400, { error: "Selecciona un técnico válido." });
  }

  const { rows } = await db.query(`
    WITH destino AS (
      SELECT id, nombre FROM tecnico
      WHERE id = $2 AND activo
        AND EXISTS (SELECT 1 FROM cuenta c WHERE c.tecnico_id = tecnico.id AND c.activa)
    ), cambio AS (
      UPDATE ticket t SET tecnico_id = $2
      WHERE t.id = $1 AND t.tecnico_id IS DISTINCT FROM $2
        AND ($2::integer IS NULL OR EXISTS (SELECT 1 FROM destino))
      RETURNING t.id, t.estado_id
    ), registrado AS (
      INSERT INTO historial_ticket (ticket_id, tipo_evento, estado_id, tecnico_id, observacion)
      SELECT id, 'actualizacion', estado_id, $3,
        coalesce('Ticket asignado a ' || (SELECT nombre FROM destino), 'Ticket sin técnico asignado')
      FROM cambio
    )
    SELECT EXISTS(SELECT 1 FROM ticket WHERE id = $1) AS encontrado,
           ($2::integer IS NULL OR EXISTS(SELECT 1 FROM destino)) AS valido,
           EXISTS(SELECT 1 FROM cambio) AS modificado
  `, [id, tecnicoId, cuenta.tecnicoId]);
  if (!rows[0].encontrado) return responder(404, { error: "Ticket no encontrado." });
  if (!rows[0].valido) return responder(400, { error: "El técnico debe tener una cuenta activa." });
  return responder(200, { modificado: rows[0].modificado });
}

export async function gestionarTicket(db, auth, cuenta, id, req, res, responder) {
  if (cuenta.rol === "solicitante" || !auth.mismoOrigen(req)) {
    return responder(403, { error: "Esta gestión es exclusiva de TI." });
  }
  const datos = await leerJson(req, res, responder);
  if (!datos) return;
  const { estado, prioridad, tecnicoId } = datos;
  const observacion = limpiar(datos.observacion);
  if (!estados.has(estado) || !prioridades.has(prioridad) || observacion.length > 2000 ||
      (tecnicoId !== null && (!Number.isInteger(tecnicoId) || tecnicoId < 1 || tecnicoId > 2147483647))) {
    return responder(400, { error: "Revisa el estado, la prioridad, el técnico y la observación." });
  }
  const { rows: [resultado] } = await db.query(`
    WITH anterior AS (
      SELECT id, estado_id, tecnico_id, prioridad FROM ticket WHERE id = $1 FOR UPDATE
    ), destino AS (
      SELECT t.id, t.nombre FROM tecnico t
      JOIN cuenta c ON c.tecnico_id = t.id WHERE t.id = $5 AND t.activo AND c.activa
    ), cambio AS (
      UPDATE ticket t
      SET estado_id = e.id, tecnico_id = $5, prioridad = $4,
          fecha_resolucion = CASE WHEN e.final THEN COALESCE(t.fecha_resolucion, now()) ELSE NULL END
      FROM anterior a, estado_ticket e
      WHERE t.id = a.id AND e.nombre = $2
        AND ($5::integer IS NULL OR a.tecnico_id = $5 OR EXISTS (SELECT 1 FROM destino))
        AND (a.estado_id <> e.id OR a.tecnico_id IS DISTINCT FROM $5 OR a.prioridad <> $4 OR $6::text IS NOT NULL)
      RETURNING t.id, e.id AS estado_id, e.final AND a.estado_id <> e.id AS resuelto,
        concat_ws(' · ', $6,
          CASE WHEN a.tecnico_id IS DISTINCT FROM $5 THEN
            coalesce('Ticket asignado a ' || (SELECT nombre FROM destino), 'Ticket sin técnico asignado') END,
          CASE WHEN a.prioridad <> $4 THEN 'Prioridad: ' || a.prioridad || ' → ' || $4 END) AS nota
    ), registrado AS (
      INSERT INTO historial_ticket (ticket_id, tipo_evento, estado_id, tecnico_id, observacion)
      SELECT id, CASE WHEN resuelto THEN 'resolucion' ELSE 'actualizacion' END, estado_id, $3, nullif(nota, '')
      FROM cambio
    )
    SELECT EXISTS(SELECT 1 FROM anterior) AS encontrado,
      ($5::integer IS NULL OR EXISTS(SELECT 1 FROM anterior WHERE tecnico_id = $5)
        OR EXISTS(SELECT 1 FROM destino)) AS valido,
      EXISTS(SELECT 1 FROM cambio) AS modificado
  `, [id, estado, cuenta.tecnicoId, prioridad, tecnicoId, observacion || null]);
  if (!resultado.encontrado) return responder(404, { error: "Ticket no encontrado." });
  if (!resultado.valido) return responder(400, { error: "Selecciona un técnico activo." });
  return responder(200, { modificado: resultado.modificado });
}
