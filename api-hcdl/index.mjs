import { createServer } from "node:http";
import { conectar } from "./db.mjs";
import { crearApi } from "./api.mjs";
import { crearAutenticacion } from "./acceso.mjs";

const puerto = Number(process.env.PORT ?? 3001);
const host = process.env.HCDL_HOST || "127.0.0.1";
if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error("PORT debe indicar un puerto válido.");
}

const pool = conectar();
pool.on("error", (error) => console.error("Conexión a PostgreSQL interrumpida.", error.code));
const origen = new URL(process.env.HCDL_ORIGEN || "http://127.0.0.1:3000");
if (origen.href !== origen.origin + "/" ||
    (origen.protocol !== "https:" &&
     !(origen.protocol === "http:" && ["127.0.0.1", "localhost"].includes(origen.hostname)))) {
  throw new Error("HCDL_ORIGEN debe ser un origen HTTPS o una dirección HTTP local de desarrollo.");
}
const auth = crearAutenticacion(pool, origen);
const app = createServer(crearApi(pool, auth));
app.listen(puerto, host, () => {
  console.log(`API HCDL en http://${host}:${puerto}`);
  console.log(`Dirección del frontend autorizada: ${origen.origin}`);
});
for (const senal of ["SIGINT", "SIGTERM"]) {
  process.once(senal, () => app.close(() => pool.end()));
}
