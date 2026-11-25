"use client";

import { useEffect, useRef } from "react";
import { Icono, IconoEstado } from "./EquipoDetalleModal";

export type Movil = {
  id: number;
  nombre: string;
  tipo: string;
  marca: string;
  serie: string;
  estado: string;
  usuario: string | null;
  sector: string;
  visible: boolean;
  imei1: string;
  imei2: string;
  compania: string;
  convenio: string;
  plan: string;
  numero: string;
  accesorios: string;
};

export function IconoMovil({
  className = "h-7 w-7",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M10 5h4M11 19h2" />
    </svg>
  );
}

function Bloque({
  titulo,
  filas,
  sim = false,
}: {
  titulo: string;
  filas: [string, string][];
  sim?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-outline bg-background">
      <h3 className="flex items-center gap-3 bg-[#E9E3D3] px-3 py-2 text-xl font-bold text-ink">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5A3835] text-background">
          {sim ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
              className="h-6 w-6"
            >
              <path d="M5 2h9l5 5v15H5V2Z" />
              <path d="M8 11h8v8H8zM12 11v8M8 15h8" />
            </svg>
          ) : (
            <Icono nombre="identificador" className="h-6 w-6" />
          )}
        </span>
        {titulo}
      </h3>

      <dl className="divide-y divide-surface px-4">
        {filas.map(([etiqueta, valor]) => (
          <div
            key={etiqueta}
            className="grid grid-cols-[20px_minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 py-4 text-sm"
          >
            <span className="text-brand-dark">
              <Icono
                nombre={sim ? "red" : "identificador"}
                className="h-5 w-5"
              />
            </span>

            <dt className="font-medium">{etiqueta}</dt>

            <dd className="min-w-0 break-words text-xs text-ink-muted">
              {valor || "No registrado"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function MovilDetalleModal({
  movil,
  onClose,
}: {
  movil: Movil;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const overflowAnterior = document.body.style.overflow;

    if (dialog && !dialog.open) dialog.showModal();

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="titulo-detalle-movil"
      onClose={onClose}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-xl border border-outline bg-surface-muted p-0 text-ink shadow-xl backdrop:bg-[#5A3835]/60"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between bg-brand-dark px-4 py-3 text-surface">
        <h2
          id="titulo-detalle-movil"
          className="flex items-center gap-2 font-semibold"
        >
          <Icono nombre="detalle" />
          Detalles del móvil
        </h2>

        <button
          type="button"
          autoFocus
          onClick={() => dialogRef.current?.close()}
          aria-label="Cerrar detalles del móvil"
          className="rounded-full p-2 hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-surface"
        >
          <Icono nombre="cerrar" />
        </button>
      </header>

      <div className="space-y-3 p-3">
        <section className="flex items-center gap-4 rounded-lg border border-[#9CCBD4] bg-brand-light p-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
            <IconoMovil className="h-10 w-10" />
          </span>

          <div className="min-w-0 flex-1 border-l border-outline pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="break-words text-2xl font-bold text-brand-dark">
                  {movil.nombre}
                </h3>
                <p className="text-brand-medium">{movil.marca}</p>
              </div>

              <span className="rounded-full border border-[#6EB3C5] bg-[#84BDCB] px-3 py-1 text-xs font-bold text-brand-dark">
                {movil.visible ? "● Visible" : "● Oculto"}
              </span>
            </div>

            <p className="mt-3 text-right text-sm text-brand-dark">
              <span className="mr-2 text-base font-bold">Usuario</span>
              {movil.usuario ?? "Sin usuario"}
            </p>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Bloque
            titulo="Identificadores"
            filas={[
              ["Serial Number", movil.serie],
              ["IMEI 1", movil.imei1],
              ["IMEI 2", movil.imei2],
            ]}
          />

          <Bloque
            titulo="Tarjeta SIM"
            sim
            filas={[
              ["Compañía", movil.compania],
              ["Convenio", movil.convenio],
              ["Plan", movil.plan],
              ["Número", movil.numero],
            ]}
          />

          <section className="flex items-center gap-3 rounded-lg border border-outline bg-[#E9E3D3] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5A3835] text-background">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path d="M8 2v5M16 2v5M5 7h14v3a7 7 0 0 1-14 0V7ZM12 17v5" />
              </svg>
            </span>

            <div className="min-w-0">
              <h3 className="text-lg font-bold">Accesorios</h3>
              <p className="break-words text-sm text-ink-muted">
                {movil.accesorios || "No registrados"}
              </p>
            </div>
          </section>

          <section
            aria-label={`Estado: ${movil.estado}`}
            className={`flex items-center gap-3 rounded-lg border border-[#9CCBD4] bg-brand-light p-3 ${
              movil.estado === "Dañado"
                ? "text-accent-dark"
                : "text-brand-dark"
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-background ${
                movil.estado === "Dañado"
                  ? "bg-accent-dark"
                  : "bg-brand-dark"
              }`}
            >
              <IconoEstado estado={movil.estado} className="h-8 w-8" />
            </span>

            <p className="border-l border-outline pl-3 text-2xl font-bold">
              {movil.estado}
            </p>
          </section>
        </div>
      </div>
    </dialog>
  );
}