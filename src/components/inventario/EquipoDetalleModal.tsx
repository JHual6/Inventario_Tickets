"use client";

import { useEffect, useRef } from "react";

const trazos = {
  equipo: "M4 3h16v13H4z M4 16l-3 4h22l-3-4",
  detalle: "M14 3H4v18h10 M8 7h3 M8 11h3 M19 17l3 4",
  historial: "M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2",
  ticket: "M3 4h18v5a3 3 0 0 0 0 6v5H3v-5a3 3 0 0 0 0-6z",
  software: "M3 3h18v14H3z M8 21h8 M12 17v4",
  hardware: "M6 6h12v12H6z M9 9h6v6H9z M9 2v4 M15 2v4 M9 18v4 M15 18v4 M2 9h4 M2 15h4 M18 9h4 M18 15h4",
  wifi: "M2 8a16 16 0 0 1 20 0 M5 12a11 11 0 0 1 14 0 M9 16a5 5 0 0 1 6 0 M12 20h.01",
  red: "M8 2h8v6H8z M12 8v5 M4 13h16 M4 13v3 M20 13v3 M1 16h6v6H1z M17 16h6v6h-6z",
  identificador: "M3 3h18v18H3z M7 7v10 M10 7v10 M14 7v10 M17 7v10",
  escudo: "M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6",
  memoria: "M2 7h20v10H2z M6 10v4 M10 10v4 M14 10v4 M18 10v4 M5 17v3 M9 17v3 M13 17v3 M17 17v3",
  disco: "M5 3h14l3 14v4H2v-4z M2 17h20 M16 19h.01 M19 19h.01",
  check: "M4 12l5 5L20 6",
  cerrar: "M6 6l12 12 M18 6 6 18",
  danado:
  "M12 3 2 21h20L12 3Z M12 9v5 M12 17h.01",
  disponible:
  "M12 3a9 9 0 1 0 9 9 M12 7v5l-3 2 M16 5l2 2 4-4",
  reservado:
  "M6 3h12v18l-6-4-6 4V3Z",
};

export type NombreIcono = keyof typeof trazos;

export function Icono({
  nombre,
  className = "h-5 w-5",
}: {
  nombre: NombreIcono;
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
      <path d={trazos[nombre]} />
    </svg>
  );
}

export function IconoEstado({
  estado,
  className = "h-6 w-6",
}: {
  estado: string;
  className?: string;
}) {
  const iconos: Record<string, NombreIcono> = {
    Asignado: "check",
    Disponible: "disponible",
    Reservado: "reservado",
    Dañado: "danado",
  };

  return (
    <Icono
      nombre={iconos[estado] ?? "equipo"}
      className={className}
    />
  );
}

type EquipoDetalle = {
  nombre: string;
  tipo: string;
  marca: string;
  serie: string;
  estado: string;
  usuario: string | null;
  sector: string;
  procesador: string;
  ram: string;
  almacenamiento: string;
  sistemaOperativo: string;
  nombreSistema?: string;
  antivirus?: string;
  office?: string;
  tarjetaVideo?: string;
  tarjetaWifi?: string;
  tarjetaEthernet?: string;
  macWifi?: string;
  macEthernet?: string;
  ip?: string;
  visible?: boolean;
  fechaRevision?: string;
};

type Fila = {
  etiqueta: string;
  valor?: string;
  icono: NombreIcono;
};

