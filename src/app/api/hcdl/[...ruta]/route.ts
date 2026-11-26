import { urlHcdl } from "@/lib/sesion-hcdl";

const rutas = /^(sesion|salud|gestion|usuarios|sectores|suministros|recursos|asignaciones|tecnicos|equipos|tickets|(?:equipos|recursos|suministros)\/[1-9]\d{0,9}\/historial|asignaciones\/[1-9]\d{0,9}|(?:impresoras|suministros)\/[1-9]\d{0,9}\/compatibles|tickets\/[1-9]\d{0,9}\/(estado|tecnico|gestion))$/;
type Contexto = { params: Promise<{ ruta: string[] }> };

async function reenviar(req: Request, { params }: Contexto) {
  const ruta = (await params).ruta.join("/");
  const autenticacion = ["login", "logout", "cambiar-clave-inicial"].includes(ruta);
  if (!autenticacion && !rutas.test(ruta)) {
    return Response.json({ error: "Ruta no encontrada." }, { status: 404 });
  }
  const destino = urlHcdl(`/${autenticacion ? "auth" : "api"}/${ruta}`);
  destino.search = new URL(req.url).search;
  const headers = new Headers();
  for (const clave of ["cookie", "origin", "content-type"]) {
    const dato = req.headers.get(clave);
    if (dato) headers.set(clave, dato);
  }
  try {
    const body = req.method === "GET" ? undefined : req.body;
    const opciones = { method: req.method, headers, body, duplex: "half" as const,
      cache: "no-store" as const, redirect: "error" as const, signal: AbortSignal.timeout(10000) };
    const respuesta = await fetch(destino, opciones);
    const salida = new Headers({
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    for (const cookie of respuesta.headers.getSetCookie()) salida.append("Set-Cookie", cookie);
    return new Response(respuesta.body, { status: respuesta.status, headers: salida });
  } catch {
    return Response.json({ error: "No se pudo conectar con la API de HCDL." }, { status: 503 });
  }
}

export { reenviar as GET, reenviar as POST, reenviar as PATCH };
