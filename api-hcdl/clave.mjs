import { randomBytes } from "node:crypto";
import { actualizarClaveCuenta, buscarCuenta, hashClave } from "./acceso.mjs";
import { conectar } from "./db.mjs";

const correo = process.argv[2]?.trim().toLowerCase();
if (!correo || process.argv.length !== 3) {
  console.error("Uso: npm run clave -- correo@dominio");
  process.exit(1);
}

const db = conectar();
try {
  const { rows } = await db.query(buscarCuenta, [correo]);
  if (rows.length !== 1) throw new Error("El correo debe corresponder a una sola cuenta activa.");
  const clave = randomBytes(18).toString("base64url");
  const registro = await hashClave(clave);
  const cliente = await db.connect();
  try {
    await cliente.query("BEGIN");
    if (!await actualizarClaveCuenta(cliente, rows[0].id, registro)) {
      throw new Error("La cuenta dejó de estar activa.");
    }
    await cliente.query("COMMIT");
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
  console.log(`Cuenta: ${correo} (${rows[0].rol})\nContraseña de HCDL: ${clave}`);
} catch (error) {
  console.error(error.code ? `Error de PostgreSQL: ${error.code}` : error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
