"use client";

import { useState, type FormEvent } from "react";
import CerrarSesion from "@/components/CerrarSesion";
import { enviarHcdl, mensajeHcdl } from "@/lib/api-hcdl";

const campo = "rounded-md border border-[#9CCBD4] bg-white p-3 text-base font-normal text-brand-dark focus-visible:outline-2 focus-visible:outline-brand-dark";

export default function FormularioClaveInicial() {
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const datos = new FormData(evento.currentTarget);
    const contrasena = String(datos.get("contrasena") ?? "");
    const confirmacion = String(datos.get("confirmacion") ?? "");
    if (contrasena !== confirmacion) {
      setError("Las contraseñas deben coincidir.");
      return;
    }
    setError("");
    setEnviando(true);
    try {
      await enviarHcdl("cambiar-clave-inicial", { contrasena, confirmacion });
      window.location.replace("/");
    } catch (causa) {
      setError(mensajeHcdl(causa));
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-0 flex-1 place-items-center overflow-auto bg-background p-5 text-ink">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-outline bg-surface shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-brand-dark p-5 text-white">
          <h1 className="text-xl font-bold">Cambia tu contraseña temporal</h1>
          <CerrarSesion />
        </header>
        <form method="post" onSubmit={guardar} className="grid gap-4 p-5 sm:p-7">
          <p className="text-sm">Elige tu propia contraseña para acceder al portal.</p>
          <label className="grid gap-1 text-sm font-semibold text-brand-dark">
            Nueva contraseña
            <input className={campo} type="password" name="contrasena" autoComplete="new-password"
              aria-describedby="requisitos-clave-inicial" required disabled={enviando} />
          </label>
          <p id="requisitos-clave-inicial" className="text-xs text-ink-muted">
            Usa entre 15 y 128 caracteres, con una minúscula, una mayúscula, un número y un símbolo.
          </p>
          <label className="grid gap-1 text-sm font-semibold text-brand-dark">
            Confirmar contraseña
            <input className={campo} type="password" name="confirmacion" autoComplete="new-password"
              required disabled={enviando} />
          </label>
          {error && <p role="alert" className="text-sm text-[#872E21]">{error}</p>}
          <button type="submit" disabled={enviando}
            className="rounded-md bg-brand-dark p-3 font-semibold text-white enabled:hover:bg-accent enabled:hover:text-ink disabled:opacity-60">
            {enviando ? "Guardando…" : "Guardar y continuar"}
          </button>
        </form>
      </section>
    </main>
  );
}
