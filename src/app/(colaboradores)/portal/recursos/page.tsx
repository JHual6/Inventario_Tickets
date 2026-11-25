"use client";

import { useEffect, useState } from "react";
import CampoBusqueda from "@/components/CampoBusqueda";
import PaginacionHcdl from "@/components/PaginacionHcdl";
import { Icono, IconoEstado, type NombreIcono } from "@/components/inventario/EquipoDetalleModal";
import { IconoMovil } from "@/components/inventario/MovilDetalleModal";
import { apiHcdl, mensajeHcdl, type Pagina, type Recurso } from "@/lib/api-hcdl";

const porPagina = 9;
const categorias: Record<Recurso["categoria"], { etiqueta: string; singular: string; icono: NombreIcono }> = {
  equipo: { etiqueta: "Equipos", singular: "Equipo", icono: "equipo" },
  movil: { etiqueta: "Móviles", singular: "Móvil", icono: "equipo" },
  periferico: { etiqueta: "Periféricos", singular: "Periférico", icono: "hardware" },
  impresora: { etiqueta: "Impresoras", singular: "Impresora", icono: "detalle" },
  iot: { etiqueta: "IoT", singular: "IoT", icono: "red" },
};
const campo = "min-h-11 w-full min-w-0 rounded-md border border-[#9CCBD4] bg-surface px-3 text-base font-normal text-brand-dark placeholder:text-[#39798A] focus-visible:outline-2 focus-visible:outline-brand sm:text-sm";
const boton = "inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition-colors enabled:hover:bg-accent enabled:hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:opacity-60";

function TarjetaRecurso({ recurso }: { recurso: Recurso }) {
  const categoria = categorias[recurso.categoria];
  const descripcion = [recurso.tipo, recurso.marca].filter(Boolean).join(" · ");

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#9CCBD4] bg-surface text-brand-dark">
      <div className="flex flex-1 items-start gap-3 bg-brand-light p-3 sm:px-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-dark text-white">
          {recurso.categoria === "movil" ? <IconoMovil className="size-5" /> : <Icono nombre={categoria.icono} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">{categoria.singular}</p>
          <h2 className="mt-0.5 text-base leading-tight font-bold wrap-anywhere">{recurso.nombre}</h2>
          {descripcion && <p className="mt-1 text-xs wrap-anywhere">{descripcion}</p>}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-[#9CCBD4] px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <dt className="text-xs text-ink-muted">Número de serie</dt>
          <dd className="mt-0.5 text-sm font-semibold wrap-anywhere">{recurso.serie || "Sin registrar"}</dd>
        </div>
        <div className="min-w-0 border-l border-brand-light pl-3">
          <dt className="text-xs text-ink-muted">Sector</dt>
          <dd className="mt-0.5 text-sm font-semibold wrap-anywhere">{recurso.sector || "Sin registrar"}</dd>
        </div>
        {recurso.estado && (
          <div className="col-span-2 flex items-center justify-between gap-2 border-t border-brand-pale pt-2">
            <dt className="text-xs text-ink-muted">Estado</dt>
            <dd className="inline-flex min-w-0 items-center gap-1 rounded-full bg-brand-pale px-2.5 py-1 text-xs font-semibold wrap-anywhere">
              <IconoEstado estado={recurso.estado} className="size-4 shrink-0" />
              {recurso.estado}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export default function MisEquipos() {
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [resultado, setResultado] = useState<Pagina<Recurso> | null>(null);
  const [error, setError] = useState("");
  const hayFiltros = Boolean(busqueda || categoria);

  useEffect(() => {
    const controlador = new AbortController();
    const consulta = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), q: busqueda });
    if (categoria) consulta.set("categoria", categoria);
    const espera = setTimeout(async () => {
      try {
        const datos = await apiHcdl<Pagina<Recurso>>(`recursos?${consulta}`, { signal: controlador.signal });
        if (controlador.signal.aborted) return;
        const ultima = Math.max(1, Math.ceil(datos.total / porPagina));
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
  }, [pagina, busqueda, categoria]);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-screen-2xl flex-col gap-4 px-3 py-4 text-sm text-ink sm:px-5">
      <header className="flex items-center gap-3 px-1 text-brand-dark">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-light">
          <Icono nombre="equipo" className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl leading-tight font-bold">Mis equipos</h1>
          <p className="mt-0.5 text-ink-muted">Dispositivos asignados a tu cuenta.</p>
        </div>
      </header>

      <section aria-label="Filtros de equipos asignados" className="grid items-end gap-3 rounded-xl border border-brand-light bg-brand-pale p-3 sm:grid-cols-[minmax(0,2fr)_minmax(8rem,1fr)_auto]">
        <label className="grid gap-1 text-xs font-semibold text-brand-dark">
          Buscar equipo
          <CampoBusqueda maxLength={120} className={campo} placeholder="Nombre, modelo, marca o serie"
            value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); setPagina(1); }} />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-brand-dark">
          Categoría
          <select className={campo} value={categoria} onChange={(evento) => { setCategoria(evento.target.value); setPagina(1); }}>
            <option value="">Todas las categorías</option>
            {Object.entries(categorias).map(([valor, { etiqueta }]) => <option key={valor} value={valor}>{etiqueta}</option>)}
          </select>
        </label>
        <button type="button" className={boton} disabled={!hayFiltros}
          onClick={() => { setBusqueda(""); setCategoria(""); setPagina(1); }}>Limpiar filtros</button>
      </section>

      {error ? <p role="alert" className="rounded-xl border border-outline bg-surface px-4 py-3">{error}</p> :
        !resultado ? <p role="status" className="rounded-xl border border-outline bg-surface-muted px-4 py-3">Cargando tus equipos…</p> :
        resultado.total === 0 ? (
          <div role="status" className="flex flex-col items-center gap-2 rounded-xl border border-outline bg-surface-muted px-4 py-8 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-brand-light text-brand-dark">
              <Icono nombre="equipo" />
            </span>
            <p className="font-semibold text-brand-dark">
              {hayFiltros ? "No se encontraron coincidencias." : "No tienes dispositivos asignados."}
            </p>
          </div>
        ) : (
          <section aria-label="Equipos asignados" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {resultado.datos.map((recurso) => <TarjetaRecurso key={recurso.id} recurso={recurso} />)}
          </section>
        )}
      {resultado && !error && <PaginacionHcdl pagina={resultado.pagina} total={resultado.total}
        porPagina={porPagina} cambiar={setPagina} unidad="dispositivos" />}
    </main>
  );
}
