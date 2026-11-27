"use client";

import Image from "next/image";
import { useId, useState, type ReactNode } from "react";

export const campoAcceso =
  "min-h-12 w-full rounded-lg border border-[#9CCBD4] bg-white px-3 py-2.5 text-base text-brand-dark " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:opacity-65";

export const botonAcceso =
  "min-h-12 w-full rounded-lg bg-brand-dark px-4 py-3 text-sm font-bold text-white transition-colors " +
  "enabled:hover:bg-accent enabled:hover:text-ink focus-visible:bg-accent focus-visible:text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:opacity-65";

export function TarjetaAcceso({ titulo, accion, children }: { titulo: string; accion?: ReactNode; children: ReactNode }) {
  const tituloId = useId();
  return (
    <main className="grid min-h-0 flex-1 overflow-auto bg-background px-4 py-6 text-ink sm:px-6 sm:py-10">
      <section aria-labelledby={tituloId}
        className="m-auto w-full max-w-[28rem] overflow-hidden rounded-2xl border border-outline bg-surface shadow-lg shadow-ink/10">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-brand-dark px-5 py-6 text-white sm:gap-5 sm:px-8">
          <h1 id={tituloId} className="text-left text-xl font-bold leading-tight wrap-anywhere sm:text-2xl">{titulo}</h1>
          <Image src="/logo.png" alt="Hotel Cabaña del Lago" width={68} height={68}
            className="rounded-full border border-white/65" priority />
          {accion && <div className="col-span-2 justify-self-end">{accion}</div>}
        </header>
        {children}
      </section>
    </main>
  );
}

export function CampoClaveAcceso({ etiqueta, nombre, autocompletar, descripcion, deshabilitado }: {
  etiqueta: string;
  nombre: string;
  autocompletar: "current-password" | "new-password";
  descripcion?: string;
  deshabilitado: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid min-w-0 gap-1.5 text-sm text-brand-dark">
      <label htmlFor={id} className="font-semibold">{etiqueta}</label>
      <div className="relative">
        <input id={id} className={campoAcceso + " pr-14"} type={visible ? "text" : "password"}
          name={nombre} autoComplete={autocompletar} autoCapitalize="none" spellCheck={false}
          aria-describedby={descripcion} required disabled={deshabilitado} />
        <button type="button" aria-controls={id} disabled={deshabilitado}
          aria-label={`${visible ? "Ocultar" : "Mostrar"} ${etiqueta.toLowerCase()}`}
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-0.5 my-0.5 grid w-11 place-items-center rounded-md enabled:hover:bg-brand-pale focus-visible:outline-2 focus-visible:outline-brand-dark disabled:opacity-65">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
            <circle cx="12" cy="12" r="2.8" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ErrorAcceso({ mensaje }: { mensaje: string }) {
  return mensaje ? (
    <p role="alert" className="rounded-lg border border-[#E7B8A9] bg-[#FFF4EF] px-3 py-2.5 text-sm text-[#872E21]">
      {mensaje}
    </p>
  ) : null;
}
