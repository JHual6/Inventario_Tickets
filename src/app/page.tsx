import { redirect } from "next/navigation";
import { inicio, obtenerSesion } from "@/lib/sesion-hcdl";

export default async function InicioPage() {
  const sesion = await obtenerSesion();
  redirect(sesion ? inicio(sesion.rol) : "/acceso");
}
