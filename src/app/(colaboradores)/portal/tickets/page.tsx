import TicketsHcdl from "@/components/TicketsHcdl";

export default async function MisSolicitudes({ searchParams }: {
  searchParams: Promise<{ creado?: string | string[]; vista?: string | string[] }>;
}) {
  const { creado, vista } = await searchParams;
  const ticketCreado = typeof creado === "string" && /^[1-9][0-9]{0,9}$/.test(creado) ? creado : undefined;
  return (
    <TicketsHcdl
      key={ticketCreado ?? (vista === "resueltos" ? "resueltos" : "pendientes")}
      esTI={false}
      creado={ticketCreado}
      verResueltos={vista === "resueltos"}
    />
  );
}
