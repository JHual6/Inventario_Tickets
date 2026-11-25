export default function EstadoCatalogo({ cargando, error, reintentar }: {
  cargando: boolean; error: string; reintentar: () => void;
}) {
  if (error) return (
    <div role="alert" className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink">
      <p>{error}</p>
      <button type="button" onClick={reintentar} className="font-semibold text-brand-dark underline">Reintentar</button>
    </div>
  );
  return cargando ? <p role="status" className="mb-3 text-sm text-brand-dark">Cargando datos…</p> : null;
}
