"use client";

import { useEffect, useRef, useState } from "react";
import { useConsultaInventario } from "@/lib/use-consulta-inventario";
import { Icono } from "./EquipoDetalleModal";

type TipoMovimiento = "Entrega" | "Devolucion" | "Atencion" | "Suministro";

export type EventoHistorial = {
  id: string | number;
  fecha: string;
  tipo: TipoMovimiento;
  usuario?: string;
  descripcion?: string;
  responsable?: string;
};

type Props = {
  equipo: {
    nombre: string;
    serie: string;
    tipo?: string;
  };
  eventos?: EventoHistorial[];
  recursoId?: number;
  onClose: () => void;
};

function IconoMovimiento({ tipo }: { tipo: TipoMovimiento }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-9 w-9"
    >
      {tipo === "Entrega" ? (
        <>
          <path d="M5 8 2 11v11h20V11l-3-3" />
          <path d="M5 13V2h14v11M2 11l10 8 10-8" />
          <path d="m8 8 3 3 5-5" />
        </>
      ) : tipo === "Devolucion" ? (
        <>
          <path d="M4 7a9 9 0 0 1 15-2M4 2v5h5" />
          <path d="M20 17a9 9 0 0 1-15 2M20 22v-5h-5" />
          <path d="M8 7h8v10H8zM10 10h4M10 13h3" />
        </>
      ) : (
        <>
          <path d="M14 6a5 5 0 0 0-6 6L2 18a3 3 0 0 0 4 4l6-6a5 5 0 0 0 6-6l-4 3-3-3 3-4Z" />
          <path d="m15 3 6 6M17 1l6 6" />
        </>
      )}
    </svg>
  );
}

function formatearFecha(fecha: string) {
  const fechaSimple = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);

  if (fechaSimple) {
    return `${fechaSimple[3]}-${fechaSimple[2]}-${fechaSimple[1]}`;
  }

  const valor = new Date(fecha);

  return Number.isNaN(valor.getTime())
    ? fecha
    : new Intl.DateTimeFormat("es-CL", {
        dateStyle: "short",
        timeZone: "America/Santiago",
      }).format(valor);
}

export default function HistorialEquipoModal({
  equipo,
  eventos = [],
  recursoId,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const overflowAnterior = document.body.style.overflow;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="titulo-historial"
      aria-describedby="descripcion-historial"
      onClose={onClose}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto border-2 border-[#9CCBD4] bg-surface-muted p-0 text-ink shadow-xl backdrop:bg-[#5A3835]/60"
    >
      <div className="p-3 sm:p-4">
        <header className="flex items-start gap-3 border-b border-[#998D8B] pb-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-dark text-background">
            <Icono nombre="historial" className="h-9 w-9" />
          </span>

          <div className="min-w-0 flex-1 pt-1">
            <h2
              id="titulo-historial"
              className="text-xl font-bold text-ink"
            >
              Historial
            </h2>

            <p
              id="descripcion-historial"
              className="text-xs text-ink-muted"
            >
              Movimientos del recurso, cambios de usuario y atenciones
              de soporte.
            </p>
          </div>

          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar historial"
            className="rounded-md p-1 text-ink transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-brand-dark"
          >
            <Icono nombre="cerrar" className="h-8 w-8" />
          </button>
        </header>

        <MovimientosRecurso equipo={equipo} eventos={eventos} recursoId={recursoId} />
      </div>
    </dialog>
  );
}

export function MovimientosRecurso({ equipo, eventos = [], recursoId }: Pick<Props, "equipo" | "eventos" | "recursoId">) {
  const [cantidadVisible, setCantidadVisible] = useState(4);
  const { datos, cargando, error } = useConsultaInventario<{ datos: EventoHistorial[] }>(
    recursoId === undefined ? null : `recursos/${recursoId}/historial`,
  );
  const movimientos = datos?.datos ?? eventos;
  const eventosVisibles = movimientos.slice(0, cantidadVisible);
  const hayMas = cantidadVisible < movimientos.length;

  if (cargando) return <p role="status" className="py-8 text-center">Cargando historial…</p>;
  if (error) return <p role="alert" className="py-8 text-center">{error}</p>;

  return (
    <>
      {movimientos.length === 0 ? (
      <p className="py-12 text-center text-sm text-ink-muted">
        No hay movimientos registrados para este recurso.
      </p>
    ) : (
      <ol
        aria-label={`Movimientos de ${equipo.nombre}`}
        className="mt-4 space-y-3"
      >
        {eventosVisibles.map((evento) => {
            const esAtencion = evento.tipo === "Atencion" || evento.tipo === "Suministro";

          return (
            <li
              key={evento.id}
              className={`flex items-center gap-3 rounded-lg border-2 p-3 ${
                esAtencion
                  ? "border-accent bg-outline text-accent-dark"
                  : "border-[#9CCBD4] bg-brand-light text-brand-dark"
              }`}
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
                  esAtencion
                    ? "bg-accent text-accent-dark"
                    : "bg-brand-pale text-brand-dark"
                }`}
              >
                <IconoMovimiento tipo={evento.tipo} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold leading-tight">
                  {evento.tipo === "Entrega"
                    ? "Entregado"
                    : evento.tipo === "Devolucion"
                      ? "Devuelto"
                      : evento.tipo === "Suministro" ? "Cambio de suministro" : "Atención de soporte"}

                  {!esAtencion && evento.usuario && (
                    <>
                      <span className="mx-1 text-xs font-normal">
                        {evento.tipo === "Entrega" ? "a" : "por"}
                      </span>

                      <span className="break-words text-base">
                        {evento.usuario}
                      </span>
                    </>
                  )}
                </p>

                <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 leading-tight">
                  <span className="text-xs">
                    {equipo.tipo || "Equipo"}
                  </span>

                  <span className="break-words text-lg font-bold">
                    {equipo.nombre}
                  </span>
                </p>

                <p className="mt-2 text-[11px]">
                  <span className="mr-2 font-bold">Fecha</span>
                  {formatearFecha(evento.fecha)}
                </p>

                {evento.descripcion && (
                  <p className="mt-1 break-words text-xs">
                    {evento.descripcion}
                  </p>
                )}

                {evento.responsable && (
                  <p className="mt-1 text-[11px]">
                    Responsable: {evento.responsable}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    )}

    {hayMas && (
      <button
        type="button"
        onClick={() => setCantidadVisible((actual) => actual + 4)}
        aria-label="Mostrar más movimientos"
        className="mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-dark text-background transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-10 w-10"
        >
          <path d="m5 9 7 7 7-7" />
        </svg>
      </button>
    )}
    </>
  );
}
