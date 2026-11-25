"use client";

import CampoBusqueda from "@/components/CampoBusqueda";
import type { Recurso } from "@/lib/api-hcdl";
import { useDetalleInventario, useIdsFiltrados } from "@/lib/use-consulta-inventario";
import EstadoCatalogo from "@/components/EstadoCatalogo";
import { fichaTexto, useCatalogoTI } from "@/lib/catalogo-hcdl";
import { useState } from "react";
import { Icono } from "@/components/inventario/EquipoDetalleModal";
import HistorialEquipoModal from "@/components/inventario/HistorialEquipoModal";
import DetalleImpresora from "@/components/inventario/DetalleImpresora";
import CompatibilidadImpresoraModal from "@/components/inventario/CompatibilidadImpresoraModal";
import {
  IconoSuministro,
} from "@/components/inventario/SuministroModal";

type EstadoImpresora = string;

type Impresora = {
  id: number;
  nombre: string;
  marca: string;
  area: string;
  estado: EstadoImpresora;
  ip: string;
  serie: string;
  visible: boolean;
  accesoWeb: boolean;
  urlWeb?: string;
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

function IconoImpresora({
  className = "h-9 w-9",
}: {
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
      <path d="M6 8V2h12v6M6 17H3V8h18v9h-3" />
      <path d="M6 14h12v8H6zM9 17h6M9 19h6M17 11h.01" />
    </svg>
  );
}

function EstadoIcono({ estado }: { estado: EstadoImpresora }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      {estado === "Activo" ? (
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

function adaptarImpresora(r: Recurso): Impresora {
  return {
    ...r, visible: true, marca: r.marca ?? "", serie: r.serie ?? "", area: r.sector ?? "", ip: fichaTexto(r, "ip"),
    accesoWeb: r.ficha.accesoWeb === true, urlWeb: fichaTexto(r, "urlWeb") || undefined,
  };
}

export default function ImpresorasPage() {
  const { catalogo, cargando, error, recargar } = useCatalogoTI();
  const impresoras: Impresora[] = catalogo.recursos.filter((r) => r.categoria === "impresora" && r.visible).map(adaptarImpresora);
  const areas = [...new Set(impresoras.map((r) => r.area).filter(Boolean))].sort();
  const marcas = [...new Set(impresoras.map((r) => r.marca).filter(Boolean))].sort();
  const estados = [...new Set(impresoras.map((r) => r.estado))].sort();
  const [busqueda, setBusqueda] = useState("");
  const [area, setArea] = useState("");
  const [marca, setMarca] = useState("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const porPagina = 8;

  const [seleccion, setSeleccion] = useState<{
    impresora: Impresora;
    vista: "detalles" | "historial" | "compatibilidad";
  } | null>(null);

  const detalle = useDetalleInventario<Recurso>("recursos", seleccion?.vista === "detalles" ? seleccion.impresora.id : undefined);
  const filtro = useIdsFiltrados("recursos", { q: busqueda, sector: area, marca, estado }, "impresora");
  const filtradas = filtro.hayFiltros ? impresoras.filter((item) => filtro.ids?.has(item.id)) : impresoras;


  const paginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const actual = Math.min(pagina, paginas);
  const inicio = (actual - 1) * porPagina;
  const visibles = filtradas.slice(inicio, inicio + porPagina);

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-col px-3 py-3 text-sm text-[#61453F] sm:px-5 xl:h-full xl:min-h-0">
      <EstadoCatalogo cargando={cargando} error={error} reintentar={recargar} />
      {filtro.cargando && <p role="status" className="p-2">Buscando coincidencias…</p>}
      {filtro.error && <p role="alert" className="p-2">{filtro.error}</p>}
      <h1 className="sr-only">Inventario de impresoras</h1>

      <section
        aria-label="Filtros de impresoras"
        className="grid shrink-0 grid-cols-2 items-end gap-2 rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-3 xl:grid-cols-[minmax(14rem,2fr)_repeat(3,minmax(7rem,1fr))_auto]"
      >
        <label className="grid gap-1 col-span-2 min-w-0 text-xs font-semibold text-[#006681] xl:col-span-1">
          Buscar impresora
          <CampoBusqueda
            value={busqueda}
            onChange={(event) => {
              setBusqueda(event.target.value);
              setPagina(1);
            }}
            placeholder="Modelo, IP o número de serie"
            className={campo}
          />
        </label>

        <label className="grid gap-1 min-w-0 text-xs font-semibold text-[#006681]">
          Área
          <select
            value={area}
            onChange={(event) => {
              setArea(event.target.value);
              setPagina(1);
            }}
            className={campo}
          >
            <option value="">Área</option>
            {areas.map((valor) => (
              <option key={valor} value={valor}>{valor}</option>
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
            className={campo}
          >
            <option value="">Marca</option>
            {marcas.map((valor) => (
              <option key={valor} value={valor}>{valor}</option>
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
              <option key={valor} value={valor}>{valor}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setBusqueda("");
            setArea("");
            setMarca("");
            setEstado("");
            setPagina(1);
          }}
          className={`min-h-10 rounded-md bg-[#007C96] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#006681] [@media(pointer:coarse)]:min-h-11 ${focoBoton}`}
        >
          Limpiar filtros
        </button>
      </section>

      <section
        aria-label="Impresoras registradas"
        className={`mt-3 grid grid-cols-1 content-start gap-3 md:grid-cols-2 ${
          porPagina === 8 ? "xl:grid-cols-4" : "xl:grid-cols-3"
        }`}
      >
        {visibles.map((impresora) => (
          <article
            key={impresora.id}
            className="min-w-0 rounded-xl border border-[#9CCBD4] bg-[#C7E1E6] p-3 text-[#006681]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DEECEF] text-[#006681]">
                <IconoImpresora className="h-6 w-6" />
              </span>

              <div className="min-w-0 flex-1">
                <h2
                  title={impresora.nombre}
                  className="text-base font-bold leading-tight [overflow-wrap:anywhere]"
                >
                  {impresora.nombre}
                </h2>
                <p className="text-sm text-[#006681]">{impresora.marca}</p>
              </div>

              <div
                className={`flex shrink-0 flex-col items-center gap-1 ${
                  impresora.estado === "Activo" ? "text-[#006681]" : "text-[#7A3500]"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    impresora.estado === "Activo"
                      ? "bg-[#006681] text-white"
                      : "bg-[#FFDBAE] text-[#7A3500]"
                  }`}
                >
                  <EstadoIcono estado={impresora.estado} />
                </span>
                <span className="text-xs font-semibold">{impresora.estado}</span>
              </div>
            </div>

            <div className="mt-2">
              <p className="text-xs font-bold">Área</p>
              <p className="text-sm leading-tight text-[#006681] [overflow-wrap:anywhere]">
                {impresora.area}
              </p>
            </div>

            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSeleccion({ impresora, vista: "detalles" })}
                  title="Ver detalles"
                  aria-label={`Ver detalles de ${impresora.nombre}, serie ${impresora.serie}`}
                  className={botonAccion}
                >
                  <Icono nombre="detalle" className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSeleccion({ impresora, vista: "historial" })}
                  title="Ver historial"
                  aria-label={`Ver historial de ${impresora.nombre}, serie ${impresora.serie}`}
                  className={botonAccion}
                >
                  <Icono nombre="historial" className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSeleccion({
                      impresora,
                      vista: "compatibilidad",
                    })
                  }
                  title="Ver suministros compatibles"
                  aria-label={`Ver suministros compatibles con ${impresora.nombre}`}
                  className={botonAccion}
                >
                  <IconoSuministro className="h-5 w-5" />
                </button>
              </div>

              <dl className="min-w-0 text-right text-xs text-[#214F5B]">
                <div>
                  <dt className="mr-2 inline font-bold text-[#006681]">IP</dt>
                  <dd className="inline [overflow-wrap:anywhere]">{impresora.ip}</dd>
                </div>
                <div>
                  <dt className="mr-2 inline font-bold text-[#006681]">SN</dt>
                  <dd className="inline [overflow-wrap:anywhere]">{impresora.serie}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </section>

      {!cargando && !error && !filtro.cargando && !filtro.error && visibles.length === 0 && (
        <p className="rounded-lg border border-[#D7D1BF] bg-[#F3F1EB] px-3 py-6 text-center text-sm text-[#735956]">
          No se encontraron impresoras con estos filtros.
        </p>
      )}

      <footer className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-xs text-[#61453F]">
          Mostrando {filtradas.length ? inicio + 1 : 0}–
          {inicio + visibles.length} de {filtradas.length} impresoras
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Paginación de impresoras" className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={actual === 1}
              onClick={() => setPagina(actual - 1)}
              className={paginaFlecha}
            >
              ‹
            </button>

            {Array.from({ length: paginas }, (_, indice) => (
              <button
                key={indice + 1}
                type="button"
                aria-label={`Página ${indice + 1}`}
                aria-current={actual === indice + 1 ? "page" : undefined}
                onClick={() => setPagina(indice + 1)}
                className={`${botonPagina} ${
                  actual === indice + 1 ? "bg-[#006681] text-white" : paginaInactiva
                }`}
              >
                {indice + 1}
              </button>
            ))}

            <button
              type="button"
              aria-label="Página siguiente"
              disabled={actual === paginas}
              onClick={() => setPagina(actual + 1)}
              className={paginaFlecha}
            >
              ›
            </button>
          </nav>
        </div>
      </footer>

      {seleccion?.vista === "detalles" && detalle.cargando && <p role="status">Cargando detalles…</p>}
      {seleccion?.vista === "detalles" && !detalle.cargando && !detalle.registro && (
        <p role="alert">{detalle.error || "El recurso ya no está disponible."}</p>
      )}
      {seleccion?.vista === "detalles" && detalle.registro && (
        <DetalleImpresora
          impresora={adaptarImpresora(detalle.registro)}
          onClose={() => setSeleccion(null)}
        />
      )}

      {seleccion?.vista === "historial" && (
        <HistorialEquipoModal
          equipo={{
            nombre: `${seleccion.impresora.marca} ${seleccion.impresora.nombre}`,
            serie: seleccion.impresora.serie,
            tipo: "Impresora",
          }}
          recursoId={seleccion.impresora.id}
          onClose={() => setSeleccion(null)}
        />
      )}
      {seleccion?.vista === "compatibilidad" && (
        <CompatibilidadImpresoraModal
          impresora={seleccion.impresora}
          onClose={() => setSeleccion(null)}
        />
      )}
    </main>
  );
}
