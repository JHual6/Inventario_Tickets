"use client";

import { useDetalleInventario } from "@/lib/use-consulta-inventario";
import CampoBusqueda from "@/components/CampoBusqueda";
import { useEffect, useState } from "react";
import { apiHcdl, mensajeHcdl, type Pagina, type Recurso } from "@/lib/api-hcdl";
import EquipoDetalleModal, {
  Icono,
  IconoEstado,
} from "@/components/inventario/EquipoDetalleModal";
import HistorialEquipoModal, {
  type EventoHistorial,
} from "@/components/inventario/HistorialEquipoModal";

type EstadoEquipo =
  | "Asignado"
  | "Disponible"
  | "Reservado"
  | "Dañado";

type Equipo = {
  id: number;
  nombre: string;
  tipo: string;
  marca: string;
  modelo: string;
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

const estados: EstadoEquipo[] = [
  "Asignado",
  "Disponible",
  "Reservado",
  "Dañado",
];

const estiloCampo =
  "min-h-10 w-full min-w-0 rounded-md border border-[#9CCBD4] bg-white px-3 py-2 text-base font-normal " +
  "text-[#006681] placeholder:text-[#39798A] focus-visible:outline-2 focus-visible:outline-[#007C96] sm:text-sm";

const focoBoton = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006681]";
const botonAccion =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#007C96] text-white transition-colors hover:bg-[#006681] " +
  "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 " + focoBoton;
const botonPagina =
  "grid h-8 min-w-8 place-items-center rounded-md border border-[#9CCBD4] px-1 text-sm font-semibold transition-colors " +
  "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11 " + focoBoton;
const paginaInactiva = "bg-[#DEECEF] text-[#006681] enabled:hover:bg-[#C7E1E6]";
const paginaFlecha = botonPagina + " " + paginaInactiva + " disabled:cursor-not-allowed disabled:opacity-40";

function equipoDesdeRecurso(recurso: Recurso): Equipo {
  const ficha = (clave: string) => {
    const valor = recurso.ficha[clave];
    return typeof valor === "string" ? valor : "";
  };
  return {
    ...recurso, tipo: recurso.tipo || "Sin tipo", marca: recurso.marca || "",
    serie: recurso.serie || "Sin registrar", sector: recurso.sector || "",
    procesador: ficha("procesador"), ram: ficha("ram"), almacenamiento: ficha("almacenamiento"),
    sistemaOperativo: ficha("sistemaOperativo"), fechaRevision: ficha("revision"),
    modelo: ficha("modelo"), nombreSistema: ficha("nombreSistema"), antivirus: ficha("antivirus"), office: ficha("office"),
    tarjetaVideo: ficha("tarjetaVideo"), tarjetaWifi: ficha("tarjetaWifi"), tarjetaEthernet: ficha("tarjetaEthernet"),
    macWifi: ficha("macWifi"), macEthernet: ficha("macEthernet"), ip: ficha("ip"),
  };
}

