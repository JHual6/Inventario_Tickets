"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useConsultaInventario } from "@/lib/use-consulta-inventario";
import CampoBusqueda from "@/components/CampoBusqueda";
import { enviarHcdl, listarHcdl, mensajeHcdl, type Pagina } from "@/lib/api-hcdl";

type Estado = "Pendiente" | "En atención" | "En espera" | "Resuelto";
type Prioridad = "Baja" | "Media" | "Alta";
type Vista = "pendientes" | "resueltos" | "crear";
type VistaModalTicket = "detalle" | "historial" | "actualizar";

type Usuario = {
  id: number;
  nombre: string;
  sector: string;
  activo: boolean;
};

type Recurso = {
  id: number;
  nombre: string;
  serie: string;
  tipo: string;
  usuarioId: number | null;
  sector: string;
  sectorId: number | null;
  otroSector: boolean;
};

type Actualizacion = {
  id: string;
  fecha: string;
  autor: string;
  tipo: string;
  observacion: string;
  cambios: string[];
};

type Ticket = {
  id: string;
  numero: string;
  titulo: string;
  descripcion: string;
  solicitante: string;
  sector: string;
  creadoPor: string;
  prioridad: Prioridad;
  estado: Estado;
  responsable: string;
  responsableId: string;
  recursos: RecursoTicket[];
  fechaCreacion: string;
  fechaResolucion: string | null;
  historial: Actualizacion[];
};

type Tecnico = { id: number; nombre: string };
type RecursoTicket = Pick<Recurso, "id" | "nombre" | "serie" | "tipo" | "sector">;
type RecursoApi = { [Clave in keyof Recurso]: Recurso[Clave] | null } & { id: number };
type TicketApi = {
  id: number;
  titulo: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: Estado;
  solicitante: string;
  sector: string;
  tecnico: string | null;
  tecnicoId: number | null;
  recursos: RecursoApi[];
  fechaCreacion: string;
  fechaResolucion: string | null;
  historial: {
    id: number; fecha: string; estado: Estado; evento: string;
    observacion: string | null; autor: string | null;
  }[];
};

const tiposEvento: Record<string, string> = {
  creacion: "Creación", actualizacion: "Actualización", resolucion: "Resolución",
};

function adaptarRecurso(recurso: RecursoApi): Recurso {
  return {
    id: recurso.id, nombre: recurso.nombre ?? "", serie: recurso.serie ?? "",
    tipo: recurso.tipo ?? "Sin tipo", sector: recurso.sector ?? "", usuarioId: recurso.usuarioId ?? null,
    sectorId: recurso.sectorId ?? null, otroSector: recurso.otroSector ?? false,
  };
}

function adaptarTicket(ticket: TicketApi): Ticket {
  return {
    ...ticket,
    id: String(ticket.id),
    numero: `TK-${String(ticket.id).padStart(4, "0")}`,
    responsable: ticket.tecnico ?? "",
    responsableId: ticket.tecnicoId == null ? "" : String(ticket.tecnicoId),
    creadoPor: ticket.historial.find((evento) => evento.evento === "creacion")?.autor ?? "Sin registro",
    recursos: ticket.recursos.map(adaptarRecurso),
    historial: ticket.historial.map((evento) => ({
      id: String(evento.id), fecha: evento.fecha, autor: evento.autor ?? "Sin registro",
      tipo: tiposEvento[evento.evento] ?? evento.evento,
      observacion: evento.observacion ?? "", cambios: [`Estado: ${evento.estado}`],
    })),
  };
}

const estados: Estado[] = [
  "Pendiente",
  "En atención",
  "En espera",
  "Resuelto",
];

const prioridades: Prioridad[] = ["Baja", "Media", "Alta"];

const etiquetaFiltro = "grid min-w-0 gap-1 text-xs font-semibold text-brand-dark";
const campoFiltro =
  "min-h-10 w-full min-w-0 rounded-md border border-[#9CCBD4] bg-white px-3 py-2 text-base font-normal " +
  "text-brand-dark placeholder:text-[#39798A] focus-visible:outline-2 focus-visible:outline-[#007C96] sm:text-sm";

const boton =
  "rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white " +
  "transition-colors hover:bg-accent hover:text-ink " +
  "disabled:cursor-not-allowed disabled:opacity-40";

const focoBoton = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006681]";
const botonPagina =
  "grid h-8 min-w-8 place-items-center rounded-md border border-[#9CCBD4] px-1 text-sm font-semibold transition-colors " +
  "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11 " + focoBoton;
const paginaInactiva = "bg-[#DEECEF] text-[#006681] enabled:hover:bg-[#C7E1E6]";
const paginaFlecha = botonPagina + " " + paginaInactiva + " disabled:cursor-not-allowed disabled:opacity-40";

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fecha(valor: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(valor));
}

const rutaTickets = "/portal/tickets";

