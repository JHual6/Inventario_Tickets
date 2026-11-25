import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derivar = promisify(scrypt);
const parametros = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
const maxEdad = 8 * 3600;
const ventana = 15 * 60_000;
const cookie = "hcdl_local";
const textoInvalido = "Correo o contraseña incorrectos.";
const huella = (token) => createHash("sha256").update("local:" + token).digest("hex");

export const cuentasActivas = `
  SELECT c.id, c.rol, c.contrasena_hash, coalesce(u.nombre, t.nombre) AS nombre,
         coalesce(u.correo, t.correo) AS correo,
         c.usuario_id AS "usuarioId", c.tecnico_id AS "tecnicoId"
  FROM cuenta c
  LEFT JOIN usuario u ON u.id = c.usuario_id
  LEFT JOIN tecnico t ON t.id = c.tecnico_id
  WHERE c.activa AND coalesce(u.activo, t.activo)
`;
export const buscarCuenta = `
  WITH cuentas AS (${cuentasActivas})
  SELECT * FROM cuentas WHERE lower(btrim(correo)) = $1 LIMIT 2
`;

export async function hashClave(clave) {
  const sal = randomBytes(16);
  const hash = await derivar(clave, sal, 64, parametros);
  return `scrypt-v1:${sal.toString("hex")}:${hash.toString("hex")}`;
}

// La llamada debe ejecutarse dentro de una transacción.
export async function actualizarClaveCuenta(db, id, hash) {
  const { rowCount } = await db.query(
    "UPDATE cuenta SET contrasena_hash = $1 WHERE id = $2 AND activa", [hash, id],
  );
  if (rowCount !== 1) return false;
  await db.query("DELETE FROM sesion_cuenta WHERE cuenta_id = $1", [id]);
  return true;
}

async function coincide(clave, registro) {
  const partes = /^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(registro ?? "");
  const sal = partes ? Buffer.from(partes[1], "hex") : Buffer.alloc(16);
  const esperado = partes ? Buffer.from(partes[2], "hex") : Buffer.alloc(64);
  const hash = await derivar(clave, sal, 64, parametros);
  return timingSafeEqual(hash, esperado) && Boolean(partes);
}

function tokenSesion(req) {
  const entrada = req.headers.cookie?.split(";").map((valor) => valor.trim())
    .find((valor) => valor.startsWith(cookie + "="));
  const token = entrada?.slice(cookie.length + 1);
  return /^[\w-]{43}$/.test(token ?? "") ? token : null;
}

export async function leerJson(req, res, responder, limite = 16_384) {
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] ?? "")) {
    responder(415, { error: "Se requiere un cuerpo JSON." });
    return;
  }
  const trozos = [];
  let longitud = 0;
  for await (const trozo of req.iterator({ destroyOnReturn: false })) {
    longitud += trozo.length;
    if (longitud > limite) {
      res.setHeader("Connection", "close");
      req.resume();
      responder(413, { error: "Solicitud demasiado grande." });
      return;
    }
    trozos.push(trozo);
  }
  try {
    const datos = JSON.parse(Buffer.concat(trozos));
    if (datos && typeof datos === "object" && !Array.isArray(datos)) return datos;
  } catch {
    // Both invalid JSON and a non-object payload receive the same response.
  }
  responder(400, { error: "Datos inválidos." });
}

