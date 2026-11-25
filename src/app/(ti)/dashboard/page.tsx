export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-screen-2xl px-3 py-5 sm:px-5">
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>

      <section
        aria-labelledby="estado-dashboard"
        className="mt-4 rounded-xl border border-[#9CCBD4] bg-brand-pale px-4 py-8 text-center sm:px-6"
      >
        <h2 id="estado-dashboard" className="text-lg font-semibold text-brand-dark">
          No disponible por ahora
        </h2>
      </section>
    </main>
  );
}