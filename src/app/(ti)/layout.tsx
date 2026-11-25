import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Header from "@/app/layout/Header";
import { inicio, obtenerSesion } from "@/lib/sesion-hcdl";

export default async function LayoutTI({ children }: { children: ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/acceso");
  if (sesion.rol === "solicitante") redirect(inicio(sesion.rol));
  return <><Header /><div className="min-h-0 flex-1 overflow-y-auto">{children}</div></>;
}
