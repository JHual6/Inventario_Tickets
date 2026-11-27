"use client";

import { listarHcdl } from "@/lib/api-hcdl";
import { useConsultaInventario, useDetalleInventario } from "@/lib/use-consulta-inventario";
import EstadoCatalogo from "@/components/EstadoCatalogo";
import { MovimientosRecurso } from "@/components/inventario/HistorialEquipoModal";
import { nombreCategoria, useCatalogoTI } from "@/lib/catalogo-hcdl";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

/* ───────────── Tipos ───────────── */

type EstadoUsuario = "Activo" | "Inactivo";

type Usuario = {
  id: number;
  nombre: string;
  cargo: string;
  correo: string;
  telefono: string;
  estado: EstadoUsuario;
  sectorId: number;
  sector: string;
};

type UsuarioApi = Omit<Usuario, "estado" | "telefono" | "cargo" | "correo"> & {
  activo: boolean; cargo: string | null; correo: string | null;
};

function adaptarUsuario(usuario: UsuarioApi): Usuario {
  return { ...usuario, cargo: usuario.cargo ?? "", correo: usuario.correo ?? "", telefono: "",
    estado: usuario.activo ? "Activo" : "Inactivo" };
}

type Sector = {
  id: number;
  nombre: string;
};

type Asignacion = {
  id: number;
  usuarioId: number;
  recursoId: number;
  dispositivo: string;
  tipo: string;
  serie: string;
  fechaAsignacion: string;
  fechaDevolucion: string | null;
  observacion: string;
};

type UsuarioModal = { usuarioId: number; sectorOrigen?: number };
type Modal =
  | { tipo: "sector"; sectorId: number }
  | ({ tipo: "detalle" } & UsuarioModal)
  | ({ tipo: "historial"; dispositivo: Asignacion } & UsuarioModal)
  | null;

type TipoIcono =
  | "usuario"
  | "sector"
  | "buscar"
  | "historial"
  | "detalle"
  | "cerrar"
  | "izquierda"
  | "derecha"
  | "dispositivo";

/* ───────────── Datos de ejemplo ───────────── */

const campoBase =
  "min-h-10 w-full min-w-0 rounded-md border bg-white px-3 py-2 text-base " +
  "focus-visible:outline-2 sm:text-sm";

const campo = campoBase +
  " border-[#9CCBD4] text-[#006681] placeholder:text-[#39798A] focus-visible:outline-[#007C96]";
const etiquetaFiltro = "grid min-w-0 gap-1 text-xs font-semibold text-brand-dark";
const botonBase =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-md " +
  "px-3 py-1.5 text-sm font-semibold text-white transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-11";
const boton = botonBase + " bg-[#007C96] enabled:hover:bg-[#006681] focus-visible:outline-[#006681]";

const botonIcono =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center " +
  "rounded-full bg-[#007C96] text-white transition-colors hover:bg-[#006681] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[#006681] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";

const formatoFecha = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Santiago",
});

function fechaCorta(valor: string) {
  return formatoFecha.format(new Date(valor));
}

/* ───────────── Página principal ───────────── */

