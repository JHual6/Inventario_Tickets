import { redirect } from "next/navigation";
import { inicio, obtenerSesion } from "@/lib/sesion-hcdl";
import FormularioClaveInicial from "./FormularioClaveInicial";

export default async function PrimeraContrasenaPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/acceso");
  if (!sesion.cambioClavePendiente) redirect(inicio(sesion));

  return <FormularioClaveInicial />;
}
