import pg from "pg";

export function conectar() {
  const cadena = process.env.DATABASE_URL;
  if (!cadena && !process.env.PGPASSWORD) {
    throw new Error("Define PGPASSWORD en .env con la contraseña de PostgreSQL.");
  }
  return new pg.Pool({
    ...(cadena ? { connectionString: cadena } : {
      host: process.env.PGHOST ?? "127.0.0.1",
      port: Number(process.env.PGPORT ?? 5433),
      database: process.env.PGDATABASE ?? "hcdl",
      user: process.env.PGUSER ?? "hcdl",
    }),
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });
}
