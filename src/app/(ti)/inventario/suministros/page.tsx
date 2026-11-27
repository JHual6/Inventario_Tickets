"use client";

import CampoBusqueda from "@/components/CampoBusqueda";
import { useDetalleInventario, useIdsFiltrados } from "@/lib/use-consulta-inventario";
import EstadoCatalogo from "@/components/EstadoCatalogo";
import { suministrosVisibles, useCatalogoTI } from "@/lib/catalogo-hcdl";
import { useState } from "react";
import { Icono } from "@/components/inventario/EquipoDetalleModal";
import SuministroModal, {
  IconoStock,
  IconoSuministro,
  estadoStock,
  type Suministro,
} from "@/components/inventario/SuministroModal";

const tipos: Suministro["tipo"][] = ["Tóner", "Tinta", "Tambor"];
const estados = ["Disponible", "Poco stock", "Sin stock"];

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

export default function SuministrosPage() {
  const { catalogo, cargando, error, recargar } = useCatalogoTI();
  const suministros = suministrosVisibles(catalogo);

  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);

  const [seleccion, setSeleccion] = useState<{
    suministro: Suministro;
    vista: "detalles" | "historial" | "compatibilidad";
  } | null>(null);

  const detalle = useDetalleInventario<Suministro>("suministros", seleccion?.vista === "detalles" ? seleccion.suministro.id : undefined);
  const filtro = useIdsFiltrados("suministros", { q: busqueda, tipo, estado });
  const filtrados = filtro.hayFiltros ? suministros.filter((item) => filtro.ids?.has(item.id)) : suministros;


  const porPagina = 9;
  const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const actual = Math.min(pagina, paginas);
  const inicio = (actual - 1) * porPagina;
  const visibles = filtrados.slice(inicio, inicio + porPagina);

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-col px-3 py-3 text-sm text-[#61453F] sm:px-5 xl:h-full xl:min-h-0">
      <h1 className="sr-only">Inventario de suministros</h1>

      <section
        aria-label="Filtros de suministros"
        className="grid shrink-0 grid-cols-2 items-end gap-2 rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-3 lg:grid-cols-[minmax(14rem,2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_auto]"
      >
        <label className="grid gap-1 col-span-2 min-w-0 text-xs font-semibold text-[#006681] lg:col-span-1">
          Buscar suministro
          <CampoBusqueda
            value={busqueda}
            onChange={(event) => {
              setBusqueda(event.target.value);
              setPagina(1);
            }}
            placeholder="Nombre, marca o tipo"
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
            setTipo("");
            setEstado("");
            setPagina(1);
          }}
          className={`col-span-2 min-h-10 rounded-md bg-[#007C96] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#006681] [@media(pointer:coarse)]:min-h-11 lg:col-span-1 ${focoBoton}`}
        >
          Limpiar filtros
        </button>
      </section>

      <EstadoCatalogo cargando={cargando} error={error} reintentar={recargar} />
      {filtro.cargando && <p role="status" className="p-2">Buscando coincidencias…</p>}
      {filtro.error && <p role="alert" className="p-2">{filtro.error}</p>}

      <section
        aria-label="Suministros de ejemplo"
        className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      >
        {visibles.map((item) => {
          const estadoActual = estadoStock(item);
          const alerta = estadoActual !== "Disponible";

          return (
            <article
              key={item.id}
              className="min-w-0 rounded-xl border border-[#9CCBD4] bg-[#C7E1E6] p-3 text-[#006681]"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DEECEF]">
                  <IconoSuministro className="h-6 w-6" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h2
                      title={item.nombre}
                      className="min-w-0 text-base font-bold leading-tight [overflow-wrap:anywhere]"
                    >
                      {item.nombre}
                    </h2>

                    <span className="text-sm font-medium text-[#214F5B]">
                      {item.marca}
                    </span>
                  </div>

                  <p className="text-sm text-[#214F5B]">
                    {item.tipo}
                  </p>
                </div>

                <div
                  className={`flex shrink-0 flex-col items-center gap-1 ${
                    alerta ? "text-[#7A3500]" : "text-[#006681]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      alerta ? "bg-[#FFDBAE] text-[#7A3500]" : "bg-[#006681] text-white"
                    }`}
                  >
                    <IconoStock estado={estadoActual} />
                  </span>

                  <span className="text-xs font-semibold">
                    {estadoActual}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="mr-2 font-semibold">Stock</span>
                  <span className="text-lg font-bold tabular-nums">{item.stock}</span>
                </p>

                <div className="flex gap-1.5">
                  {(["detalles", "historial", "compatibilidad"] as const).map((vista) => (
                    <button
                      key={vista}
                      type="button"
                      onClick={() => setSeleccion({ suministro: item, vista })}
                      title={`Ver ${vista}`}
                      aria-label={`Ver ${vista} de ${item.nombre}`}
                      className={botonAccion}
                    >
                      <Icono
                        nombre={
                          vista === "detalles"
                            ? "detalle"
                            : vista === "historial"
                              ? "historial"
                              : "red"
                        }
                        className="h-5 w-5"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {!cargando && !error && !filtro.cargando && !filtro.error && visibles.length === 0 && (
        <p className="rounded-lg border border-[#D7D1BF] bg-[#F3F1EB] px-3 py-6 text-center text-sm text-[#735956]">
          No se encontraron suministros con estos filtros.
        </p>
      )}

      <footer className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-xs text-[#61453F]">
          Mostrando {filtrados.length ? inicio + 1 : 0}–
          {inicio + visibles.length} de {filtrados.length} suministros
        </p>

        <nav
          aria-label="Paginación de suministros"
          className="ml-auto flex flex-wrap gap-1.5"
        >
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

      {seleccion?.vista === "detalles" && detalle.cargando && <p role="status">Cargando detalles…</p>}
      {seleccion?.vista === "detalles" && !detalle.cargando && !detalle.registro && (
        <p role="alert">{detalle.error || "El suministro ya no está disponible."}</p>
      )}
      {seleccion && (seleccion.vista !== "detalles" || detalle.registro) && (
        <SuministroModal
          suministro={detalle.registro ?? seleccion.suministro}
          vista={seleccion.vista}
          onClose={() => setSeleccion(null)}
        />
      )}
    </main>
  );
}
