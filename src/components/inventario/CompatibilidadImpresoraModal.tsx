"use client";

import { useConsultaInventario } from "@/lib/use-consulta-inventario";
import { useEffect, useRef } from "react";
import { Icono } from "./EquipoDetalleModal";
import {
  IconoSuministro,
  estadoStock,
  type Suministro,
} from "./SuministroModal";

export default function CompatibilidadImpresoraModal({
  impresora,
  onClose,
}: {
  impresora: {
    id: number;
    nombre: string;
    marca: string;
    serie: string;
  };
  onClose: () => void;
}) {
  const { datos, cargando, error } = useConsultaInventario<{ datos: Suministro[] }>(`impresoras/${impresora.id}/compatibles`);
  const suministros = datos?.datos ?? [];
  const dialogRef = useRef<HTMLDialogElement>(null);

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
      aria-labelledby="titulo-compatibilidad-impresora"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border-2 border-[#9CCBD4] bg-surface-muted p-0 text-ink shadow-xl backdrop:bg-[#5A3835]/60"
    >
      <div className="p-4">
        <header className="flex items-center justify-between gap-3 border-b border-outline pb-3">
          <h2
            id="titulo-compatibilidad-impresora"
            className="text-xl font-bold"
          >
            Suministros compatibles
          </h2>

          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar suministros compatibles"
            className="rounded-full p-2 hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-dark"
          >
            <Icono nombre="cerrar" className="h-7 w-7" />
          </button>
        </header>

        {/* Impresora en azul */}
        <section className="mt-3 flex items-center gap-3 rounded-lg border-2 border-[#998D8B] bg-[#E9E3D3] p-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#61453F] text-[#EFEADC]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-9 w-9"
            >
              <path d="M6 8V2h12v6M6 17H3V8h18v9h-3" />
              <path d="M6 14h12v8H6zM9 17h6M9 19h6M17 11h.01" />
            </svg>
          </span>
        
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-xl font-bold text-[#5A3835]">
              {impresora.nombre}
            </h3>
        
            <p className="text-sm text-[#735956]">
              {impresora.marca}
            </p>
        
            <p className="mt-2 break-all text-xs text-[#735956]">
              <span className="mr-1 font-bold text-[#5A3835]">SN</span>
              {impresora.serie}
            </p>
          </div>
        </section>

        {/* Suministros en café */}
        {cargando ? (
          <p role="status" className="py-8 text-center">Cargando suministros…</p>
        ) : error ? (
          <p role="alert" className="py-8 text-center">{error}</p>
        ) : suministros.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            No hay suministros compatibles registrados para esta impresora.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {suministros.map((suministro) => {
              const estado = estadoStock(suministro);

              return (
                <li
                  key={suministro.id}
                  className="flex items-start gap-3 rounded-lg border-2 border-[#9CCBD4] bg-brand-light p-3"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
                    <IconoSuministro />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h3 className="break-words text-lg font-bold text-brand-dark">
                        {suministro.nombre}
                      </h3>

                      <span className="text-sm text-brand-medium">
                        {suministro.marca}
                      </span>
                    </div>

                    <p className="text-sm text-brand-medium">
                      {suministro.tipo}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-brand-dark">
                        <span className="mr-2 font-semibold">Stock</span>
                        {suministro.stock}
                      </p>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold text-white ${
                          estado === "Disponible"
                            ? "bg-brand-dark"
                            : "bg-[#B95710]"
                        }`}
                      >
                        {estado}
                      </span>
                    </div>
                    
                    <p className="mt-2 whitespace-pre-line break-words text-xs text-brand-dark">
                      {suministro.descripcion || "Sin descripción registrada."}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
}