"use client";

import { useCallback, useEffect, useState } from "react";
import { apiHcdl, mensajeHcdl, type Recurso } from "./api-hcdl";
import type { Suministro } from "@/components/inventario/SuministroModal";

export type RecursoTI = Recurso & { visible: boolean; sectorId: number | null; tieneClaveWeb: boolean };
type UsuarioTI = { id: number; nombre: string; cargo: string | null; correo: string | null;
  activo: boolean; visible: boolean; sectorId: number; sector: string };
type AsignacionTI = { id: number; recursoId: number; usuarioId: number; usuario: string;
  dispositivo: string; categoria: Recurso["categoria"]; serie: string | null; fechaAsignacion: string;
  fechaDevolucion: string | null; observacion: string | null; observacionDevolucion: string | null; tecnico: string };
type MovimientoTI = { id: string; suministroId: number; impresoraId: number | null; fecha: string;
  cantidad: number; motivo: string | null; tecnico: string; impresora: string | null };
type Catalogo = {
  recursos: RecursoTI[];
  usuarios: UsuarioTI[];
  sectores: { id: number; nombre: string }[];
  suministros: (Omit<Suministro, "marca" | "descripcion"> & { marca: string | null; descripcion: string | null })[];
  asignaciones: AsignacionTI[];
  compatibilidades: { suministroId: number; impresoraId: number }[];
  movimientos: MovimientoTI[];
  tickets: { abiertos: number; resueltos: number };
};

const vacio: Catalogo = {
  recursos: [], usuarios: [], sectores: [], suministros: [], asignaciones: [],
  compatibilidades: [], movimientos: [], tickets: { abiertos: 0, resueltos: 0 },
};

export const nombreCategoria: Record<Recurso["categoria"], string> = {
  equipo: "Equipo", movil: "Móvil", periferico: "Periférico", impresora: "Impresora", iot: "IoT",
};

export function fichaTexto(recurso: Pick<Recurso, "ficha">, ...claves: string[]) {
  for (const clave of claves) {
    const valor = recurso.ficha[clave];
    if (typeof valor === "string" && valor) return valor;
  }
  return "";
}

export function useCatalogoTI() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((actual) => actual + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    apiHcdl<Catalogo>("gestion", { signal: controller.signal }).then((datos) => {
      if (!controller.signal.aborted) {
        setCatalogo(datos);
        setError("");
      }
    }).catch((causa) => {
      if (!controller.signal.aborted) setError(mensajeHcdl(causa));
    });
    return () => controller.abort();
  }, [version]);

  return { catalogo: catalogo ?? vacio, cargando: !catalogo && !error, error, recargar };
}

export function suministrosVisibles(catalogo: Catalogo): Suministro[] {
  return catalogo.suministros.filter(({ visible }) => visible)
    .map((s) => ({ ...s, marca: s.marca ?? "", descripcion: s.descripcion ?? "" }));
}
