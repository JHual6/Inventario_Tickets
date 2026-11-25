"use client";

import { useEffect, useRef } from "react";
import { Icono } from "./EquipoDetalleModal";

type ImpresoraDetalle = {
  nombre: string;
  marca: string;
  area: string;
  estado: string;
  ip: string;
  serie: string;
  visible: boolean;
  accesoWeb: boolean;
  urlWeb?: string;
};

function IconoImpresora() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-10 w-10"
    >
      <path d="M6 8V2h12v6M6 17H3V8h18v9h-3" />
      <path d="M6 14h12v8H6zM9 17h6M9 19h6M17 11h.01" />
    </svg>
  );
}

function EstadoIcono({
  estado,
}: {
  estado: ImpresoraDetalle["estado"];
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-7 w-7"
    >
      {estado === "Activo" ? (
        <path d="m5 12 4 4L19 6" />
      ) : estado === "Dañado" ? (
        <>
          <path d="m12 3 10 18H2L12 3Z" />
          <path d="M12 9v5M12 17h.01" />
        </>
      ) : (
        <>
          <path d="M12 2v10" />
          <path d="M6 5a9 9 0 1 0 12 0" />
        </>
      )}
    </svg>
  );
}

export default function DetalleImpresora({
  impresora,
  onClose,
}: {
  impresora: ImpresoraDetalle;
  onClose: () => void;
}) {
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

  let enlaceWeb: string | null = null;

  if (impresora.accesoWeb && impresora.urlWeb) {
    try {
      const url = new URL(impresora.urlWeb);

      if (url.protocol === "http:" || url.protocol === "https:") {
        enlaceWeb = url.href;
      }
    } catch {
      enlaceWeb = null;
    }
  }

  const bloqueEstado = (
    <section
      aria-label={`Estado: ${impresora.estado}`}
      className={`flex items-center gap-3 rounded-lg border border-[#9CCBD4] bg-brand-light px-3 py-3 ${
        impresora.estado === "Dañado"
          ? "text-accent-dark"
          : impresora.estado === "Inactivo"
            ? "text-ink"
            : "text-brand-dark"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-background ${
          impresora.estado === "Dañado"
            ? "bg-accent-dark"
            : impresora.estado === "Inactivo"
              ? "bg-[#5A3835]"
              : "bg-brand-dark"
        }`}
      >
        <EstadoIcono estado={impresora.estado} />
      </span>

      <p className="border-l border-outline pl-3 text-2xl font-bold">
        {impresora.estado === "Activo"
          ? "Activa"
          : impresora.estado === "Inactivo"
            ? "Inactiva"
            : "Dañada"}
      </p>
    </section>
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="titulo-detalle-impresora"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl border border-outline bg-surface-muted p-0 text-ink shadow-xl backdrop:bg-[#5A3835]/60"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-brand-dark px-4 py-3 text-surface">
        <h2
          id="titulo-detalle-impresora"
          className="flex items-center gap-2 font-semibold"
        >
          <Icono nombre="detalle" />
          Detalles de la impresora
        </h2>

        <button
          type="button"
          autoFocus
          onClick={() => dialogRef.current?.close()}
          aria-label="Cerrar detalles de la impresora"
          className="rounded-full p-2 transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-surface"
        >
          <Icono nombre="cerrar" />
        </button>
      </header>

      <div className="space-y-3 p-3">
        {/* Información principal */}
        <section className="flex items-center gap-3 rounded-lg border border-[#9CCBD4] bg-brand-light p-3">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand-dark">
            <IconoImpresora />
          </span>

          <div className="min-w-0 flex-1 border-l border-outline pl-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="break-words text-xl font-bold text-brand-dark">
                  {impresora.nombre}
                </h3>

                <p className="text-sm text-brand-medium">
                  {impresora.marca}
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6EB3C5] bg-[#84BDCB] px-3 py-1 text-xs font-bold text-brand-dark">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-brand-dark"
                />
                {impresora.visible ? "Visible" : "Oculta"}
              </span>
            </div>

            <p className="mt-2 text-right text-sm text-brand-dark">
              <span className="mr-2 font-bold">Sector</span>
              {impresora.area}
            </p>
          </div>
        </section>

        <div className="grid items-stretch gap-3 sm:grid-cols-2">
          {/* Columna izquierda */}
          <div className="flex min-w-0 flex-col gap-3">
            <section className="overflow-hidden rounded-lg border border-outline bg-background">
              <h3 className="flex items-center gap-2 bg-[#E9E3D3] px-3 py-2 text-lg font-bold text-ink">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5A3835] text-background">
                  <Icono nombre="red" />
                </span>

                <span className="flex-1">Acceso Web</span>

                <span
                  aria-label={
                    impresora.accesoWeb
                      ? "Cuenta con acceso web"
                      : "No cuenta con acceso web"
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5A3835] text-background"
                >
                  <Icono
                    nombre={impresora.accesoWeb ? "check" : "cerrar"}
                    className="h-4 w-4"
                  />
                </span>
              </h3>

              {impresora.accesoWeb && (
                <dl className="divide-y divide-surface px-3">
                  <div className="grid grid-cols-[20px_1fr_1.2fr] items-center gap-2 py-4">
                    <span className="text-brand-dark">
                      <Icono nombre="red" className="h-5 w-5" />
                    </span>

                    <dt className="text-sm">Acceso Web</dt>

                    <dd className="min-w-0 break-words text-xs">
                      {enlaceWeb ? (
                        <a
                          href={enlaceWeb}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-brand-dark underline underline-offset-2"
                        >
                          Abrir administración web
                        </a>
                      ) : (
                        <span className="text-ink-muted">
                          URL no registrada o inválida
                        </span>
                      )}
                    </dd>
                  </div>

                  <div className="grid grid-cols-[20px_1fr_1.2fr] items-center gap-2 py-4">
                    <span className="text-brand-dark">
                      <Icono nombre="escudo" className="h-5 w-5" />
                    </span>

                    <dt className="text-sm">Contraseña</dt>

                    <dd className="text-xs text-ink-muted">
                      No registrada
                    </dd>
                  </div>
                </dl>
              )}
            </section>

            {!impresora.accesoWeb && bloqueEstado}
          </div>

          {/* Columna derecha */}
          <section className="h-full overflow-hidden rounded-lg border border-outline bg-background">
            <h3 className="flex items-center gap-2 bg-[#E9E3D3] px-3 py-2 text-lg font-bold text-ink">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5A3835] text-background">
                <Icono nombre="identificador" />
              </span>
              Identificadores
            </h3>

            <dl className="divide-y divide-surface px-3">
              <div className="grid grid-cols-[20px_1fr_1.2fr] items-center gap-2 py-4">
                <span className="text-brand-dark">
                  <Icono nombre="red" className="h-5 w-5" />
                </span>

                <dt className="text-sm">Dirección IP</dt>

                <dd className="min-w-0 break-all text-xs text-ink-muted">
                  {impresora.ip || "No registrada"}
                </dd>
              </div>

              <div className="grid grid-cols-[20px_1fr_1.2fr] items-center gap-2 py-4">
                <span className="text-brand-dark">
                  <Icono nombre="identificador" className="h-5 w-5" />
                </span>

                <dt className="text-sm">Serial Number</dt>

                <dd className="min-w-0 break-all text-xs text-ink-muted">
                  {impresora.serie}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        {impresora.accesoWeb && bloqueEstado}
      </div>
    </dialog>
  );
}