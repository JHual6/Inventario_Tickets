"use client";

import { useState, type FormEvent } from "react";
import CerrarSesion from "@/components/CerrarSesion";
import { enviarHcdl, mensajeHcdl } from "@/lib/api-hcdl";

import { botonAcceso, CampoClaveAcceso, ErrorAcceso, TarjetaAcceso } from "../TarjetaAcceso";

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
    <TarjetaAcceso titulo="Cambia tu contraseña temporal" accion={<CerrarSesion />}>
      <form method="post" onSubmit={guardar} className="grid gap-4 p-5 sm:p-8">
        <p className="text-sm text-ink-muted">Elige tu propia contraseña para acceder al portal.</p>
        <div className="grid gap-2">
          <CampoClaveAcceso etiqueta="Nueva contraseña" nombre="contrasena" autocompletar="new-password"
            descripcion="requisitos-clave-inicial" deshabilitado={enviando} />
          <p id="requisitos-clave-inicial" className="text-xs text-ink-muted">
            Usa entre 15 y 128 caracteres, con una minúscula, una mayúscula, un número y un símbolo.
          </p>
        </div>
        <CampoClaveAcceso etiqueta="Confirmar contraseña" nombre="confirmacion"
          autocompletar="new-password" deshabilitado={enviando} />
        <ErrorAcceso mensaje={error} />
        <button type="submit" disabled={enviando} className={botonAcceso}>
          {enviando ? "Guardando…" : "Guardar y continuar"}
        </button>
      </form>
    </TarjetaAcceso>
  );
}
