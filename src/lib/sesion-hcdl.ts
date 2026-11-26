import { cache } from "react";
import { cookies } from "next/headers";

export type Rol = "solicitante" | "tecnico" | "administrador";
export type Sesion = { nombre: string; rol: Rol; cambioClavePendiente: boolean };
export const rutaClaveInicial = "/acceso/primera-contrasena";

export function inicio(sesion: Sesion) {
  if (sesion.cambioClavePendiente) return rutaClaveInicial;
  return sesion.rol === "solicitante" ? "/portal/recursos" : "/inventario/equipos";
}

export function urlHcdl(ruta: string) {
  return new URL(ruta, process.env.HCDL_API_URL || "http://127.0.0.1:3001");
}

export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const cookie = (await cookies()).get("hcdl_local");
  if (!cookie) return null;
  try {
    const respuesta = await fetch(urlHcdl("/api/sesion"), {
      headers: { Cookie: `hcdl_local=${cookie.value}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (respuesta.status === 401) return null;
    if (respuesta.ok) return await respuesta.json();
  } catch {
    // Keep protected pages closed while the API is unavailable.
  }
  throw new Error("No se pudo comprobar la sesión. Revisa que la API de HCDL esté en ejecución.");
});
