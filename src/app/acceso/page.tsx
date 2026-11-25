"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { enviarHcdl, mensajeHcdl } from "@/lib/api-hcdl";

export default function AccesoPage() {
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function acceder(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    setError("");
    setEnviando(true);
    try {
      await enviarHcdl("login", Object.fromEntries(new FormData(formulario)));
      const sesion = await fetch("/api/hcdl/sesion", { cache: "no-store" });
      if (sesion.status === 401) {
        throw new Error("El navegador no conservó la sesión. Permite las cookies de este sitio e inténtalo nuevamente.");
      }
      if (!sesion.ok) {
        throw new Error("El servidor no pudo verificar la sesión. Comprueba que la API de HCDL esté disponible.");
      }
      window.location.replace("/");
    } catch (causa) {
      setError(mensajeHcdl(causa));
      setEnviando(false);
    }
  }

  return (
    <main className="grid min-h-0 flex-1 place-items-center overflow-auto bg-background p-5 text-ink">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-outline bg-surface shadow-sm">
        <div className="flex items-center gap-4 bg-brand-dark p-5 text-white">
          <Image src="/logo.png" alt="Hotel Cabaña del Lago" width={62} height={62} className="rounded-full border border-white/70" priority />
          <div>
            <p className="text-sm">Hotel Cabaña del Lago</p>
            <h1 className="text-xl font-bold">Inventario y soporte TI</h1>
          </div>
        </div>
        <form method="post" onSubmit={acceder} className="grid gap-4 p-5 sm:p-7">
          <label className="grid gap-1 text-sm font-semibold">Correo
            <input className="rounded-md border border-outline bg-white p-3" type="email" name="correo"
              autoComplete="username" maxLength={254} required />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Contraseña de HCDL
            <input className="rounded-md border border-outline bg-white p-3" type="password" name="contrasena"
              autoComplete="current-password" required />
          </label>
          {error && <p role="alert" className="text-sm">{error}</p>}
          <button disabled={enviando} className="rounded-md bg-brand p-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
            {enviando ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>
      </section>
    </main>
  );
}
