"use client";

import CampoBusqueda from "@/components/CampoBusqueda";
import { useIdsFiltrados } from "@/lib/use-consulta-inventario";
import EstadoCatalogo from "@/components/EstadoCatalogo";
import { fichaTexto, useCatalogoTI } from "@/lib/catalogo-hcdl";
import { useState } from "react";
import { Icono } from "@/components/inventario/EquipoDetalleModal";
import HistorialEquipoModal from "@/components/inventario/HistorialEquipoModal";

type TipoIoT = string;
type EstadoIoT = string;

type DispositivoIoT = {
  id: number;
  nombre: string;
  tipo: TipoIoT;
  marca: string;
  serie: string;
  ubicacion: string;
  estado: EstadoIoT;
};

const campo =
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

function IconoDispositivo({ tipo }: { tipo: TipoIoT }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-6 w-6"
    >
      {tipo === "Switch" ? (
        <>
          <rect x="2" y="7" width="20" height="11" rx="2" />
          <path d="M5 11h2v3H5zM10 11h2v3h-2zM15 11h2v3h-2zM20 11h.01" />
        </>
      ) : tipo === "AP" ? (
        <>
          <circle cx="12" cy="13" r="7" />
          <path d="M8 12a6 6 0 0 1 8 0M10 15a3 3 0 0 1 4 0M12 18h.01M5 5a11 11 0 0 1 14 0" />
        </>
      ) : (
        <>
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M9 5h6v3H9zM13 10l-4 6h4l-1 4 4-6h-4l1-4Z" />
        </>
      )}
    </svg>
  );
}

