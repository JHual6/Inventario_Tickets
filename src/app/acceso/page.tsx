"use client";

import { useState, type FormEvent } from "react";
import { enviarHcdl, mensajeHcdl } from "@/lib/api-hcdl";
import { botonAcceso, campoAcceso, CampoClaveAcceso, ErrorAcceso, TarjetaAcceso } from "./TarjetaAcceso";

export default function AccesoPage() {
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function acceder(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
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
    <TarjetaAcceso titulo="Inventario y soporte TI">
      <form method="post" onSubmit={acceder} className="grid gap-5 p-5 sm:p-8">
        <div>
          <h2 className="text-xl font-bold leading-tight text-brand-dark">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-ink-muted">Accede con tu cuenta de HCDL.</p>
        </div>
        <label className="grid gap-1.5 text-sm font-semibold text-brand-dark">
          Correo institucional
          <input className={campoAcceso + " font-normal"} type="email" name="correo" autoComplete="username"
            autoCapitalize="none" spellCheck={false} maxLength={254} required disabled={enviando} />
        </label>
        <CampoClaveAcceso etiqueta="Contraseña de HCDL" nombre="contrasena"
          autocompletar="current-password" deshabilitado={enviando} />
        <ErrorAcceso mensaje={error} />
        <button type="submit" disabled={enviando} className={botonAcceso}>
          {enviando ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>
    </TarjetaAcceso>
  );
}
