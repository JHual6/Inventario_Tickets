"use client";

import CampoBusqueda from "@/components/CampoBusqueda";
import type { Recurso } from "@/lib/api-hcdl";
import { useDetalleInventario, useIdsFiltrados } from "@/lib/use-consulta-inventario";
import EstadoCatalogo from "@/components/EstadoCatalogo";
import { fichaTexto, useCatalogoTI } from "@/lib/catalogo-hcdl";
import { useState } from "react";
import { Icono, IconoEstado } from "@/components/inventario/EquipoDetalleModal";
import HistorialEquipoModal from "@/components/inventario/HistorialEquipoModal";
import MovilDetalleModal, {
  IconoMovil,
  type Movil,
} from "@/components/inventario/MovilDetalleModal";

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

function adaptarMovil(r: Recurso): Movil {
  return {
    ...r, visible: true, tipo: r.tipo ?? "", marca: r.marca ?? "", serie: r.serie ?? "",
    sector: r.sector ?? "", imei1: fichaTexto(r, "imei1"), imei2: fichaTexto(r, "imei2"),
    compania: fichaTexto(r, "compania"), convenio: fichaTexto(r, "convenio"), plan: fichaTexto(r, "plan"),
    numero: fichaTexto(r, "numeroLinea", "numero"), accesorios: fichaTexto(r, "accesorio", "accesorios"),
  };
}

