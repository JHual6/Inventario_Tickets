import { leerJson } from "./acceso.mjs";

const texto = (valor) => typeof valor === "string" ? valor.trim() : "";
const idValido = (valor) => Number.isInteger(valor) && valor > 0 && valor <= 2147483647;
const estadosIniciales = new Set(["Disponible", "Reservado", "Dañado"]);
const condiciones = new Set(["N", "U", "R"]);
const fichaEquipo = [
  "modelo", "nombreSistema", "procesador", "ram", "almacenamiento", "sistemaOperativo",
  "antivirus", "office", "tarjetaVideo", "tarjetaWifi", "tarjetaEthernet", "macWifi",
  "macEthernet", "ip",
];

export async function registrarEquipo(db, req, res, responder) {
  const datos = await leerJson(req, res, responder);
  if (!datos) return;
  const [nombre, marca, tipo, serie] = ["nombre", "marca", "tipo", "serie"].map((clave) => texto(datos[clave]));
  const { sectorId, estado = "Disponible" } = datos;
  const ficha = Object.fromEntries(fichaEquipo.map((clave) => [clave, texto(datos.ficha?.[clave])])
    .filter(([, valor]) => valor));
  if ([nombre, marca, tipo, serie].some((valor) => !valor || valor.length > 160) ||
      !idValido(sectorId) || !estadosIniciales.has(estado) ||
      Object.values(ficha).some((valor) => valor.length > 200)) {
    return responder(400, { error: "Revisa el nombre, la marca, el tipo, el número de serie, el sector y el estado." });
  }
  try {
    const { rows } = await db.query(`
      INSERT INTO recurso (categoria, nombre, marca, tipo, serie, estado, sector_id, ficha)
      SELECT 'equipo', $1, $2, $3, $4, $5, id, $7 FROM sector WHERE id = $6
      ON CONFLICT (categoria, serie) DO NOTHING
      RETURNING id
    `, [nombre, marca, tipo, serie, estado, sectorId, ficha]);
    if (rows.length) return responder(201, rows[0]);
    const sector = await db.query("SELECT 1 FROM sector WHERE id = $1", [sectorId]);
    return sector.rowCount
      ? responder(409, { error: "Ya existe un equipo con ese número de serie." })
      : responder(400, { error: "Selecciona un sector registrado." });
  } catch (error) {
    if (error.code !== "23503") throw error;
    return responder(400, { error: "Selecciona un sector registrado." });
  }
}

export async function registrarEntrega(db, cuenta, req, res, responder) {
  const datos = await leerJson(req, res, responder, 350_000);
  if (!datos) return;
  const { usuarioId, recursos } = datos;
  if (!idValido(usuarioId) || !Array.isArray(recursos) || recursos.length === 0 || recursos.length > 50 ||
      recursos.some((item) => !idValido(item?.recursoId) || !condiciones.has(item.condicion) ||
        texto(item.observacion).length > 1000) ||
      new Set(recursos.map((item) => item.recursoId)).size !== recursos.length) {
    return responder(400, { error: "Selecciona un usuario, entre 1 y 50 recursos distintos y una condición para cada uno." });
  }
  const cliente = await db.connect();
  try {
    await cliente.query("BEGIN");
    const usuario = await cliente.query(
      "SELECT id FROM usuario WHERE id = $1 AND activo AND visible FOR SHARE", [usuarioId],
    );
    if (!usuario.rowCount) {
      await cliente.query("ROLLBACK");
      return responder(400, { error: "Selecciona un usuario activo y visible." });
    }
    const ids = recursos.map(({ recursoId }) => recursoId);
    const stock = await cliente.query(`
      SELECT id, estado FROM recurso
      WHERE id = ANY($1::integer[]) AND visible AND categoria IN ('equipo','movil','periferico')
      ORDER BY id FOR UPDATE
    `, [ids]);
    const vigentes = await cliente.query(`
      SELECT 1 FROM detalle_asignacion
      WHERE recurso_id = ANY($1::integer[]) AND fecha_devolucion IS NULL LIMIT 1
    `, [ids]);
    if (stock.rowCount !== ids.length || stock.rows.some(({ estado }) => estado !== "Disponible") ||
        vigentes.rowCount) {
      await cliente.query("ROLLBACK");
      return responder(409, { error: "Uno de los recursos ya no está disponible para entrega." });
    }
    const { rows: [acta] } = await cliente.query(`
      INSERT INTO asignacion (usuario_id, tecnico_id) VALUES ($1, $2) RETURNING id, fecha
    `, [usuarioId, cuenta.tecnicoId]);
    await cliente.query(`
      INSERT INTO detalle_asignacion (asignacion_id, recurso_id, condicion, observacion)
      SELECT $1, * FROM unnest($2::integer[], $3::text[], $4::text[])
    `, [acta.id, ids, recursos.map((item) => item.condicion),
      recursos.map((item) => texto(item.observacion) || null)]);
    await cliente.query(`
      UPDATE recurso SET ficha = ficha || jsonb_build_object(
        'revision', to_char($2::timestamptz AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')
      )
      WHERE id = ANY($1::int[]) AND categoria = 'equipo'
    `, [ids, acta.fecha]);
    const actaGuardada = await leerActa(cliente, acta.id);
    await cliente.query("COMMIT");
    return responder(201, actaGuardada);
  } catch (error) {
    await cliente.query("ROLLBACK");
    if (error.code === "23505" || error.code === "40P01") {
      return responder(409, { error: "Hubo otra operación sobre esos recursos. Actualiza la lista e inténtalo nuevamente." });
    }
    throw error;
  } finally {
    cliente.release();
  }
}

