"use client";

import { useConsultaInventario } from "@/lib/use-consulta-inventario";
import { useEffect, useRef, useState } from "react";
import { Icono } from "./EquipoDetalleModal";

export type Suministro = {
  id: number;
  nombre: string;
  tipo: "Tóner" | "Tinta" | "Tambor";
  marca: string;
  descripcion: string;
  stock: number;
  stockMinimo: number;
  visible: boolean;
};

export type MovimientoSuministro = {
  id: string | number;
  motivo?: string | null;
  fecha: string;
  impresora: string;
  sector: string | null;
  cantidad: number;
  responsable: string;
};

export type ImpresoraCompatible = {
  id: number;
  marca: string;
  modelo: string;
  sector: string | null;
};

const formatoMovimiento = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago",
});

export function estadoStock(item: Suministro) {
  if (item.stock === 0) return "Sin stock";
  if (item.stock <= item.stockMinimo) return "Poco stock";
  return "Disponible";
}

export function IconoSuministro({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m4 8 12-5 5 5-12 5-5-5ZM4 8v8l5 5 12-5V8M9 13v8" />
      <path d="m8 9 8-3M12 16l5-2" />
    </svg>
  );
}

export function IconoStock({
  estado,
}: {
  estado: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-6 w-6"
    >
      {estado === "Disponible" ? (
        <path d="m5 12 4 4L19 6" />
      ) : estado === "Poco stock" ? (
        <>
          <path d="m12 3 10 18H2L12 3Z" />
          <path d="M12 9v5M12 17h.01" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m6 6 12 12" />
        </>
      )}
    </svg>
  );
}

