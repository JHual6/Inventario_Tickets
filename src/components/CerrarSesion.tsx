"use client";

import { useState } from "react";
import { apiHcdl, mensajeHcdl } from "@/lib/api-hcdl";

export default function CerrarSesion({ soloIcono = false }: { soloIcono?: boolean }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  async function salir() {
    setOcupado(true);
    setError("");
    try {
      await apiHcdl("logout", { method: "POST" });
      window.location.replace("/acceso");
    } catch (causa) {
      setError(mensajeHcdl(causa));
      setOcupado(false);
    }
  }
  return (
    <div className="relative">
      <button type="button" onClick={salir} disabled={ocupado}
        aria-label="Cerrar sesión" title="Cerrar sesión"
        className={soloIcono
          ? "flex h-[54px] w-[54px] items-center justify-center rounded-full border-2 border-background bg-brand-dark text-brand-light hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
          : "min-h-10 rounded-md border border-white/50 px-3 text-sm font-semibold hover:bg-accent hover:text-ink disabled:opacity-60"}>
        {soloIcono ? (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-8 w-8">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-2a8 8 0 0 1 16 0v2H4Z" />
          </svg>
        ) : "Cerrar sesión"}
      </button>
      {error && <p role="alert" className="absolute right-0 top-full mt-2 w-56 rounded-md bg-surface p-3 text-sm text-ink shadow">{error}</p>}
    </div>
  );
}
