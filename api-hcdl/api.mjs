import { catalogoTI, ejecutarGestion } from "./gestion.mjs";
import { asignarTecnico, cambiarEstado, crearTicket, gestionarTicket, recursoReportablePorColaborador } from "./tickets.mjs";

import { consultarActa, consultarCompatibilidad, historialRecurso, historialSuministro, registrarEntrega, registrarEquipo } from "./inventario.mjs";

const categorias = new Set(["equipo", "movil", "periferico", "impresora", "iot"]);

const acentos = "áéíóúüñ";
const letras = "aeiouun";
function palabrasBusqueda(texto) {
  return texto.normalize("NFC").toLowerCase().replace(/[áéíóúüñ]/g,
    (letra) => letras[acentos.indexOf(letra)]).split(/\s+/).filter(Boolean);
}

const recursoRuta = "/api/recursos";
const recursosTicketRuta = "/api/tickets/recursos";
const soloTI = new Map([
  ["/api/asignaciones", registrarEntrega],
  ["/api/equipos", (db, _cuenta, ...args) => registrarEquipo(db, ...args)],
]);
const listados = new Map([
  ["/api/sectores", `
    SELECT s.id, s.nombre
    FROM sector AS s
    WHERE ($3::int IS NULL OR s.id=$3) AND NOT EXISTS (
      SELECT 1 FROM unnest($4::text[]) AS palabra
      WHERE strpos(translate(lower(s.nombre), '${acentos}', '${letras}'), palabra)=0
    )
  `],
  ["/api/usuarios", `
    SELECT u.id, u.nombre, u.cargo, u.correo, u.activo,
           s.id AS "sectorId", s.nombre AS sector
    FROM usuario AS u
    JOIN sector AS s ON s.id = u.sector_id
    WHERE u.visible AND ($3::int IS NULL OR u.id=$3)
      AND ($4::int IS NULL OR u.sector_id=$4)
      AND ($5::boolean IS NULL OR u.activo=$5)
      AND NOT EXISTS (
        SELECT 1 FROM unnest($6::text[]) AS palabra
        WHERE strpos(translate(lower(concat_ws(' ', u.nombre, u.cargo, u.correo)), '${acentos}', '${letras}'), palabra)=0
      )
  `],
  ["/api/recursos", `
    SELECT r.id, r.nombre, r.categoria, r.tipo, r.marca, r.serie, r.estado,
           r.ficha - ARRAY['password','contrasena','contraseña','passwordWeb','contrasenaWeb','claveWeb'] AS ficha,
           s.nombre AS sector, r.usuario_id AS "usuarioId", r.usuario
    FROM recurso_asignacion_vigente AS r
    LEFT JOIN sector AS s ON s.id = r.sector_actual_id
    WHERE r.visible AND ($3::text IS NULL OR r.categoria = $3)
      AND ($4::integer IS NULL OR r.usuario_id = $4)
      AND ($5::text IS NULL OR r.estado = $5)
      AND ($6::text IS NULL OR r.marca = $6)
      AND ($8::text IS NULL OR coalesce(r.tipo, 'Sin tipo') = $8)
      AND ($9::text IS NULL OR s.nombre = $9)
      AND ($10::int IS NULL OR r.id = $10)
      AND ($11::int IS NULL OR r.usuario_id = $11)
      AND NOT EXISTS (
        SELECT 1 FROM unnest($7::text[]) AS palabra
        WHERE strpos(translate(lower(concat_ws(' ', r.nombre, r.tipo, r.marca, r.serie,
          r.usuario, s.nombre, r.ficha->>'modelo', r.ficha->>'nombreSistema',
          r.ficha->>'ip', r.ficha->>'ubicacion', r.ficha->>'numeroLinea', r.ficha->>'numero',
          r.ficha->>'imei1', r.ficha->>'imei2')), '${acentos}', '${letras}'),
          palabra) = 0
      )
  `],
  [recursosTicketRuta, `
    SELECT r.id, r.nombre, r.serie, r.tipo, s.nombre AS sector,
           s.id AS "sectorId", (s.id <> u.sector_id) AS "otroSector"
    FROM usuario u
    JOIN recurso_asignacion_vigente r ON ${recursoReportablePorColaborador}
    JOIN sector s ON s.id = r.sector_actual_id
    WHERE u.id = $3 AND u.activo AND r.visible
  `],
  ["/api/suministros", `
    SELECT id, nombre, marca, tipo, descripcion, stock, stock_minimo AS "stockMinimo",
           estado_stock AS "estadoStock", visible
    FROM suministro_disponibilidad
    WHERE visible AND ($3::text IS NULL OR estado_stock = $3) AND ($4::text IS NULL OR tipo = $4)
      AND ($6::int IS NULL OR id=$6)
      AND NOT EXISTS (
        SELECT 1 FROM unnest($5::text[]) AS palabra
        WHERE strpos(translate(lower(concat_ws(' ', nombre, marca, tipo)), '${acentos}', '${letras}'), palabra)=0
      )
  `],
]);