function IconoEstadoIoT({ estado }: { estado: EstadoIoT }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      {estado === "Operativo" ? (
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

export default function IoTPage() {
  const { catalogo, cargando, error, recargar } = useCatalogoTI();
  const dispositivos: DispositivoIoT[] = catalogo.recursos.filter((r) => r.categoria === "iot" && r.visible).map((r) => ({
    ...r, tipo: r.tipo ?? "Sin tipo", serie: r.serie ?? "", marca: r.marca ?? "",
    ubicacion: fichaTexto(r, "ubicacion") || r.sector || "",
  }));
  const tipos = [...new Set(dispositivos.map((r) => r.tipo))].sort();
  const estados = [...new Set(dispositivos.map((r) => r.estado))].sort();
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const [historial, setHistorial] = useState<DispositivoIoT | null>(null);

  const filtro = useIdsFiltrados("recursos", { q: busqueda, tipo, estado }, "iot");
  const filtrados = filtro.hayFiltros ? dispositivos.filter((item) => filtro.ids?.has(item.id)) : dispositivos;


  const porPagina = 8;
  const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const actual = Math.min(pagina, paginas);
  const inicio = (actual - 1) * porPagina;
  const visibles = filtrados.slice(inicio, inicio + porPagina);

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-col px-3 py-3 text-sm text-[#61453F] sm:px-5 xl:h-full xl:min-h-0">
      <EstadoCatalogo cargando={cargando} error={error} reintentar={recargar} />
      {filtro.cargando && <p role="status" className="p-2">Buscando coincidencias…</p>}
      {filtro.error && <p role="alert" className="p-2">{filtro.error}</p>}
      <h1 className="sr-only">Inventario IoT</h1>

      <section
        aria-label="Filtros de dispositivos IoT"
        className="grid shrink-0 grid-cols-2 items-end gap-2 rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-3 lg:grid-cols-[minmax(14rem,2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_auto]"
      >
        <label className="grid gap-1 col-span-2 min-w-0 text-xs font-semibold text-[#006681] lg:col-span-1">
          Buscar dispositivo
          <CampoBusqueda
            value={busqueda}
            onChange={(event) => {
              setBusqueda(event.target.value);
              setPagina(1);
            }}
            placeholder="Nombre, marca, ubicación o número de serie"
            className={campo}
          />
        </label>

        <label className="grid gap-1 min-w-0 text-xs font-semibold text-[#006681]">
          Tipo
          <select
            value={tipo}
            onChange={(event) => {
              setTipo(event.target.value);
              setPagina(1);
            }}
            className={campo}
          >
            <option value="">Tipo</option>
            {tipos.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 min-w-0 text-xs font-semibold text-[#006681]">
          Estado
          <select
            value={estado}
            onChange={(event) => {
              setEstado(event.target.value);
              setPagina(1);
            }}
            className={campo}
          >
            <option value="">Estado</option>
            {estados.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setBusqueda("");
            setTipo("");
            setEstado("");
            setPagina(1);
          }}
          className={`col-span-2 min-h-10 rounded-md bg-[#007C96] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#006681] [@media(pointer:coarse)]:min-h-11 lg:col-span-1 ${focoBoton}`}
        >
          Limpiar filtros
        </button>
      </section>

      <section
        aria-label="Dispositivos IoT registrados"
        className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        {visibles.map((item) => (
          <article
            key={item.id}
            className="flex min-w-0 flex-col rounded-xl border border-[#9CCBD4] bg-[#C7E1E6] p-3 text-[#006681]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DEECEF]">
                <IconoDispositivo tipo={item.tipo} />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold leading-tight [overflow-wrap:anywhere]">
                  {item.nombre}
                </h2>

                <p className="mt-0.5 text-sm">
                  {item.tipo} · {item.marca}
                </p>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold">
                Estado
              </p>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                  item.estado === "Operativo"
                    ? "bg-[#006681] text-white"
                    : "bg-[#FFDBAE] text-[#7A3500]"
                }`}
              >
                <IconoEstadoIoT estado={item.estado} />
                {item.estado}
              </span>
            </div>

            <dl className="mt-2">
              <dt className="text-xs font-bold">
                Ubicación
              </dt>
              <dd className="text-sm [overflow-wrap:anywhere]">
                {item.ubicacion}
              </dd>
            </dl>

            <div className="mt-auto flex items-end justify-between gap-3 pt-3">
              <button
                type="button"
                onClick={() => setHistorial(item)}
                title="Ver historial"
                aria-label={`Ver historial de ${item.nombre}, serie ${item.serie}`}
                className={botonAccion}
              >
                <Icono nombre="historial" className="h-5 w-5" />
              </button>

              <p className="min-w-0 text-right text-xs text-[#214F5B] [overflow-wrap:anywhere]">
                <span className="mr-1 font-bold">
                  SN
                </span>
                {item.serie}
              </p>
            </div>
          </article>
        ))}
      </section>

      {!cargando && !error && !filtro.cargando && !filtro.error && visibles.length === 0 && (
        <p className="rounded-lg border border-[#D7D1BF] bg-[#F3F1EB] px-3 py-6 text-center text-sm text-[#735956]">
          No se encontraron dispositivos con estos filtros.
        </p>
      )}

      <footer className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-xs text-[#61453F]">
          Mostrando {filtrados.length ? inicio + 1 : 0}–
          {inicio + visibles.length} de {filtrados.length} dispositivos
        </p>

        <nav aria-label="Paginación de IoT" className="ml-auto flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={actual === 1}
            onClick={() => setPagina(actual - 1)}
            aria-label="Página anterior"
            className={paginaFlecha}
          >
            ‹
          </button>

          {Array.from({ length: paginas }, (_, indice) => (
            <button
              key={indice + 1}
              type="button"
              onClick={() => setPagina(indice + 1)}
              aria-label={`Página ${indice + 1}`}
              aria-current={actual === indice + 1 ? "page" : undefined}
              className={`${botonPagina} ${
                actual === indice + 1 ? "bg-[#006681] text-white" : paginaInactiva
              }`}
            >
              {indice + 1}
            </button>
          ))}

          <button
            type="button"
            disabled={actual === paginas}
            onClick={() => setPagina(actual + 1)}
            aria-label="Página siguiente"
            className={paginaFlecha}
          >
            ›
          </button>
        </nav>
      </footer>

      {historial && (
        <HistorialEquipoModal
          equipo={{
            nombre: historial.nombre,
            serie: historial.serie,
            tipo: historial.tipo,
          }}
          recursoId={historial.id}
          onClose={() => setHistorial(null)}
        />
      )}
    </main>
  );
}
