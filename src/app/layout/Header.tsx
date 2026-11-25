"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CerrarSesion from "@/components/CerrarSesion";

const enlacesTI = [
  {
    nombre: "Dashboard",
    href: "/dashboard",
    base: "/dashboard",
  },
  {
    nombre: "Gestión de Inventario",
    href: "/inventario/equipos",
    base: "/inventario",
  },
  {
    nombre: "Fichas y Actas de entrega",
    href: "/asignaciones",
    base: "/asignaciones",
  },
  {
    nombre: "Tickets",
    href: "/tickets",
    base: "/tickets",
  },
  {
    nombre: "Usuarios y Sectores",
    href: "/usuarios",
    base: "/usuarios",
  },
  {
    nombre: "Administración",
    href: "/administracion",
    base: "/administracion",
  },
];

const enlacesColaboradores = [
  { nombre: "Mis equipos", href: "/portal/recursos", base: "/portal/recursos" },
  { nombre: "Mis solicitudes", href: "/portal/tickets", base: "/portal/tickets" },
];

const categorias = [
  { nombre: "Equipos", href: "/inventario/equipos" },
  { nombre: "Móviles", href: "/inventario/moviles" },
  { nombre: "Periféricos", href: "/inventario/perifericos" },
  { nombre: "Impresoras", href: "/inventario/impresoras" },
  { nombre: "IoT", href: "/inventario/iot" },
  { nombre: "Suministros", href: "/inventario/suministros" },
];

export default function Header({ colaborador = false }: { colaborador?: boolean }) {
  const enlaces = colaborador ? enlacesColaboradores : enlacesTI;
  const pathname = usePathname();
  const [menuAbiertoEn, setMenuAbiertoEn] = useState<string | null>(null);

  const menuAbierto = menuAbiertoEn === pathname;

function coincide(ruta: string) {
  if (ruta === "/") return pathname === "/";

  if (ruta === "/usuarios") {
    return (
      pathname === "/usuarios" ||
      pathname.startsWith("/usuarios/") ||
      pathname === "/sectores" ||
      pathname.startsWith("/sectores/")
    );
  }

  return pathname === ruta || pathname.startsWith(`${ruta}/`);
}

  function cerrarMenu() {
    setMenuAbiertoEn(null);
  }

  const estiloEnlace =
    "flex items-center justify-center px-4 text-sm font-medium " +
    "transition-colors hover:bg-accent hover:text-ink " +
    "focus-visible:outline-2 focus-visible:-outline-offset-4 " +
    "focus-visible:outline-surface";

  return (
    <header
      className="sticky top-0 z-50"
      onKeyDown={(event) => {
        if (event.key === "Escape") cerrarMenu();
      }}
    >
      <div className="bg-brand text-surface">
        <div className="hcdl-barra flex h-[60px] items-center">
          {/* Archivo: public/logo.png */}
          <div className="hcdl-extremo-inicio flex h-full shrink-0 items-center px-3 transition-colors">
            <Link
              href="/"
              onClick={cerrarMenu}
              aria-label="Hotel Cabaña del Lago, inicio"
              className="relative h-[54px] w-[54px] shrink-0 overflow-hidden rounded-full border-2 border-background bg-brand-dark"
            >
            <Image
              src="/logo.png"
              alt="Hotel Cabaña del Lago"
              fill
              sizes="54px"
              className="object-contain"
            />
            </Link>
          </div>

          {/* Navegación de escritorio */}
          <nav
            aria-label="Navegación principal"
            className="hidden h-full min-w-0 flex-1 items-stretch lg:flex"
          >
            {enlaces.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={coincide(enlace.base) ? "page" : undefined}
              className={`${estiloEnlace} flex-1 whitespace-nowrap ${
                enlace.base === "/dashboard"
                  ? "hcdl-dashboard"
                  : enlace.base === "/administracion"
                    ? `hcdl-administracion ${coincide(enlace.base) ? "bg-accent text-ink" : ""}`
                    : colaborador && coincide(enlace.base) ? "bg-brand-dark" : ""
              }`}
            >
              {enlace.nombre}
            </Link>
            ))}
          </nav>

          <div className={`hcdl-extremo-final ml-auto flex h-full shrink-0 items-center gap-3 px-3 transition-colors ${coincide("/administracion") ? "bg-accent" : ""}`}>
            <CerrarSesion soloIcono />

            {/* Botón de menú móvil */}
            <button
              type="button"
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuAbierto}
              aria-controls="menu-movil"
              onClick={() => {
                setMenuAbiertoEn(menuAbierto ? null : pathname);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-surface lg:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="h-6 w-6"
              >
                {menuAbierto ? (
                  <path d="m6 6 12 12M18 6 6 18" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Navegación móvil */}
        <nav
          id="menu-movil"
          aria-label="Navegación móvil"
          hidden={!menuAbierto}
          className="border-t border-brand-light lg:hidden"
        >
          {enlaces.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              onClick={cerrarMenu}
              aria-current={coincide(enlace.base) ? "page" : undefined}
              className={`${estiloEnlace} min-h-12 justify-start ${colaborador && coincide(enlace.base) ? "bg-brand-dark" : ""}`}
            >
              {enlace.nombre}
            </Link>
          ))}
        </nav>
      </div>

      {/* Categorías: solo aparecen dentro del inventario */}
      {coincide("/inventario") && (
        <nav
          aria-label="Categorías de inventario"
          className="overflow-x-auto border-b border-outline bg-surface"
        >
          <div className="flex w-full gap-2 px-5 py-2">
            {categorias.map((categoria) => (
              <Link
                key={categoria.href}
                href={categoria.href}
                onClick={cerrarMenu}
                aria-current={
                  coincide(categoria.href) ? "page" : undefined
                }
                className={`flex min-w-[110px] flex-1 basis-0 items-center justify-center rounded-md px-3 py-2 text-center text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-dark ${
                  coincide(categoria.href)
                    ? "bg-brand text-white hover:bg-accent hover:text-ink"
                    : "text-brand-dark hover:bg-accent hover:text-ink"
                }`}
              >
                {categoria.nombre}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}