export function crearAutenticacion(db, origen) {
  const intentos = new Map();
  let siguienteLimpieza = 0;
  let verificaciones = 0;
  const cabeceraCookie = (token, edad) => `${cookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${edad}${origen.protocol === "https:" ? "; Secure" : ""}`;

  async function sesion(req) {
    const token = tokenSesion(req);
    if (!token) return null;
    const { rows } = await db.query(`
      WITH cuentas AS (${cuentasActivas})
      SELECT c.id, c.rol, c.nombre, c.correo, c."usuarioId", c."tecnicoId"
      FROM sesion_cuenta s JOIN cuentas c ON c.id = s.cuenta_id
      WHERE s.huella = $1 AND s.vence_en > now() AND c.contrasena_hash IS NOT NULL
    `, [huella(token)]);
    return rows[0] ?? null;
  }

  async function iniciar(req, res, _url, responder) {
    if (req.headers.origin !== origen.origin) {
      return responder(403, { error: `Para iniciar sesión, abre Inventario HCDL en ${origen.origin}.` });
    }
    const datos = await leerJson(req, res, responder);
    if (!datos) return;
    const correo = typeof datos?.correo === "string" ? datos.correo.trim().toLowerCase() : "";
    const contrasena = datos?.contrasena;
    if (correo.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(correo) ||
        typeof contrasena !== "string" || !contrasena || Buffer.byteLength(contrasena) > 512) {
      return responder(401, { error: textoInvalido });
    }
    const ahora = Date.now();
    if (ahora >= siguienteLimpieza) {
      for (const [clave, intento] of intentos) {
        if (intento.vence <= ahora) intentos.delete(clave);
      }
      siguienteLimpieza = ahora + 60_000;
    }
    const ip = req.socket.remoteAddress;
    const limites = [[`ip:${ip}`, 40], [`cuenta:${correo}`, 8]];
    if (verificaciones >= 2 || intentos.size >= 10_000 ||
        limites.some(([clave, maximo]) =>
          intentos.get(clave)?.vence > ahora && intentos.get(clave).cantidad >= maximo)) {
      return responder(429, { error: "Hay demasiados intentos. Intenta nuevamente en unos minutos." });
    }
    for (const [clave] of limites) {
      const previo = intentos.get(clave);
      intentos.set(clave, previo?.vence > ahora
        ? { ...previo, cantidad: previo.cantidad + 1 }
        : { cantidad: 1, vence: ahora + ventana });
    }
    verificaciones++;
    try {
      const { rows } = await db.query(buscarCuenta, [correo]);
      const cuenta = rows.length === 1 ? rows[0] : null;
      if (!(await coincide(contrasena, cuenta?.contrasena_hash)) || !cuenta) {
        return responder(401, { error: textoInvalido });
      }
      const token = randomBytes(32).toString("base64url");
      const anterior = tokenSesion(req);
      const cliente = await db.connect();
      try {
        await cliente.query("BEGIN");
        const { rowCount } = await cliente.query(`
          INSERT INTO sesion_cuenta (huella, cuenta_id, vence_en)
          SELECT $1, id, now() + $3::integer * interval '1 second'
          FROM cuenta WHERE id = $2 AND activa AND contrasena_hash = $4 FOR UPDATE
        `, [huella(token), cuenta.id, maxEdad, cuenta.contrasena_hash]);
        if (rowCount !== 1) {
          await cliente.query("ROLLBACK");
          return responder(401, { error: textoInvalido });
        }
        await cliente.query("DELETE FROM sesion_cuenta WHERE vence_en <= now() OR huella = $1",
          [anterior ? huella(anterior) : null]);
        await cliente.query("COMMIT");
      } catch (error) {
        await cliente.query("ROLLBACK");
        throw error;
      } finally {
        cliente.release();
      }
      intentos.delete(`cuenta:${correo}`);
      res.setHeader("Set-Cookie", cabeceraCookie(token, maxEdad));
      return responder(200, { estado: "ok" });
    } finally {
      verificaciones--;
    }
  }

  async function salir(req, res, _url, responder) {
    if (req.headers.origin !== origen.origin) return responder(403, { error: "Origen no autorizado." });
    const token = tokenSesion(req);
    if (token) await db.query("DELETE FROM sesion_cuenta WHERE huella = $1", [huella(token)]);
    res.setHeader("Set-Cookie", cabeceraCookie("", 0));
    return responder(200, { estado: "ok" });
  }

  return {
    sesion,
    mismoOrigen: (req) => req.headers.origin === origen.origin,
    rutas: new Map([
      ["/auth/login", { metodo: "POST", ejecutar: iniciar }],
      ["/auth/logout", { metodo: "POST", ejecutar: salir }],
    ]),
  };
}
