"use client";

import { useConsultaInventario, useIdsFiltrados } from "@/lib/use-consulta-inventario";
import CampoBusqueda from "@/components/CampoBusqueda";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiHcdl, enviarHcdl, listarHcdl, mensajeHcdl, type Recurso as RecursoApi } from "@/lib/api-hcdl";
import { exportarFichaUsuario } from "@/lib/exportarFichaUsuario";
import {
  exportarActaEntrega,
  type ActaEntrega,
} from "@/lib/exportarActaEntrega";

type Categoria = "Equipo" | "Móvil" | "Periférico";

type Usuario = {
  id: number;
  nombre: string;
  cargo: string;
  correo: string;
  sector: string;
  sectorId: number;
  activo: boolean;
};

type Recurso = {
  id: number;
  nombre: string;
  marca: string;
  tipo: string;
  categoria: Categoria;
  serie: string;
  usuarioId: number | null;
  estado: string;
};

type Condicion = "N" | "U" | "R";

type Entrega = {
  recursoId: number;
  condicion: Condicion;
  observacion: string;
};

const categorias: Partial<Record<RecursoApi["categoria"], Categoria>> = {
  equipo: "Equipo", movil: "Móvil", periferico: "Periférico",
};

function adaptarRecursos(registros: RecursoApi[]): Recurso[] {
  return registros.flatMap((recurso) => {
    const categoria = categorias[recurso.categoria];
    return categoria ? [{
      ...recurso.ficha, ...recurso, categoria, marca: recurso.marca ?? "",
      tipo: recurso.tipo ?? "", serie: recurso.serie ?? "",
      ...(typeof recurso.ficha.accesorio === "string" ? { accesorios: recurso.ficha.accesorio } : {}),
    }] : [];
  });
}

type ActaApi = {
  id: number;
  fecha: string;
  usuario: { nombre: string; cargo: string | null; correo: string | null; sector: string };
  responsable: { nombre: string; cargo: string | null };
  recursos: { recurso: RecursoApi; condicion: Condicion; observacion: string | null }[];
};

function adaptarActa(acta: ActaApi): ActaEntrega {
  return {
    referencia: `HCDL-${acta.id}`,
    fecha: acta.fecha,
    ciudad: "Puerto Varas, Chile",
    usuario: { ...acta.usuario, cargo: acta.usuario.cargo ?? "", correo: acta.usuario.correo ?? undefined },
    entregadoPor: { nombre: acta.responsable.nombre, cargo: acta.responsable.cargo || "Informática" },
    recursos: acta.recursos.flatMap(({ recurso, condicion, observacion }) =>
      adaptarRecursos([recurso]).map((adaptado) => ({ recurso: adaptado, condicion, observacion: observacion ?? "" })),
    ),
  };
}

const campo =
  "min-h-10 w-full min-w-0 rounded-md border border-[#9CCBD4] bg-white px-3 py-2 text-base font-normal " +
  "text-[#006681] placeholder:text-[#39798A] focus-visible:outline-2 focus-visible:outline-[#007C96] sm:text-sm";
const botonBase =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-white " +
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 " +
  "[@media(pointer:coarse)]:min-h-11";
const botonAzul = botonBase + " bg-[#007C96] enabled:hover:bg-[#006681] focus-visible:outline-[#006681]";
const botonCafe = botonBase + " bg-[#61453F] enabled:hover:bg-[#735956] focus-visible:outline-[#61453F]";
const botonIcono =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#007C96] text-xl leading-none text-white " +
  "transition-colors hover:bg-[#006681] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006681] " +
  "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";
const tarjetaRecurso = "min-w-0 rounded-lg border border-[#9CCBD4] bg-[#C7E1E6] p-2.5 text-[#006681]";

const focoBoton = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006681]";
const botonPagina =
  "grid h-8 min-w-8 place-items-center rounded-md border border-[#9CCBD4] px-1 text-sm font-semibold transition-colors " +
  "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11 " + focoBoton;
const paginaInactiva = "bg-[#DEECEF] text-[#006681] enabled:hover:bg-[#C7E1E6]";
const paginaFlecha = botonPagina + " " + paginaInactiva + " disabled:cursor-not-allowed disabled:opacity-40";

function IconoRecurso({ categoria }: { categoria: Categoria }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-8 w-8"
    >
      {categoria === "Equipo" ? (
        <>
          <rect x="4" y="3" width="16" height="13" rx="1" />
          <path d="m4 16-3 4h22l-3-4M9 20h6" />
        </>
      ) : categoria === "Móvil" ? (
        <>
          <rect x="7" y="2" width="10" height="20" rx="2" />
          <path d="M10 5h4M11 19h2" />
        </>
      ) : (
        <>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h1m3 0h1m3 0h1m3 0h0M6 14h1m3 0h7" />
        </>
      )}
    </svg>
  );
}