export default function UsuariosVista({ inicial = "usuarios" }: { inicial?: "usuarios" | "sectores" }) {
  const { catalogo, cargando, error, recargar } = useCatalogoTI();
  const sectores = catalogo.sectores;
  const usuarios = catalogo.usuarios.filter((u) => u.visible).map(adaptarUsuario);
  const asignaciones: Asignacion[] = catalogo.asignaciones.map((a) => ({
    ...a, tipo: nombreCategoria[a.categoria], serie: a.serie ?? "", observacion: a.observacion ?? "",
  }));
  const [vista, setVista] = useState<"usuarios" | "sectores">(inicial);
  const [busqueda, setBusqueda] = useState("");
  const [consulta, setConsulta] = useState("");
  const [estado, setEstado] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState<Modal>(null);

  const parametros = new URLSearchParams();
  if (consulta.trim()) parametros.set("q", consulta.trim());
  if (estado) parametros.set("estado", estado);
  if (sectorId) parametros.set("sectorId", sectorId);
  const resultadosUsuarios = useConsultaInventario<UsuarioApi[]>(
    vista === "usuarios" && parametros.size ? `usuarios?${parametros}` : null, listarHcdl,
  );
  const resultadosSectores = useConsultaInventario<Sector[]>(
    vista === "sectores" && consulta.trim() ? `sectores?${new URLSearchParams({ q: consulta.trim() })}` : null, listarHcdl,
  );
  const usuariosFiltrados = vista === "usuarios" && parametros.size
    ? (resultadosUsuarios.datos ?? []).map(adaptarUsuario) : usuarios;
  const sectoresFiltrados = vista === "sectores" && consulta.trim() ? resultadosSectores.datos ?? [] : sectores;
  const consultaLista = vista === "usuarios" ? resultadosUsuarios : resultadosSectores;

  const porPagina = 6;
  const cantidad =
    vista === "usuarios"
      ? usuariosFiltrados.length
      : sectoresFiltrados.length;

  const totalPaginas = Math.max(1, Math.ceil(cantidad / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * porPagina;

  const usuariosVisibles = usuariosFiltrados.slice(
    inicio,
    inicio + porPagina,
  );

  const sectoresVisibles = sectoresFiltrados.slice(
    inicio,
    inicio + porPagina,
  );

  const sectorModal =
    modal?.tipo === "sector"
      ? sectores.find((sector) => sector.id === modal.sectorId)
      : undefined;

  const detalleUsuario = useDetalleInventario<UsuarioApi>("usuarios", modal?.tipo === "detalle" ? modal.usuarioId : undefined);
  const usuarioModal = detalleUsuario.registro ? adaptarUsuario(detalleUsuario.registro) : undefined;

  function cambiarVista(nuevaVista: "usuarios" | "sectores") {
    setVista(nuevaVista);
    setBusqueda("");
    setConsulta("");
    setEstado("");
    setSectorId("");
    setPagina(1);
    setModal(null);
  }

  function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConsulta(busqueda);
    setPagina(1);
  }

  function limpiarFiltros() {
    setBusqueda("");
    setConsulta("");
    setEstado("");
    setSectorId("");
    setPagina(1);
  }

  return (
    <main className="flex h-[calc(100dvh-60px)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#EFEADC] text-sm">
      <h1 className="sr-only">Usuarios y Sectores</h1>

        <nav
          aria-label="Usuarios y sectores"
          className="grid shrink-0 grid-cols-2 gap-2 border-b border-[#D7D1BF] bg-white px-5 py-2"
        >
          {(
            [
              { id: "usuarios", nombre: "Usuarios" },
              { id: "sectores", nombre: "Sectores" },
            ] as const
          ).map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              aria-pressed={vista === opcion.id}
              onClick={() => cambiarVista(opcion.id)}
              className={[
                "flex min-h-9 items-center justify-center rounded-md",
                "px-3 py-2 text-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2",
                "focus-visible:outline-[#006681]",
                vista === opcion.id
                  ? "bg-[#007C96] font-semibold text-white"
                  : "font-semibold text-[#006681] hover:bg-[#DEECEF]",
              ].join(" ")}
            >
              {opcion.nombre}
            </button>
          ))}
        </nav>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-2 sm:p-3">
        <form
          onSubmit={buscar}
          aria-label="Buscar y filtrar"
          className="grid items-end gap-2 rounded-xl border border-[#C7E1E6] bg-[#DEECEF] p-3 md:grid-cols-2 xl:grid-cols-12"
        >
          <label
            className={`${etiquetaFiltro} ${vista === "usuarios" ? "xl:col-span-5" : "md:col-span-2 xl:col-span-8"}`}
          >
            {vista === "usuarios" ? "Buscar usuario" : "Buscar sector"}

            <span className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#006681]">
                <Icono tipo="buscar" />
              </span>

              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder={
                  vista === "usuarios"
                    ? "Buscar por nombre, cargo o correo"
                    : "Buscar por nombre del sector"
                }
                className={`${campo} pl-11 font-normal`}
              />
            </span>
          </label>

          {vista === "usuarios" && (
            <>
              <label className={`${etiquetaFiltro} xl:col-span-2`}>
                Estado
                <select
                  value={estado}
                  onChange={(event) => {
                    setEstado(event.target.value);
                    setPagina(1);
                  }}
                  className={`${campo} font-normal`}
                >
                  <option value="">Estado</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>

              <label className={`${etiquetaFiltro} xl:col-span-2`}>
                Sector
                <select
                  value={sectorId}
                  onChange={(event) => {
                    setSectorId(event.target.value);
                    setPagina(1);
                  }}
                  className={`${campo} font-normal`}
                >
                  <option value="">Sector</option>
                  {sectores.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div
            className={`flex gap-2 ${
              vista === "usuarios"
                ? "xl:col-span-3"
                : "md:col-span-2 xl:col-span-4"
            }`}
          >
            <button type="submit" className={`${boton} min-h-10 flex-1`}>
              Buscar
            </button>

            <button
              type="button"
              onClick={limpiarFiltros}
              className={`${boton} min-h-10 whitespace-nowrap`}
            >
              Limpiar filtros
            </button>
          </div>
        </form>

        <EstadoCatalogo cargando={cargando} error={error} reintentar={recargar} />

        <section
          aria-label={vista === "usuarios" ? "Usuarios" : "Sectores"}
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[#F3F1EB] p-3"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {consultaLista.cargando && <p role="status">Buscando…</p>}
            {consultaLista.error && <p role="alert">{consultaLista.error}</p>}
            {vista === "usuarios" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {usuariosVisibles.map((usuario) => (
                  <article
                    key={usuario.id}
                    className="flex min-w-0 flex-col rounded-lg border border-[#9CCBD4] bg-[#C7E1E6] p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DEECEF] text-[#006681]">
                        <Icono tipo="usuario" className="h-6 w-6" />
                      </span>
                
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-bold leading-snug text-[#006681]">
                          {usuario.nombre}
                        </h3>
                
                        <p className="mt-1 text-xs text-[#006681]">
                          {usuario.sector}
                        </p>
                      </div>
                
                      <Estado valor={usuario.estado} />
                    </div>
                
                    <div className="mt-3 flex flex-1 items-end gap-2">
                      <dl className="min-w-0 flex-1 space-y-1.5 text-xs">
                        <Dato etiqueta="Cargo">{usuario.cargo}</Dato>
                        <Dato etiqueta="Correo">{usuario.correo}</Dato>
                      </dl>
                
                      <button
                        type="button"
                        title="Ver detalle del usuario"
                        aria-label={`Ver detalle de ${usuario.nombre}`}
                        onClick={() =>
                          setModal({
                            tipo: "detalle",
                            usuarioId: usuario.id,
                          })
                        }
                        className={botonIcono}
                      >
                        <Icono tipo="detalle" className="h-5 w-5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mx-auto max-w-5xl space-y-3">
                {sectoresVisibles.map((sector) => {
                  const cantidadUsuarios = usuarios.filter(
                    (usuario) => usuario.sectorId === sector.id,
                  ).length;

                  return (
                    <article
                      key={sector.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-[#9CCBD4] bg-[#C7E1E6] p-4 sm:gap-5"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DEECEF] text-[#006681] sm:h-14 sm:w-14">
                        <Icono tipo="sector" className="h-8 w-8" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[#007C9C]">Sector</p>
                        <h3 className="break-words text-lg font-bold text-[#006681]">
                          {sector.nombre}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-[#006681]">
                        <span className="hidden text-right text-sm leading-tight sm:block">
                          Usuarios
                          <br />
                          del sector
                        </span>

                        <span
                          aria-label={`${cantidadUsuarios} usuarios`}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#006681] text-lg font-bold text-white"
                        >
                          {cantidadUsuarios}
                        </span>
                      </div>

                      <button
                        type="button"
                        title="Ver usuarios del sector"
                        aria-label={`Ver usuarios de ${sector.nombre}`}
                        onClick={() =>
                          setModal({ tipo: "sector", sectorId: sector.id })
                        }
                        className={botonIcono}
                      >
                        <Icono tipo="usuario" />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}

            {cantidad === 0 && (
              <Vacio mensaje="No se encontraron resultados con estos filtros." />
            )}
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 pt-2">
            <p role="status" className="text-[11px] text-[#61453F]">
              Mostrando {cantidad === 0 ? 0 : inicio + 1}–
              {Math.min(inicio + porPagina, cantidad)} de {cantidad}{" "}
              {vista === "usuarios" ? "usuarios" : "sectores"}
            </p>
                    
            <Paginacion
              pagina={paginaActual}
              total={totalPaginas}
              onCambiar={setPagina}
            />
          </footer>
        </section>
      </div>  
      {modal && (
        <ModalVentana
          titulo={
            modal.tipo === "sector"
              ? `Usuarios del sector ${sectorModal?.nombre ?? ""}`
              : modal.tipo === "historial"
                ? "Historial del dispositivo"
                : "Detalle del usuario"
          }
          subtitulo={
            modal.tipo === "sector"
              ? "Consulta los integrantes del sector y sus detalles."
              : modal.tipo === "historial"
                ? [modal.dispositivo.dispositivo, modal.dispositivo.serie].filter(Boolean).join(" · ")
                : usuarioModal?.nombre
          }
          volver={modal.tipo === "historial" ? {
            etiqueta: "Volver al detalle del usuario",
            accion: () => setModal({
              tipo: "detalle",
              usuarioId: modal.usuarioId,
              sectorOrigen: modal.sectorOrigen,
            }),
          } : modal.tipo === "detalle" && modal.sectorOrigen !== undefined ? {
            etiqueta: "Volver al sector",
            accion: () => {
              const sectorId = modal.sectorOrigen;
              if (sectorId !== undefined) setModal({ tipo: "sector", sectorId });
            },
          } : undefined}
          icono={modal.tipo === "historial" ? "historial" : "usuario"}
          compacto={modal.tipo === "historial"}
          onCerrar={() => setModal(null)}
        >
          {modal.tipo === "sector" && sectorModal && (
            <UsuariosSector
              key={sectorModal.id}
              sector={sectorModal}
              onVerDetalle={(usuarioId) =>
                setModal({
                  tipo: "detalle",
                  usuarioId,
                  sectorOrigen: sectorModal.id,
                })
              }
            />
          )}

          {modal.tipo === "detalle" && !usuarioModal && (
            <p role={detalleUsuario.error ? "alert" : "status"}>
              {detalleUsuario.cargando ? "Cargando usuario…" : detalleUsuario.error || "Usuario no encontrado."}
            </p>
          )}

          {modal.tipo === "detalle" && usuarioModal && (
            <DetalleUsuario
              usuario={usuarioModal}
              asignaciones={asignaciones}
              onVerHistorial={(dispositivo) => setModal({ ...modal, tipo: "historial", dispositivo })}
            />
          )}

          {modal.tipo === "historial" && (
            <MovimientosRecurso
              key={modal.dispositivo.recursoId}
              equipo={{
                nombre: modal.dispositivo.dispositivo,
                serie: modal.dispositivo.serie,
                tipo: modal.dispositivo.tipo,
              }}
              recursoId={modal.dispositivo.recursoId}
            />
          )}
        </ModalVentana>
      )}
    </main>
  );
}

/* ───────────── Usuarios de un sector ───────────── */

function UsuariosSector({ sector, onVerDetalle }: {
  sector: Sector;
  onVerDetalle: (id: number) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);

  const resultados = useConsultaInventario<UsuarioApi[]>(
    `usuarios?${new URLSearchParams({ sectorId: String(sector.id), q: consulta })}`, listarHcdl,
  );
  const filtrados = (resultados.datos ?? []).map(adaptarUsuario);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 6));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice(
    (paginaActual - 1) * 6,
    paginaActual * 6,
  );

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setConsulta(busqueda);
          setPagina(1);
        }}
        className="mb-2 flex items-center gap-2 rounded-lg border border-[#C7E1E6] bg-[#DEECEF] p-2"
      >
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Buscar por usuario o cargo</span>
      
          <span className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#007C9C]">
              <Icono tipo="buscar" className="h-4 w-4" />
            </span>
      
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por usuario o cargo"
              className={`${campo} pl-9`}
            />
          </span>
        </label>
      
        <button
          type="submit"
          className={`${boton} min-h-10 shrink-0 sm:min-w-24`}
        >
          Buscar
        </button>
      </form>

      <div className="hidden overflow-hidden rounded-xl border border-[#9CCBD4] sm:block">
        <table className="w-full text-center text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
          <thead className="bg-[#007C96] text-white">
            <tr>
              <th scope="col">
                ID
              </th>
              <th scope="col">
                Nombre
              </th>
              <th scope="col">
                Cargo
              </th>
              <th scope="col">
                Detalles
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#9CCBD4] bg-[#C7E1E6] text-[#006681]">
            {visibles.map((usuario) => (
              <tr key={usuario.id} className="align-middle">
                <td className="font-semibold">
                  {usuario.id}
                </td>
                <td className="[overflow-wrap:anywhere] font-semibold">
                  {usuario.nombre}
                </td>
                <td className="[overflow-wrap:anywhere]">
                  {usuario.cargo}
                </td>
                <td>
                  <button
                    type="button"
                    title="Ver detalle del usuario"
                    aria-label={`Ver detalle de ${usuario.nombre}`}
                    onClick={() => onVerDetalle(usuario.id)}
                    className={botonIcono}
                  >
                    <Icono tipo="detalle" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 sm:hidden">
        {visibles.map((usuario) => (
          <article
            key={usuario.id}
            className="flex items-center gap-3 rounded-xl border border-[#9CCBD4] bg-[#C7E1E6] p-4"
          >
            <div className="min-w-0 flex-1 text-[#006681]">
              <p className="text-xs">ID {usuario.id}</p>
              <h3 className="break-words font-bold">{usuario.nombre}</h3>
              <p className="mt-1 break-words text-sm">{usuario.cargo}</p>
            </div>

            <button
              type="button"
              aria-label={`Ver detalle de ${usuario.nombre}`}
              onClick={() => onVerDetalle(usuario.id)}
              className={botonIcono}
            >
              <Icono tipo="detalle" />
            </button>
          </article>
        ))}
      </div>

      {resultados.cargando && <p role="status">Cargando usuarios…</p>}
      {resultados.error && <p role="alert">{resultados.error}</p>}
      {!resultados.cargando && !resultados.error && filtrados.length === 0 && (
        <Vacio mensaje="No se encontraron usuarios en este sector." />
      )}

      <Paginacion
        pagina={paginaActual}
        total={totalPaginas}
        onCambiar={setPagina}
      />
    </div>
  );
}

/* ───────────── Detalle del usuario ───────────── */

function DetalleUsuario({ usuario, asignaciones, onVerHistorial }: {
  usuario: Usuario;
  asignaciones: Asignacion[];
  onVerHistorial: (dispositivo: Asignacion) => void;
}) {
  const actuales = asignaciones.filter(
    (asignacion) =>
      asignacion.usuarioId === usuario.id &&
      asignacion.fechaDevolucion === null,
  );

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-[#D7D1BF] bg-[#EFEADC] p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#61453F]">
            Información del usuario
          </h3>

          <Estado valor={usuario.estado} />
        </div>

        <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
          <Dato etiqueta="Nombre" tono="cafe">
            {usuario.nombre}
          </Dato>

          <Dato etiqueta="Cargo" tono="cafe">
            {usuario.cargo}
          </Dato>

          <Dato etiqueta="Sector" tono="cafe">
            {usuario.sector}
          </Dato>

          <Dato etiqueta="Correo" tono="cafe">
            {usuario.correo}
          </Dato>

          <Dato etiqueta="Teléfono" tono="cafe">
            {usuario.telefono || "Sin registrar"}
          </Dato>

          <Dato etiqueta="ID" tono="cafe">
            {usuario.id}
          </Dato>
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold text-[#61453F]">
          Dispositivos actualmente asignados · {actuales.length}
        </h3>

        <div className="space-y-2">
          {actuales.map((asignacion) => (
            <TarjetaAsignacion
              key={asignacion.id}
              asignacion={asignacion}
              onVerHistorial={() => onVerHistorial(asignacion)}
            />
          ))}
        </div>

        {actuales.length === 0 && (
          <Vacio mensaje="Este usuario no tiene dispositivos asignados." />
        )}
      </section>
    </div>
  );
}

function TarjetaAsignacion({
  asignacion,
  onVerHistorial,
}: {
  asignacion: Asignacion;
  onVerHistorial: () => void;
}) {
  return (
    <article className="rounded-lg border border-[#9CCBD4] bg-[#C7E1E6] px-2.5 py-2.5 text-[#006681] sm:px-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#006681] text-white">
            <Icono tipo="dispositivo" className="h-4 w-4" />
          </span>

          <div className="min-w-0 [overflow-wrap:anywhere]">
            <h4 className="text-sm leading-tight font-bold">{asignacion.dispositivo}</h4>
            <p className="text-xs">{asignacion.tipo}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-brand-dark px-2.5 py-0.5 text-xs font-semibold text-white">
            Asignado actualmente
          </span>
          <button
            type="button"
            title="Ver historial del dispositivo"
            aria-label={`Ver historial de ${asignacion.dispositivo}${asignacion.serie ? `, serie ${asignacion.serie}` : ""}`}
            onClick={onVerHistorial}
            className={botonIcono}
          >
            <Icono tipo="historial" className="size-5" />
          </button>
        </div>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs [&>div:first-child]:col-span-2 sm:grid-cols-3 sm:[&>div:first-child]:col-span-1">
        <Dato etiqueta="Número de serie">{asignacion.serie}</Dato>
        <Dato etiqueta="Asignación">
          {fechaCorta(asignacion.fechaAsignacion)}
        </Dato>
        <Dato etiqueta="Devolución">
          {asignacion.fechaDevolucion
            ? fechaCorta(asignacion.fechaDevolucion)
            : "Sin devolución registrada"}
        </Dato>
      </dl>

      {asignacion.observacion && (
        <p className="mt-1.5 whitespace-pre-wrap [overflow-wrap:anywhere] border-t border-[#9CCBD4] pt-1.5 text-xs">
          {asignacion.observacion}
        </p>
      )}
    </article>
  );
}

/* ───────────── Componentes compartidos ───────────── */

function Dato({
  etiqueta,
  children,
  tono = "azul",
}: {
  etiqueta: string;
  children: ReactNode;
  tono?: "azul" | "cafe";
}) {
  return (
    <div className="min-w-0">
      <dt
        className={`font-semibold ${
          tono === "cafe" ? "text-[#61453F]" : "text-[#006681]"
        }`}
      >
        {etiqueta}
      </dt>

      <dd
        className={`mt-0.5 break-words [overflow-wrap:anywhere] ${
          tono === "cafe" ? "text-[#735956]" : "text-[#006681]"
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

function Estado({ valor }: { valor: EstadoUsuario }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${
        valor === "Activo"
          ? "bg-[#DEECEF] text-[#006681]"
          : "bg-[#EFEADC] text-[#61453F]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${
          valor === "Activo" ? "bg-[#006681]" : "bg-[#735956]"
        }`}
      />
      {valor}
    </span>
  );
}

function Vacio({ mensaje }: { mensaje: string }) {
  return (
    <p
      role="status"
      className="rounded-xl border border-dashed border-[#9CCBD4] p-8 text-center text-sm text-[#006681]"
    >
      {mensaje}
    </p>
  );
}

function Paginacion({
  pagina,
  total,
  onCambiar,
}: {
  pagina: number;
  total: number;
  onCambiar: (pagina: number) => void;
}) {
  const inicio = Math.max(1, Math.min(pagina - 2, total - 4));
  const numeros = Array.from(
    { length: Math.min(5, total) },
    (_, indice) => inicio + indice,
  );

  const clase =
    "flex h-8 min-w-8 items-center justify-center rounded-lg border " +
    "border-[#9CCBD4] text-sm font-bold transition-colors " +
    "focus-visible:outline-2 focus-visible:outline-[#006681] " +
    "disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label="Paginación"
      className="mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2"
    >
      <span className="mr-1 text-xs text-[#006681]">
        {pagina} de {total}
      </span>

      <button
        type="button"
        aria-label="Página anterior"
        disabled={pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
        className={`${clase} bg-[#C7E1E6] text-[#006681] hover:bg-[#DEECEF]`}
      >
        <Icono tipo="izquierda" />
      </button>

      {numeros.map((numero) => (
        <button
          key={numero}
          type="button"
          aria-label={`Página ${numero}`}
          aria-current={pagina === numero ? "page" : undefined}
          onClick={() => onCambiar(numero)}
          className={`${clase} ${
            pagina === numero
              ? "bg-[#006681] text-white"
              : "bg-[#C7E1E6] text-[#006681] hover:bg-[#DEECEF]"
          }`}
        >
          {numero}
        </button>
      ))}

      <button
        type="button"
        aria-label="Página siguiente"
        disabled={pagina >= total}
        onClick={() => onCambiar(pagina + 1)}
        className={`${clase} bg-[#C7E1E6] text-[#006681] hover:bg-[#DEECEF]`}
      >
        <Icono tipo="derecha" />
      </button>
    </nav>
  );
}

function ModalVentana({
  titulo,
  subtitulo,
  icono,
  volver,
  compacto = false,
  children,
  onCerrar,
}: {
  titulo: string;
  subtitulo?: string;
  icono: TipoIcono;
  volver?: { etiqueta: string; accion: () => void };
  compacto?: boolean;
  children: ReactNode;
  onCerrar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (!dialog.open) dialog.showModal();

    return () => {
      document.body.style.overflow = overflowAnterior;
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onCancel={(event) => {
        event.preventDefault();
        onCerrar();
      }}
      className={`fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-hidden rounded-xl border border-[#9CCBD4] bg-[#F3F1EB] p-0 text-[#61453F] shadow-xl backdrop:bg-black/40 ${compacto ? "max-w-3xl" : "max-w-5xl"}`}
    >
      <div className="flex max-h-[calc(92dvh-2px)] min-w-0 flex-col">
        <header className="flex shrink-0 items-center gap-2 bg-[#006681] px-3 py-2 text-white sm:px-4">
          {volver && (
            <button
              type="button"
              title={volver.etiqueta}
              aria-label={volver.etiqueta}
              onClick={volver.accion}
              className="grid size-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-white [@media(pointer:coarse)]:size-11"
            >
              <Icono tipo="izquierda" className="size-5" />
            </button>
          )}
          <Icono tipo={icono} className="h-5 w-5 shrink-0" />

          <div className="min-w-0 flex-1 self-center">
            <h2 className="text-base font-bold [overflow-wrap:anywhere]">
              {titulo}
            </h2>

            {subtitulo && (
              <p className="text-xs text-[#DEECEF] [overflow-wrap:anywhere] sm:text-sm">
                {subtitulo}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="Cerrar ventana"
            onClick={onCerrar}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md transition-colors hover:bg-[#F49737] hover:text-[#392414] focus-visible:bg-[#F49737] focus-visible:text-[#392414] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          >
            <Icono tipo="cerrar" className="h-5 w-5" />
          </button>
        </header>

        <div key={titulo} className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 ${compacto ? "" : "sm:p-4"}`}>
          {children}
        </div>
      </div>
    </dialog>
  );
}

/* ───────────── Íconos sin dependencias adicionales ───────────── */

function Icono({
  tipo,
  className = "h-6 w-6",
}: {
  tipo: TipoIcono;
  className?: string;
}) {
  const trazos: Record<TipoIcono, ReactNode> = {
    usuario: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    sector: (
      <>
        <path d="M19 9c0 5-7 11-7 11S5 14 5 9a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="9" r="2.5" />
        <path d="M6 18c-2 .4-3 1-3 2 0 1.7 4 3 9 3s9-1.3 9-3c0-1-1-1.6-3-2" />
      </>
    ),
    buscar: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    historial: (
      <>
        <path d="M3 11a9 9 0 1 1 2.6 7.4" />
        <path d="M3 4v7h7M12 7v5l3 2" />
      </>
    ),
    detalle: (
      <>
        <path d="M14 3H5v18h14V8Z" />
        <path d="M14 3v5h5M8 11h5M8 15h3" />
        <circle cx="16" cy="16" r="3" />
        <path d="m18.2 18.2 3 3" />
      </>
    ),
    cerrar: <path d="m5 5 14 14M19 5 5 19" />,
    izquierda: <path d="m15 5-7 7 7 7" />,
    derecha: <path d="m9 5 7 7-7 7" />,
    dispositivo: (
      <>
        <rect x="3" y="3" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 16v5" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {trazos[tipo]}
    </svg>
  );
}