export default function EquiposPage() {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [marca, setMarca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [equipoSeleccionado, setEquipoSeleccionado] =
  useState<Equipo | null>(null);
  const [equipoHistorial, setEquipoHistorial] =
  useState<Equipo | null>(null);

  const [resultado, setResultado] = useState<Pagina<Recurso> | null>(null);
  const [error, setError] = useState("");
  const [errorHistorial, setErrorHistorial] = useState("");
  const [historial, setHistorial] = useState<{ equipoId: number; datos: EventoHistorial[] } | null>(null);

  useEffect(() => {
    const controlador = new AbortController();
    const consulta = new URLSearchParams({
      categoria: "equipo", q: busqueda, estado, marca, pagina: String(pagina), porPagina: "9",
    });
    const espera = setTimeout(async () => {
      try {
        const datos = await apiHcdl<Pagina<Recurso>>(`recursos?${consulta}`, { signal: controlador.signal });
        if (controlador.signal.aborted) return;
        const ultima = Math.max(1, Math.ceil(datos.total / datos.porPagina));
        if (datos.pagina > ultima) {
          setPagina(ultima);
          return;
        }
        setResultado(datos);
        setError("");
      } catch (causa) {
        if (!controlador.signal.aborted) setError(mensajeHcdl(causa));
      }
    }, 180);
    return () => { clearTimeout(espera); controlador.abort(); };
  }, [busqueda, estado, marca, pagina]);

  useEffect(() => {
    if (!equipoHistorial) return;
    const controlador = new AbortController();
    apiHcdl<{ datos: EventoHistorial[] }>(`equipos/${equipoHistorial.id}/historial`, { signal: controlador.signal })
      .then(({ datos }) => setHistorial({ equipoId: equipoHistorial.id, datos }))
      .catch((causa) => {
        if (!controlador.signal.aborted) {
          setEquipoHistorial(null);
          setErrorHistorial(mensajeHcdl(causa));
        }
      });
    return () => controlador.abort();
  }, [equipoHistorial]);

  const detalle = useDetalleInventario<Recurso>("recursos", equipoSeleccionado?.id);
  const equiposVisibles = resultado?.datos.map(equipoDesdeRecurso) ?? [];
  const marcas = resultado?.marcas ?? [];
  const paginaActual = resultado?.pagina ?? 1;
  const total = resultado?.total ?? 0;
  const porPagina = resultado?.porPagina ?? 9;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const inicio = (paginaActual - 1) * porPagina;

  function limpiarFiltros() {
    setBusqueda("");
    setEstado("");
    setMarca("");
    setPagina(1);
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-screen-2xl flex-col px-3 py-3 text-sm text-[#61453F] sm:px-5">
      <section
        aria-label="Filtros de equipos"
        className="mb-3 grid grid-cols-2 items-end gap-2 rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-3 lg:grid-cols-[minmax(14rem,2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_auto]"
      >
        <label className="grid gap-1 col-span-2 min-w-0 text-xs font-semibold text-[#006681] lg:col-span-1">
          Buscar equipo
          <CampoBusqueda
            value={busqueda}
            maxLength={120}
            onChange={(event) => {
              setBusqueda(event.target.value);
              setPagina(1);
            }}
            placeholder="Nombre, modelo, marca, serie, usuario o sector"
            className={estiloCampo}
          />
        </label>

        <label className="grid gap-1 min-w-0 text-xs font-semibold text-[#006681]">
          Estado
          <select
            value={estado}
            onChange={(event) => {
              setEstado(event.target.value);
              setPagina(1);
            }}
            className={estiloCampo}
          >
            <option value="">Estado</option>
            {estados.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 min-w-0 text-xs font-semibold text-[#006681]">
          Marca
          <select
            value={marca}
            onChange={(event) => {
              setMarca(event.target.value);
              setPagina(1);
            }}
            className={estiloCampo}
          >
            <option value="">Marca</option>
            {marcas.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={limpiarFiltros}
          className={`col-span-2 min-h-10 rounded-md bg-[#007C96] px-3 py-2 font-semibold whitespace-nowrap text-white transition-colors hover:bg-[#006681] [@media(pointer:coarse)]:min-h-11 lg:col-span-1 ${focoBoton}`}
        >
          Limpiar filtros
        </button>
      </section>

      {errorHistorial && <p role="alert" className="mb-3">{errorHistorial}</p>}
      {error ? <p role="alert">{error}</p> : !resultado ? <p role="status">Cargando equipos…</p> :
        resultado.total === 0 ? (
        <div className="rounded-lg border border-[#D7D1BF] bg-[#F3F1EB] px-3 py-6 text-center">
          <h2 className="font-semibold text-[#61453F]">
            No se encontraron equipos
          </h2>
          <p className="mt-1 text-sm text-[#735956]">
            Cambia la búsqueda o limpia los filtros.
          </p>
        </div>
      ) : (
        <section
          aria-label="Equipos registrados"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {equiposVisibles.map((equipo) => (
            <article
              key={equipo.id}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-[#9CCBD4] bg-[#C7E1E6] p-3 text-[#006681]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#DEECEF]">
                    <Icono nombre="equipo" className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base leading-tight font-bold [overflow-wrap:anywhere]">
                      {equipo.nombre}
                    </h2>
                    <p className="text-xs">{[equipo.tipo, equipo.modelo].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                    equipo.estado === "Dañado"
                      ? "bg-[#FFDBAE] text-[#7A3500]"
                      : "bg-[#DEECEF] text-[#006681]"
                  }`}
                >
                  <IconoEstado estado={equipo.estado} className="h-4 w-4" />
                  {equipo.estado}
                </span>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#9CCBD4] pt-2">
                <dl className="min-w-0 text-xs [overflow-wrap:anywhere]">
                  <dt className="font-semibold">Usuario</dt>
                  <dd>{equipo.usuario ?? "Sin usuario"}</dd>
                </dl>

                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEquipoSeleccionado(equipo)}
                    aria-label={`Ver detalles de ${equipo.nombre}`}
                    title="Ver detalles"
                    className={botonAccion}
                  >
                    <Icono nombre="detalle" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setErrorHistorial(""); setHistorial(null); setEquipoHistorial(equipo); }}
                    aria-label={`Ver historial de ${equipo.nombre}`}
                    title="Ver historial"
                    className={botonAccion}
                  >
                    <Icono nombre="historial" className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <p className="text-xs [overflow-wrap:anywhere]">
                <span className="mr-1 font-semibold">SN</span>
                {equipo.serie}
              </p>
            </article>
          ))}
        </section>
      )}
      {resultado && !error && (
        <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-3 pt-3">
          <p role="status" className="text-xs text-[#61453F]">
            Mostrando {total === 0 ? 0 : inicio + 1}–{inicio + equiposVisibles.length} de {total} equipos
          </p>

          <nav aria-label="Paginación de equipos" className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={paginaActual === 1}
              onClick={() => setPagina(paginaActual - 1)}
              aria-label="Página anterior"
              className={paginaFlecha}
            >
              ‹
            </button>

            {Array.from({ length: totalPaginas }, (_, indice) => {
              const numero = indice + 1;
              const activa = numero === paginaActual;
              return (
                <button
                  key={numero}
                  type="button"
                  onClick={() => setPagina(numero)}
                  aria-label={`Página ${numero}`}
                  aria-current={activa ? "page" : undefined}
                  className={`${botonPagina} ${activa ? "bg-[#006681] text-white" : paginaInactiva}`}
                >
                  {numero}
                </button>
              );
            })}

            <button
              type="button"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPagina(paginaActual + 1)}
              aria-label="Página siguiente"
              className={paginaFlecha}
            >
              ›
            </button>
          </nav>
        </footer>
      )}
      {equipoSeleccionado && detalle.cargando && <p role="status">Cargando detalles…</p>}
      {equipoSeleccionado && !detalle.cargando && !detalle.registro && (
        <p role="alert">{detalle.error || "El equipo ya no está disponible."}</p>
      )}
      {equipoSeleccionado && detalle.registro && (
        <EquipoDetalleModal
          equipo={equipoDesdeRecurso(detalle.registro)}
          onClose={() => setEquipoSeleccionado(null)}
        />
      )}
      {equipoHistorial && historial?.equipoId !== equipoHistorial.id && <p role="status">Cargando historial…</p>}
      {equipoHistorial && historial?.equipoId === equipoHistorial.id && (
        <HistorialEquipoModal
          equipo={equipoHistorial}
          eventos={historial.datos}
          onClose={() => setEquipoHistorial(null)}
        />
      )}
    </main>
  );
}
