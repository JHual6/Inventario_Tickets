"use client";

import Link from "next/link";

export default function ErrorHcdl({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-5 py-10 text-ink">
      <h1 className="text-xl font-bold">No se pudo abrir esta sección</h1>
      <p>Comprueba que la API de HCDL esté en ejecución e inténtalo de nuevo.</p>
      <button className="rounded-md bg-brand px-4 py-2 text-white" onClick={reset}>Reintentar</button>
      <Link className="ml-4 text-brand-dark underline" href="/acceso">Volver al acceso</Link>
    </main>
  );
}