function entero(valor, predeterminado, maximo) {
  if (valor === null) return predeterminado;
  if (!/^\d+$/.test(valor)) return null;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero >= 1 && numero <= maximo ? numero : null;
}

listados.set("/api/tecnicos", `
  SELECT t.id, t.nombre, t.cargo
  FROM tecnico t
  JOIN cuenta c ON c.tecnico_id = t.id
  WHERE t.activo AND c.activa
`);

listados.set("/api/tickets", `
  SELECT t.id, t.titulo, t.descripcion, t.prioridad, e.nombre AS estado, e.final AS resuelto,
         t.fecha_creacion AS "fechaCreacion", t.fecha_resolucion AS "fechaResolucion",
         u.nombre AS solicitante, s.nombre AS sector, te.nombre AS tecnico, t.tecnico_id AS "tecnicoId",
         COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'nombre', r.nombre, 'serie', r.serie, 'tipo', r.tipo, 'sector', sr.nombre) ORDER BY r.id)
           FROM ticket_recurso tr JOIN recurso r ON r.id = tr.recurso_id
           LEFT JOIN sector sr ON sr.id = r.sector_id WHERE tr.ticket_id = t.id), '[]') AS recursos,
         COALESCE((SELECT jsonb_agg(
            jsonb_build_object('id', h.id, 'fecha', h.fecha, 'evento', h.tipo_evento, 'estado', he.nombre,
                               'observacion', h.observacion, 'autor', coalesce(hu.nombre, ht.nombre)) ORDER BY h.fecha, h.id
          ) FROM historial_ticket h JOIN estado_ticket he ON he.id = h.estado_id
            LEFT JOIN usuario hu ON hu.id = h.usuario_id
            LEFT JOIN tecnico ht ON ht.id = h.tecnico_id
            WHERE h.ticket_id = t.id), '[]') AS historial
  FROM ticket t
  JOIN estado_ticket e ON e.id = t.estado_id
  JOIN usuario u ON u.id = t.usuario_id
  JOIN sector s ON s.id = t.sector_id
  LEFT JOIN tecnico te ON te.id = t.tecnico_id
  WHERE ($3::integer IS NULL OR t.usuario_id = $3) AND ($4::boolean IS NULL OR e.final = $4)
    AND ($6::text IS NULL OR t.prioridad = $6)
    AND ($7::text IS NULL OR s.nombre = $7)
    AND ($8::text IS NULL OR ($8 = 'sin-asignar' AND t.tecnico_id IS NULL) OR t.tecnico_id::text = $8)
    AND ($9::text IS NULL OR e.nombre=$9)
    AND ($10::int IS NULL OR t.id=$10)
    AND ($11::date IS NULL OR ((CASE WHEN $4::boolean THEN t.fecha_resolucion ELSE t.fecha_creacion END)
      AT TIME ZONE 'America/Santiago')::date >= $11)
    AND ($12::date IS NULL OR ((CASE WHEN $4::boolean THEN t.fecha_resolucion ELSE t.fecha_creacion END)
      AT TIME ZONE 'America/Santiago')::date <= $12)
    AND NOT EXISTS (
      SELECT 1 FROM unnest($5::text[]) AS palabra
      WHERE strpos(translate(lower(concat_ws(' ', t.id::text,
          'TK-' || CASE WHEN t.id < 10000 THEN lpad(t.id::text, 4, '0') ELSE t.id::text END, t.titulo, t.descripcion,
          u.nombre, s.nombre, te.nombre)), '${acentos}', '${letras}'), palabra) = 0
        AND NOT EXISTS (
          SELECT 1 FROM ticket_recurso tr JOIN recurso r ON r.id = tr.recurso_id
          WHERE tr.ticket_id = t.id AND strpos(translate(lower(concat_ws(' ', r.nombre,
            r.serie, r.ficha->>'modelo')), '${acentos}', '${letras}'), palabra) > 0
        )
    )
`);