async function leerActa(db, id) {
  const { rows: [acta] } = await db.query(`
    SELECT a.id, a.fecha,
           jsonb_build_object('nombre', u.nombre, 'cargo', u.cargo, 'correo', u.correo, 'sector', s.nombre) AS usuario,
           jsonb_build_object('nombre', t.nombre, 'cargo', t.cargo) AS responsable,
           coalesce((SELECT jsonb_agg(jsonb_build_object(
             'recurso', jsonb_build_object('id', r.id, 'nombre', r.nombre, 'marca', r.marca,
               'tipo', r.tipo, 'categoria', r.categoria, 'serie', r.serie,
               'ficha', r.ficha - ARRAY['password','contrasena','contraseña','passwordWeb','contrasenaWeb','claveWeb']),
             'condicion', d.condicion, 'observacion', d.observacion
           ) ORDER BY d.id)
           FROM detalle_asignacion d JOIN recurso r ON r.id=d.recurso_id
           WHERE d.asignacion_id=a.id), '[]') AS recursos
    FROM asignacion a JOIN usuario u ON u.id=a.usuario_id JOIN sector s ON s.id=u.sector_id
    JOIN tecnico t ON t.id=a.tecnico_id WHERE a.id=$1
  `, [id]);
  return acta;
}

export async function consultarActa(db, id, responder) {
  const acta = await leerActa(db, id);
  return acta ? responder(200, acta) : responder(404, { error: "No se encontró el acta." });
}

export async function historialRecurso(db, id, responder) {
  const { rows } = await db.query(`
    SELECT d.id::text || ':' || m.tipo AS id, m.fecha, m.tipo, u.nombre AS usuario,
           m.descripcion, CASE WHEN m.tipo = 'Entrega' THEN t.nombre END AS responsable
    FROM detalle_asignacion d
    JOIN asignacion a ON a.id = d.asignacion_id
    JOIN usuario u ON u.id = a.usuario_id
    JOIN tecnico t ON t.id = a.tecnico_id
    CROSS JOIN LATERAL (VALUES
      (a.fecha, 'Entrega', COALESCE(d.observacion, a.observacion)),
      (d.fecha_devolucion, 'Devolucion', d.observacion_devolucion)
    ) AS m(fecha, tipo, descripcion)
    WHERE d.recurso_id = $1 AND m.fecha IS NOT NULL
    UNION ALL
    SELECT 'ticket:' || h.id, h.fecha, 'Atencion', u.nombre,
           concat_ws(' · ', 'TK-' || CASE WHEN tk.id < 10000 THEN lpad(tk.id::text, 4, '0') ELSE tk.id::text END,
             tk.titulo, nullif(h.observacion, '')), t.nombre
    FROM ticket_recurso tr JOIN ticket tk ON tk.id=tr.ticket_id
    JOIN historial_ticket h ON h.ticket_id=tk.id AND h.tipo_evento='resolucion'
    JOIN usuario u ON u.id=tk.usuario_id LEFT JOIN tecnico t ON t.id=h.tecnico_id
    WHERE tr.recurso_id=$1
    UNION ALL
    SELECT 'suministro:' || c.id, c.fecha, 'Suministro', NULL, concat_ws(' · ', s.nombre, c.motivo), t.nombre
    FROM cambio_suministro c JOIN suministro s ON s.id=c.suministro_id
    JOIN tecnico t ON t.id=c.tecnico_id WHERE c.impresora_id=$1
    ORDER BY fecha DESC, id DESC
  `, [id]);
  return responder(200, { datos: rows });
}

export async function consultarCompatibilidad(db, clase, id, responder) {
  const { rows } = clase === "impresoras"
    ? await db.query(`
        SELECT s.id, s.nombre, s.tipo, s.marca, s.descripcion, s.stock,
               s.stock_minimo AS "stockMinimo", s.visible
        FROM compatibilidad c JOIN suministro s ON s.id=c.suministro_id
        JOIN recurso r ON r.id=c.impresora_id
        WHERE c.impresora_id=$1 AND c.activa AND s.visible AND r.visible ORDER BY s.nombre, s.id
      `, [id])
    : await db.query(`
        SELECT r.id, r.nombre AS modelo, r.marca, s.nombre AS sector
        FROM compatibilidad c JOIN recurso r ON r.id=c.impresora_id
        JOIN suministro su ON su.id=c.suministro_id LEFT JOIN sector s ON s.id=r.sector_id
        WHERE c.suministro_id=$1 AND c.activa AND r.visible AND su.visible ORDER BY r.nombre, s.nombre, r.id
      `, [id]);
  return responder(200, { datos: rows });
}

export async function historialSuministro(db, id, responder) {
  const { rows } = await db.query(`
    SELECT 'entrada:' || e.id AS id, e.fecha, e.motivo, e.cantidad,
           'Entrada de stock' AS impresora, NULL AS sector, t.nombre AS responsable
    FROM entrada_suministro e JOIN tecnico t ON t.id=e.tecnico_id WHERE e.suministro_id=$1
    UNION ALL
    SELECT 'cambio:' || c.id, c.fecha, c.motivo, -c.cantidad, r.nombre, s.nombre, t.nombre
    FROM cambio_suministro c JOIN recurso r ON r.id=c.impresora_id
    LEFT JOIN sector s ON s.id=r.sector_id JOIN tecnico t ON t.id=c.tecnico_id
    WHERE c.suministro_id=$1
    ORDER BY fecha DESC, id DESC
  `, [id]);
  return responder(200, { datos: rows });
}