export default function SuministroModal({
  suministro,
  vista,
  onClose,
}: {
  suministro: Suministro;
  vista: "detalles" | "historial" | "compatibilidad";
  onClose: () => void;
}) {
  const { datos, cargando, error } = useConsultaInventario<{ datos: ImpresoraCompatible[] }>(
    vista === "compatibilidad" ? `suministros/${suministro.id}/compatibles` : null,
  );
  const compatibles = datos?.datos ?? [];
  const historial = useConsultaInventario<{ datos: MovimientoSuministro[] }>(
    vista === "historial" ? `suministros/${suministro.id}/historial` : null,
  );
  const movimientos = historial.datos?.datos ?? [];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [cantidadVisible, setCantidadVisible] = useState(4);
  const estado = estadoStock(suministro);
  const alerta = estado !== "Disponible";

  useEffect(() => {
    const dialog = dialogRef.current;
    const anterior = document.body.style.overflow;

    if (dialog && !dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="titulo-suministro"
      className={`fixed inset-0 m-auto max-h-[100dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl border-2 border-[#9CCBD4] bg-surface-muted p-0 text-ink shadow-xl backdrop:bg-[#5A3835]/60 ${
        vista === "detalles" ? "max-w-2xl" : "max-w-lg"
      }`}
    >
      <div className="p-4">
        <header className="flex items-center gap-3 border-b border-outline pb-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-dark text-background">
            <Icono
              nombre={vista === "detalles" ? "detalle" : "historial"}
              className="h-7 w-7"
            />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="titulo-suministro" className="text-xl font-bold">
              {vista === "detalles"
                ? "Detalles del suministro"
                : vista === "historial"
                  ? "Historial"
                  : "Impresoras compatibles"}
            </h2>

            {vista === "historial" && (
              <p className="text-xs text-ink-muted">
                Reposiciones del suministro en impresoras.
              </p>
            )}
          </div>

          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar modal"
            className="rounded-full p-2 hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-dark"
          >
            <Icono nombre="cerrar" className="h-7 w-7" />
          </button>
        </header>

        <section className="mt-3 flex items-center gap-3 rounded-lg border-2 border-[#998D8B] bg-[#E9E3D3] p-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#61453F] text-[#EFEADC]">
            <IconoSuministro />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="break-words text-xl font-bold text-[#5A3835]">
              {suministro.nombre}
            </h3>

            <p className="text-sm text-[#735956]">
              {suministro.tipo}
              <span className="mx-1">·</span>
              {suministro.marca}
            </p>
          </div>

          {vista === "detalles" && (
            <span className="rounded-full border border-[#5A3835] bg-[#61453F] px-3 py-1 text-xs font-bold text-[#EFEADC]">
              {suministro.visible ? "● Visible" : "● Oculto"}
            </span>
          )}
        </section>

          {vista === "compatibilidad" ? (
            <section
              aria-label="Impresoras compatibles"
              className="mt-3"
            >
              {cargando ? (
                <p role="status" className="py-8 text-center">Cargando impresoras…</p>
              ) : error ? (
                <p role="alert" className="py-8 text-center">{error}</p>
              ) : compatibles.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">
                  No hay compatibilidades registradas para este suministro.
                </p>
              ) : (
                <ul className="space-y-3">
                  {compatibles.map((impresora) => (
                    <li
                      key={impresora.id}
                      className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-center gap-2 rounded-lg border border-[#9CCBD4] bg-brand-light p-3 sm:gap-3"
                    >
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand-dark sm:size-11">
                          <Icono nombre="software" className="size-5 sm:size-7" />
                        </span>

                        <div className="min-w-0 wrap-anywhere">
                          <p className="text-base font-bold leading-tight text-brand-dark sm:text-lg">
                            {impresora.modelo}
                          </p>
                          {impresora.marca && (
                            <p className="mt-0.5 text-sm text-brand-medium">{impresora.marca}</p>
                          )}
                        </div>
                      </div>

                      <dl className="min-w-0 border-l border-brand-dark/25 pl-2 text-brand-dark wrap-anywhere sm:pl-3">
                        <dt className="text-xs font-semibold">Sector</dt>
                        <dd className="mt-0.5 text-sm">{impresora.sector || "Sin sector asignado"}</dd>
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : vista === "detalles" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <section className="overflow-hidden rounded-lg border border-outline bg-background">
              <h3 className="flex items-center gap-2 bg-[#E9E3D3] px-3 py-2 text-lg font-bold">
                <Icono nombre="identificador" />
                Descripción
              </h3>

              <p className="whitespace-pre-line break-words p-4 text-sm leading-relaxed text-ink-muted">
                {suministro.descripcion || "Sin descripción registrada."}
              </p>
            </section>

            <div className="space-y-3">
              <section className="overflow-hidden rounded-lg border border-outline bg-background">
                <h3 className="flex items-center gap-2 bg-[#E9E3D3] px-3 py-2 text-lg font-bold">
                  <Icono nombre="disco" />
                  Stock
                </h3>

                <dl className="space-y-3 p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt>Stock disponible</dt>
                    <dd className="font-bold text-brand-dark">
                      {suministro.stock}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-3">
                    <dt>Stock mínimo</dt>
                    <dd className="font-bold text-brand-dark">
                      {suministro.stockMinimo}
                    </dd>
                  </div>
                </dl>
              </section>

              <div
                className={`flex items-center gap-3 rounded-lg border border-[#9CCBD4] bg-brand-light p-3 font-bold ${
                  alerta ? "text-accent-dark" : "text-brand-dark"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
                    alerta ? "bg-accent-dark" : "bg-brand-dark"
                  }`}
                >
                  <IconoStock estado={estado} />
                </span>

                <p className="text-xl">
                  {estado === "Disponible" ? "Con stock" : estado}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {historial.cargando ? (
              <p role="status" className="py-8 text-center">Cargando historial…</p>
            ) : historial.error ? (
              <p role="alert" className="py-8 text-center">{historial.error}</p>
            ) : movimientos.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">
                No hay movimientos registrados para este suministro.
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {movimientos.slice(0, cantidadVisible).map((movimiento) => (
                  <li
                    key={movimiento.id}
                    className="flex items-center gap-3 rounded-lg border border-[#9CCBD4] bg-brand-light p-3"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
                      <Icono nombre="historial" className="h-8 w-8" />
                    </span>

                    <div className="min-w-0 text-brand-dark">
                      <p className="text-lg font-bold">
                        {movimiento.cantidad > 0 ? "Entrada de stock" : "Cambio de suministro"}
                        <span className="ml-2 text-xs font-normal">
                          {movimiento.sector}
                        </span>
                      </p>

                      <p className="break-words font-bold">
                        {movimiento.impresora}
                      </p>

                      <p className="mt-1 text-xs">
                        Fecha: {formatoMovimiento.format(new Date(movimiento.fecha))} · Cantidad:{" "}
                        {movimiento.cantidad}
                      </p>

                      <p className="mt-1 text-xs">Responsable: {movimiento.responsable}</p>
                      {movimiento.motivo && <p className="mt-1 text-xs">{movimiento.motivo}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {cantidadVisible < movimientos.length && (
              <button
                type="button"
                onClick={() => setCantidadVisible((valor) => valor + 4)}
                aria-label="Mostrar más reposiciones"
                className="mx-auto mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-dark text-background hover:bg-accent hover:text-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-8 w-8"
                >
                  <path d="m5 9 7 7 7-7" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}