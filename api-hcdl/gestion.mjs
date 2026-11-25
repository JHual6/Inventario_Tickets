import { actualizarClaveCuenta, hashClave, leerJson } from "./acceso.mjs";

const categorias = new Set(["equipo", "movil", "periferico", "impresora", "iot"]);
const idValido = (id) => Number.isInteger(id) && id > 0 && id <= 2147483647;
const cantidadValida = (n) => Number.isInteger(n) && n >= 0 && n <= 2147483647;
const texto = (v) => typeof v === "string" ? v.trim() : "";
const clavesFicha = [
  "modelo", "nombreSistema", "procesador", "ram", "almacenamiento", "sistemaOperativo",
  "antivirus", "office", "tarjetaVideo", "tarjetaWifi", "tarjetaEthernet", "macWifi", "macEthernet",
  "ip", "imei1", "imei2", "compania", "convenio", "plan", "numeroLinea", "accesorio",
  "ubicacion", "urlWeb",
];
const clavesSecretas = "ARRAY['password','contrasena','contraseña','passwordWeb','contrasenaWeb','claveWeb']";

function validarVisibilidadInicial(id, visible) {
  exigir(id != null || visible === undefined || typeof visible === "boolean",
    "Selecciona una visibilidad inicial válida.");
}

function claveValida(contrasena) {
  if (typeof contrasena !== "string") return false;
  const longitud = Array.from(contrasena).length;
  return longitud >= 15 && longitud <= 128 &&
    /\p{Ll}/u.test(contrasena) && /\p{Lu}/u.test(contrasena) &&
    /\p{Nd}/u.test(contrasena) && /[\p{S}\p{P}]/u.test(contrasena);
}

const requisitosClave = "La contraseña debe tener entre 15 y 128 caracteres, minúscula, mayúscula, número y símbolo.";

export async function catalogoTI(db, responder) {
  const { rows: [datos] } = await db.query(`
    SELECT
      (SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id), '[]') FROM (
        SELECT r.id, r.categoria, r.nombre, r.tipo, r.marca, r.serie, r.estado, r.visible,
          s.nombre AS sector, r.sector_id AS "sectorId", r.usuario_id AS "usuarioId", r.usuario,
          r.ficha - ${clavesSecretas} AS ficha, nullif(r.ficha->>'claveWeb', '') IS NOT NULL AS "tieneClaveWeb"
        FROM recurso_asignacion_vigente r LEFT JOIN sector s ON s.id = r.sector_actual_id
      ) q) AS recursos,
      (SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id), '[]') FROM (
        SELECT id, nombre, marca, tipo, descripcion, stock, stock_minimo AS "stockMinimo", visible
        FROM suministro
      ) q) AS suministros,
      (SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id), '[]') FROM (
        SELECT u.id, u.nombre, u.cargo, u.correo, u.activo, u.visible, u.sector_id AS "sectorId", s.nombre AS sector
        FROM usuario u JOIN sector s ON s.id = u.sector_id
      ) q) AS usuarios,
      (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.nombre), '[]') FROM sector s) AS sectores,
      (SELECT coalesce(jsonb_agg(jsonb_build_object('suministroId', suministro_id, 'impresoraId', impresora_id)
        ORDER BY suministro_id, impresora_id), '[]') FROM compatibilidad WHERE activa) AS compatibilidades,
      (SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.fecha DESC, q.id DESC), '[]') FROM (
        SELECT 'entrada:' || e.id AS id, e.suministro_id AS "suministroId", NULL::int AS "impresoraId",
          e.fecha, e.cantidad, e.motivo, t.nombre AS tecnico, NULL::text AS impresora
        FROM entrada_suministro e JOIN tecnico t ON t.id = e.tecnico_id
        UNION ALL
        SELECT 'cambio:' || c.id, c.suministro_id, c.impresora_id, c.fecha, -c.cantidad, c.motivo, t.nombre, r.nombre
        FROM cambio_suministro c JOIN tecnico t ON t.id = c.tecnico_id
        JOIN recurso r ON r.id = c.impresora_id
      ) q) AS movimientos,
      (SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q."fechaAsignacion" DESC, q.id DESC), '[]') FROM (
        SELECT d.id, d.recurso_id AS "recursoId", a.usuario_id AS "usuarioId", u.nombre AS usuario,
          r.nombre AS dispositivo, r.categoria, r.serie, a.fecha AS "fechaAsignacion",
          d.fecha_devolucion AS "fechaDevolucion", coalesce(d.observacion, a.observacion) AS observacion,
          d.observacion_devolucion AS "observacionDevolucion", t.nombre AS tecnico
        FROM detalle_asignacion d JOIN asignacion a ON a.id = d.asignacion_id
        JOIN recurso r ON r.id = d.recurso_id JOIN usuario u ON u.id = a.usuario_id
        JOIN tecnico t ON t.id = a.tecnico_id
      ) q) AS asignaciones,
      (SELECT jsonb_build_object('abiertos', count(*) FILTER (WHERE NOT e.final),
         'resueltos', count(*) FILTER (WHERE e.final)) FROM ticket t JOIN estado_ticket e ON e.id = t.estado_id) AS tickets
  `);
  return responder(200, datos);
}