export default function MovilesPage() {
  const { catalogo, cargando, error, recargar } = useCatalogoTI();
  const moviles: Movil[] = catalogo.recursos.filter((r) => r.categoria === "movil" && r.visible).map(adaptarMovil);
  const marcas = [...new Set(moviles.map((r) => r.marca).filter(Boolean))].sort();
  const estados = [...new Set(moviles.map((r) => r.estado))].sort();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [marca, setMarca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState<{
    movil: Movil;
    vista: "detalles" | "historial";
  } | null>(null);

  const detalle = useDetalleInventario<Recurso>("recursos", seleccion?.vista === "detalles" ? seleccion.movil.id : undefined);
  const filtro = useIdsFiltrados("recursos", { q: busqueda, estado, marca }, "movil");
  const filtrados = filtro.hayFiltros ? moviles.filter((item) => filtro.ids?.has(item.id)) : moviles;


  const porPagina = 10;

  const totalPaginas = Math.max(
    1,
    Math.ceil(filtrados.length / porPagina),
  );

  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;

  const visibles = filtrados.slice(inicio, inicio + porPagina);

  const desde = filtrados.length === 0 ? 0 : inicio + 1;
  const hasta = inicio + visibles.length;

  function limpiarFiltros() {
    setBusqueda("");
    setEstado("");
    setMarca("");
    setPagina(1);
  }

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-3 py-3 text-sm text-[#61453F] sm:px-5">
      <EstadoCatalogo cargando={cargando} error={error} reintentar={recargar} />
      {filtro.cargando && <p role="status" className="p-2">Buscando coincidencias…</p>}
      {filtro.error && <p role="alert" className="p-2">{filtro.error}</p>}
      <h1 className="sr-only">Inventario de móviles</h1>

      <section
        aria-label="Filtros de móviles"
        className="mb-3 grid grid-cols-2 items-end gap-2 rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-3 lg:grid-cols-[minmax(14rem,2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_auto]"
      >
        <label className="grid gap-1 col-span-2 min-w-0 text-xs font-semibold text-[#006681] lg:col-span-1">
          Buscar móvil
          <CampoBusqueda
            value={busqueda}
            onChange={(event) => {
              setBusqueda(event.target.value);
              setPagina(1);
            }}
            placeholder="Usuario, modelo, serie, número o IMEI"
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

      {cargando || error || filtro.cargando || filtro.error ? null : filtrados.length === 0 ? (
        <div className="rounded-lg border border-[#D7D1BF] bg-[#F3F1EB] px-3 py-6 text-center">
          <h2 className="font-semibold text-[#61453F]">
            No se encontraron móviles
          </h2>
          <p className="mt-1 text-sm text-[#735956]">
            Cambia la búsqueda o limpia los filtros.
          </p>
        </div>
      ) : (
        <section
          aria-label="Móviles registrados"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {visibles.map((movil) => (
            <article
              key={movil.id}
              className="flex min-w-0 flex-col rounded-xl border border-[#9CCBD4] bg-[#C7E1E6] p-3 text-[#006681]"
            >
              {/* Nombre, marca y estado */}
              <div className="flex items-start gap-2">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DEECEF]">
                  <IconoMovil className="h-7 w-7" />
                </span>

                <div className="min-w-0 flex-1">
                  <h2
                    title={movil.nombre}
                    className="text-base font-bold leading-tight [overflow-wrap:anywhere]"
                  >
                    {movil.nombre}
                  </h2>

                  <p className="mt-0.5 text-sm">
                    {movil.marca}
                  </p>
                </div>

                <div
                  className={`flex shrink-0 flex-col items-center gap-1 ${
                    movil.estado === "Dañado"
                      ? "text-[#7A3500]"
                      : "text-[#006681]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      movil.estado === "Dañado"
                        ? "bg-[#FFDBAE] text-[#7A3500]"
                        : "bg-[#006681] text-white"
                    }`}
                  >
                    <IconoEstado
                      estado={movil.estado}
                      className="h-5 w-5"
                    />
                  </span>

                  <span className="text-xs font-semibold leading-tight">
                    {movil.estado}
                  </span>
                </div>
              </div>

              {/* Usuario */}
              <div className="my-3 min-w-0">
                <p className="text-sm font-bold">
                  Usuario
                </p>

                <p className="text-sm leading-tight [overflow-wrap:anywhere]">
                  {movil.usuario ?? "Sin usuario"}
                </p>
              </div>

              {/* Acciones centradas */}
              <div className="mt-auto flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSeleccion({ movil, vista: "detalles" })}
                  aria-label={`Ver detalles de ${movil.nombre}`}
                  title="Ver detalles"
                  className={botonAccion}
                >
                  <Icono nombre="detalle" className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSeleccion({ movil, vista: "historial" })}
                  aria-label={`Ver historial de ${movil.nombre}`}
                  title="Ver historial"
                  className={botonAccion}
                >
                  <Icono nombre="historial" className="h-5 w-5" />
                </button>
              </div>

              {/* Serie */}
              <p className="mt-2 text-right text-xs text-[#214F5B] [overflow-wrap:anywhere]">
                <span className="mr-1 font-bold">SN</span>
                {movil.serie}
              </p>
            </article>
          ))}
        </section>
      )}

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p
          role="status"
          className="text-xs text-[#61453F]"
        >
          Mostrando {desde}–{hasta} de {filtrados.length} móviles
        </p>

        {totalPaginas > 1 && (
          <nav
            aria-label="Paginación de móviles"
            className="flex flex-wrap items-center gap-1.5"
          >
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
                  className={`${botonPagina} ${
                    activa ? "bg-[#006681] text-white" : paginaInactiva
                  }`}
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
        )}
      </footer>

      {seleccion?.vista === "detalles" && detalle.cargando && <p role="status">Cargando detalles…</p>}
      {seleccion?.vista === "detalles" && !detalle.cargando && !detalle.registro && (
        <p role="alert">{detalle.error || "El recurso ya no está disponible."}</p>
      )}
      {seleccion?.vista === "detalles" && detalle.registro && (
        <MovilDetalleModal
          movil={adaptarMovil(detalle.registro)}
          onClose={() => setSeleccion(null)}
        />
      )}

      {seleccion?.vista === "historial" && (
        <HistorialEquipoModal
          equipo={seleccion.movil}
          recursoId={seleccion.movil.id}
          onClose={() => setSeleccion(null)}
        />
      )}
    </main>
  );
}