listados.set("/api/asignaciones", `
  SELECT a.id, u.nombre AS usuario, te.nombre AS tecnico, a.fecha, a.observacion,
         COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'nombre', r.nombre, 'serie', r.serie, 'condicion', d.condicion,
           'fechaDevolucion', d.fecha_devolucion
         ) ORDER BY d.id) FROM detalle_asignacion d JOIN recurso r ON r.id = d.recurso_id
           WHERE d.asignacion_id = a.id), '[]') AS recursos
  FROM asignacion a JOIN usuario u ON u.id = a.usuario_id JOIN tecnico te ON te.id = a.tecnico_id
`);

export function crearApi(db, auth) {
  return async (req, res) => {
    const responder = (codigo, cuerpo) => {
      res.writeHead(codigo, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(cuerpo));
    };

    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      return responder(400, { error: "URL inválida." });
    }

    const consulta = listados.get(url.pathname);
    const gestion = url.pathname === "/api/gestion";
    const agregar = req.method === "POST" && soloTI.get(url.pathname);
    const historial = /^\/api\/(equipos|recursos|suministros)\/([1-9][0-9]{0,9})\/historial$/.exec(url.pathname);
    const acta = /^\/api\/asignaciones\/([1-9][0-9]{0,9})$/.exec(url.pathname);
    const compatibilidad = /^\/api\/(impresoras|suministros)\/([1-9][0-9]{0,9})\/compatibles$/.exec(url.pathname);
    const idConsulta = historial ? entero(historial[2], null, 2147483647)
      : acta ? entero(acta[1], null, 2147483647)
        : compatibilidad ? entero(compatibilidad[2], null, 2147483647) : null;
    const salud = url.pathname === "/api/salud";
    const rutaAuth = auth.rutas.get(url.pathname);
    const perfil = url.pathname === "/api/sesion";
    const cambio = /^\/api\/tickets\/([1-9][0-9]{0,9})\/(estado|tecnico|gestion)$/.exec(url.pathname);
    const idTicket = cambio && entero(cambio[1], null, 2147483647);
    const alta = url.pathname === "/api/tickets" && req.method === "POST";
    if (!consulta && !salud && !rutaAuth && !perfil && !idTicket && !agregar && !idConsulta && !gestion) {
      return responder(404, { error: "Ruta no encontrada." });
    }
    const metodo = rutaAuth?.metodo ?? (gestion && req.method === "POST" ? "POST" : idTicket ? "PATCH" : (alta || agregar) ? "POST" : "GET");
    if (req.method !== metodo) {
      res.setHeader("Allow", url.pathname === "/api/tickets" || gestion ? "GET, POST" : metodo);
      return responder(405, { error: "Método no permitido." });
    }

    try {
      if (rutaAuth) return await rutaAuth.ejecutar(req, res, url, responder);
      if (salud) {
        const { rows } = await db.query(
          "SELECT version FROM hcdl_migracion WHERE version = $1", ["005-primer-acceso"],
        );
        if (!rows.length) {
          return responder(503, { error: "La base requiere la migración 005-primer-acceso de HCDL." });
        }
        return responder(200, { estado: "ok" });
      }

      const cuenta = await auth.sesion(req);
      if (!cuenta) return responder(401, { error: "Inicia sesión para continuar." });
      if (perfil) return responder(200, cuenta);
      if (cuenta.cambioClavePendiente) {
        return responder(403, { error: "Cambia la contraseña temporal para continuar." });
      }
      if (gestion) {
        if (cuenta.rol === "solicitante" || (req.method === "POST" && !auth.mismoOrigen(req))) {
          return responder(403, { error: "Esta operación es exclusiva de TI." });
        }
        return req.method === "GET" ? await catalogoTI(db, responder)
          : await ejecutarGestion(db, cuenta, req, res, responder);
      }
      if (agregar || idConsulta) {
        if (cuenta.rol === "solicitante" || (agregar && !auth.mismoOrigen(req))) {
          return responder(403, { error: "Esta operación es exclusiva de TI." });
        }
        if (historial && idConsulta) return await (historial[1] === "suministros" ? historialSuministro : historialRecurso)(db, idConsulta, responder);
        if (acta && idConsulta) return await consultarActa(db, idConsulta, responder);
        if (compatibilidad && idConsulta) return await consultarCompatibilidad(db, compatibilidad[1], idConsulta, responder);
        return await agregar(db, cuenta, req, res, responder);
      }
      if (alta) return await crearTicket(db, auth, cuenta, req, res, responder);
      if (idTicket) {
        const ejecutar = { estado: cambiarEstado, tecnico: asignarTecnico, gestion: gestionarTicket }[cambio[2]];
        return await ejecutar(db, auth, cuenta, idTicket, req, res, responder);
      }

      if (cuenta.rol === "solicitante" && ![recursoRuta, "/api/tickets", recursosTicketRuta].includes(url.pathname)) {
        return responder(403, { error: "Esta consulta es exclusiva de TI." });
      }

      const pagina = entero(url.searchParams.get("pagina"), 1, 1_000_000);
      const porPagina = entero(url.searchParams.get("porPagina"), 20, 100);
      const categoria = url.searchParams.get("categoria");
      const texto = url.searchParams.get("q")?.trim() ?? "";
      const estado = url.searchParams.get("estado") || null;
      const marca = url.searchParams.get("marca") || null;
      const tipo = url.searchParams.get("tipo") || null;
      const sectorRecurso = url.pathname === recursoRuta ? url.searchParams.get("sector") || null : null;
      const esSuministro = url.pathname === "/api/suministros";
      const esUsuarios = url.pathname === "/api/usuarios";
      const esSectores = url.pathname === "/api/sectores";
      const idParametro = url.searchParams.get("id");
      const id = entero(idParametro, null, 2147483647);
      const usuarioParametro = url.searchParams.get("usuarioId");
      const usuarioFiltro = entero(usuarioParametro, null, 2147483647);
      const sectorParametro = url.searchParams.get("sectorId");
      const sectorFiltro = entero(sectorParametro, null, 2147483647);
      if ((idParametro !== null && id === null) || (usuarioParametro !== null && usuarioFiltro === null) ||
          (sectorParametro !== null && sectorFiltro === null)) {
        return responder(400, { error: "Identificador inválido." });
      }
      if (texto.length > 120 || (estado?.length ?? 0) > 120 || (marca?.length ?? 0) > 160 ||
          (tipo?.length ?? 0) > 160 || (sectorRecurso?.length ?? 0) > 160 ||
          (marca && url.pathname !== recursoRuta) ||
          (tipo && url.pathname !== recursoRuta && !esSuministro) ||
          (estado && url.pathname !== recursoRuta && !esSuministro && !esUsuarios && url.pathname !== "/api/tickets") ||
          (texto && ![recursoRuta, "/api/tickets", "/api/suministros", "/api/usuarios", "/api/sectores"].includes(url.pathname))) {
        return responder(400, { error: "Filtros de búsqueda inválidos." });
      }
      if (pagina === null || porPagina === null ||
          (categoria !== null && (url.pathname !== "/api/recursos" || !categorias.has(categoria)))) {
        return responder(400, { error: "Página, tamaño o categoría inválidos." });
      }

      const parametros = [porPagina, (pagina - 1) * porPagina];
      if (url.pathname === "/api/recursos") {
        parametros.push(categoria, cuenta.rol === "solicitante" ? cuenta.usuarioId : null,
          estado, marca, palabrasBusqueda(texto), tipo, sectorRecurso, id, usuarioFiltro);
      }
      if (url.pathname === recursosTicketRuta) parametros.push(cuenta.usuarioId);
      if (esSuministro) parametros.push(estado, tipo, palabrasBusqueda(texto), id);
      if (esSectores) parametros.push(id, palabrasBusqueda(texto));
      if (esUsuarios) {
        if (estado && !["Activo", "Inactivo"].includes(estado)) return responder(400, { error: "Estado inválido." });
        parametros.push(id, sectorFiltro, estado === null ? null : estado === "Activo", palabrasBusqueda(texto));
      }

      if (url.pathname === "/api/tickets") {
        const resueltos = url.searchParams.get("resueltos");
        if (resueltos !== null && !["true", "false"].includes(resueltos)) {
          return responder(400, { error: "Filtro de resolución inválido." });
        }
        const prioridad = url.searchParams.get("prioridad") || null;
        const sector = url.searchParams.get("sector") || null;
        const tecnico = url.searchParams.get("tecnico") || null;
        const desde = url.searchParams.get("desde");
        const hasta = url.searchParams.get("hasta");
        const fechaValida = (valor) => valor === null || (
          /^\d{4}-\d{2}-\d{2}$/.test(valor) && !valor.startsWith("0000") &&
          !Number.isNaN(Date.parse(valor)) && new Date(valor).toISOString().slice(0, 10) === valor
        );
        if ((prioridad && !["Baja", "Media", "Alta"].includes(prioridad)) ||
            (estado && !["Pendiente", "En atención", "En espera", "Resuelto"].includes(estado)) ||
            !fechaValida(desde) || !fechaValida(hasta) || (desde && hasta && desde > hasta) ||
            (sector && sector.length > 160) ||
            (tecnico && tecnico !== "sin-asignar" && !entero(tecnico, null, 2147483647))) {
          return responder(400, { error: "Filtros de solicitud inválidos." });
        }
        parametros.push(cuenta.usuarioId, resueltos, palabrasBusqueda(texto), prioridad, sector, tecnico,
          estado, id, desde, hasta);
      }

      const orden = url.pathname === "/api/tickets"
        ? url.searchParams.get("resueltos") === "true" ? '"fechaResolucion" DESC, id DESC' : '"fechaCreacion" DESC, id DESC'
        : "id";
      const { rows: [resultado] } = await db.query(`
        WITH resultados AS (${consulta}),
        paginados AS (SELECT * FROM resultados ORDER BY ${orden} LIMIT $1 OFFSET $2)
        SELECT COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY ${orden}) FROM paginados p), '[]') AS datos,
               (SELECT count(*)::integer FROM resultados) AS total
               ${url.pathname === recursoRuta && cuenta.rol !== "solicitante" ? `,
                 (SELECT COALESCE(jsonb_agg(DISTINCT marca ORDER BY marca), '[]')
                  FROM recurso WHERE visible AND marca IS NOT NULL
                    AND ($3::text IS NULL OR categoria = $3)) AS marcas` : ""}
      `, parametros);

      return responder(200, { ...resultado, pagina, porPagina });
    } catch (error) {
      console.error("Error interno de la API HCDL.", error.code ?? error.name);
      return responder(503, { error: "No se pudo completar la solicitud." });
    }
  };
}