export default function AsignacionesPage() {
  const [vista, setVista] = useState<"ficha" | "acta">("ficha");
  const [sector, setSector] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [busquedaUsuario, setBusquedaUsuario] = useState("");
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [errorCarga, setErrorCarga] = useState("");
  const [cargando, setCargando] = useState(true);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [exportando, setExportando] = useState(false);
  const [referenciaActa, setReferenciaActa] = useState("");
  const enviandoActa = useRef(false);
  const [exportandoActa, setExportandoActa] = useState(false);
  useEffect(() => {
    const controlador = new AbortController();
    Promise.all([
      listarHcdl<Usuario>("usuarios", controlador.signal),
      listarHcdl<RecursoApi>("recursos", controlador.signal),
    ]).then(([usuarios, recursos]) => {
      if (controlador.signal.aborted) return;
      setUsuarios(usuarios.filter(({ activo }) => activo));
      setRecursos(adaptarRecursos(recursos));
      setCargando(false);
    }).catch((error) => {
      if (!controlador.signal.aborted) {
        setErrorCarga(mensajeHcdl(error));
        setCargando(false);
      }
    });
    return () => controlador.abort();
  }, []);

  const usuario = usuarios.find((item) => item.id === Number(usuarioId));

  const sectores = Array.from(
    new Set(usuarios.map((item) => item.sector)),
  ).sort();

  const buscarUsuarios = new URLSearchParams({ estado: "Activo" });
  if (busquedaUsuario.trim()) buscarUsuarios.set("q", busquedaUsuario.trim());
  const sectorSeleccionado = usuarios.find((item) => item.sector === sector)?.sectorId;
  if (sectorSeleccionado) buscarUsuarios.set("sectorId", String(sectorSeleccionado));
  const hayFiltroUsuario = Boolean(busquedaUsuario.trim() || sectorSeleccionado);
  const consultaUsuarios = useConsultaInventario<Usuario[]>(
    hayFiltroUsuario ? `usuarios?${buscarUsuarios}` : null, listarHcdl,
  );
  const usuariosFiltrados = hayFiltroUsuario ? consultaUsuarios.datos ?? [] : usuarios;
  const opcionesUsuario = usuario && !usuariosFiltrados.some((item) => item.id === usuario.id)
    ? [usuario, ...usuariosFiltrados] : usuariosFiltrados;

  const ficha = useConsultaInventario<RecursoApi[]>(
    vista === "ficha" && usuarioId ? `recursos?usuarioId=${usuarioId}&estado=Asignado` : null, listarHcdl,
  );
  const asignados = adaptarRecursos(ficha.datos ?? []);

  const pendientes = entregas.flatMap((entrega) => {
    const recurso = recursos.find((item) => item.id === entrega.recursoId);
    return recurso ? [{ recurso, entrega }] : [];
  });

  const disponibles = recursos.filter(
    (item) =>
      item.usuarioId === null && item.estado === "Disponible" &&
      !entregas.some((entrega) => entrega.recursoId === item.id),
  );

  function cambiarUsuario(valor: string) {
    setUsuarioId(valor);
    setEntregas([]);
    setMensaje("");
  }

  function agregarRecurso(recurso: Recurso) {
    setEntregas((actuales) => actuales.length >= 50 ? actuales : [
      ...actuales,
      {
        recursoId: recurso.id,
        condicion: "U",
        observacion: "",
      },
    ]);
    setMensaje("");
  }

  function actualizarEntrega(
    recursoId: number,
    cambios: Partial<Omit<Entrega, "recursoId">>,
  ) {
    setEntregas((actuales) =>
      actuales.map((item) =>
        item.recursoId === recursoId ? { ...item, ...cambios } : item,
      ),
    );
  }

  async function confirmarEntregaYExportar() {
    if (!usuario || pendientes.length === 0 || enviandoActa.current) return;
    enviandoActa.current = true;
  
    const ventana = window.open("", "_blank");
    setMensaje("");
    setExportandoActa(true);

    try {
      const registrada = await enviarHcdl<ActaApi>("asignaciones", { usuarioId: usuario.id, recursos: entregas });
      const acta = adaptarActa(registrada);

      const ids = new Set(entregas.map(({ recursoId }) => recursoId));
      setRecursos((actuales) => actuales.map((recurso) =>
        ids.has(recurso.id) ? { ...recurso, estado: "Asignado", usuarioId: usuario.id } : recurso));
      setReferenciaActa(acta.referencia);
      setEntregas([]);
      try {
        await exportarActaEntrega(acta, ventana);
        setMensaje(`Entrega ${acta.referencia} confirmada.`);
      } catch (error) {
        setMensaje(`Entrega ${acta.referencia} confirmada. ${mensajeHcdl(error)} Puedes volver a exportar el acta.`);
      }
    } catch (error) {
      ventana?.close();
      setMensaje(mensajeHcdl(error));
    } finally {
      enviandoActa.current = false;
      setExportandoActa(false);
    }
  }

  async function volverAExportarActa(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviandoActa.current) return;
    const referencia = /^(?:HCDL-)?([1-9]\d{0,9})$/i.exec(referenciaActa.trim());
    if (!referencia || Number(referencia[1]) > 2147483647) {
      setMensaje("Ingresa una referencia válida, por ejemplo HCDL-123.");
      return;
    }
    const ventana = window.open("", "_blank");
    enviandoActa.current = true;
    setExportandoActa(true);
    setMensaje("");

    try {
      const acta = adaptarActa(await apiHcdl<ActaApi>(`asignaciones/${referencia[1]}`));
      await exportarActaEntrega(acta, ventana);
    } catch (error) {
      ventana?.close();
      setMensaje(mensajeHcdl(error));
    } finally {
      enviandoActa.current = false;
      setExportandoActa(false);
    }
  }

  async function descargarFicha() {
      if (!usuario || exportando) return;

      setMensaje("");
      setExportando(true);

      try {
        await exportarFichaUsuario(usuario, asignados);
      } catch (error) {
        setMensaje(
          error instanceof Error
            ? error.message
            : "No se pudo generar la ficha.",
        );
      } finally {
        setExportando(false);
      }
    }

  return (
  <main className="flex h-full min-h-0 flex-col overflow-hidden bg-[#EFEADC] text-sm text-[#61453F]">
    {errorCarga && <p role="alert" className="p-3 text-sm">{errorCarga}</p>}
    {cargando && <p role="status" className="p-3 text-sm">Cargando usuarios y equipos…</p>}
    <nav
      aria-label="Fichas y actas de entrega"
      className="shrink-0 border-b border-[#D7D1BF] bg-white"
    >
      <div className="flex w-full gap-2 px-3 py-2 sm:px-5">
        {[
          { id: "ficha" as const, nombre: "Ficha de usuario" },
          { id: "acta" as const, nombre: "Acta de entrega" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={vista === item.id ? "page" : undefined}
            onClick={() => {
              setVista(item.id);
              setMensaje("");
            }}
            className={`flex min-w-0 flex-1 items-center justify-center min-h-9 rounded-md px-3 py-2 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006681] ${
              vista === item.id
                ? "bg-[#007C96] text-white"
                : "text-[#006681] hover:bg-[#DEECEF]"
            }`}
          >
            {item.nombre}
          </button>
        ))}
      </div>
    </nav>

    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 p-3 sm:px-5">
      {/* Filtros */}
      <section
        aria-label="Seleccionar usuario"
        className="grid shrink-0 grid-cols-2 gap-2 rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-3"
      >
        <label className="col-span-2 grid min-w-0 gap-1 text-xs font-semibold text-brand-dark">
          Buscar usuario
          <CampoBusqueda className={campo} placeholder="Nombre, cargo o correo" value={busquedaUsuario}
            onChange={(evento) => setBusquedaUsuario(evento.target.value)} maxLength={120} />
        </label>
        {(consultaUsuarios.cargando || consultaUsuarios.error) && (
          <p className="col-span-2 text-xs text-brand-dark" role={consultaUsuarios.error ? "alert" : "status"}>
            {consultaUsuarios.error || "Buscando usuarios…"}
          </p>
        )}
        <label className="grid gap-1 min-w-0 text-xs font-semibold text-[#006681]">
          Área / sector
          <select
            value={sector}
            onChange={(event) => {
              setSector(event.target.value);
              cambiarUsuario("");
            }}
            className={campo}
          >
            <option value="">Sector</option>

            {sectores.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 min-w-0 text-xs font-semibold text-[#006681]">
          Usuario
          <select
            value={usuarioId}
            onChange={(event) => cambiarUsuario(event.target.value)}
            className={campo}
          >
            <option value="">Selecciona un usuario</option>

            {opcionesUsuario.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Panel de ficha o acta */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#D7D1BF] bg-[#F3F1EB] p-3 sm:p-4">
        <header className="shrink-0 pb-3 text-center">
          <h1 className="text-base font-bold text-[#61453F] sm:text-lg">
            {vista === "ficha"
              ? "Ficha de dispositivos tecnológicos"
              : "Acta de entrega de dispositivos tecnológicos"}
          </h1>

          {usuario && (
            <div className="mt-1">
              <p className="text-sm font-semibold text-[#61453F]">
                {usuario.nombre}
              </p>

              <p className="text-sm text-[#735956]">
                {usuario.cargo}
              </p>
            </div>
          )}
        </header>

        {/* Única zona con desplazamiento */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
          {!usuario ? (
            <div className="flex min-h-full items-center justify-center">
              <p className="text-center text-[#735956]">
                Selecciona un usuario para continuar.
              </p>
            </div>
          ) : vista === "ficha" && (ficha.cargando || ficha.error) ? (
            <p role={ficha.error ? "alert" : "status"} className="p-3">{ficha.error || "Cargando recursos asignados…"}</p>
          ) : vista === "ficha" ? (
            <div className="space-y-2">
              {asignados.map((recurso) => (
                <article key={recurso.id} className={tarjetaRecurso}>
                  <FilaRecurso recurso={recurso} />
                </article>
              ))}

              {asignados.length === 0 && (
                <p className="py-10 text-center text-[#735956]">
                  Este usuario no tiene recursos asignados.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {pendientes.map(({ recurso, entrega }) => (
                <article
                  key={recurso.id}
                  className={tarjetaRecurso}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <FilaRecurso recurso={recurso} />
                    </div>

                    <button
                      type="button"
                      aria-label={`Quitar ${recurso.nombre} del acta`}
                      onClick={() =>
                        setEntregas((actuales) =>
                          actuales.filter(
                            (item) => item.recursoId !== recurso.id,
                          ),
                        )
                      }
                      className={botonIcono}
                    >
                      −
                    </button>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(10rem,1fr)_2fr]">
                    <label className="grid gap-1 text-xs font-semibold text-[#006681]">
                      Condición de entrega
                      <select
                        value={entrega.condicion}
                        onChange={(event) =>
                          actualizarEntrega(recurso.id, {
                            condicion: event.target.value as Condicion,
                          })
                        }
                        className={campo}
                      >
                        <option value="N">Nuevo</option>
                        <option value="U">Semi Nuevo</option>
                        <option value="R">Con Detalles</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-semibold text-[#006681]">
                      Observaciones / accesorios
                      <input
                        maxLength={1000}
                        value={entrega.observacion}
                        onChange={(event) =>
                          actualizarEntrega(recurso.id, {
                            observacion: event.target.value,
                          })
                        }
                        placeholder="Ej.: cargador incluido"
                        className={campo}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Acciones fijas debajo del listado */}
        {usuario && (
          <footer className="mt-3 flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-[#D7D1BF] pt-2">
            {vista === "ficha" ? (
              <button
                type="button"
                onClick={descargarFicha}
                disabled={exportando || ficha.cargando || Boolean(ficha.error)}
                className={botonCafe}
              >
                {exportando ? "Preparando informe..." : "Exportar informe"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelectorAbierto(true)}
                  className={botonAzul}
                >
                  <span aria-hidden="true" className="text-2xl leading-none">
                    +
                  </span>
                  Agregar recurso
                </button>
            
                <button
                  type="button"
                  disabled={entregas.length === 0 || exportandoActa}
                  onClick={confirmarEntregaYExportar}
                  className={botonCafe}
                >
                  {exportandoActa
                    ? "Preparando acta..."
                    : "Confirmar entrega y exportar ficha"}
                </button>
                
              </>
            )}
          </footer>
        )}

        {vista === "acta" && (
          <form onSubmit={volverAExportarActa} className="mt-2 flex shrink-0 flex-wrap items-end justify-center gap-2">
            <label className="grid min-w-0 gap-1 text-xs font-semibold text-brand-dark">
              Referencia del acta
              <CampoBusqueda className={campo} placeholder="HCDL-123" value={referenciaActa}
                onChange={(evento) => setReferenciaActa(evento.target.value)} maxLength={15} required />
            </label>
            <button type="submit" className={botonCafe} disabled={!referenciaActa.trim() || exportandoActa}>
              Reimprimir acta
            </button>
          </form>
        )}

        {mensaje && (
          <p
            role="status"
            className="mt-3 shrink-0 rounded-lg border border-[#9CCBD4] bg-[#DEECEF] px-3 py-2 text-center text-sm text-[#006681]"
          >
            {mensaje}
          </p>
        )}
      </section>
    </div>

    {selectorAbierto && usuario && (
      <SelectorRecursos
        recursos={disponibles}
        onAgregar={agregarRecurso}
        onClose={() => setSelectorAbierto(false)}
      />
    )}
  </main>
);
}

function FilaRecurso({ recurso }: { recurso: Recurso }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DEECEF] text-[#006681] [&>svg]:h-5 [&>svg]:w-5">
        <IconoRecurso categoria={recurso.categoria} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold [overflow-wrap:anywhere]">
          {recurso.marca} {recurso.nombre}
        </p>
        <p className="text-xs">{recurso.tipo}</p>
      </div>

      <p className="text-xs [overflow-wrap:anywhere]">
        <span className="font-semibold">SN </span>
        {recurso.serie}
      </p>
    </div>
  );
}

function SelectorRecursos({
  recursos,
  onAgregar,
  onClose,
}: {
  recursos: Recurso[];
  onAgregar: (recurso: Recurso) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [categoria, setCategoria] = useState<Categoria>("Equipo");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) dialog.showModal();

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  const filtro = useIdsFiltrados("recursos", { q: busqueda },
    categoria === "Equipo" ? "equipo" : categoria === "Móvil" ? "movil" : "periferico",
  );
  const filtrados = recursos.filter((item) => item.categoria === categoria &&
    (!filtro.hayFiltros || filtro.ids?.has(item.id)));
  const porPagina = 6;
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;
  const visibles = filtrados.slice(inicio, inicio + porPagina);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="titulo-selector-recursos"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-hidden rounded-xl border border-[#9CCBD4] bg-[#F3F1EB] p-0 text-[#61453F] shadow-xl backdrop:bg-black/40"
    >
      <div className="flex max-h-[calc(92dvh-2px)] min-w-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 bg-[#006681] px-3 py-2 text-white sm:px-4">
          <div>
            <h2
              id="titulo-selector-recursos"
              className="text-base font-bold"
            >
              Agregar recursos al acta
            </h2>
            <p className="text-xs text-[#DEECEF] sm:text-sm">
              Selecciona recursos disponibles del inventario.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar selector de recursos"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-2xl leading-none transition-colors hover:bg-[#F49737] hover:text-[#392414] focus-visible:bg-[#F49737] focus-visible:text-[#392414] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:px-4">
          <div className="mb-2 grid gap-2 rounded-lg border border-[#C7E1E6] bg-[#DEECEF] p-2.5 sm:grid-cols-[minmax(8rem,1fr)_2fr]">
            <label className="grid gap-1 text-xs font-semibold text-[#006681]">
              Categoría
              <select
                value={categoria}
                onChange={(event) => {
                  setCategoria(event.target.value as Categoria);
                  setPagina(1);
                }}
                className={campo}
              >
                <option value="Equipo">Equipos</option>
                <option value="Móvil">Móviles</option>
                <option value="Periférico">Periféricos</option>
              </select>
            </label>

            <label className="grid gap-1 text-xs font-semibold text-[#006681]">
              Buscar recurso
              <CampoBusqueda
                value={busqueda}
                onChange={(event) => {
                  setBusqueda(event.target.value);
                  setPagina(1);
                }}
                placeholder="Nombre, marca, tipo o número de serie"
                className={campo}
              />
            </label>
          </div>

          {(filtro.cargando || filtro.error) && (
            <p role={filtro.error ? "alert" : "status"} className="py-2">
              {filtro.error || "Buscando recursos…"}
            </p>
          )}
          <div className="space-y-2">
            {visibles.map((recurso) => (
              <div key={recurso.id} className={`${tarjetaRecurso} flex items-center gap-2`}>
                <div className="min-w-0 flex-1">
                  <FilaRecurso recurso={recurso} />
                </div>

                <button
                  type="button"
                  onClick={() => onAgregar(recurso)}
                  aria-label={`Agregar ${recurso.marca} ${recurso.nombre}`}
                  className={botonIcono}
                >
                  +
                </button>
              </div>
            ))}

            {visibles.length === 0 && (
              <p className="py-10 text-center text-[#735956]">
                No hay recursos disponibles que coincidan con los filtros.
              </p>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#D7D1BF] px-3 py-2 sm:px-4">
          <p role="status" className="text-xs text-[#61453F]">
            Mostrando {filtrados.length ? inicio + 1 : 0}–
            {inicio + visibles.length} de {filtrados.length} recursos
          </p>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <nav
              aria-label="Paginación de recursos"
              className="flex flex-wrap gap-1.5"
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

            <button
              type="button"
              onClick={onClose}
              className={`${botonAzul} shrink-0`}
            >
              Listo
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