function exigir(condicion, mensaje, estado = 400) {
  if (!condicion) throw Object.assign(new Error(mensaje), { estado });
}

async function sectorValido(db, id) {
  exigir(idValido(id) && (await db.query("SELECT 1 FROM sector WHERE id=$1", [id])).rowCount,
    "Selecciona un sector registrado.");
}

async function buscarRegistro(db, tabla, id) {
  exigir(idValido(id), "El identificador no es válido.");
  const { rows: [item] } = await db.query(`SELECT * FROM ${tabla} WHERE id=$1 FOR UPDATE`, [id]);
  exigir(item, "El registro ya no existe.", 404);
  return item;
}

async function guardarRecursos(db, _cuenta, entrada) {
  const lote = entrada.recursos;
  exigir(Array.isArray(lote) && lote.length > 0 && lote.length <= 100,
    "Selecciona al menos un recurso.");
  exigir(lote.every((r) => r && (r.id == null || idValido(r.id))), "Los recursos enviados no son válidos.");
  const ids = lote.flatMap((r) => r.id == null ? [] : [r.id]);
  exigir(new Set(ids).size === ids.length, "Hay recursos repetidos.");
  exigir(entrada.usuarioId == null, "Asigna los recursos desde Fichas y Actas de entrega.");
  const { rows: existentes } = await db.query("SELECT * FROM recurso WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE", [ids]);
  exigir(existentes.length === ids.length, "Alguno de los recursos ya no existe.", 404);
  const { rows: vigentes } = await db.query("SELECT recurso_id FROM detalle_asignacion WHERE recurso_id=ANY($1::int[]) AND fecha_devolucion IS NULL", [ids]);
  const asignados = new Set(vigentes.map((r) => r.recurso_id));
  const anteriores = new Map(existentes.map((r) => [r.id, r]));

  for (const r of lote) {
    const previo = anteriores.get(r.id);
    validarVisibilidadInicial(r.id, r.visible);
    const nombre = texto(r.nombre);
    const tipo = texto(r.tipo);
    const estado = texto(r.estado);
    const serie = texto(r.serie) || null;
    const marca = texto(r.marca) || null;
    const sectorId = r.sectorId === undefined ? previo?.sector_id ?? null : r.sectorId;
    exigir(categorias.has(r.categoria) && (!previo || previo.categoria === r.categoria) &&
      nombre && tipo && estado && [nombre, tipo, estado, serie, marca].every((v) => (v?.length ?? 0) <= 160),
      "Revisa el nombre, tipo, estado y número de serie del recurso.");
    if (sectorId !== null) await sectorValido(db, sectorId);
    const tieneAsignacion = asignados.has(r.id);
    exigir(estado !== "Asignado" || tieneAsignacion, "Asigna el recurso desde Fichas y Actas de entrega.");
    const ficha = Object.fromEntries(clavesFicha.filter((clave) => Object.hasOwn(r.ficha ?? {}, clave))
      .map((clave) => [clave, texto(r.ficha[clave]) || null]));
    exigir(Object.values(ficha).every((v) => (v?.length ?? 0) <= 500), "Un campo de la ficha supera el largo permitido.");
    if (r.categoria === "impresora" && typeof r.ficha?.accesoWeb === "boolean") {
      ficha.accesoWeb = r.ficha.accesoWeb;
      if (ficha.accesoWeb) {
        exigir(/^https?:\/\//i.test(ficha.urlWeb ?? ""), "Ingresa la dirección HTTP o HTTPS de la impresora.");
        if (typeof r.claveWeb === "string" && r.claveWeb) {
          exigir(r.claveWeb.length <= 160, "La contraseña supera el largo permitido.");
          ficha.claveWeb = r.claveWeb;
        }
      } else {
        ficha.urlWeb = null;
        ficha.claveWeb = null;
      }
    }
    const valores = [nombre, tipo, marca, serie, tieneAsignacion ? "Asignado" : estado, sectorId, ficha];
    if (previo) {
      await db.query(`UPDATE recurso SET nombre=$1,tipo=$2,marca=$3,serie=$4,estado=$5,sector_id=$6,
        ficha=jsonb_strip_nulls(ficha || $7::jsonb || CASE WHEN categoria='equipo' THEN jsonb_build_object(
          'revision', to_char(now() AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')
        ) ELSE '{}'::jsonb END) WHERE id=$8`, [...valores, previo.id]);
    } else {
      await db.query(`INSERT INTO recurso(nombre,tipo,marca,serie,estado,sector_id,ficha,categoria,visible)
        VALUES($1,$2,$3,$4,$5,$6,jsonb_strip_nulls($7::jsonb || CASE WHEN $8='equipo' THEN jsonb_build_object(
          'revision', to_char(now() AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')
        ) ELSE '{}'::jsonb END),$8,$9)`, [...valores, r.categoria, r.visible ?? true]);
    }
  }
}

async function guardarUsuario(db, cuenta, { id, nombre, cargo, correo, sectorId, activo, visible, contrasena }) {
  validarVisibilidadInicial(id, visible);
  const campos = [texto(nombre), texto(cargo), texto(correo).toLowerCase()];
  exigir(campos[0] && campos.every((v) => v.length <= 254) && typeof activo === "boolean", "Revisa los datos del usuario.");
  exigir(!campos[2] || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos[2]), "Ingresa un correo válido.");
  if (contrasena !== undefined) {
    exigir(cuenta.rol === "administrador", "Solo un administrador puede establecer la contraseña inicial.", 403);
    exigir(id == null && campos[2], "Usa un correo válido en el alta o la acción de cambiar contraseña.");
    exigir(claveValida(contrasena), requisitosClave);
  }
  if (campos[2]) {
    const { rowCount } = await db.query("SELECT 1 FROM tecnico WHERE lower(btrim(correo))=$1", [campos[2]]);
    exigir(!rowCount, "Ese correo pertenece a una cuenta de TI.", 409);
  }
  await sectorValido(db, sectorId);
  const valores = [campos[0], campos[1] || null, campos[2] || null, sectorId, activo];
  if (id != null) {
    await buscarRegistro(db, "usuario", id);
    await db.query("UPDATE usuario SET nombre=$1,cargo=$2,correo=$3,sector_id=$4,activo=$5 WHERE id=$6", [...valores, id]);
  } else {
    const { rows: [usuario] } = await db.query(
      "INSERT INTO usuario(nombre,cargo,correo,sector_id,activo,visible) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
      [...valores, visible ?? true],
    );
    await db.query("INSERT INTO cuenta(usuario_id,rol,activa,contrasena_hash) VALUES($1,'solicitante',true,$2)",
      [usuario.id, contrasena === undefined ? null : await hashClave(contrasena)]);
  }
}

