const botonPagina =
  "grid h-8 min-w-8 place-items-center rounded-md border border-[#9CCBD4] px-1 text-sm font-semibold transition-colors " +
  "[@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006681]";
const inactiva = "bg-[#DEECEF] text-[#006681] enabled:hover:bg-[#C7E1E6]";
const flecha = `${botonPagina} ${inactiva} disabled:cursor-not-allowed disabled:opacity-40`;

export default function PaginacionHcdl({ pagina, total, porPagina, cambiar, unidad = "registros" }: {
  pagina: number; total: number; porPagina: number; cambiar: (pagina: number) => void; unidad?: string;
}) {
  const ultima = Math.max(1, Math.ceil(total / porPagina));
  const inicio = (pagina - 1) * porPagina;
  return (
    <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-3 pt-3">
      <p role="status" className="text-xs text-[#61453F]">
        Mostrando {total ? inicio + 1 : 0}–{Math.min(inicio + porPagina, total)} de {total} {unidad}
      </p>
      <nav aria-label="Paginación" className="ml-auto flex flex-wrap items-center gap-1.5">
        <button type="button" aria-label="Página anterior" disabled={pagina <= 1}
          onClick={() => cambiar(pagina - 1)} className={flecha}>‹</button>
        {Array.from({ length: ultima }, (_, indice) => {
          const numero = indice + 1;
          const activa = pagina === numero;
          return (
            <button key={numero} type="button" aria-label={`Página ${numero}`} aria-current={activa ? "page" : undefined}
              onClick={() => cambiar(numero)} className={`${botonPagina} ${activa ? "bg-[#006681] text-white" : inactiva}`}>
              {numero}
            </button>
          );
        })}
        <button type="button" aria-label="Página siguiente" disabled={pagina >= ultima}
          onClick={() => cambiar(pagina + 1)} className={flecha}>›</button>
      </nav>
    </footer>
  );
}