export default function TicketsHcdl({ esTI, nuevo = false, creado, verResueltos = false }: {
  esTI: boolean;
  nuevo?: boolean;
  creado?: string;
  verResueltos?: boolean;
}) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const [version, recargar] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    Promise.all([
      esTI ? listarHcdl<Usuario>("usuarios", controlador.signal) : [],
      esTI || nuevo ? listarHcdl<RecursoApi>(esTI ? "recursos" : "tickets/recursos", controlador.signal) : [],
      esTI ? listarHcdl<Tecnico>("tecnicos", controlador.signal) : [],
    ]).then(([usuarios, recursos, tecnicos]) => {
      if (controlador.signal.aborted) return;
      setUsuarios(usuarios.filter((usuario) => usuario.activo));
      setRecursos(recursos.map(adaptarRecurso));
      setTecnicos(tecnicos);
      setErrorCarga("");
      setCargando(false);
    }).catch((error) => {
      if (controlador.signal.aborted) return;
      setErrorCarga(mensajeHcdl(error));
      setCargando(false);
    });
    return () => controlador.abort();
  }, [esTI, nuevo, version]);
  const [vista, setVista] = useState<Vista>(nuevo ? "crear" : verResueltos ? "resueltos" : "pendientes");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [sector, setSector] = useState("");
  const [responsable, setResponsable] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [mensaje, setMensaje] = useState(creado ? `Ticket TK-${creado.padStart(4, "0")} creado correctamente.` : "");
  const [modal, setModal] = useState<{
    id: string;
    vista: VistaModalTicket;
  } | null>(null);

  const consulta = new URLSearchParams({ resueltos: vista === "resueltos" ? "true" : "false", version: String(version) });
  for (const [clave, valor] of Object.entries({
    q: busqueda.trim(), estado: vista === "pendientes" ? estado : "", prioridad,
    sector, tecnico: responsable, desde, hasta,
  })) {
    if (valor) consulta.set(clave, valor);
  }
  const listado = useConsultaInventario<TicketApi[]>(vista === "crear" ? null : `tickets?${consulta}`, listarHcdl);
  const detalle = useConsultaInventario<Pagina<TicketApi>>(modal ? `tickets?id=${modal.id}&version=${version}` : null);
  const registro = detalle.datos?.datos[0];
  const seleccionado = registro ? adaptarTicket(registro) : undefined;
  const sectores = Array.from(new Set(usuarios.map((usuario) => usuario.sector))).sort();
  const filtrados = listado.datos ?? [];
  const porPagina = 8;
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;
  const visibles = filtrados.slice(inicio, inicio + porPagina).map(adaptarTicket);

  function limpiarFiltros() {
    setBusqueda("");
    setEstado("");
    setPrioridad("");
    setSector("");
    setResponsable("");
    setDesde("");
    setHasta("");
    setPagina(1);
  }

  async function guardarActualizacion(id: string, cambios: {
    estado: Estado; prioridad: Prioridad; responsable: string; observacion: string;
  }) {
    if (!esTI || guardando) return;
    setGuardando(true);
    setErrorModal("");
    try {
      await enviarHcdl(`tickets/${id}/gestion`, {
        estado: cambios.estado, prioridad: cambios.prioridad, observacion: cambios.observacion,
        tecnicoId: cambios.responsable ? Number(cambios.responsable) : null,
      }, "PATCH");
      setModal(null);
      recargar((actual) => actual + 1);
      setMensaje(cambios.estado === "Resuelto" ? "Ticket resuelto. Puedes consultarlo en Resueltos."
        : "Actualización registrada en el historial.");
    } catch (error) {
      setErrorModal(mensajeHcdl(error));
    } finally {
      setGuardando(false);
    }
  }

  async function crearTicket(datos: {
    solicitanteId?: number; titulo: string; descripcion: string; prioridad: Prioridad; recursosIds: number[];
  }) {
    if (guardando) return;
    setGuardando(true);
    setMensaje("");
    try {
      const ticket = await enviarHcdl<{ id: number }>("tickets", {
        titulo: datos.titulo, descripcion: datos.descripcion, prioridad: datos.prioridad,
        ...(esTI
          ? { usuarioId: datos.solicitanteId, recursosIds: datos.recursosIds }
          : { recursoId: datos.recursosIds[0] }),
      });
      if (!esTI) {
        router.replace(`${rutaTickets}?creado=${ticket.id}`);
        return;
      }
      recargar((actual) => actual + 1);
      limpiarFiltros();
      setVista("pendientes");
      setMensaje("Ticket creado correctamente.");
    } catch (error) {
      setMensaje(mensajeHcdl(error));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {!esTI && <h1 className="sr-only">{nuevo ? "Crear ticket" : "Mis solicitudes"}</h1>}
      <nav
        aria-label="Secciones de tickets"
        className="shrink-0 border-b border-outline bg-surface"
      >
        <div className="flex gap-2 px-3 py-2 sm:px-5">
          {[
            { id: "pendientes" as const, nombre: "Pendientes" },
            { id: "resueltos" as const, nombre: "Resueltos" },
            { id: "crear" as const, nombre: "Crear ticket" },
          ].map((item) => {
            const activa = vista === item.id;
            const clase = `min-w-0 flex-1 rounded-md px-2 py-2 text-center text-sm font-medium transition-colors hover:bg-accent hover:text-ink sm:px-3 ${activa ? "bg-brand text-white" : "text-brand-dark"}`;
            const destino = esTI ? null : item.id === "crear" ? `${rutaTickets}/nuevo`
              : nuevo ? `${rutaTickets}${item.id === "resueltos" ? "?vista=resueltos" : ""}` : null;
            if (destino) {
              return <Link key={item.id} href={destino} className={clase} aria-current={activa ? "page" : undefined}>{item.nombre}</Link>;
            }
            return (
              <button key={item.id} type="button" aria-current={activa ? "page" : undefined} className={clase}
                onClick={() => {
                  setVista(item.id);
                  limpiarFiltros();
                  setMensaje("");
                }}>
                {item.nombre}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-2 sm:p-3">
        {mensaje && (
          <p
            role="status"
            className="shrink-0 rounded-lg border border-[#9CCBD4] bg-brand-pale p-3 text-sm text-brand-dark"
          >
            {mensaje}
          </p>
        )}

        {cargando ? (
          <p role="status" className="p-3 text-sm text-brand-dark">{nuevo ? "Cargando formulario…" : "Cargando tickets…"}</p>
        ) : errorCarga ? (
          <p role="alert" className="p-3 text-sm text-ink">{errorCarga}</p>
        ) : vista === "crear" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <FormularioTicket esTI={esTI} onCrear={crearTicket} usuarios={usuarios} recursos={recursos} guardando={guardando} />
          </div>
        ) : (
          <>
            <section
              aria-label="Filtros de tickets"
              className="max-h-[40dvh] shrink-0 overflow-y-auto rounded-xl border border-[#C7E1E6] bg-brand-pale p-3"
            >
              <div className="grid items-end gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <label className={etiquetaFiltro}>
                  Buscar ticket
                  <CampoBusqueda
                    value={busqueda}
                    onChange={(event) => {
                      setBusqueda(event.target.value);
                      setPagina(1);
                    }}
                    placeholder="Número, título, usuario o serie"
                    className={campoFiltro}
                  />
                </label>

                <label className={etiquetaFiltro}>
                  Prioridad
                  <select
                    value={prioridad}
                    onChange={(event) => {
                      setPrioridad(event.target.value);
                      setPagina(1);
                    }}
                    className={campoFiltro}
                  >
                    <option value="">Todas las prioridades</option>
                    {prioridades.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                {esTI && <>
                <label className={etiquetaFiltro}>
                  Sector
                  <select
                    value={sector}
                    onChange={(event) => {
                      setSector(event.target.value);
                      setPagina(1);
                    }}
                    className={campoFiltro}
                  >
                    <option value="">Todos los sectores</option>
                    {sectores.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className={etiquetaFiltro}>
                  Responsable
                  <select
                    value={responsable}
                    onChange={(event) => {
                      setResponsable(event.target.value);
                      setPagina(1);
                    }}
                    className={campoFiltro}
                  >
                    <option value="">Todos los responsables</option>
                    <option value="sin-asignar">Sin asignar</option>
                    {tecnicos.map((item) => (
                      <option key={item.id} value={item.id}>{item.nombre}</option>
                    ))}
                  </select>
                </label>

                </>}

                {vista === "pendientes" && (
                  <label className={etiquetaFiltro}>
                    Estado
                    <select
                      value={estado}
                      onChange={(event) => {
                        setEstado(event.target.value);
                        setPagina(1);
                      }}
                      className={campoFiltro}
                    >
                      <option value="">Todos los estados</option>
                      {estados
                        .filter((item) => item !== "Resuelto")
                        .map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                    </select>
                  </label>
                )}

                <label className={etiquetaFiltro}>
                  {vista === "resueltos" ? "Resolución desde" : "Creación desde"}
                  <input
                    type="date"
                    value={desde}
                    max={hasta || undefined}
                    onChange={(event) => {
                      setDesde(event.target.value);
                      setPagina(1);
                    }}
                    className={campoFiltro}
                  />
                </label>

                <label className={etiquetaFiltro}>
                  Hasta
                  <input
                    type="date"
                    value={hasta}
                    min={desde || undefined}
                    onChange={(event) => {
                      setHasta(event.target.value);
                      setPagina(1);
                    }}
                    className={campoFiltro}
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className={`${boton} min-h-10 w-full`}
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </section>

            <section
              aria-label="Listado de tickets"
              className="min-h-0 flex-1 overflow-auto rounded-xl border border-[#9CCBD4] bg-surface-muted"
            >
              <table className={`w-full text-left text-sm text-brand-dark ${esTI ? "min-w-[1000px]" : ""}`}>
                <thead className="sticky top-0 z-10 bg-brand text-white">
                  <tr>
                    <th scope="col" className="px-3 py-3 font-semibold sm:px-4">Ticket</th>
                    {esTI && <th scope="col" className="px-4 py-3 font-semibold">Solicitante</th>}
                    <th scope="col" className={`px-4 py-3 font-semibold ${esTI ? "" : "hidden md:table-cell"}`}>Prioridad</th>
                    <th scope="col" className={`px-4 py-3 font-semibold ${esTI ? "" : "hidden sm:table-cell"}`}>Estado</th>
                    <th scope="col" className={`px-4 py-3 font-semibold ${esTI ? "" : "hidden lg:table-cell"}`}>Responsable</th>
                    <th scope="col" className={`px-4 py-3 font-semibold ${esTI ? "" : "hidden lg:table-cell"}`}>
                      {vista === "resueltos" ? "Resolución" : "Creación"}
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold sm:px-4">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#9CCBD4]">
                  {visibles.map((ticket) => (
                    <tr key={ticket.id} className="align-middle hover:bg-brand-pale">
                      <td className="max-w-[260px] break-words px-3 py-3 sm:px-4">
                        <p className="text-xs font-bold">{ticket.numero}</p>
                        <p className="mt-1 font-semibold">{ticket.titulo}</p>
                        <p className="mt-1 text-xs text-brand-medium">
                          {ticket.recursos.length === 0
                            ? "Sin recurso asociado"
                            : ticket.recursos
                                .map((item) => item.nombre)
                                .join(", ")}
                        </p>
                        {!esTI && (
                          <div className="mt-2 flex flex-wrap items-center gap-1 md:hidden">
                            <span className="sm:hidden"><Insignia texto={ticket.estado} /></span>
                            <Insignia texto={ticket.prioridad} />
                          </div>
                        )}
                      </td>

                      {esTI && <td className="px-4 py-3">
                        <p className="font-medium">
                          {ticket.solicitante}
                        </p>
                        <p className="mt-1 text-xs text-brand-medium">
                          {ticket.sector}
                        </p>
                      </td>}

                      <td className={`px-4 py-3 ${esTI ? "" : "hidden md:table-cell"}`}>
                        <Insignia texto={ticket.prioridad} />
                      </td>

                      <td className={`px-4 py-3 ${esTI ? "" : "hidden sm:table-cell"}`}>
                        <Insignia texto={ticket.estado} />
                      </td>

                      <td className={`px-4 py-3 ${esTI ? "" : "hidden lg:table-cell"}`}>
                        {ticket.responsable || "Sin asignar"}
                      </td>

                      <td className={`whitespace-nowrap px-4 py-3 text-xs ${esTI ? "" : "hidden lg:table-cell"}`}>
                        {fecha(
                          vista === "resueltos"
                            ? ticket.fechaResolucion!
                            : ticket.fechaCreacion,
                        )}
                      </td>

                      <td className="w-px px-3 py-3 sm:px-4">
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                          <button
                            type="button"
                            title="Ver detalle"
                            aria-label={`Ver detalle de ${ticket.numero}`}
                            onClick={() =>
                              setModal({ id: ticket.id, vista: "detalle" })
                            }
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                          >
                            <IconoAccionTicket tipo="detalle" />
                          </button>
                          
                          <button
                            type="button"
                            title="Ver historial"
                            aria-label={`Ver historial de ${ticket.numero}`}
                            onClick={() =>
                              setModal({ id: ticket.id, vista: "historial" })
                            }
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                          >
                            <IconoAccionTicket tipo="historial" />
                          </button>
                          
                          {esTI && ticket.estado !== "Resuelto" && (
                            <button
                              type="button"
                              title="Actualizar ticket"
                              aria-label={`Actualizar ${ticket.numero}`}
                              onClick={() =>
                                setModal({ id: ticket.id, vista: "actualizar" })
                              }
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                            >
                              <IconoAccionTicket tipo="actualizar" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {visibles.length === 0 && (
                    <tr>
                      <td colSpan={esTI ? 7 : 6} className="px-4 py-12 text-center">
                        {listado.cargando ? "Cargando tickets…" : listado.error || "No se encontraron tickets con estos filtros."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3">
              <p role="status" className="text-xs text-[#61453F]">
                Mostrando {filtrados.length ? inicio + 1 : 0}–
                {inicio + visibles.length} de {filtrados.length} tickets
              </p>

              <nav
                aria-label="Paginación de tickets"
                className="ml-auto flex flex-wrap gap-1.5"
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

                {Array.from({ length: totalPaginas }, (_, indice) => (
                  <button
                    key={indice + 1}
                    type="button"
                    onClick={() => setPagina(indice + 1)}
                    aria-label={`Página ${indice + 1}`}
                    aria-current={paginaActual === indice + 1 ? "page" : undefined}
                    className={`${botonPagina} ${
                      paginaActual === indice + 1 ? "bg-[#006681] text-white" : paginaInactiva
                    }`}
                  >
                    {indice + 1}
                  </button>
                ))}

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
          </>
        )}
      </div>

      {modal && (detalle.cargando || detalle.error || !seleccionado) && (
        <ModalTicket titulo="Consultar ticket" vista={modal.vista} onClose={() => setModal(null)}>
          <p role={detalle.error ? "alert" : "status"}>
            {detalle.cargando ? "Cargando ticket…" : detalle.error || "Ticket no encontrado."}
          </p>
        </ModalTicket>
      )}

      {modal && seleccionado && (
        <ModalTicket
          vista={modal.vista}
          titulo={`${seleccionado.numero} · ${
            modal.vista === "detalle"
              ? "Detalle"
              : modal.vista === "historial"
                ? "Historial de actualizaciones"
                : "Actualizar ticket"
          }`}
          onClose={() => { setModal(null); setErrorModal(""); }}
        >
          {modal.vista === "detalle" ? (
            <DetalleTicket ticket={seleccionado} />
          ) : modal.vista === "historial" ? (
            <HistorialTicket ticket={seleccionado} />
          ) : esTI ? (
            <ActualizarTicket
              ticket={seleccionado}
              onGuardar={guardarActualizacion}
              tecnicos={tecnicos} guardando={guardando} error={errorModal}
            />
          ) : null}
        </ModalTicket>
      )}
    </main>
  );
}

function Insignia({ texto }: { texto: string }) {
  const estilo =
    texto === "Alta"
      ? "bg-[#B95710] text-white"
      : texto === "En espera"
        ? "bg-[#FF9024] text-[#5A3835]"
        : texto === "Resuelto"
          ? "bg-[#006681] text-white"
          : "bg-[#C7E1E6] text-[#006681]";

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${estilo}`}
    >
      {texto}
    </span>
  );
}

function ModalTicket({
  titulo,
  vista,
  children,
  onClose,
}: {
  titulo: string;
  vista: VistaModalTicket;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;

    if (dialog && !dialog.open) dialog.showModal();

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="titulo-modal-ticket"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="fixed inset-0 m-auto max-h-[94dvh] w-[calc(100%-1rem)] max-w-5xl overflow-hidden rounded-2xl border border-[#9CCBD4] bg-[#F3F1EB] p-0 text-[#61453F] shadow-xl backdrop:bg-black/50 sm:w-[calc(100%-3rem)]"
    >
      <div className="flex max-h-[94dvh] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 bg-brand-dark px-4 py-2.5 text-surface sm:px-6">
          <h2 id="titulo-modal-ticket" className="flex min-w-0 items-center gap-2 text-base font-semibold [&>svg]:shrink-0">
            <IconoAccionTicket tipo={vista} />
            <span className="min-w-0 wrap-anywhere">{titulo}</span>
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
              className="size-5"
            >
              <path d="m5 5 14 14M19 5 5 19" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-5 sm:px-7 sm:pb-7">
          {children}
        </div>
      </div>
    </dialog>
  );
}

function DetalleTicket({ ticket }: { ticket: Ticket }) {
  const asociados = ticket.recursos;

  const resolucion = [...ticket.historial]
    .reverse()
    .find((evento) => evento.tipo === "Resolución");

  const datos = [
    {
      etiqueta: "Solicitante",
      valor: ticket.solicitante,
    },
    {
      etiqueta: "Sector",
      valor: ticket.sector,
    },
    {
      etiqueta: "Responsable",
      valor: ticket.responsable || "Sin asignar",
    },
    {
      etiqueta: "Prioridad",
      valor: ticket.prioridad,
    },
    {
      etiqueta: "Fecha de creación",
      valor: fecha(ticket.fechaCreacion),
    },
    {
      etiqueta: "Fecha de resolución",
      valor: ticket.fechaResolucion
        ? fecha(ticket.fechaResolucion)
        : "Sin resolver",
    },
  ];

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h3 className="break-words text-xl font-bold text-brand-dark sm:text-2xl">
            {ticket.titulo}
          </h3>

          <div className="mt-3">
            <Insignia texto={ticket.estado} />
          </div>
        </div>

        <div className="self-start sm:self-auto">
          <IndicadorPrioridad valor={ticket.prioridad} />
        </div>
      </section>

      <section className="rounded-xl border border-[#D7D1BF] bg-[#EFEADC] p-4 sm:p-5">
        <dl className="grid grid-cols-1 gap-x-5 gap-y-5 text-center sm:grid-cols-3">
          {datos.map((dato) => (
            <div key={dato.etiqueta} className="min-w-0">
              <dt className="font-bold text-[#61453F]">
                {dato.etiqueta}
              </dt>
              <dd className="mt-1 break-words text-[#735956]">
                {dato.valor}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-5 border-t border-[#D7D1BF] pt-3 text-center text-xs text-[#735956]">
          Registrado por: {ticket.creadoPor}
        </p>
      </section>

      <section className="rounded-xl border border-[#D7D1BF] bg-[#EFEADC] p-4 sm:p-5">
        <h3 className="mb-2 text-lg font-bold text-[#61453F]">
          Descripción
        </h3>

        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#735956] sm:text-base">
          {ticket.descripcion}
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-xl font-bold text-brand-dark">
          Recursos relacionados
        </h3>

        {asociados.length ? (
          <ul className="space-y-3">
            {asociados.map((recurso) => (
              <li
                key={recurso.id}
                className="rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-4"
              >
                <h4 className="text-lg font-bold text-brand-dark">
                  {recurso.nombre}
                </h4>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-brand">
                  <span>{recurso.tipo}</span>
                  <span className="border-l border-[#9CCBD4] pl-4">
                    {recurso.sector}
                  </span>
                </div>

                <p className="mt-2 break-all text-sm text-brand-medium">
                  <strong className="mr-2 text-brand-dark">SN</strong>
                  {recurso.serie}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-4 text-sm text-brand-dark">
            Este ticket no tiene recursos asociados.
          </p>
        )}
      </section>

      {ticket.estado === "Resuelto" && resolucion && (
        <section className="rounded-xl border border-[#9CCBD4] bg-[#C7E1E6] p-4 sm:p-5">
          <h3 className="mb-2 text-lg font-bold text-brand-dark">
            Solución aplicada
          </h3>

          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-brand-dark">
            {resolucion.observacion}
          </p>

          <p className="mt-3 text-xs text-brand-dark">
            Por {resolucion.autor} · {fecha(resolucion.fecha)}
          </p>
        </section>
      )}
    </div>
  );
}

function HistorialTicket({ ticket }: { ticket: Ticket }) {
  return (
    <ol className="space-y-4">
      {[...ticket.historial].reverse().map((evento) => (
        <li
          key={evento.id}
          className="rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-4 sm:p-5"
        >
          <div className="grid gap-4 lg:grid-cols-[72px_1fr_1.2fr]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-dark text-white lg:h-18 lg:w-18">
              <IconoTicket
                tipo={
                  evento.tipo === "Creación"
                    ? "creacion"
                    : "actualizacion"
                }
              />
            </span>

            <div className="min-w-0">
              <h3 className="text-xl font-bold text-brand-dark">
                {evento.tipo}
              </h3>

              <p className="mt-1 text-sm font-semibold text-brand">
                Por: {evento.autor}
              </p>

              {evento.cambios.length > 0 && (
                <dl className="mt-3 space-y-2 text-sm">
                  {evento.cambios.map((cambio, indice) => {
                    const separador = cambio.indexOf(":");
                    const etiqueta =
                      separador >= 0
                        ? cambio.slice(0, separador)
                        : "Cambio";
                    const valor =
                      separador >= 0
                        ? cambio.slice(separador + 1).trim()
                        : cambio;

                    return (
                      <div
                        key={indice}
                        className="grid gap-1 sm:grid-cols-[100px_1fr]"
                      >
                        <dt className="font-bold text-brand-dark">
                          {etiqueta}
                        </dt>
                        <dd className="break-words text-brand-medium">
                          {valor}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </div>

            <div className="min-w-0">
              <time
                dateTime={evento.fecha}
                className="mb-3 block text-sm font-medium text-brand-medium lg:text-right"
              >
                {fecha(evento.fecha)}
              </time>

              <h4 className="text-sm font-bold text-brand">
                Observaciones
              </h4>

              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-brand-medium">
                {evento.observacion}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ActualizarTicket({
  ticket,
  onGuardar, tecnicos, guardando, error,
}: {
  ticket: Ticket;
  tecnicos: Tecnico[];
  guardando: boolean;
  error: string;
  onGuardar: (
    id: string,
    cambios: {
      estado: Estado;
      prioridad: Prioridad;
      responsable: string;
      observacion: string;
    },
  ) => void;
}) {
  const [estado, setEstado] = useState<Estado>(ticket.estado);
  const [prioridad, setPrioridad] = useState<Prioridad>(ticket.prioridad);
  const [responsable, setResponsable] = useState(ticket.responsableId);
  const [observacion, setObservacion] = useState("");

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!observacion.trim()) return;

    onGuardar(ticket.id, {
      estado,
      prioridad,
      responsable,
      observacion,
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-4">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold text-brand-dark">
            {ticket.titulo}
          </h3>
          <p className="mt-1 text-sm text-brand-medium">
            {ticket.solicitante} · {ticket.sector}
          </p>
        </div>

        <Insignia texto={ticket.estado} />
      </section>

      <BloqueFormulario numero="1" titulo="Gestión del ticket">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#61453F]">
            Nuevo estado
            <select
              value={estado}
              onChange={(event) =>
                setEstado(event.target.value as Estado)
              }
              className={campoTicket}
            >
              {estados.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-[#61453F]">
            Prioridad
            <select
              value={prioridad}
              onChange={(event) =>
                setPrioridad(event.target.value as Prioridad)
              }
              className={campoTicket}
            >
              {prioridades.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-[#61453F] sm:col-span-2">
            Responsable TI
            <select
              value={responsable}
              onChange={(event) =>
                setResponsable(event.target.value)
              }
              className={campoTicket}
            >
              <option value="">Sin asignar</option>
              {ticket.responsableId && !tecnicos.some((item) => String(item.id) === ticket.responsableId) && (
                <option value={ticket.responsableId}>{ticket.responsable}</option>
              )}
              {tecnicos.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
          </label>
        </div>
      </BloqueFormulario>

      <BloqueFormulario
        numero="2"
        titulo={
          estado === "Resuelto"
            ? "Solución aplicada"
            : "Registro de la atención"
        }
      >
        <label className="block text-sm font-semibold text-[#61453F]">
          {estado === "Resuelto" ? "Solución" : "Observación"}
          <textarea
            required
            rows={5}
            maxLength={2000}
            value={observacion}
            onChange={(event) =>
              setObservacion(event.target.value)
            }
            placeholder={
              estado === "Resuelto"
                ? "Describe la solución y las pruebas realizadas."
                : "Describe lo realizado o el motivo de la actualización."
            }
            className={`${campoTicket} resize-y`}
          />
        </label>

        <p className="mt-2 text-xs text-[#735956]">
          La actualización quedará registrada en el historial.
        </p>
      </BloqueFormulario>

      {error && <p role="alert" className="text-sm text-ink">{error}</p>}
      <div className="flex justify-center pt-1">
        <button
          type="submit"
          disabled={guardando || !observacion.trim()}
          className="min-h-11 w-full rounded-full bg-brand-dark px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-72"
        >
          {estado === "Resuelto"
            ? "Resolver ticket y guardar"
            : "Guardar actualización"}
        </button>
      </div>
    </form>
  );
}

function FormularioTicket({
  onCrear, usuarios, recursos, guardando, esTI,
}: {
  esTI: boolean;
  usuarios: Usuario[];
  recursos: Recurso[];
  guardando: boolean;
  onCrear: (datos: {
    solicitanteId?: number;
    titulo: string;
    descripcion: string;
    prioridad: Prioridad;
    recursosIds: number[];
  }) => void;
}) {
  const [usuarioId, setUsuarioId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("Media");
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [buscarRecurso, setBuscarRecurso] = useState("");
  const [todosLosRecursos, setTodosLosRecursos] = useState(false);
  const [sectorReporte, setSectorReporte] = useState("mi-sector");

  const usuario = usuarios.find(
    (item) => item.id === Number(usuarioId),
  );

  const otrosSectores = new Map<number, string>();
  if (!esTI) {
    for (const recurso of recursos) {
      if (recurso.otroSector && recurso.sectorId !== null) {
        otrosSectores.set(recurso.sectorId, recurso.sector);
      }
    }
  }
  const sectoresOrdenados = [...otrosSectores].sort((a, b) => a[1].localeCompare(b[1], "es-CL"));
  const textoBusqueda = normalizar(buscarRecurso.trim());
  const disponibles = recursos.filter((recurso) => {
    if (esTI && !todosLosRecursos) {
      const propio = recurso.usuarioId === usuario?.id;
      const delSector = recurso.usuarioId === null && recurso.sector === usuario?.sector;
      if (!propio && !delSector) return false;
    }
    if (!esTI) {
      if (sectorReporte === "mi-sector" && recurso.otroSector) return false;
      if (sectorReporte !== "mi-sector" && !recurso.otroSector) return false;
      if (sectorReporte !== "mi-sector" && sectorReporte !== "otros" &&
          String(recurso.sectorId) !== sectorReporte) return false;
    }
    return normalizar(
      `${recurso.nombre} ${recurso.serie} ${recurso.tipo} ${recurso.sector}`,
    ).includes(textoBusqueda);
  });

  const recursosElegidos = recursos.filter((recurso) =>
    seleccionados.includes(recurso.id),
  );

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if ((esTI && !usuario) || !titulo.trim() || !descripcion.trim()) return;

    onCrear({
      solicitanteId: usuario?.id,
      titulo,
      descripcion,
      prioridad,
      recursosIds: [...seleccionados],
    });
  }

  return (
    <form
      onSubmit={enviar}
      className="mx-auto max-w-5xl space-y-5 rounded-2xl border border-outline bg-[#F3F1EB] p-4 sm:p-6"
    >
      <CabeceraTicket
        titulo="Crear ticket"
        subtitulo="Registrar una solicitud de soporte"
      />

      {esTI && <BloqueFormulario numero="1" titulo="Datos del solicitante">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#61453F]">
            Solicitante
            <select
              required
              value={usuarioId}
              onChange={(event) => {
                setUsuarioId(event.target.value);
                setSeleccionados([]);
                setBuscarRecurso("");
                setTodosLosRecursos(false);
              }}
              className={campoTicket}
            >
              <option value="">Selecciona un usuario</option>

              {usuarios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-[#61453F]">
            Sector
            <input
              readOnly
              value={usuario?.sector ?? ""}
              placeholder="Se completa al seleccionar el usuario"
              className={`${campoTicket} bg-[#F3F1EB]`}
            />
          </label>
        </div>
      </BloqueFormulario>}

      <BloqueFormulario numero={esTI ? "2" : "1"} titulo="Descripción del problema">
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-[#61453F]">
            Título
            <input
              required
              maxLength={150}
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ej.: Impresora presenta atasco de papel"
              className={campoTicket}
            />
          </label>

          <label className="block text-sm font-semibold text-[#61453F]">
            Descripción
            <textarea
              required
              rows={5}
              maxLength={2000}
              value={descripcion}
              onChange={(event) =>
                setDescripcion(event.target.value)
              }
              placeholder="Indica qué ocurre, desde cuándo y cómo afecta el trabajo."
              className={`${campoTicket} resize-y`}
            />
          </label>

          <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
            <label className="text-sm font-semibold text-[#61453F]">
              Prioridad solicitada
              <select
                value={prioridad}
                onChange={(event) =>
                  setPrioridad(event.target.value as Prioridad)
                }
                className={campoTicket}
              >
                {prioridades.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <div className="justify-self-start">
              <IndicadorPrioridad valor={prioridad} />
            </div>
          </div>
        </div>
      </BloqueFormulario>

      {(!esTI || usuario) && (
        <BloqueFormulario numero={esTI ? "3" : "2"} titulo={esTI ? "Recursos relacionados" : "Recurso relacionado (opcional)"}>
          <div className="space-y-3">
            {esTI && <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[#61453F]">
              <input
                type="checkbox"
                checked={todosLosRecursos}
                onChange={(event) =>
                  setTodosLosRecursos(event.target.checked)
                }
                className="h-5 w-5 shrink-0 accent-[#007C9C]"
              />
              Buscar en todo el inventario
            </label>}

            <div className="grid items-end gap-3 sm:grid-cols-2">
              {!esTI && (
                <label className="text-sm font-semibold text-[#61453F]">
                  Dónde buscar
                  <select
                    value={sectorReporte}
                    onChange={(event) => setSectorReporte(event.target.value)}
                    className={campoTicket}
                  >
                    <option value="mi-sector">Mis recursos y mi sector</option>
                    <optgroup label="Otros sectores">
                      <option value="otros">Todos los otros sectores</option>
                      {sectoresOrdenados.map(([id, nombre]) => (
                        <option key={id} value={id}>{nombre}</option>
                      ))}
                    </optgroup>
                  </select>
                </label>
              )}
              <div className={esTI ? "sm:col-span-2" : undefined}>
                <CampoBusqueda
                  aria-label="Buscar recurso"
                  value={buscarRecurso}
                  onChange={(event) => setBuscarRecurso(event.target.value)}
                  placeholder="Nombre, tipo, serie o sector"
                  className={campoTicket}
                />
              </div>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {disponibles.map((recurso) => {
                const elegido = seleccionados.includes(recurso.id);

                return (
                  <label
                    key={recurso.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                      elegido
                        ? "border-brand bg-[#C7E1E6]"
                        : "border-[#C7E1E6] bg-[#DEECEF]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={elegido}
                      disabled={esTI && !elegido && seleccionados.length >= 50}
                      onChange={(event) => {
                        const checked = event.target.checked;

                        setSeleccionados((actuales) =>
                          checked
                            ? esTI ? [...actuales, recurso.id] : [recurso.id]
                            : actuales.filter(
                                (id) => id !== recurso.id,
                              ),
                        );
                      }}
                      className="mt-1 h-5 w-5 shrink-0 accent-[#007C9C]"
                    />

                    <span className="min-w-0 text-sm">
                      <strong className="block break-words text-base text-brand-dark">
                        {recurso.nombre}
                      </strong>

                      <span className="mt-1 block text-brand">
                        {recurso.tipo} · {recurso.sector}
                      </span>

                      <span className="mt-1 block break-all text-brand-medium">
                        <strong className="text-brand-dark">SN </strong>
                        {recurso.serie}
                      </span>
                    </span>
                  </label>
                );
              })}

              {disponibles.length === 0 && (
                <p className="py-4 text-center text-sm text-[#735956]">
                  No se encontraron recursos.
                </p>
              )}
            </div>

            {recursosElegidos.length > 0 && (
              <div className="border-t border-[#D7D1BF] pt-3">
                <p className="mb-2 text-sm font-semibold text-[#61453F]">
                  Recursos seleccionados
                </p>

                <ul className="flex flex-wrap gap-2">
                  {recursosElegidos.map((recurso) => (
                    <li key={recurso.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSeleccionados((actuales) =>
                            actuales.filter(
                              (id) => id !== recurso.id,
                            ),
                          )
                        }
                        aria-label={`Quitar ${recurso.nombre}, serie ${recurso.serie}`}
                        className="flex min-h-11 items-center gap-3 rounded-lg bg-brand-dark px-3 py-2 text-left text-xs text-white hover:bg-brand"
                      >
                        <span>
                          <strong className="block">
                            {recurso.nombre}
                          </strong>
                          <span>{recurso.serie}</span>
                        </span>
                        <span aria-hidden="true" className="text-xl">
                          ×
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-[#735956]">
              Puedes registrar problemas de correo, internet o software
              sin seleccionar un recurso.
            </p>
          </div>
        </BloqueFormulario>
      )}

      <div className="flex justify-center pt-1">
        <button
          type="submit"
          disabled={guardando || (esTI && !usuario) || !titulo.trim() || !descripcion.trim()}
          className="min-h-11 w-full rounded-full bg-brand-dark px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-72"
        >
          Crear ticket
        </button>
      </div>
    </form>
  );
}

function IconoAccionTicket({
  tipo,
}: {
  tipo: VistaModalTicket;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      {tipo === "detalle" ? (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M8 12h8M8 16h5" />
        </>
      ) : tipo === "historial" ? (
        <>
          <path d="M3 11a9 9 0 1 1 2.6 7.4" />
          <path d="M3 4v7h7M12 7v5l3 2" />
        </>
      ) : (
        <>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 17.9 17" />
        </>
      )}
    </svg>
  );
}
function IconoTicket({
  tipo = "ticket",
}: {
  tipo?: "ticket" | "actualizacion" | "creacion";
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
      className="h-[55%] w-[55%]"
    >
      {tipo === "actualizacion" ? (
        <>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 17.9 17" />
        </>
      ) : tipo === "creacion" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M7 12h10" />
        </>
      ) : (
        <>
          <path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Z" />
          <path d="M8 10h8M8 14h5M6 6l8-4 3 4" />
        </>
      )}
    </svg>
  );
}

function CabeceraTicket({
  titulo,
  subtitulo,
}: {
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#61453F] text-white sm:h-18 sm:w-18">
        <IconoTicket />
      </span>

      <div className="min-w-0">
        <h2 className="break-words text-xl font-bold leading-tight text-[#61453F] sm:text-2xl">
          {titulo}
        </h2>

        {subtitulo && (
          <p className="mt-1 text-sm text-[#735956]">
            {subtitulo}
          </p>
        )}
      </div>
    </div>
  );
}

function BloqueFormulario({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#D7D1BF] bg-[#EFEADC] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#61453F] text-sm font-bold text-white">
          {numero}
        </span>

        <h3 className="text-base font-bold text-[#61453F] sm:text-lg">
          {titulo}
        </h3>
      </div>

      {children}
    </section>
  );
}

const campoTicket =
  "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-[#D7D1BF] " +
  "bg-white px-3 py-2.5 text-base text-[#61453F] outline-none " +
  "transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/20 " +
  "sm:text-sm";

function IndicadorPrioridad({ valor }: { valor: Prioridad }) {
  const colores = {
    Baja: "bg-[#006681] text-white",
    Media: "bg-[#C6651F] text-white",
    Alta: "bg-[#B95710] text-white",
  };

  return (
    <div
      className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 ${colores[valor]}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
        className="h-8 w-8"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v8M12 17v1" />
      </svg>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider">
          Prioridad
        </p>
        <p className="text-lg font-bold">{valor}</p>
      </div>
    </div>
  );
}