async function guardarSuministro(db, cuenta, { id, nombre, marca, tipo, descripcion, stockMinimo, stock, visible }) {
  validarVisibilidadInicial(id, visible);
  nombre = texto(nombre);
  marca = texto(marca);
  descripcion = texto(descripcion);
  exigir(nombre && nombre.length <= 160 && marca.length <= 160 && descripcion.length <= 3000 &&
    ["Tóner", "Tinta", "Tambor"].includes(tipo) && cantidadValida(stockMinimo), "Revisa los datos del suministro.");
  const valores = [nombre, marca || null, tipo, descripcion || null, stockMinimo];
  if (id != null) {
    await buscarRegistro(db, "suministro", id);
    await db.query("UPDATE suministro SET nombre=$1,marca=$2,tipo=$3,descripcion=$4,stock_minimo=$5 WHERE id=$6",
      [...valores, id]);
  } else {
    exigir(cantidadValida(stock), "Ingresa un stock inicial válido.");
    const { rows: [suministro] } = await db.query(`INSERT INTO suministro(nombre,marca,tipo,descripcion,stock_minimo,visible)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, [...valores, visible ?? true]);
    if (stock) await agregarStock(db, cuenta, { id: suministro.id, cantidad: stock, motivo: "Stock inicial" });
  }
}

async function ajustarVisibilidad(db, _cuenta, { clase, id, visible }) {
  exigir(["recurso", "suministro", "usuario"].includes(clase) && typeof visible === "boolean", "La visibilidad no es válida.");
  await buscarRegistro(db, clase, id);
  if (!visible && clase !== "suministro") {
    const columna = clase === "usuario" ? "a.usuario_id" : "d.recurso_id";
    const { rowCount } = await db.query(`
      SELECT 1 FROM detalle_asignacion d JOIN asignacion a ON a.id=d.asignacion_id
      WHERE ${columna}=$1 AND d.fecha_devolucion IS NULL LIMIT 1`, [id]);
    exigir(!rowCount, "Desvincula las asignaciones vigentes antes de ocultar el registro.", 409);
  }
  await db.query(`UPDATE ${clase} SET visible=$2 WHERE id=$1`, [id, visible]);
}

async function desvincular(db, _cuenta, { id, recursosIds }) {
  exigir(idValido(id) && Array.isArray(recursosIds) && recursosIds.length > 0 && recursosIds.length <= 100 &&
    recursosIds.every(idValido) && new Set(recursosIds).size === recursosIds.length, "Selecciona recursos válidos.");
  await db.query("SELECT id FROM recurso WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE", [recursosIds]);
  const { rowCount } = await db.query(`UPDATE detalle_asignacion d SET fecha_devolucion=now()
    FROM asignacion a WHERE d.asignacion_id=a.id AND a.usuario_id=$1
    AND d.recurso_id=ANY($2::int[]) AND d.fecha_devolucion IS NULL`, [id, recursosIds]);
  exigir(rowCount === recursosIds.length, "Uno de los recursos ya no está asignado a este usuario.", 409);
}

async function guardarCompatibilidad(db, _cuenta, { id, impresorasIds }) {
  exigir(Array.isArray(impresorasIds) && impresorasIds.every(idValido) &&
    new Set(impresorasIds).size === impresorasIds.length, "Selecciona impresoras válidas.");
  await buscarRegistro(db, "suministro", id);
  const { rowCount } = await db.query("SELECT 1 FROM recurso WHERE categoria='impresora' AND id=ANY($1::int[])", [impresorasIds]);
  exigir(rowCount === impresorasIds.length, "Una de las impresoras seleccionadas no existe.");
  await db.query(`UPDATE compatibilidad SET activa=false
    WHERE suministro_id=$1 AND activa AND NOT (impresora_id=ANY($2::int[]))`, [id, impresorasIds]);
  await db.query(`INSERT INTO compatibilidad(suministro_id,impresora_id,activa)
    SELECT $1,id,true FROM unnest($2::int[]) AS impresora(id)
    ON CONFLICT(suministro_id,impresora_id) DO UPDATE SET activa=true`, [id, impresorasIds]);
}

async function agregarStock(db, cuenta, { id, cantidad, motivo }) {
  exigir(cantidadValida(cantidad) && cantidad > 0, "Ingresa una cantidad entera positiva.");
  await buscarRegistro(db, "suministro", id);
  await db.query(`INSERT INTO entrada_suministro(suministro_id,tecnico_id,cantidad,motivo)
    VALUES($1,$2,$3,$4)`, [id, cuenta.tecnicoId, cantidad, texto(motivo).slice(0, 1000) || null]);
}

async function cambiarSuministro(db, cuenta, { id, impresoraId, motivo }) {
  exigir(idValido(impresoraId), "Selecciona una impresora válida.");
  const suministro = await buscarRegistro(db, "suministro", id);
  exigir(suministro.visible && suministro.stock > 0, "Selecciona un suministro visible y con stock.", 409);
  const { rowCount: operativa } = await db.query(
    "SELECT id FROM recurso WHERE id=$1 AND categoria='impresora' AND visible FOR SHARE", [impresoraId],
  );
  exigir(operativa, "La impresora debe estar visible para cambiar el suministro.", 409);
  const { rowCount } = await db.query(`
    INSERT INTO cambio_suministro(suministro_id,impresora_id,tecnico_id,motivo)
    SELECT $1,r.id,$3,$4 FROM recurso r JOIN compatibilidad c ON c.impresora_id=r.id
    WHERE r.id=$2 AND r.categoria='impresora' AND c.suministro_id=$1 AND c.activa
  `, [id, impresoraId, cuenta.tecnicoId, texto(motivo).slice(0, 1000) || null]);
  exigir(rowCount, "La impresora y el suministro deben tener compatibilidad activa.", 409);
}

async function cambiarContrasena(db, cuenta, { usuarioId, contrasena }) {
  exigir(cuenta.rol === "administrador", "Solo un administrador puede restablecer contraseñas.", 403);
  exigir(idValido(usuarioId) && claveValida(contrasena), requisitosClave);
  const { rows: [destino] } = await db.query(`
    SELECT c.id FROM cuenta c JOIN usuario u ON u.id=c.usuario_id
    WHERE u.id=$1 AND u.activo AND c.activa AND c.rol='solicitante'
      AND nullif(btrim(u.correo),'') IS NOT NULL FOR SHARE OF u
  `, [usuarioId]);
  exigir(destino, "El usuario necesita una cuenta activa y un correo para iniciar sesión.", 409);
  exigir(await actualizarClaveCuenta(db, destino.id, await hashClave(contrasena)),
    "La cuenta dejó de estar activa.", 409);
}

const operaciones = new Map(Object.entries({
  guardarRecursos, guardarUsuario, guardarSuministro, ajustarVisibilidad,
  desvincular, guardarCompatibilidad, agregarStock, cambiarSuministro, cambiarContrasena,
}));

export async function ejecutarGestion(db, cuenta, req, res, responder) {
  const datos = await leerJson(req, res, responder, 350_000);
  if (!datos) return;
  const operar = operaciones.get(datos.operacion);
  if (!operar) return responder(400, { error: "Operación de administración inválida." });
  const cliente = await db.connect();
  try {
    await cliente.query("BEGIN");
    await operar(cliente, cuenta, datos);
    await cliente.query("COMMIT");
    return responder(200, { estado: "ok" });
  } catch (error) {
    await cliente.query("ROLLBACK");
    if (error.estado) return responder(error.estado, { error: error.message });
    const errores = {
      "23505": "El correo o el número de serie ya está registrado.",
      "23503": "Alguno de los registros relacionados ya no existe.",
      "23514": "La operación no cumple las reglas de inventario o stock.",
      "22003": "La cantidad supera el máximo disponible.",
      "40P01": "Hubo otra operación al mismo tiempo. Actualiza la página e inténtalo nuevamente.",
    };
    if (errores[error.code]) return responder(409, { error: errores[error.code] });
    throw error;
  } finally {
    cliente.release();
  }
}
