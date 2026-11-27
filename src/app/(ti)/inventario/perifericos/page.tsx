"use client";

import CampoBusqueda from "@/components/CampoBusqueda";
import { useIdsFiltrados } from "@/lib/use-consulta-inventario";
import EstadoCatalogo from "@/components/EstadoCatalogo";
import { fichaTexto, useCatalogoTI } from "@/lib/catalogo-hcdl";
import { useState, useEffect, useRef } from "react";
import { Icono } from "@/components/inventario/EquipoDetalleModal";
import HistorialEquipoModal from "@/components/inventario/HistorialEquipoModal";

type TipoPeriferico = string;

type Periferico = {
  id: number;
  nombre: string;
  tipo: TipoPeriferico;
  marca: string;
  serie: string;
  estado: string;
  visible: boolean;
  usuario: { id: number; nombre: string } | null;
};

type GrupoUsuario = {
  id: number;
  nombre: string;
  perifericos: Periferico[];
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

function IconoPeriferico({
  tipo,
  className = "h-6 w-6",
}: {
  tipo: TipoPeriferico;
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
      {tipo === "Teclado" ? (
        <>
          <rect x="2" y="7" width="20" height="12" rx="2" />
          <path d="M6 11h.01M10 11h.01M14 11h.01M18 11h.01M6 15h.01M10 15h8M12 7V3h6" />
        </>
      ) : tipo === "Mouse" ? (
        <>
          <rect x="6" y="5" width="12" height="17" rx="6" />
          <path d="M12 5V2h5M12 8v4" />
        </>
      ) : (
        <>
          <rect x="2" y="3" width="20" height="14" rx="1" />
          <path d="M12 17v4M7 21h10" />
        </>
      )}
    </svg>
  );
}

function DetallePeriferico({
  periferico,
  onClose,
}: {
  periferico: Periferico;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const anterior = document.body.style.overflow;

    if (dialog && !dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="titulo-periferico"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border border-outline bg-surface-muted p-0 text-ink shadow-xl backdrop:bg-[#5A3835]/60"
    >
      <header className="flex items-center justify-between bg-brand-dark px-4 py-3 text-surface">
        <h2 id="titulo-periferico" className="font-semibold">
          Detalles del periférico
        </h2>

        <button
          type="button"
          autoFocus
          onClick={() => ref.current?.close()}
          aria-label="Cerrar detalles"
          className="rounded-full p-2 hover:bg-accent hover:text-ink"
        >
          <Icono nombre="cerrar" />
        </button>
      </header>

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-lg bg-brand-light p-4 text-brand-dark">
          <IconoPeriferico
            tipo={periferico.tipo}
            className="h-10 w-10 shrink-0"
          />

          <div>
            <h3 className="text-xl font-bold">
              {periferico.marca} {periferico.nombre}
            </h3>
            <p>{periferico.tipo}</p>
          </div>
        </div>

        <dl className="mt-4 divide-y divide-outline">
          {[
            ["Usuario", periferico.usuario?.nombre ?? "Sin asignar"],
            ["Marca", periferico.marca],
            ["Modelo", periferico.nombre],
            ["Número de serie", periferico.serie],
            ["Condición", periferico.estado],
            ["Visibilidad", periferico.visible ? "Visible" : "Oculto"],
          ].map(([etiqueta, valor]) => (
            <div
              key={etiqueta}
              className="grid grid-cols-[1fr_1.5fr] gap-3 py-3 text-sm"
            >
              <dt className="font-semibold text-brand-dark">{etiqueta}</dt>
              <dd className="min-w-0 break-words">{valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
}

export default function PerifericosPage() {
  const { catalogo, cargando, error, recargar } = useCatalogoTI();
  const perifericos: Periferico[] = catalogo.recursos.filter((r) => r.categoria === "periferico" && r.visible).map((r) => ({
    ...r, nombre: fichaTexto(r, "modelo") || r.nombre, tipo: r.tipo ?? "Sin tipo", marca: r.marca ?? "", serie: r.serie ?? "",
    usuario: r.usuarioId !== null && r.usuario ? { id: r.usuarioId, nombre: r.usuario } : null,
  }));
  const marcas = [...new Set(perifericos.map((r) => r.marca).filter(Boolean))].sort();
  const tipos = [...new Set(perifericos.map((r) => r.tipo))].sort();
  const [vista, setVista] = useState<"asignados" | "sinAsignar">("asignados");
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const [marca, setMarca] = useState("");
  const [pagina, setPagina] = useState(1);

  const [seleccion, setSeleccion] = useState<{
    periferico: Periferico;
    modal: "historial";
  } | null>(null);

  const esAsignados = vista === "asignados";
  const filtro = useIdsFiltrados("recursos", { q: busqueda, tipo: esAsignados ? "" : tipo, marca: esAsignados ? "" : marca }, "periferico");
  const coincide = (item: Periferico) => !filtro.hayFiltros || Boolean(filtro.ids?.has(item.id));

  // Agrupación por ID de usuario, no por nombre.
  const grupos = new Map<number, GrupoUsuario>();

  perifericos.forEach((item) => {
    if (!item.usuario) return;

    const grupo = grupos.get(item.usuario.id);

    if (grupo) {
      grupo.perifericos.push(item);
    } else {
      grupos.set(item.usuario.id, {
        ...item.usuario,
        perifericos: [item],
      });
    }
  });

  // Si coincide un periférico, se muestra la tarjeta completa del usuario.
  const usuariosFiltrados = [...grupos.values()].filter((grupo) =>
    grupo.perifericos.some(coincide),
  );

  const libresFiltrados = perifericos.filter(
    (item) =>
      item.usuario === null &&
      coincide(item),
  );

  const porPagina = esAsignados ? 8 : 16;

  const total = esAsignados
    ? usuariosFiltrados.length
    : libresFiltrados.length;

  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const actual = Math.min(pagina, paginas);
  const inicio = (actual - 1) * porPagina;

  const usuariosVisibles = usuariosFiltrados.slice(
    inicio,
    inicio + porPagina,
  );

  const libresVisibles = libresFiltrados.slice(
    inicio,
    inicio + porPagina,
  );

  function acciones(item: Periferico) {
    return (
      <button
        type="button"
        onClick={() =>
          setSeleccion({
            periferico: item,
            modal: "historial",
          })
        }
        title="Ver historial"
        aria-label={`Ver historial de ${item.marca} ${item.nombre}, serie ${item.serie}`}
        className={botonAccion}
      >
        <Icono nombre="historial" className="h-5 w-5" />
      </button>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-col px-3 py-3 text-sm text-[#61453F] sm:px-5 xl:h-full xl:min-h-0">
      <h1 className="sr-only">Inventario de periféricos</h1>

        <section
          aria-label="Filtros de periféricos"
          className={`grid shrink-0 grid-cols-2 items-end gap-2 rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-3 ${
            esAsignados
              ? "xl:grid-cols-[2fr_1fr_auto]"
              : "xl:grid-cols-[2fr_1fr_1fr_1fr_auto]"
          }`}
        >
          <label className="grid gap-1 col-span-2 min-w-0 text-xs font-semibold text-[#006681] xl:col-span-1">
            Buscar periférico
            <CampoBusqueda
              value={busqueda}
              onChange={(event) => {
                setBusqueda(event.target.value);
                setPagina(1);
              }}
              placeholder="Usuario, modelo, marca o número de serie"
              className={campo}
            />
          </label>

          <label className={`grid gap-1 min-w-0 text-xs font-semibold text-[#006681] ${esAsignados ? "" : "col-span-2 xl:col-span-1"}`}>
            Asignación
            <select
              value={vista}
              onChange={(event) => {
                setVista(event.target.value as "asignados" | "sinAsignar");
                setTipo("");
                setMarca("");
                setPagina(1);
              }}
              className={campo}
            >
              <option value="asignados">Asignados</option>
              <option value="sinAsignar">Sin asignar</option>
            </select>
          </label>

          {!esAsignados && (
            <>
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
                    <option key={valor} value={valor}>
                      {valor}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setTipo("");
              setMarca("");
              setPagina(1);
            }}
            className={`min-h-10 rounded-md bg-[#007C96] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#006681] [@media(pointer:coarse)]:min-h-11 ${esAsignados ? "" : "col-span-2 xl:col-span-1"} ${focoBoton}`}
          >
            Limpiar filtros
          </button>
        </section>

        <EstadoCatalogo cargando={cargando} error={error} reintentar={recargar} />
        {filtro.cargando && <p role="status" className="p-2">Buscando coincidencias…</p>}
        {filtro.error && <p role="alert" className="p-2">{filtro.error}</p>}

      <div className="mt-3 flex flex-col p-2 xl:min-h-0 xl:flex-1">
        {cargando || error ? null : total === 0 ? (
          <p className="rounded-lg border border-[#D7D1BF] bg-[#F3F1EB] px-3 py-6 text-center text-sm text-[#735956]">
            No se encontraron resultados en esta vista.
          </p>
        ) : esAsignados ? (
          <section
            aria-label="Periféricos agrupados por usuario"
            className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            {usuariosVisibles.map((grupo) => (
              <article
                key={grupo.id}
                className="min-w-0 overflow-hidden rounded-lg border border-[#9CCBD4] bg-[#C7E1E6]"
              >
                <header className="flex items-center justify-between gap-2 border-b border-[#9CCBD4] bg-[#84BDCB] px-2 py-2">
                  <h2
                    title={grupo.nombre}
                    className="min-w-0 truncate text-sm font-bold text-[#006681]"
                  >
                    {grupo.nombre}
                  </h2>

                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#006681] bg-[#006681] px-2.5 py-1 text-xs font-bold leading-none text-white">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="h-4 w-4"
                      >
                        <path d="m5 12 4 4L19 6" />
                      </svg>

                      Asignado
                    </span>
                </header>

                <ul className="divide-y divide-[#9CCBD4] px-2">
                  {grupo.perifericos.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 py-2"
                    >
                      <span className="shrink-0 text-[#006681]">
                        <IconoPeriferico tipo={item.tipo} />
                      </span>

                      <div className="min-w-0 flex-1 text-[#006681]">
                        <p
                          title={`${item.marca} ${item.nombre}`}
                          className="truncate text-xs font-bold"
                        >
                          {item.marca} {item.nombre}
                        </p>

                        <p className="text-xs">{item.tipo}</p>

                        <p className="text-xs text-[#214F5B] [overflow-wrap:anywhere]">
                          <span className="mr-1 font-bold text-[#5A3835]">
                            SN
                          </span>
                          {item.serie}
                        </p>
                      </div>

                      {acciones(item)}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        ) : (
          <section
            aria-label="Periféricos sin asignar"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            {libresVisibles.map((item) => (
              <article
                key={item.id}
                className="min-w-0 rounded-lg border border-[#9CCBD4] bg-[#C7E1E6] p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DEECEF] text-[#006681]">
                    <IconoPeriferico tipo={item.tipo} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-[#006681]">
                      {item.marca} {item.nombre}
                    </h2>
                    <p className="text-sm text-[#006681]">{item.tipo}</p>
                  </div>

                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E8B679] bg-[#FFDBAE] px-2.5 py-1 text-xs font-bold leading-none text-[#7A3500]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        aria-hidden="true"
                        className="h-4 w-4"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="m6 6 12 12" />
                      </svg>

                      Sin asignar
                    </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  {acciones(item)}

                    <p className="text-xs text-[#214F5B] [overflow-wrap:anywhere]">
                      <span className="mr-1 font-bold text-[#5A3835]">
                        SN
                      </span>
                      {item.serie}
                    </p>
                </div>
              </article>
            ))}
          </section>
        )}

        <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-3 pt-3">
          <p role="status" className="text-xs text-[#61453F]">
            Mostrando {total === 0 ? 0 : inicio + 1}–
            {Math.min(inicio + porPagina, total)} de {total}{" "}
            {esAsignados ? "usuarios" : "periféricos"}
          </p>

          <nav
            aria-label="Paginación de periféricos"
            className="ml-auto flex flex-wrap items-center gap-1.5"
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

            {Array.from({ length: paginas }, (_, indice) => {
              const numero = indice + 1;
              const activa = numero === actual;

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
              disabled={actual === paginas}
              onClick={() => setPagina(actual + 1)}
              aria-label="Página siguiente"
              className={paginaFlecha}
            >
              ›
            </button>
          </nav>
        </footer>
      </div>

      {seleccion?.modal === "historial" && (
        <HistorialEquipoModal
          equipo={{
            nombre: `${seleccion.periferico.marca} ${seleccion.periferico.nombre}`,
            serie: seleccion.periferico.serie,
            tipo: seleccion.periferico.tipo,
          }}
          recursoId={seleccion.periferico.id}
          onClose={() => setSeleccion(null)}
        />
      )}
    </main>
  );
}
