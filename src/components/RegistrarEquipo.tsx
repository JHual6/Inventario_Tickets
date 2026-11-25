"use client";

import { useEffect, useState, type FormEvent } from "react";
import { enviarHcdl, listarHcdl, mensajeHcdl } from "@/lib/api-hcdl";

const ficha = [
  ["modelo", "Modelo"], ["nombreSistema", "Nombre de sistema"],
  ["procesador", "Procesador"], ["ram", "RAM"], ["almacenamiento", "Almacenamiento"],
  ["sistemaOperativo", "Sistema operativo"], ["antivirus", "Antivirus"], ["office", "Office"],
  ["tarjetaVideo", "Tarjeta de video"], ["tarjetaWifi", "Tarjeta Wi-Fi"],
  ["tarjetaEthernet", "Tarjeta Ethernet"], ["macWifi", "MAC Wi-Fi"], ["macEthernet", "MAC Ethernet"],
  ["ip", "Dirección IP"],
];

const campo = "min-h-10 min-w-0 rounded-md border border-outline bg-white px-3 py-2 text-brand-dark";
export default function RegistrarEquipo({ confirmado }: { confirmado: () => void }) {
  const [sectores, setSectores] = useState<{ id: number; nombre: string }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controlador = new AbortController();
    listarHcdl<{ id: number; nombre: string }>("sectores", controlador.signal).then(setSectores).catch((causa) => {
      if (!controlador.signal.aborted) setError(mensajeHcdl(causa));
    });
    return () => controlador.abort();
  }, []);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    setEnviando(true);
    setAviso("");
    setError("");
    try {
      const resultado = await enviarHcdl<{ id: number }>("equipos", {
        nombre: datos.get("nombre"), marca: datos.get("marca"), tipo: datos.get("tipo"),
        serie: datos.get("serie"), estado: datos.get("estado"), sectorId: Number(datos.get("sector")),
        ficha: Object.fromEntries(ficha.map(([clave]) => [clave, datos.get(clave)])),
      });
      formulario.reset();
      setAviso(`Equipo #${resultado.id} registrado.`);
      confirmado();
    } catch (causa) {
      setError(mensajeHcdl(causa));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <details className="mb-3 rounded-lg border border-outline bg-brand-pale text-brand-dark">
      <summary className="cursor-pointer px-4 py-3 font-semibold">Registrar equipo</summary>
      <form className="grid gap-3 border-t border-outline p-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={guardar}>
        {[["nombre", "Nombre del equipo"], ["marca", "Marca"], ["tipo", "Tipo de equipo"], ["serie", "Número de serie"]].map(([clave, etiqueta]) => (
          <label key={clave} className="grid gap-1 font-semibold">{etiqueta}
            <input required name={clave} maxLength={160} className={campo} />
          </label>
        ))}
        <label className="grid gap-1 font-semibold">Sector
          <select name="sector" defaultValue="" className={campo} required>
            <option value="">Selecciona un sector</option>
            {sectores.map(({ id, nombre }) => <option key={id} value={id}>{nombre}</option>)}
          </select>
        </label>
        <label className="grid gap-1 font-semibold">Estado inicial
          <select name="estado" className={campo}><option>Disponible</option><option>Reservado</option><option>Dañado</option></select>
        </label>
        <details className="col-span-full rounded-md border border-outline bg-surface">
          <summary className="cursor-pointer px-3 py-2 font-semibold text-ink">Ficha técnica opcional</summary>
          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {ficha.map(([clave, etiqueta]) => <label key={clave} className="grid gap-1 font-semibold">{etiqueta}
              <input name={clave} maxLength={200} className={campo} />
            </label>)}
          </div>
        </details>
        <div className="col-span-full flex flex-wrap items-center gap-3">
          <button disabled={enviando || !sectores.length} className="min-h-10 rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Guardar equipo</button>
          {aviso && <p role="status">{aviso}</p>}
          {error && <p role="alert">{error}</p>}
        </div>
      </form>
    </details>
  );
}
