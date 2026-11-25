"use client";

import { useEffect, useState } from "react";
import { apiHcdl, listarHcdl, mensajeHcdl, type Pagina } from "./api-hcdl";

const leer = <T>(ruta: string, signal: AbortSignal) => apiHcdl<T>(ruta, { signal });

export function useConsultaInventario<T>(
  ruta: string | null,
  cargar: (ruta: string, signal: AbortSignal) => Promise<T> = leer,
) {
  const [resultado, setResultado] = useState<{ ruta: string; datos?: T; error?: string } | null>(null);

  useEffect(() => {
    if (!ruta) return;
    const controlador = new AbortController();
    cargar(ruta, controlador.signal)
      .then((datos) => {
        if (!controlador.signal.aborted) setResultado({ ruta, datos });
      })
      .catch((causa) => {
        if (!controlador.signal.aborted) setResultado({ ruta, error: mensajeHcdl(causa) });
      });
    return () => controlador.abort();
  }, [ruta, cargar]);

  const actual = resultado?.ruta === ruta ? resultado : null;
  return { datos: actual?.datos, error: actual?.error, cargando: Boolean(ruta && !actual) };
}

export function useIdsFiltrados(ruta: "recursos" | "suministros", filtros: Record<string, string>, categoria?: string) {
  const parametros = Object.entries(filtros).filter(([, valor]) => valor.trim());
  const consulta = new URLSearchParams(parametros);
  if (categoria) consulta.set("categoria", categoria);
  const { datos, cargando, error } = useConsultaInventario<{ id: number }[]>(
    parametros.length ? `${ruta}?${consulta}` : null, listarHcdl,
  );
  const ids = datos ? new Set(datos.map(({ id }) => id)) : null;
  return { ids, cargando, error, hayFiltros: parametros.length > 0 };
}

export function useDetalleInventario<T>(ruta: "recursos" | "suministros" | "usuarios", id?: number) {
  const consulta = useConsultaInventario<Pagina<T>>(id === undefined ? null : `${ruta}?id=${id}`);
  return { ...consulta, registro: consulta.datos?.datos[0] };
}