function Seccion({
  titulo,
  icono,
  filas,
}: {
  titulo: string;
  icono: NombreIcono;
  filas: Fila[];
}) {
  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-outline bg-background">
      <h3 className="flex items-center gap-3 bg-[#E9E3D3] px-3 py-2 text-xl font-bold text-ink">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5A3835] text-background">
          <Icono nombre={icono} className="h-6 w-6" />
        </span>

        {titulo}
      </h3>

      <dl className="flex flex-1 flex-col justify-evenly px-3 py-1">
        {filas.map((fila) => (
          <div
            key={fila.etiqueta}
            className="grid grid-cols-[22px_minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-2 border-b border-surface py-3 text-xs last:border-b-0"
          >
            <span className="text-brand-dark">
              <Icono nombre={fila.icono} className="h-5 w-5" />
            </span>

            <dt className="min-w-0 font-medium text-ink">
              {fila.etiqueta}
            </dt>

            <dd className="min-w-0 break-words text-[11px] text-ink-muted">
              {fila.valor?.trim() || "No registrado"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function EquipoDetalleModal({
  equipo,
  onClose,
}: {
  equipo: EquipoDetalle;
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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="titulo-detalle-equipo"
      onClose={onClose}
      className="fixed inset-0 m-auto max-h-[100dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto rounded-2xl border border-outline bg-surface p-0 text-ink shadow-xl backdrop:bg-[#5A3835]/60"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-brand-dark px-5 py-3 text-surface">
        <h2
          id="titulo-detalle-equipo"
          className="flex items-center gap-2 font-semibold"
        >
          <Icono nombre="detalle" />
          Detalles del equipo
        </h2>

        <button
          type="button"
          autoFocus
          onClick={() => dialogRef.current?.close()}
          aria-label="Cerrar detalles del equipo"
          className="rounded-full p-2 hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-surface"
        >
          <Icono nombre="cerrar" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <section className="rounded-lg border border-[#9CCBD4] bg-brand-light p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-pale text-brand-dark sm:h-20 sm:w-20">
              <Icono nombre="equipo" className="h-10 w-10" />
            </span>

            <div className="min-w-0 flex-1 border-l border-outline pl-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold leading-tight text-brand-dark sm:text-2xl">
                    {equipo.nombre}
                  </h3>

                  <p className="text-sm text-brand-medium">
                    {equipo.tipo}
                  </p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#6EB3C5] bg-[#84BDCB] px-3 py-1 text-xs font-bold text-brand-dark">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-brand-dark"
                  />

                  {equipo.visible === undefined
                    ? "Sin información"
                    : equipo.visible
                      ? "Visible"
                      : "Oculto"}
                </span>
              </div>
                  
              <dl className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                  <dt className="text-[10px] font-semibold text-brand-dark">
                    Nombre Sistema
                  </dt>
                  
                  <dd className="break-all text-[10px] text-brand-dark">
                    {equipo.nombreSistema || "No registrado"}
                  </dd>
                </div>
                  
                <div className="ml-auto flex min-w-0 flex-wrap items-baseline justify-end gap-2 text-right">
                  <dt className="text-base font-bold text-brand-dark">
                    Usuario
                  </dt>
                  
                  <dd className="break-words text-sm text-brand-dark">
                    {equipo.usuario ?? "Sin usuario"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2">
          <Seccion
            titulo="Software"
            icono="software"
            filas={[
              {
                etiqueta: "Sistema operativo",
                valor: equipo.sistemaOperativo,
                icono: "software",
              },
              {
                etiqueta: "Antivirus",
                valor: equipo.antivirus,
                icono: "escudo",
              },
              {
                etiqueta: "Office",
                valor: equipo.office,
                icono: "software",
              },
            ]}
          />

          <Seccion
            titulo="Hardware"
            icono="hardware"
            filas={[
              { etiqueta: "RAM", valor: equipo.ram, icono: "memoria" },
              {
                etiqueta: "Almacenamiento",
                valor: equipo.almacenamiento,
                icono: "disco",
              },
              {
                etiqueta: "Tarjeta de video",
                valor: equipo.tarjetaVideo,
                icono: "hardware",
              },
              {
                etiqueta: "Procesador",
                valor: equipo.procesador,
                icono: "hardware",
              },
            ]}
          />

          <Seccion
            titulo="Conectividad"
            icono="wifi"
            filas={[
              {
                etiqueta: "WiFi",
                valor: equipo.tarjetaWifi,
                icono: "wifi",
              },
              {
                etiqueta: "Ethernet",
                valor: equipo.tarjetaEthernet,
                icono: "red",
              },
            ]}
          />

          <Seccion
            titulo="Identificadores"
            icono="identificador"
            filas={[
              {
                etiqueta: "Dirección MAC WiFi",
                valor: equipo.macWifi,
                icono: "wifi",
              },
              {
                etiqueta: "Dirección MAC Ethernet",
                valor: equipo.macEthernet,
                icono: "red",
              },
              {
                etiqueta: "Dirección IP",
                valor: equipo.ip,
                icono: "red",
              },
              {
                etiqueta: "Número de serie",
                valor: equipo.serie,
                icono: "identificador",
              },
            ]}
          />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#9CCBD4] bg-brand-light px-4 py-3">
          <div
            className={`flex items-center gap-3 ${
              equipo.estado === "Dañado"
                ? "text-accent-dark"
                : "text-brand-dark"
            }`}
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-background ${
                equipo.estado === "Dañado"
                  ? "bg-accent-dark"
                  : "bg-brand-dark"
              }`}
            >
              <IconoEstado
                estado={equipo.estado}
                className="h-8 w-8"
              />
            </span>
            
            <p className="border-l border-outline pl-3 text-2xl font-bold sm:text-3xl">
              {equipo.estado}
            </p>
          </div>
            
          <div className="ml-auto text-right">
            <p className="text-sm font-bold text-brand-dark">
              Fecha de revisión
            </p>
            <p className="text-sm text-brand-medium">
              {equipo.fechaRevision || "No registrada"}
            </p>
          </div>
        </footer>
      </div>
    </dialog>
  );
}