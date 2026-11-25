export type Pagina<T> = { datos: T[]; pagina: number; porPagina: number; total: number; marcas?: string[] };
export type Recurso = {
  id: number; nombre: string; categoria: "equipo" | "movil" | "periferico" | "impresora" | "iot";
  serie: string | null; marca: string | null; tipo: string | null; estado: string;
  sector: string | null; usuario: string | null; usuarioId: number | null; ficha: Record<string, unknown>;
};

export async function apiHcdl<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const resultado = await fetch(`/api/hcdl/${ruta}`, { cache: "no-store", ...opciones });
  const datos = await resultado.json();
  if (!resultado.ok) throw new Error(datos.error || "No se pudo completar la operación.");
  return datos;
}

export function enviarHcdl<T>(ruta: string, datos: unknown, method = "POST") {
  return apiHcdl<T>(ruta, { method, body: JSON.stringify(datos), headers: { "Content-Type": "application/json" } });
}

export async function listarHcdl<T>(ruta: string, signal?: AbortSignal) {
  const registros: T[] = [];
  const separador = ruta.includes("?") ? "&" : "?";
  for (let pagina = 1; ; pagina++) {
    const { datos, total, porPagina } = await apiHcdl<Pagina<T>>(
      `${ruta}${separador}porPagina=100&pagina=${pagina}`, { signal },
    );
    registros.push(...datos);
    if (pagina * porPagina >= total) return registros;
  }
}

export const mensajeHcdl = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la operación.";
