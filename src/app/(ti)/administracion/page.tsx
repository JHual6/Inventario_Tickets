"use client";

import { useEffect, useId, useRef, useState } from "react";
import EstadoCatalogo from "@/components/EstadoCatalogo";
import { apiHcdl, enviarHcdl, mensajeHcdl, type Recurso } from "@/lib/api-hcdl";
import { fichaTexto, useCatalogoTI, type RecursoTI } from "@/lib/catalogo-hcdl";
import type { CSSProperties, FormEvent, ReactNode } from "react";

const categorias = ["Periféricos", "Móviles", "Equipos", "Impresoras", "Suministros", "IoT", "Usuarios"] as const;
type Categoria = (typeof categorias)[number];
type Campo = "modelo" | "nombre" | "tipo" | "serie" | "marca" | "estado" | "area" | "usuario" | "ip" | "stock" | "descripcion" | "correo" | "cargo";
type CampoEquipo = "nombreSistema" | "sistemaOperativo" | "antivirus" | "office" | "ram" |
  "almacenamiento" | "tarjetaVideo" | "procesador" | "wifi" | "ethernet" | "macWifi" | "macEthernet";
type CampoMovil = "imei1" | "imei2" | "compania" | "convenio" | "plan" | "numeroLinea" | "accesorio";
type Registro = Partial<Record<Campo | CampoEquipo | CampoMovil, string>> & {
  id: number;
  categoria: Categoria;
  nombre: string;
  visible: boolean;
  usuarioId?: number;
  revision?: string;
  ubicacion?: string;
  compatibles?: number[];
  stockMinimo?: number;
  accesoWeb?: boolean;
  urlWeb?: string;
  claveWeb?: string;
  tieneClaveWeb?: boolean;
};
type Filtro = Campo | "visible";
type Cambio = { id: string; impresoraId: number; suministro: string; fecha: string; nota: string };
type Dialogo = { accion: "Agregar" | "Editar" | "Detalles" | "Configuración" | "Compatibilidad" | "Suministro" | "Agregar stock" | "Desvincular recursos" | "Cambiar contraseña"; registro: Registro };

function tieneUsuario(recurso: Registro) {
  return recurso.usuarioId !== undefined || Boolean(recurso.usuario?.trim());
}

function estadosSinUsuario(estado?: string) {
  return [...new Set(["Disponible", "Dañado", "Fuera de servicio", estado].filter(
    (opcion): opcion is string => Boolean(opcion && opcion !== "Asignado"),
  ))];
}

function perteneceAUsuario(recurso: Registro, usuario: Registro) {
  return (recurso.categoria === "Equipos" || recurso.categoria === "Móviles" || recurso.categoria === "Periféricos") &&
    (recurso.usuarioId !== undefined ? recurso.usuarioId === usuario.id : recurso.usuario === usuario.nombre);
}

const etiquetas: Record<Filtro | CampoEquipo | CampoMovil, string> = {
  modelo: "Modelo", nombre: "Nombre", tipo: "Tipo", serie: "Número de serie", marca: "Marca",
  estado: "Estado", area: "Área", usuario: "Usuario", ip: "Dirección IP",
  nombreSistema: "Nombre del equipo", sistemaOperativo: "Sistema operativo", antivirus: "Antivirus", office: "Office",
  ram: "RAM", almacenamiento: "Almacenamiento", tarjetaVideo: "Tarjeta de video", procesador: "Procesador",
  wifi: "Wi-Fi", ethernet: "Ethernet", macWifi: "Dirección MAC Wi-Fi", macEthernet: "Dirección MAC Ethernet",
  imei1: "IMEI 1", imei2: "IMEI 2", compania: "Compañía", convenio: "Convenio",
  plan: "Plan", numeroLinea: "Número de línea", accesorio: "Accesorio",
  stock: "Stock", descripcion: "Descripción", correo: "Correo", cargo: "Cargo", visible: "Visibilidad",
};

const bloquesEquipo = [
  { titulo: "Software", icono: "software", campos: ["sistemaOperativo", "antivirus", "office"] },
  { titulo: "Hardware", icono: "hardware", campos: ["ram", "almacenamiento", "tarjetaVideo", "procesador"] },
  { titulo: "Conectividad", icono: "wifi", campos: ["wifi", "ethernet"] },
  { titulo: "Identificadores", icono: "detalle", campos: ["macWifi", "macEthernet", "ip", "serie"] },
] as const;
const camposEquipo = [
  "nombre", "modelo", "marca", "nombreSistema", "tipo", "usuario", "estado",
  ...bloquesEquipo.flatMap(({ campos }) => [...campos]),
] as const;

const bloquesMovil = [
  { titulo: "Identificadores", icono: "detalle", campos: ["serie", "imei1", "imei2"] },
  { titulo: "Tarjeta SIM", icono: "sim", campos: ["compania", "convenio", "plan", "numeroLinea"] },
] as const;
const camposMovil = [
  "nombre", "marca", "accesorio", ...bloquesMovil.flatMap(({ campos }) => [...campos]),
] as const;

const camposIoT = ["nombre", "tipo", "marca", "serie", "estado"] as const;
const tiposIoT = ["Punto de acceso", "Switch", "Router", "UPS", "TV", "Teléfono IP", "Teléfono fijo", "Otro"] as const;
const estadosIoT = ["Operativo", "Disponible", "Fuera de servicio", "En revisión"] as const;

const configuracion: Record<Categoria, { columnas: Campo[]; filtros: Filtro[]; buscar: string }> = {
  "Periféricos": { columnas: ["nombre", "tipo", "serie", "estado", "usuario"], filtros: ["tipo", "visible", "estado"], buscar: "Nombre, usuario o número de serie" },
  "Móviles": { columnas: ["nombre", "tipo", "serie", "estado", "usuario"], filtros: ["marca", "visible", "estado"], buscar: "Modelo, usuario o número de serie" },
  Equipos: { columnas: ["nombre", "tipo", "serie", "estado", "usuario"], filtros: ["visible", "marca", "estado"], buscar: "Modelo, usuario o número de serie" },
  Impresoras: { columnas: ["nombre", "tipo", "serie", "estado", "area", "ip"], filtros: ["visible", "area", "estado"], buscar: "Dirección IP, modelo o número de serie" },
  Suministros: { columnas: ["nombre", "tipo", "stock", "estado", "descripcion"], filtros: ["tipo", "visible", "estado"], buscar: "Nombre del suministro o impresora compatible" },
  IoT: { columnas: [...camposIoT], filtros: ["tipo", "estado", "visible"], buscar: "Nombre, tipo, marca o número de serie" },
  Usuarios: { columnas: ["nombre", "estado", "correo", "cargo", "area"], filtros: ["area", "visible", "estado"], buscar: "Nombre, correo, cargo o área" },
};

const categoriasRecurso: Record<Recurso["categoria"], Categoria> = {
  equipo: "Equipos", movil: "Móviles", periferico: "Periféricos", impresora: "Impresoras", iot: "IoT",
};

function registroRecurso(r: RecursoTI): Registro {
  return {
    ...Object.fromEntries(Object.entries(r.ficha).filter(([, valor]) => typeof valor === "string")),
    id: r.id, categoria: categoriasRecurso[r.categoria], nombre: r.nombre, tipo: r.tipo ?? undefined,
    marca: r.marca ?? undefined, serie: r.serie ?? undefined, estado: r.estado, visible: r.visible,
    usuario: r.usuario ?? undefined, usuarioId: r.usuarioId ?? undefined, area: r.sector ?? undefined,
    wifi: fichaTexto(r, "tarjetaWifi", "wifi"), ethernet: fichaTexto(r, "tarjetaEthernet", "ethernet"),
    numeroLinea: fichaTexto(r, "numeroLinea", "numero"), accesorio: fichaTexto(r, "accesorio", "accesorios"),
    accesoWeb: r.ficha.accesoWeb === true, tieneClaveWeb: r.tieneClaveWeb,
  };
}

function datosRecurso(registro: Registro, sectorId?: number | null) {
  const categoria = Object.entries(categoriasRecurso).find(([, nombre]) => nombre === registro.categoria)?.[0];
  const ficha = Object.fromEntries([
    ...camposEquipo, ...camposMovil, "modelo", "ubicacion", "urlWeb", "accesoWeb",
  ].flatMap((clave) => {
    const valor = registro[clave as keyof Registro];
    return valor === undefined ? [] : [[clave, valor]];
  }));
  if (registro.wifi !== undefined) ficha.tarjetaWifi = registro.wifi;
  if (registro.ethernet !== undefined) ficha.tarjetaEthernet = registro.ethernet;
  return {
    id: registro.id || null, categoria, nombre: registro.nombre, tipo: registro.tipo, marca: registro.marca,
    serie: registro.serie, estado: registro.estado, sectorId, ficha, claveWeb: registro.claveWeb,
  };
}

const etiquetaCampo = "grid min-w-0 content-start gap-1 text-xs font-semibold";
const entrada = "min-h-9 w-full min-w-0 rounded-md border border-[color:var(--borde-campo,#d7d1bf)] bg-white px-3 py-1.5 text-base text-[color:var(--texto-campo,#61453f)] placeholder:text-[color:var(--texto-campo,#735956)] focus-visible:outline-2 focus-visible:outline-[color:var(--texto-campo,#61453f)] sm:text-sm";
const boton = "inline-flex min-h-9 items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed [@media(pointer:coarse)]:min-h-11";
const cafe = boton + " bg-[#61453f] text-white enabled:hover:bg-[#735956]";
const azul = boton + " bg-[#007c96] text-white enabled:hover:bg-[#006681]";
const filaEstadoFormulario = "flex flex-wrap items-end gap-2 [&>label]:flex-[1_1_9rem] [&>div]:ml-auto [@media(pointer:coarse)]:[&_select]:min-h-11";

function clasePestana(activa: boolean) {
  return boton + " min-w-0 gap-2 leading-tight " +
    (activa ? "bg-[#007c96] text-white" : "text-[#006681] hover:bg-[#deecef]");
}

const iconosAdmin = {
  stockDisponible: "M20 6 9 17l-5-5",
  stockBajo: "M12 3 2 20h20L12 3zm0 6v4m0 3v.1",
  sinStock: "M18 6 6 18M6 6l12 12",
  teclado: "M3 7h18a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm2 4h.1m3 0h.1m4 0h.1m4 0h.1m3 0h.1M5 15h.1m3 0h8m3 0h.1",
  mouse: "M12 3a6 6 0 0 1 6 6v6a6 6 0 0 1-12 0V9a6 6 0 0 1 6-6zm0 0v6",
  monitor: "M3 4h18v13H3zm9 13v4m-4 0h8",
  usuario: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21a8 8 0 0 1 16 0",
  contrasena: "M6 10h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zm2 0V7a4 4 0 0 1 8 0v3m-4 5v2",
  volver: "M10 5l-7 7 7 7m-7-7h11a6 6 0 0 1 6 6",
  guardar: "M4 3h13l3 3v15H4zm4 0v6h8V3M8 21v-7h8v7",
  stock: "M3 8l9-5 9 5v9l-9 5-9-5zm0 0 9 5 9-5m-9 5v9M7.5 5.5l9 5",
  mas: "M12 4v16M4 12h16",
  red: "M9 3h6v6H9zM3 15h6v6H3zm12 0h6v6h-6zM12 9v3m-6 3v-3h12v3",
  impresora: "M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6zm11-3h1",
  telefono: "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm3 17h2",
  sim: "M6 3h8l4 4v14H6zm3 8h6v7H9zm3 0v7",
  laptop: "M5 5h14v11H5zM5 16l-3 4h20l-3-4M10 18h4",
  software: "M8 6l-5 6 5 6m8-12 5 6-5 6m-3-14-2 16",
  hardware: "M6 6h12v12H6zm4 4h4v4h-4zM9 3v3m6-3v3m-6 12v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3",
  wifi: "M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0m-4 3v.1",
  oculto: "M3 3l18 18M10 6l2-.2c6.5 0 10 6.2 10 6.2a16 16 0 0 1-3 3.4M6 7.5A16 16 0 0 0 2 12s3.5 6 10 6c1.2 0 2.2-.2 3.2-.5M9.2 10.8a3 3 0 0 0 4 4",
  activos: "M11 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6m-9 2 1-4 7-7 3 3-7 7zM17 4l3 3",
  cambio: "M4 9V5h4M20 15v4h-4M4 5l4 4m12 10-4-4m-8-5 4-2 4 2v5l-4 2-4-2zm0 0 4 2 4-2m-4 2v5",
  buscar: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0zm-2 4 6 6",
  detalle: "M6 3h8l4 4v4m-4-8v5h4m-9 3h4m-4 3h2m0 7H6V3m13 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm-1 2 3 3",
  visible: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  desvincular: "M9 15l6-6m-8 8-1 1a3 3 0 0 1-4-4l4-4m12 4 4-4a3 3 0 0 0-4-4l-1 1M5 3l1 3m-3 1 3 1m13 13-1-3m3-1-3-1",
  compatibilidad: "M10 14l4-4m-6 6-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0m2 6a3 3 0 0 0 4 0l4-4a3 3 0 0 0-4-4l-1 1",
};

function IconoAdmin({ tipo }: { tipo: keyof typeof iconosAdmin }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d={iconosAdmin[tipo]} />
    </svg>
  );
}

function AccionIcono({ etiqueta, icono, ejecutar }: {
  etiqueta: string;
  icono: keyof typeof iconosAdmin;
  ejecutar: () => void;
}) {
  return (
    <button type="button" className={botonAccion} aria-label={etiqueta} title={etiqueta} onClick={ejecutar}>
      <IconoAdmin tipo={icono} />
    </button>
  );
}
const contenedor = "rounded-xl border border-[#c7e1e6] bg-[#deecef] p-3";
const campoFiltro = "min-h-10 w-full min-w-0 rounded-md border border-[#9ccbd4] bg-white px-3 py-2 text-base text-[#006681] placeholder:text-[#39798a] focus-visible:outline-2 focus-visible:outline-[#007c96] sm:text-sm";
const etiquetaFiltro = "grid min-w-0 gap-1 text-xs font-semibold text-brand-dark";
const botonAccion = "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#007c96] text-white hover:bg-[#006681] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006681] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";

const fechaChile = new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" });

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function valor(registro: Registro, campo: Filtro) {
  if (campo === "visible") return registro.visible ? "Visible" : "Oculto";
  if (campo === "estado" && registro.categoria === "Suministros") {
    const stock = Number(registro.stock);
    return stock === 0 ? "Sin stock" : stock <= (registro.stockMinimo ?? 1) ? "Poco stock" : "Con stock";
  }
  return registro[campo] ?? "";
}

function camposDe(categoria: Categoria): Campo[] {
  const { columnas, filtros } = configuracion[categoria];
  const campos = [...columnas, ...filtros.filter((campo): campo is Campo => campo !== "visible")];
  return [...new Set(campos)].filter((campo) => categoria !== "Suministros" || campo !== "estado");
}

function Modal({ titulo, cerrar, children, ancho = false, compacto = false, subtitulo, icono, pie }: {
  titulo: string; cerrar: () => void; children: ReactNode; ancho?: boolean;
  compacto?: "detalle" | "formulario" | false;
  subtitulo?: string; icono?: keyof typeof iconosAdmin; pie?: ReactNode;
}) {
  const id = useId();
  return (
    <dialog
      ref={(elemento) => { if (elemento && !elemento.open) elemento.showModal(); }}
      onClose={cerrar}
      aria-labelledby={id}
      className={"fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-hidden rounded-xl border border-[#9ccbd4] bg-[#f3f1eb] p-0 text-[#61453f] shadow-xl backdrop:bg-black/40 " +
        (compacto === "detalle" ? "max-w-md" : compacto === "formulario" ? "max-w-xl" : ancho ? "max-w-5xl" : "max-w-2xl")}
    >
      <div className="flex max-h-[calc(92dvh-2px)] min-w-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 bg-[#006681] px-3 py-2 text-white sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            {icono && <IconoAdmin tipo={icono} />}
            <div className="min-w-0">
              <h2 id={id} className="text-base font-bold [overflow-wrap:anywhere]">{titulo}</h2>
              {subtitulo && <p className="text-xs text-[#deecef] sm:text-sm">{subtitulo}</p>}
            </div>
          </div>
          <form method="dialog" className="shrink-0">
            <button type="submit" aria-label="Cerrar"
              className="grid h-10 w-10 place-items-center rounded-md text-2xl leading-none transition-colors hover:bg-[#f49737] hover:text-[#392414] focus-visible:bg-[#f49737] focus-visible:text-[#392414] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11">
              <span aria-hidden="true">×</span>
            </button>
          </form>
        </header>
        <div className={"min-h-0 overflow-y-auto overscroll-contain p-3 " + (compacto ? "" : "sm:p-4")}>{children}</div>
        {pie && <footer className="shrink-0 border-t border-[#9ccbd4] bg-[#deecef] px-3 py-2 sm:px-4">{pie}</footer>}
      </div>
    </dialog>
  );
}

export default function AdministracionPage() {
  const { catalogo, cargando, error: errorCatalogo, recargar } = useCatalogoTI();
  const sectores = catalogo.sectores.map((s) => s.nombre);
  const registros: Registro[] = [
    ...catalogo.recursos.map(registroRecurso),
    ...catalogo.usuarios.map((u): Registro => ({
      id: u.id, categoria: "Usuarios", nombre: u.nombre, cargo: u.cargo ?? "", correo: u.correo ?? "",
      area: u.sector, estado: u.activo ? "Activo" : "Inactivo", visible: u.visible,
    })),
    ...catalogo.suministros.map((s): Registro => ({
      ...s, categoria: "Suministros", marca: s.marca ?? "", descripcion: s.descripcion ?? "",
      stock: String(s.stock), compatibles: catalogo.compatibilidades.filter((c) => c.suministroId === s.id)
        .map((c) => c.impresoraId),
    })),
  ];
  const cambios: Cambio[] = catalogo.movimientos.flatMap((m) => m.impresoraId === null ? [] : [{
    id: m.id, impresoraId: m.impresoraId, fecha: m.fecha, nota: m.motivo ?? "",
    suministro: catalogo.suministros.find((s) => s.id === m.suministroId)?.nombre ?? "Suministro",
  }]);
  const [categoria, setCategoria] = useState<Categoria>("Periféricos");
  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<Partial<Record<Filtro, string>>>({});
  const [pagina, setPagina] = useState(1);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const enviando = useRef(false);

  const [puedeRestablecer, setPuedeRestablecer] = useState(false);
  useEffect(() => {
    const controlador = new AbortController();
    apiHcdl<{ rol: string }>("sesion", { signal: controlador.signal }).then(({ rol }) => {
      if (!controlador.signal.aborted) setPuedeRestablecer(rol === "administrador");
    }).catch(() => {});
    return () => controlador.abort();
  }, []);

  const config = configuracion[categoria];
  const lista = registros.filter((registro) => registro.categoria === categoria);
  const impresoras = registros.filter((registro) => registro.categoria === "Impresoras");
  const filtrados = lista.filter((registro) => {
    const modelos = impresoras.filter((item) => registro.compatibles?.includes(item.id)).map((item) => item.nombre);
    const datos = camposDe(categoria).map((campo) => valor(registro, campo));
    if (categoria === "Suministros") datos.push(registro.marca ?? "");
    if (categoria === "Equipos") datos.push(registro.nombreSistema ?? "");
    if (categoria === "Periféricos") datos.push(registro.marca ?? "", registro.modelo ?? "");
    const texto = [...datos, ...modelos].join(" ");
    return normalizar(texto).includes(normalizar(busqueda)) &&
      config.filtros.every((campo) => !filtros[campo] || valor(registro, campo) === filtros[campo]);
  });
  const porPagina = 6;
  const total = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const actual = Math.min(pagina, total);
  const inicio = (actual - 1) * porPagina;

  async function persistir(datos: Record<string, unknown>, exito: string) {
    if (enviando.current) return;
    enviando.current = true;
    setError("");
    setMensaje("");
    try {
      await enviarHcdl("gestion", datos);
      if (dialogo?.accion === "Agregar") {
        setPagina(1);
        setBusqueda("");
        setFiltros({});
      }
      setDialogo(null);
      setMensaje(exito);
      recargar();
    } catch (causa) {
      setError(mensajeHcdl(causa));
    } finally {
      enviando.current = false;
    }
  }

  function registrarCambio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (dialogo?.accion !== "Suministro" || dialogo.registro.categoria !== "Impresoras") return;
    const datos = new FormData(evento.currentTarget);
    const impresoraId = dialogo.registro.id;
    const suministro = registros.find((item) => item.id === Number(datos.get("suministro")) &&
      item.categoria === "Suministros" && item.visible && item.compatibles?.includes(impresoraId) && Number(item.stock) > 0);
    if (!suministro) {
      setError("Selecciona un suministro compatible con stock disponible.");
      return;
    }
    void persistir({ operacion: "cambiarSuministro", id: suministro.id, impresoraId,
      motivo: datos.get("nota") }, "Cambio registrado. Se descontó una unidad del stock.");
  }

  function grupoPerifericos(registro: Registro) {
    return registro.usuario
      ? registros.filter((item) => item.categoria === "Periféricos" && (registro.usuarioId !== undefined ? item.usuarioId === registro.usuarioId : item.usuarioId === undefined && item.usuario === registro.usuario))
      : [registro];
  }

  function guardarPerifericos(registro: Registro, datos: FormData) {
    const grupo = grupoPerifericos(registro);
    const actuales = new Set(grupo.map((item) => item.id));
    const series = new Set(registros.filter((item) => item.categoria === "Periféricos" && !actuales.has(item.id))
      .map((item) => normalizar(item.serie ?? "")).filter(Boolean));
    const cambios = new Map<number, Registro>();
    for (const item of grupo) {
      const marca = String(datos.get("marca-" + item.id) ?? "").trim();
      const modelo = String(datos.get("modelo-" + item.id) ?? "").trim();
      const serie = String(datos.get("serie-" + item.id) ?? "").trim();
      if (!modelo) { setError("Ingresa el modelo de cada periférico."); return; }
      const serieNormalizada = normalizar(serie);
      if (serieNormalizada && series.has(serieNormalizada)) {
        setError("El número de serie " + serie + " ya existe en Periféricos.");
        return;
      }
      if (serieNormalizada) series.add(serieNormalizada);
      const vinculado = tieneUsuario(item);
      const estado = vinculado ? "Asignado" : String(datos.get("estado-" + item.id) ?? "Disponible");
      if (!vinculado && !estadosSinUsuario(item.estado).includes(estado)) {
        setError("Selecciona un estado válido para el periférico sin usuario.");
        return;
      }
      cambios.set(item.id, { ...item, marca, modelo, serie, estado });
    }
    void persistir({ operacion: "guardarRecursos",
      recursos: [...cambios.values()].map((item) => datosRecurso(item,
        !tieneUsuario(item) ? sectorDelFormulario(datos) : undefined)) }, "Periféricos guardados.");
  }

  function sectorDelFormulario(datos: FormData) {
    const area = datos.get("area");
    return area === null ? undefined : catalogo.sectores.find((sector) => sector.nombre === area)?.id ?? null;
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!dialogo) return;
    const datos = new FormData(evento.currentTarget);
    const registro = { ...dialogo.registro };
    if (dialogo.accion === "Desvincular recursos" && registro.categoria === "Usuarios") {
      const seleccion = new Set(datos.getAll("recursos").map(Number));
      const vinculados = registros.filter((item) => seleccion.has(item.id) && perteneceAUsuario(item, registro));
      if (vinculados.length === 0 || vinculados.length !== seleccion.size) {
        setError("Selecciona recursos que estén vinculados a este usuario.");
        return;
      }
      void persistir({ operacion: "desvincular", id: registro.id, recursosIds: [...seleccion] },
        vinculados.length === 1 ? "Recurso desvinculado." : `${vinculados.length} recursos desvinculados.`);
      return;
    }
    if (registro.categoria === "Periféricos" && dialogo.accion === "Editar") {
      guardarPerifericos(registro, datos);
      return;
    }
    if (dialogo.accion === "Configuración") {
      const clase = registro.categoria === "Usuarios" ? "usuario"
        : registro.categoria === "Suministros" ? "suministro" : "recurso";
      void persistir({ operacion: "ajustarVisibilidad", clase, id: registro.id, visible: !registro.visible },
        "Visibilidad actualizada.");
      return;
    }
    if (dialogo.accion === "Compatibilidad") {
      void persistir({ operacion: "guardarCompatibilidad", id: registro.id,
        impresorasIds: datos.getAll("compatibles").map(Number) }, "Compatibilidad actualizada.");
      return;
    }
    if (dialogo.accion === "Agregar stock") {
      void persistir({ operacion: "agregarStock", id: registro.id, cantidad: Number(datos.get("cantidad")) },
        "Stock actualizado.");
      return;
    }

    const alta = dialogo.accion === "Agregar";
    const campos = registro.categoria === "Equipos" ? camposEquipo :
      registro.categoria === "Móviles" ? camposMovil :
        registro.categoria === "Periféricos" ? (["nombre", "modelo", "marca", "tipo", "serie"] as const) :
          registro.categoria === "Impresoras" ? (["nombre", "marca", "area", "ip", "serie", "estado"] as const) :
            registro.categoria === "Suministros" ? (["nombre", "marca", "tipo", "stock", "descripcion"] as const) :
              registro.categoria === "IoT" ? camposIoT : camposDe(registro.categoria);
    for (const campo of campos) {
      if (campo !== "usuario" && !(alta && campo === "estado")) registro[campo] = String(datos.get(campo) ?? "").trim();
    }
    if (registro.categoria === "IoT") {
      registro.ubicacion = String(datos.get("ubicacion") ?? "").trim();
      if (!registro.tipo || (!alta && !registro.estado)) {
        setError(alta ? "Selecciona el tipo del dispositivo." : "Selecciona el tipo y el estado del dispositivo.");
        return;
      }
    }
    if (registro.categoria === "Suministros") {
      const stock = Number(registro.stock);
      const minimo = Number(datos.get("stockMinimo"));
      if (!registro.tipo) { setError("Ingresa el tipo de suministro."); return; }
      if (!registro.stock || !Number.isSafeInteger(stock) || stock < 0 || !Number.isSafeInteger(minimo) || minimo < 0) {
        setError("El stock disponible y el mínimo deben ser enteros mayores o iguales a cero.");
        return;
      }
      registro.stock = String(stock);
      registro.stockMinimo = minimo;
    }
    if (registro.categoria === "Periféricos") {
      if (!registro.tipo) { setError("Ingresa el tipo de periférico."); return; }
    }
    if (registro.categoria === "Impresoras") {
      registro.tipo = registro.tipo || "Impresora";
      registro.accesoWeb = datos.get("accesoWeb") === "si";
      registro.urlWeb = registro.accesoWeb ? String(datos.get("urlWeb") ?? "").trim() : "";
      if (registro.accesoWeb && !/^https?:\/\//i.test(registro.urlWeb)) {
        setError("Ingresa una dirección de acceso web que comience con http:// o https://.");
        return;
      }
      registro.claveWeb = registro.accesoWeb ? String(datos.get("claveWeb") ?? "") || undefined : undefined;
    }
    if (registro.categoria === "Móviles" && dialogo.accion === "Agregar") {
      registro.tipo = "Teléfono";
    }
    if (!alta && (registro.categoria === "Equipos" || registro.categoria === "Móviles")) {
      registro.estado = tieneUsuario(registro) ? "Asignado" : String(datos.get("estado") ?? "Disponible");
      if (!tieneUsuario(registro) && !estadosSinUsuario(dialogo.registro.estado).includes(registro.estado)) {
        setError("Selecciona un estado válido para el recurso sin usuario.");
        return;
      }
    }
    if (!registro.nombre) { setError("Ingresa un nombre."); return; }
    if (registro.serie && registros.some((item) =>
      item.categoria === registro.categoria && item.id !== registro.id && normalizar(item.serie ?? "") === normalizar(registro.serie ?? ""),
    )) { setError("Ese número de serie ya existe en la categoría."); return; }
    if (registro.correo && registros.some((item) => item.categoria === "Usuarios" && item.id !== registro.id && normalizar(item.correo ?? "") === normalizar(registro.correo ?? ""))) {
      setError("Ese correo ya está registrado."); return;
    }

    const sectorId = sectorDelFormulario(datos);
    if (registro.categoria === "Usuarios") {
      if (!sectorId) { setError("Selecciona un sector válido."); return; }
      const contrasena = alta && puedeRestablecer ? String(datos.get("contrasenaInicial") ?? "") : "";
      const confirmacion = alta && puedeRestablecer ? String(datos.get("confirmarInicial") ?? "") : "";
      if (contrasena || confirmacion) {
        if (contrasena !== confirmacion) { setError("Las contraseñas deben coincidir."); return; }
        if (!requisitosContrasena(contrasena).every(({ cumple }) => cumple)) {
          setError("La contraseña inicial debe cumplir todos los requisitos."); return;
        }
      }
      void persistir({ operacion: "guardarUsuario", id: registro.id || null, nombre: registro.nombre,
        cargo: registro.cargo, correo: registro.correo, sectorId,
        ...(!alta ? { activo: registro.estado !== "Inactivo" } : {}),
        ...(contrasena ? { contrasena } : {}) },
        "Usuario guardado.");
    } else if (registro.categoria === "Suministros") {
      void persistir({ operacion: "guardarSuministro", id: registro.id || null, nombre: registro.nombre,
        tipo: registro.tipo, marca: registro.marca, descripcion: registro.descripcion, stock: Number(registro.stock),
        stockMinimo: registro.stockMinimo }, "Suministro guardado.");
    } else {
      void persistir({ operacion: "guardarRecursos",
        recursos: [datosRecurso(registro, sectorId)] },
        "Recurso guardado.");
    }
  }

  function abrirDialogo(accion: Dialogo["accion"], registro: Registro) {
    if (enviando.current) return;
    setError("");
    setDialogo({ accion, registro });
  }

  function acciones(registro: Registro) {
    return (
      <div className="flex flex-wrap gap-1.5 xl:justify-center">
        {registro.categoria !== "Periféricos" && <AccionIcono etiqueta="Detalles" icono="detalle" ejecutar={() => abrirDialogo("Detalles", registro)} />}
        <AccionIcono etiqueta="Editar" icono="activos" ejecutar={() => abrirDialogo("Editar", registro)} />
        {registro.categoria === "Usuarios" && (
          <>
            <AccionIcono etiqueta="Desvincular recursos" icono="desvincular" ejecutar={() => abrirDialogo("Desvincular recursos", registro)} />
            {puedeRestablecer && <AccionIcono etiqueta="Cambiar contraseña" icono="contrasena" ejecutar={() => abrirDialogo("Cambiar contraseña", registro)} />}
          </>
        )}
        {registro.categoria === "Impresoras" && registro.visible && (
          <AccionIcono etiqueta="Cambiar suministro" icono="cambio" ejecutar={() => abrirDialogo("Suministro", registro)} />
        )}
        {registro.categoria === "Suministros" && (
          <>
            <AccionIcono etiqueta="Agregar stock" icono="mas" ejecutar={() => abrirDialogo("Agregar stock", registro)} />
            <AccionIcono etiqueta="Vincular impresoras compatibles" icono="compatibilidad" ejecutar={() => abrirDialogo("Compatibilidad", registro)} />
          </>
        )}
        <AccionIcono etiqueta="Cambiar visibilidad" icono={registro.visible ? "visible" : "oculto"} ejecutar={() => abrirDialogo("Configuración", registro)} />
      </div>
    );
  }

  function mostrarCampo(registro: Registro, campo: Campo) {
    return valor(registro, campo) || "—";
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col bg-[#eee9db] text-sm text-[#61453f]">
      <div className="flex flex-1 flex-col">
        <h1 className="sr-only">Modificar activos</h1>
        <nav aria-label="Categorías de administración" className="grid grid-cols-2 gap-1.5 border-b border-[#d7d1bf] bg-white px-3 py-2 sm:grid-cols-4 sm:px-5 lg:grid-cols-7">
          {categorias.map((item) => (
            <button key={item} type="button" aria-pressed={item === categoria} className={clasePestana(item === categoria)}
              onClick={() => {
                if (item === categoria) return;
                setCategoria(item); setBusqueda(""); setFiltros({}); setPagina(1); setMensaje("");
              }}>
              {item}
            </button>
          ))}
        </nav>

        <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-3 px-3 py-3 sm:px-5">
          {mensaje && <p role="status" className="rounded-md border border-[#d7d1bf] bg-[#f3f1eb] px-3 py-2">{mensaje}</p>}

          <div role="group" aria-label="Filtros del listado"
            style={{ "--cant-filtros": config.filtros.length } as CSSProperties}
            className={contenedor + " grid items-end gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,3fr)_repeat(var(--cant-filtros),minmax(7rem,1fr))_auto]"}>
            <label className={etiquetaFiltro}>
              Buscar registro
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-brand-dark">
                  <IconoAdmin tipo="buscar" />
                </span>
                <input type="search" className={campoFiltro + " pl-11 font-normal"} placeholder={config.buscar}
                  value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); setPagina(1); }} />
              </span>
            </label>
            {config.filtros.map((campo) => (
              <label key={campo} className={etiquetaFiltro}>
                {etiquetas[campo]}
                <select className={campoFiltro + " font-normal"} value={filtros[campo] ?? ""}
                  onChange={(evento) => { setFiltros({ ...filtros, [campo]: evento.target.value }); setPagina(1); }}>
                  <option value="">{etiquetas[campo]}</option>
                  {[...new Set(lista.map((registro) => valor(registro, campo)).filter(Boolean))].sort().map((opcion) =>
                    <option key={opcion}>{opcion}</option>,
                  )}
                </select>
              </label>
            ))}
            <button type="button"
              className={azul + " min-h-10 whitespace-nowrap sm:col-span-2 xl:col-span-1"}
              onClick={() => { setBusqueda(""); setFiltros({}); setPagina(1); }}>
              Limpiar filtros
            </button>
          </div>

          <EstadoCatalogo cargando={cargando} error={errorCatalogo} reintentar={recargar} />

          {filtrados.length === 0 ? <p className="rounded-md bg-[#f3f1eb] p-3">No se encontraron registros.</p> : (
            <>
              <div className="hidden overflow-hidden rounded-lg border border-[#9ccbd4] xl:block">
                <table className="w-full text-center">
                  <caption className="sr-only">{categoria}</caption>
                  <thead className="bg-[#007c96] text-white">
                    <tr>
                      <th scope="col" className="px-3 py-2">ID</th>
                      {config.columnas.map((campo) => <th key={campo} scope="col" className="px-3 py-2">{campo === "nombre" && categoria === "Impresoras" ? "Modelo" : etiquetas[campo]}</th>)}
                      <th scope="col" className="px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] text-[#00546a]">
                    {filtrados.slice(inicio, inicio + porPagina).map((registro) => (
                      <tr key={registro.id} className="align-middle">
                        <td className="px-3 py-2">{registro.id}</td>
                        {config.columnas.map((campo) =>
                          <td key={campo} className="px-3 py-2 [overflow-wrap:anywhere]">{mostrarCampo(registro, campo)}</td>,
                        )}
                        <td className="px-3 py-2">{acciones(registro)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 xl:hidden">
                {filtrados.slice(inicio, inicio + porPagina).map((registro) => (
                  <li key={registro.id} className="grid gap-2 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-2 text-[#00546a]">
                    <h2 className="font-bold [overflow-wrap:anywhere]">{registro.nombre}</h2>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      {config.columnas.filter((campo) => campo !== "nombre").map((campo) => (
                        <div key={campo} className="min-w-0 [overflow-wrap:anywhere]">
                          <dt className="font-semibold">{etiquetas[campo]}</dt><dd>{mostrarCampo(registro, campo)}</dd>
                        </div>
                      ))}
                    </dl>
                    {acciones(registro)}
                  </li>
                ))}
              </ul>
            </>
          )}

          <footer className="mt-auto grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg  px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <span role="status" className="text-xs">Mostrando {filtrados.length ? inicio + 1 : 0}–{Math.min(inicio + porPagina, filtrados.length)} de {filtrados.length}</span>
            <button className={azul} disabled={cargando || Boolean(errorCatalogo)} onClick={() => abrirDialogo("Agregar", { id: 0, nombre: "", categoria, visible: true })}>＋ Agregar</button>
            <div className="col-span-2 flex justify-end sm:col-span-1">
              <Paginacion pagina={actual} total={total} cambiar={setPagina} />
            </div>
          </footer>
        </div>
      </div>

      {dialogo && (dialogo.registro.categoria === "Equipos" ? (
        <ModalEquipo dialogo={dialogo} sectores={sectores} cerrar={() => setDialogo(null)} guardar={guardar} error={error} />
      ) : dialogo.registro.categoria === "Móviles" ? (
        <ModalMovil dialogo={dialogo} sectores={sectores} cerrar={() => setDialogo(null)} guardar={guardar} error={error} />
      ) : dialogo.registro.categoria === "Periféricos" ? (
        <ModalPeriferico dialogo={dialogo} sectores={sectores} grupo={grupoPerifericos(dialogo.registro)}
          cerrar={() => setDialogo(null)} guardar={guardar} error={error} />
      ) : dialogo.registro.categoria === "Impresoras" ? (
        dialogo.accion === "Suministro" ? (
          <ModalSuministro impresora={dialogo.registro}
            compatibles={registros.filter((item) => item.categoria === "Suministros" && item.visible && item.compatibles?.includes(dialogo.registro.id))}
            historial={cambios.filter((cambio) => cambio.impresoraId === dialogo.registro.id)}
            cerrar={() => setDialogo(null)} guardar={registrarCambio} error={error} />
        ) : (
          <ModalImpresora dialogo={dialogo} sectores={sectores}
            cerrar={() => setDialogo(null)} guardar={guardar} error={error} />
        )
      ) : dialogo.registro.categoria === "Suministros" ? (
        <ModalGestionSuministro dialogo={dialogo} impresoras={impresoras} cerrar={() => setDialogo(null)} guardar={guardar} error={error} />
      ) : dialogo.registro.categoria === "IoT" ? (
        <ModalIoT dialogo={dialogo} sectores={sectores}
          cerrar={() => setDialogo(null)} guardar={guardar} error={error} />
      ) : dialogo.registro.categoria === "Usuarios" ? (
        dialogo.accion === "Cambiar contraseña" ? (
          <ModalContrasenaUsuario key={dialogo.registro.id} usuario={dialogo.registro.nombre}
            error={error} cerrar={() => setDialogo(null)}
            guardar={(contrasena) => persistir({ operacion: "cambiarContrasena", usuarioId: dialogo.registro.id, contrasena },
              "Contraseña actualizada. Se cerraron las sesiones anteriores del usuario.")} />
        ) : (
          <ModalUsuario dialogo={dialogo} puedeRestablecer={puedeRestablecer} recursos={registros.filter((item) => perteneceAUsuario(item, dialogo.registro))}
            sectores={sectores}
            cerrar={() => setDialogo(null)} guardar={guardar} error={error} />
        )
      ) : (
        <Modal titulo={dialogo.accion + (dialogo.accion === "Agregar" ? " · " + categoria : " · " + dialogo.registro.nombre)} cerrar={() => setDialogo(null)}>
          {dialogo.accion === "Detalles" ? (
            <dl className="grid gap-2 sm:grid-cols-2">
              {camposDe(dialogo.registro.categoria).map((campo) => (
                <div key={campo} className="[overflow-wrap:anywhere]">
                  <dt className="font-semibold">{etiquetas[campo]}</dt><dd>{mostrarCampo(dialogo.registro, campo)}</dd>
                </div>
              ))}
              <div><dt className="font-semibold">Visibilidad</dt><dd>{valor(dialogo.registro, "visible")}</dd></div>
            </dl>
          ) : (
            <form onSubmit={guardar} className="grid gap-3">
              {dialogo.accion === "Configuración" ? (
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="visible" defaultChecked={dialogo.registro.visible} /> Visible en inventario
                </label>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {camposDe(dialogo.registro.categoria).map((campo) => (
                    <label key={campo} className="grid min-w-0 gap-1">
                      {etiquetas[campo]}
                      {campo === "estado" && dialogo.registro.categoria === "Usuarios" ? (
                        <select name={campo} className={entrada} defaultValue={dialogo.registro.estado || "Activo"}>
                          <option>Activo</option><option>Inactivo</option>
                        </select>
                      ) : (
                        <input name={campo} className={entrada}
                          type={campo === "stock" ? "number" : campo === "correo" ? "email" : "text"}
                          min={campo === "stock" ? 0 : undefined} step={campo === "stock" ? 1 : undefined}
                          required={campo === "nombre" || campo === "stock" || campo === "correo"}
                          maxLength={campo === "descripcion" ? 500 : 160}
                          defaultValue={dialogo.registro[campo] ?? (campo === "stock" ? "0" : "")} />
                      )}
                    </label>
                  ))}
                </div>
              )}
              {error && <p role="alert">{error}</p>}
              <button className={cafe + " justify-self-end"}>Guardar</button>
            </form>
          )}
        </Modal>
      ))}
    </main>
  );
}

function Paginacion({ pagina, total, cambiar }: { pagina: number; total: number; cambiar: (pagina: number) => void }) {
  const inicio = Math.max(1, Math.min(pagina - 1, total - 2));
  const paginas = Array.from({ length: Math.min(total, 3) }, (_, indice) => inicio + indice);
  const control = boton + " min-w-9 border border-[#9ccbd4]";
  const secundario = control + " bg-[#deecef] text-[#006681] enabled:hover:bg-[#c7e1e6]";
  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs">{pagina} de {total}</span>
      <button type="button" className={secundario} aria-label="Página anterior" disabled={pagina <= 1} onClick={() => cambiar(pagina - 1)}>‹</button>
      {paginas.map((numero) => (
        <button key={numero} type="button" className={numero === pagina ? control + " bg-[#006681] text-white" : secundario}
          aria-label={`Página ${numero}`} aria-current={numero === pagina ? "page" : undefined} onClick={() => cambiar(numero)}>
          {numero}
        </button>
      ))}
      <button type="button" className={secundario} aria-label="Página siguiente" disabled={pagina >= total} onClick={() => cambiar(pagina + 1)}>›</button>
    </nav>
  );
}

function ModalEquipo({ dialogo, sectores, cerrar, guardar, error }: {
  dialogo: Dialogo;
  sectores: string[];
  cerrar: () => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const { accion, registro } = dialogo;
  const lectura = accion === "Detalles";
  const titulo = lectura ? "Detalles del equipo" : accion + " equipo";

  if (accion === "Configuración") {
    const bloqueado = registro.visible && tieneUsuario(registro);
    return (
      <Modal titulo="Cambiar visibilidad" cerrar={cerrar}>
        <form onSubmit={guardar} className="grid gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#006681] text-white">
              <IconoAdmin tipo={registro.visible ? "visible" : "oculto"} />
            </span>
            <p className="[overflow-wrap:anywhere]">¿Quieres {registro.visible ? "ocultar" : "mostrar"} <strong>{registro.nombre}</strong> en el inventario?</p>
          </div>
          {bloqueado && <p className="rounded-md bg-[#eee9db] p-2">Desvincula el equipo desde Usuarios antes de ocultarlo.</p>}
          {error && <p role="alert">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-[#d7d1bf] pt-3">
            <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
            <button className={azul} disabled={bloqueado}>Cambiar</button>
          </div>
        </form>
      </Modal>
    );
  }

  function campo(clave: Campo | CampoEquipo) {
    const etiqueta = clave === "nombre" ? "Nombre del equipo" : clave === "nombreSistema" ? "Nombre del sistema" : etiquetas[clave];
    const dato = registro[clave] ?? "";
    if (lectura) {
      return (
        <div key={clave} className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1 [overflow-wrap:anywhere]">
          <dt className="font-semibold">{etiqueta}</dt>
          <dd>{dato || "—"}</dd>
        </div>
      );
    }

    if (clave === "estado") return <CampoEstadoRecurso registro={registro} />;
    return (
      <label key={clave} className={etiquetaCampo}>
        <span>{etiqueta}</span>
        {clave === "tipo" ? (
          <select name={clave} className={entrada} defaultValue={dato} required>
            <option value="">Selecciona un tipo</option>
            {[...new Set(["Notebook", "Escritorio", "All-in-one", "Otro", dato].filter(Boolean))].map((opcion) => (
              <option key={opcion}>{opcion}</option>
            ))}
          </select>
        ) : (
          <input name={clave} className={entrada} defaultValue={dato}
            required={clave === "nombre"} maxLength={160} />
        )}
      </label>
    );
  }

  const bloques = (
    <div className="grid gap-3 md:grid-cols-2">
      {bloquesEquipo.map(({ titulo, icono, campos }) => (
        <section key={titulo} className="min-w-0 rounded-lg border border-[#d7d1bf] bg-[#eee9db] p-3">
          <h3 className="mb-2 flex items-center gap-2 border-b border-[#d7d1bf] pb-2 font-bold">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#61453f] text-white"><IconoAdmin tipo={icono} /></span>
            {titulo}
          </h3>
          {lectura ? <dl className="space-y-2 text-sm">{campos.map(campo)}</dl> :
            <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">{campos.map(campo)}</div>}
        </section>
      ))}
    </div>
  );

  return (
    <Modal titulo={titulo} cerrar={cerrar} ancho>
      {lectura ? (
        <div className="grid gap-3">
          <section className="flex flex-wrap items-start gap-3 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#deecef]"><IconoAdmin tipo="laptop" /></span>
            <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <h3 className="text-base font-bold">{registro.nombre}</h3>
              <p>{registro.tipo || "Sin tipo"}</p>
              <dl className="mt-2 grid gap-2 sm:grid-cols-2">{campo("nombreSistema")}{campo("marca")}{campo("modelo")}{campo("usuario")}</dl>
            </div>
            <span className="rounded-full bg-[#deecef] px-3 py-1 text-xs font-semibold">{valor(registro, "visible")}</span>
          </section>
          {bloques}
          <dl className="grid gap-2 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a] sm:grid-cols-2">
            {campo("estado")}
            <div><dt className="font-semibold">Fecha de revisión</dt><dd>{registro.revision || "—"}</dd></div>
          </dl>
        </div>
      ) : (
        <form onSubmit={guardar} className="grid gap-3">
          <section aria-label="Datos del equipo" className="grid gap-2 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a] sm:grid-cols-2">
            {campo("nombre")}{campo("modelo")}{campo("marca")}{campo("tipo")}{campo("nombreSistema")}
            {!tieneUsuario(registro) && <CampoSector sectores={sectores} valor={registro.area} />}
            {accion === "Editar" && <label className={etiquetaCampo}>
              Usuario asignado
              <input className={entrada} value={registro.usuario || "Sin asignar"} readOnly />
            </label>}
          </section>
          {bloques}
          <div className="grid gap-2 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a]">
            <div className={filaEstadoFormulario}>
              {accion === "Editar" && campo("estado")}
              <div className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap">
                <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
                <button type="submit" className={azul}>Guardar equipo</button>
              </div>
            </div>
            {error && <p role="alert" className="font-semibold text-[#61453f]">{error}</p>}
          </div>
        </form>
      )}
    </Modal>
  );
}

function ModalMovil({ dialogo, sectores, cerrar, guardar, error }: {
  dialogo: Dialogo;
  sectores: string[];
  cerrar: () => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const { accion, registro } = dialogo;
  const lectura = accion === "Detalles";
  const editar = accion === "Editar";
  const titulo = lectura ? "Detalles del móvil" : accion + " móvil";
  const usuario = registro.usuario ?? "";
  const panel = "min-w-0 rounded-lg border border-[#d7d1bf] bg-[#eee9db] p-3";
  const franja = "min-w-0 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a]";

  if (accion === "Configuración") {
    const bloqueado = registro.visible && tieneUsuario(registro);
    return (
      <Modal titulo="Cambiar visibilidad" cerrar={cerrar}>
        <form onSubmit={guardar} className="grid gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#006681] text-white">
              <IconoAdmin tipo={registro.visible ? "visible" : "oculto"} />
            </span>
            <p className="[overflow-wrap:anywhere]">¿Quieres {registro.visible ? "ocultar" : "mostrar"} <strong>{registro.nombre}</strong> en el inventario?</p>
          </div>
          {bloqueado && <p className="rounded-md bg-[#eee9db] p-2">Desvincula el móvil desde Usuarios antes de ocultarlo.</p>}
          {error && <p role="alert">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-[#d7d1bf] pt-3">
            <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
            <button className={azul} disabled={bloqueado}>Cambiar</button>
          </div>
        </form>
      </Modal>
    );
  }

  function campo(clave: (typeof camposMovil)[number]) {
    const etiqueta = clave === "nombre" ? "Nombre del modelo" : etiquetas[clave];
    const dato = registro[clave] ?? "";
    const esImei = clave === "imei1" || clave === "imei2";
    if (lectura) {
      return <div key={clave} className="grid min-w-0 grid-cols-2 gap-2 [overflow-wrap:anywhere]"><dt className="font-semibold">{etiqueta}</dt><dd>{dato || "—"}</dd></div>;
    }
    return (
      <label key={clave} className={etiquetaCampo}>
        <span>{etiqueta}</span>
        <input name={clave} className={entrada} defaultValue={dato} required={clave === "nombre"}
          type={clave === "numeroLinea" ? "tel" : "text"} inputMode={esImei ? "numeric" : undefined}
          maxLength={esImei ? 15 : clave === "numeroLinea" ? 30 : 160} />
      </label>
    );
  }

  const bloques = (
    <div className="grid gap-3 md:grid-cols-2">
      {bloquesMovil.map(({ titulo, icono, campos }) => (
        <section key={titulo} className={panel}>
          <h3 className="mb-2 flex items-center gap-2 border-b border-[#d7d1bf] pb-2 font-bold">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#61453f] text-white"><IconoAdmin tipo={icono} /></span>
            {titulo}
          </h3>
          {lectura ? <dl className="space-y-2">{campos.map(campo)}</dl> : <div className="space-y-2">{campos.map(campo)}</div>}
        </section>
      ))}
    </div>
  );

  const icono = (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#deecef]">
      <IconoAdmin tipo="telefono" />
    </span>
  );

  return (
    <Modal titulo={titulo} cerrar={cerrar} ancho>
      {lectura ? (
        <div className="grid gap-3">
          <section className={franja + " flex flex-wrap items-start gap-3"}>
            {icono}
            <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <h3 className="text-base font-bold">{registro.nombre}</h3>
              {registro.marca && <p>{registro.marca}</p>}
              <p className="mt-1"><strong>Usuario:</strong> {usuario || "Sin asignar"}</p>
            </div>
            <span className="rounded-full bg-[#deecef] px-3 py-1 text-xs font-semibold">{valor(registro, "visible")}</span>
          </section>
          {bloques}
          <div className="grid gap-3 md:grid-cols-2">
            <dl className={panel}>{campo("accesorio")}</dl>
            <p className={franja}><strong>Estado:</strong> {registro.estado || "—"}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={guardar} className="grid gap-3">
          <section aria-label="Datos del móvil" className={franja + " flex items-start gap-3"}>
            {icono}
            <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-2">
              {campo("nombre")}{campo("marca")}
              {!tieneUsuario(registro) && <CampoSector sectores={sectores} valor={registro.area} />}
              {editar && <CampoUsuarioAsignado registro={registro} />}
            </div>
          </section>
          {bloques}
          <div className="grid gap-3 md:grid-cols-2">
            <section className={panel}>{campo("accesorio")}</section>
            <div className={franja + " grid gap-2"}>
              {editar && <CampoEstadoRecurso registro={registro} />}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
                <button className={azul}>Guardar móvil</button>
              </div>
            </div>
          </div>
          {error && <p role="alert" className="font-semibold text-[#61453f]">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

function iconoPeriferico(tipo = ""): keyof typeof iconosAdmin {
  const texto = normalizar(tipo);
  if (texto.includes("teclado")) return "teclado";
  if (texto.includes("mouse") || texto.includes("raton")) return "mouse";
  if (texto.includes("monitor") || texto.includes("pantalla")) return "monitor";
  return "hardware";
}

function ModalPeriferico({ dialogo, sectores, grupo, cerrar, guardar, error }: {
  dialogo: Dialogo;
  sectores: string[];
  grupo: Registro[];
  cerrar: () => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const { accion, registro } = dialogo;
  const agregar = accion === "Agregar";
  const idFormulario = useId();
  const franja = "rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a]";

  if (accion === "Configuración") {
    const bloqueado = registro.visible && tieneUsuario(registro);
    return (
      <Modal titulo="Cambiar visibilidad" cerrar={cerrar}>
        <form onSubmit={guardar} className="grid gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#006681] text-white">
              <IconoAdmin tipo={registro.visible ? "visible" : "oculto"} />
            </span>
            <p className="[overflow-wrap:anywhere]">¿Quieres {registro.visible ? "ocultar" : "mostrar"} <strong>{registro.nombre}</strong> en el inventario?</p>
          </div>
          {bloqueado && <p>Desvincula el periférico desde Usuarios antes de ocultarlo.</p>}
          {error && <p role="alert">{error}</p>}
          <div className="flex justify-center gap-3 border-t border-[#d7d1bf] pt-3">
            <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
            <button className={azul} disabled={bloqueado}>Cambiar</button>
          </div>
        </form>
      </Modal>
    );
  }

  function campo(etiqueta: string, nombre: string, valor = "", requerido = false) {
    return (
      <label key={nombre} className={etiquetaCampo}>
        {etiqueta}
        <input name={nombre} className={entrada} defaultValue={valor} required={requerido} maxLength={160} />
      </label>
    );
  }

  return (
    <Modal titulo={agregar ? "Agregar periférico" : "Editar periféricos"} cerrar={cerrar} ancho={!agregar}
      icono={agregar ? "mas" : "activos"}
      pie={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={azul + " gap-2"} onClick={cerrar}><IconoAdmin tipo="volver" />Cancelar</button>
          <button type="submit" form={idFormulario} className={azul + " gap-2"}><IconoAdmin tipo="guardar" />Guardar</button>
        </div>
      }>
      <form id={idFormulario} onSubmit={guardar} className="grid gap-2.5">
        {agregar ? (
          <div className={franja + " flex items-start gap-3"}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#deecef]"><IconoAdmin tipo="teclado" /></span>
            <div className="grid min-w-0 flex-1 gap-x-3 gap-y-2 sm:grid-cols-2">
              {campo("Nombre del periférico", "nombre", "", true)}
              {campo("Modelo", "modelo", "", false)}
              {campo("Marca", "marca", "", false)}
              {campo("Tipo de periférico", "tipo", "", true)}
              {campo("Número de serie", "serie", "", false)}
              <CampoSector sectores={sectores} valor={registro.area} />
            </div>
          </div>
        ) : (
          <>
            <div className={franja + " flex items-center gap-3"}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#deecef]"><IconoAdmin tipo="usuario" /></span>
              <div className="min-w-0 flex-1">
                <CampoUsuarioAsignado registro={registro} />
              </div>
            </div>
            <div className="divide-y divide-[#d7d1bf] rounded-lg border border-[#d7d1bf] bg-[#eee9db] px-3">
              {grupo.map((item) => (
                <fieldset key={item.id} className="min-w-0 py-2.5">
                  <legend className="sr-only">{item.nombre}, {item.serie || "ID " + item.id}</legend>
                  <div aria-hidden="true" className="mb-2 flex items-center gap-2 text-[#00546a]">
                    <IconoAdmin tipo={iconoPeriferico(item.tipo)} />
                    <strong className="[overflow-wrap:anywhere]">{item.nombre}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-4">
                    {campo("Marca", "marca-" + item.id, item.marca)}
                    {campo("Modelo", "modelo-" + item.id, item.modelo || item.nombre, true)}
                    {campo("Número de serie", "serie-" + item.id, item.serie)}
                    <CampoEstadoRecurso registro={item} nombre={"estado-" + item.id} />
                    {!tieneUsuario(item) && <CampoSector sectores={sectores} valor={item.area} />}
                  </div>
                </fieldset>
              ))}
            </div>
          </>
        )}
        {error && <p role="alert" className="font-semibold">{error}</p>}
      </form>
    </Modal>
  );
}

function ModalImpresora({ dialogo, sectores, cerrar, guardar, error }: {
  dialogo: Dialogo;
  sectores: string[];
  cerrar: () => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const { accion, registro } = dialogo;
  const [accesoWeb, setAccesoWeb] = useState(Boolean(registro.accesoWeb));
  const lectura = accion === "Detalles";
  const panel = "min-w-0 rounded-lg border border-[#d7d1bf] bg-[#eee9db] p-3";
  const franja = "rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a]";
  const estados = [...new Set(["Activa", "Inactiva", "Asignado", "Disponible", "Fuera de servicio", registro.estado].filter(Boolean))];

  if (accion === "Configuración") {
    return (
      <Modal titulo="Cambiar visibilidad" cerrar={cerrar}>
        <form onSubmit={guardar} className="grid gap-3">
          <p className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#006681] text-white">
              <IconoAdmin tipo={registro.visible ? "visible" : "oculto"} />
            </span>
            <span>¿Quieres {registro.visible ? "ocultar" : "mostrar"} <strong>{registro.nombre}</strong> en el inventario?</span>
          </p>
          <div className="flex justify-center gap-3 border-t border-[#d7d1bf] pt-3">
            <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
            <button className={azul}>Cambiar</button>
          </div>
        </form>
      </Modal>
    );
  }

  function campo(label: string, nombre: string, valor: string | undefined, tipo = "text", requerido = false) {
    return lectura ? (
      <div className="grid min-w-0 grid-cols-2 gap-2 [overflow-wrap:anywhere]">
        <dt className="font-semibold">{label}</dt><dd>{valor || "—"}</dd>
      </div>
    ) : (
      <label className={etiquetaCampo}>
        {label}
        <input name={nombre} className={entrada} type={tipo} defaultValue={valor} required={requerido}
          maxLength={tipo === "url" ? 500 : 160} />
      </label>
    );
  }

  const identificadores = (
    <section className={panel}>
      <h3 className="mb-2 flex items-center gap-2 font-bold"><IconoAdmin tipo="detalle" />Identificadores</h3>
      {lectura ? <dl className="space-y-2">{campo("Dirección IP", "ip", registro.ip)}{campo("Número de serie", "serie", registro.serie)}</dl> :
        <div className="grid gap-2">{campo("Dirección IP", "ip", registro.ip)}{campo("Número de serie", "serie", registro.serie)}</div>}
    </section>
  );

  const web = (
    <section className={panel}>
      <h3 className="mb-2 flex flex-wrap items-center gap-2 font-bold">
        <IconoAdmin tipo="hardware" />Acceso web
        {lectura && <span className="ml-auto text-xs">{accesoWeb ? "Habilitado" : "Sin acceso"}</span>}
      </h3>
      {lectura ? (accesoWeb && <dl className="space-y-2">
        {campo("Dirección web", "urlWeb", registro.urlWeb)}
        {campo("Contraseña", "claveWeb", registro.tieneClaveWeb ? "••••••••" : undefined)}
      </dl>) : (
        <div className="grid gap-2">
          <label className={etiquetaCampo}>¿Tiene acceso web?
            <select name="accesoWeb" className={entrada} value={accesoWeb ? "si" : "no"}
              onChange={(evento) => setAccesoWeb(evento.target.value === "si")}>
              <option value="si">Sí</option><option value="no">No</option>
            </select>
          </label>
          <div className="grid gap-2" hidden={!accesoWeb} style={!accesoWeb ? { display: "none" } : undefined}>
            <fieldset className="grid gap-2" disabled={!accesoWeb}>
              {campo("Dirección web", "urlWeb", registro.urlWeb, "url", accesoWeb)}
              <label className={etiquetaCampo}>Contraseña del acceso web
                <input name="claveWeb" type="password" autoComplete="new-password" maxLength={160} className={entrada}
                  placeholder={registro.tieneClaveWeb ? "Deja vacío para conservarla" : undefined} />
              </label>
            </fieldset>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <Modal titulo={lectura ? "Detalles de la impresora" : accion + " impresora"} cerrar={cerrar} ancho>
      {lectura ? (
        <div className="grid gap-3">
          <div className={franja + " flex flex-wrap items-start gap-3"}>
            <IconoAdmin tipo="impresora" />
            <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <h3 className="text-base font-bold">{registro.nombre}</h3>
              {registro.marca && <p>{registro.marca}</p>}
              <p>Sector: {registro.area || "Sin sector"}</p>
            </div>
            <span className="rounded-full bg-[#deecef] px-3 py-1 text-xs font-semibold">{valor(registro, "visible")}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">{web}{identificadores}</div>
          <p className={franja}><strong>Estado:</strong> {registro.estado || "—"}</p>
        </div>
      ) : (
        <form onSubmit={guardar} className="grid gap-3">
          <div className={franja + " grid gap-2 sm:grid-cols-2"}>
            {campo("Modelo", "nombre", registro.nombre, "text", true)}
            {campo("Marca", "marca", registro.marca)}
            <CampoSector sectores={sectores} valor={registro.area} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">{web}{identificadores}</div>
          <div className={franja + " flex flex-wrap items-end justify-between gap-3"}>
            {accion === "Editar" && <label className={etiquetaCampo}>Estado
              <select name="estado" className={entrada} defaultValue={registro.estado || "Activa"}>
                {estados.map((estado) => <option key={estado}>{estado}</option>)}
              </select>
            </label>}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={azul + " gap-2"} onClick={cerrar}><IconoAdmin tipo="volver" />Cancelar</button>
              <button className={azul + " gap-2"}><IconoAdmin tipo="guardar" />Guardar</button>
            </div>
          </div>
          {error && <p role="alert" className="font-semibold">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

function ModalSuministro({ impresora, compatibles, historial, cerrar, guardar, error }: {
  impresora: Registro;
  compatibles: Registro[];
  historial: Cambio[];
  cerrar: () => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const [seleccion, setSeleccion] = useState("");
  const hayStock = compatibles.some((item) => Number(item.stock) > 0);

  return (
    <Modal titulo="Cambiar suministro" cerrar={cerrar}>
      <form onSubmit={guardar} className="grid gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a]">
          <IconoAdmin tipo="impresora" />
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <strong>{impresora.nombre}</strong>
            <p>{[impresora.area, impresora.serie].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <label className={etiquetaCampo}>Suministro compatible
          <select name="suministro" className={entrada} required disabled={!hayStock} value={seleccion}
            onChange={(evento) => setSeleccion(evento.target.value)}>
            <option value="">Selecciona un suministro</option>
            {compatibles.map((item) => <option key={item.id} value={item.id} disabled={!(Number(item.stock) > 0)}>
              {item.nombre} · Stock: {item.stock}
            </option>)}
          </select>
        </label>
        {!hayStock && <p role="status">{compatibles.length ? "Los suministros compatibles están sin stock." : "Esta impresora no tiene suministros compatibles registrados."}</p>}
        <label className={etiquetaCampo}>Observación (opcional)
          <textarea name="nota" className={entrada} rows={2} maxLength={500} />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
          <button className={azul + " gap-2"} disabled={!seleccion}><IconoAdmin tipo="cambio" />Registrar cambio</button>
        </div>
      </form>
      <details className="mt-4 border-t border-[#d7d1bf] pt-3">
        <summary className="cursor-pointer font-semibold">Historial de esta impresora ({historial.length})</summary>
        {historial.length === 0 ? <p className="mt-2">Sin cambios registrados.</p> : (
          <ul className="mt-2 grid gap-2">
            {historial.map((cambio) => (
              <li key={cambio.id} className="rounded-md bg-[#deecef] p-2 text-[#00546a]">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{cambio.suministro}</strong>
                  <time dateTime={cambio.fecha}>{fechaChile.format(new Date(cambio.fecha))}</time>
                </div>
                {cambio.nota && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{cambio.nota}</p>}
              </li>
            ))}
          </ul>
        )}
      </details>
    </Modal>
  );
}

function ModalGestionSuministro({ dialogo, impresoras, cerrar, guardar, error }: {
  dialogo: Dialogo;
  impresoras: Registro[];
  cerrar: () => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const { accion, registro } = dialogo;
  const estadoStock = valor(registro, "estado");
  const lectura = accion === "Detalles";
  const editar = accion === "Editar";
  const panel = "min-w-0 rounded-lg border border-[#d7d1bf] bg-[#eee9db] p-3";
  const franja = "min-w-0 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a]";
  const vinculadas = impresoras.filter((item) => registro.compatibles?.includes(item.id));

  function acciones(etiqueta: string) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
        <button className={azul}>{etiqueta}</button>
      </div>
    );
  }

  function campo(etiqueta: string, nombre: string, dato: string | number, requerido = false, numerico = false, soloLectura = false) {
    return (
      <label className={etiquetaCampo}>
        {etiqueta}
        <input className={entrada} name={nombre} defaultValue={dato}
          type={numerico ? "number" : "text"} required={requerido} readOnly={soloLectura}
          min={numerico ? 0 : undefined} step={numerico ? 1 : undefined}
          maxLength={numerico ? undefined : 160} />
      </label>
    );
  }

  if (accion === "Compatibilidad") {
    return <ModalCompatibilidad suministro={registro} impresoras={impresoras} cerrar={cerrar} guardar={guardar} error={error} />;
  }

  if (accion === "Configuración" || accion === "Agregar stock") {
    const stock = accion === "Agregar stock";
    const titulo = stock ? "Agregar stock" : "Cambiar visibilidad";
    return (
      <Modal titulo={titulo} cerrar={cerrar}>
        <form onSubmit={guardar} className="grid gap-3">
          <div className={franja + " flex items-center gap-3"}>
            <IconoAdmin tipo={stock ? "mas" : registro.visible ? "visible" : "oculto"} />
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <strong>{registro.nombre}</strong>
              {stock && <p>Stock disponible: {registro.stock ?? "0"}</p>}
            </div>
          </div>
          {stock ? (
            <label className={etiquetaCampo}>Cantidad que se agregará
              <input type="number" name="cantidad" required min={1} step={1} className={entrada} />
            </label>
          ) : (
            <p>¿Quieres {registro.visible ? "ocultar" : "mostrar"} este suministro en el inventario?</p>
          )}
          {error && <p role="alert">{error}</p>}
          {acciones(stock ? "Agregar stock" : "Cambiar")}
        </form>
      </Modal>
    );
  }

  return (
    <Modal titulo={lectura ? "Detalles del suministro" : editar ? "Editar suministro" : "Agregar suministro"} cerrar={cerrar} ancho>
      {lectura ? (
        <div className="grid gap-3">
          <div className={franja + " flex flex-wrap items-center gap-3"}>
            <IconoAdmin tipo="stock" />
            <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <h3 className="text-base font-bold">{registro.nombre}</h3>
              <p>{[registro.tipo, registro.marca].filter(Boolean).join(" · ")}</p>
            </div>
            <span className="rounded-full bg-[#deecef] px-3 py-1 text-xs font-semibold">{valor(registro, "visible")}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <section className={panel}>
              <h3 className="mb-2 font-bold">Descripción</h3>
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{registro.descripcion || "Sin descripción."}</p>
            </section>
            <section className={panel}>
              <h3 className="mb-2 font-bold">Stock</h3>
              <dl className="grid grid-cols-2 gap-1">
                <dt>Stock disponible</dt><dd>{registro.stock ?? "0"}</dd>
                <dt>Stock mínimo</dt><dd>{registro.stockMinimo ?? 1}</dd>
              </dl>
            </section>
          </div>
          <div className={franja + " flex items-center gap-3 font-bold"}>
            <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-full " +
              (estadoStock === "Con stock" ? "bg-[#006681] text-white" :
                estadoStock === "Poco stock" ? "bg-[#ffbb75] text-[#633000]" : "bg-[#f5dbd5] text-[#872e21]")}>
              <IconoAdmin tipo={estadoStock === "Con stock" ? "stockDisponible" : estadoStock === "Poco stock" ? "stockBajo" : "sinStock"} />
            </span>
            <span>{estadoStock}</span>
          </div>
          <section className={panel}>
            <h3 className="mb-1 font-bold">Impresoras compatibles</h3>
            {vinculadas.length ? (
              <ul className="grid gap-1">
                {vinculadas.map((item) => <li key={item.id} className="[overflow-wrap:anywhere]">
                  {[item.nombre, item.area, item.serie].filter(Boolean).join(" · ")}
                </li>)}
              </ul>
            ) : <p>Sin impresoras vinculadas.</p>}
          </section>
        </div>
      ) : (
        <form onSubmit={guardar} className="grid gap-3">
          <div className={franja + " grid gap-2 sm:grid-cols-2"}>
            {campo("Nombre del suministro", "nombre", registro.nombre, true)}
            {campo("Marca", "marca", registro.marca ?? "")}
            <label className={etiquetaCampo}>Tipo
              <select name="tipo" className={entrada} defaultValue={registro.tipo ?? ""} required>
                <option value="">Selecciona un tipo</option>
                <option>Tóner</option><option>Tinta</option><option>Tambor</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <section className={panel}>
              <label className="grid gap-2 font-bold">Descripción
                <textarea name="descripcion" className={entrada} rows={4} maxLength={3000} defaultValue={registro.descripcion} />
              </label>
            </section>
            <section className={panel}>
              <h3 className="mb-2 font-bold">Stock</h3>
              <div className="grid gap-2">
                {campo(editar ? "Stock disponible" : "Stock inicial", "stock", registro.stock ?? "0", true, true, editar)}
                {campo("Stock mínimo", "stockMinimo", registro.stockMinimo ?? 1, true, true)}
                {editar && <p className="text-xs">Las entradas y los cambios de suministro actualizan el stock disponible.</p>}
              </div>
            </section>
          </div>
          {error && <p role="alert">{error}</p>}
          <div className={franja}>{acciones("Guardar suministro")}</div>
        </form>
      )}
    </Modal>
  );
}

function ModalIoT({ dialogo, sectores, cerrar, guardar, error }: {
  dialogo: Dialogo;
  sectores: string[];
  cerrar: () => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const { accion, registro } = dialogo;
  const lectura = accion === "Detalles";
  const editar = accion === "Editar";
  const franja = "min-w-0 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a]";
  const panel = "min-w-0 rounded-lg border border-[#d7d1bf] bg-[#eee9db] p-3";

  if (accion === "Configuración") {
    return (
      <Modal titulo="Cambiar visibilidad" cerrar={cerrar}>
        <form onSubmit={guardar} className="grid gap-3">
          <div className={franja + " flex items-center gap-3"}>
            <IconoAdmin tipo={registro.visible ? "visible" : "oculto"} />
            <p className="[overflow-wrap:anywhere]">¿Quieres {registro.visible ? "ocultar" : "mostrar"} <strong>{registro.nombre}</strong> en el inventario?</p>
          </div>
          {error && <p role="alert">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-[#d7d1bf] pt-3">
            <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
            <button className={azul}>Cambiar</button>
          </div>
        </form>
      </Modal>
    );
  }

  function campo(clave: (typeof camposIoT)[number]) {
    const dato = registro[clave] ?? "";
    const etiqueta = etiquetas[clave];

    return (
      <label key={clave} className={etiquetaCampo}>
        {etiqueta}
        {clave === "tipo" || clave === "estado" ? (
          <select name={clave} className={entrada} required defaultValue={dato || (clave === "estado" ? "Disponible" : "")}>
            {clave === "tipo" && <option value="">Selecciona un tipo</option>}
            {[...new Set([...(clave === "tipo" ? tiposIoT : estadosIoT), dato].filter(Boolean))].map((opcion) => (
              <option key={opcion}>{opcion}</option>
            ))}
          </select>
        ) : (
          <input name={clave} className={entrada} defaultValue={dato} required={clave === "nombre"}
            maxLength={160} />
        )}
      </label>
    );
  }

  return (
    <Modal titulo={lectura ? "Detalles del dispositivo IoT" : editar ? "Editar dispositivo IoT" : "Agregar dispositivo IoT"}
      cerrar={cerrar} compacto={lectura ? "detalle" : "formulario"}>
      {lectura ? (
        <div className="grid gap-2">
          <div className={franja + " flex items-center gap-2.5"}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#deecef]"><IconoAdmin tipo="red" /></span>
            <div className="min-w-0 flex-1 leading-tight [overflow-wrap:anywhere]">
              <h3 className="text-base font-bold">{registro.nombre}</h3>
              <p className="mt-0.5 text-sm">{[registro.tipo, registro.marca].filter(Boolean).join(" · ")}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#deecef] px-2 py-1 text-xs font-semibold [&>svg]:h-4 [&>svg]:w-4">
              <IconoAdmin tipo={registro.visible ? "visible" : "oculto"} />{valor(registro, "visible")}
            </span>
          </div>
          <section className={panel}>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold"><IconoAdmin tipo="detalle" />Información del dispositivo</h3>
            <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-[#d7d1bf] pt-2 text-sm">
              <dt className="font-semibold">ID</dt><dd>{registro.id}</dd>
              <dt className="font-semibold">Número de serie</dt><dd className="[overflow-wrap:anywhere]">{registro.serie || "—"}</dd>
              <dt className="font-semibold">Estado</dt><dd className="[overflow-wrap:anywhere]">{registro.estado || "—"}</dd>
              <dt className="font-semibold">Sector</dt><dd className="wrap-anywhere">{registro.area || "—"}</dd>
              <dt className="font-semibold">Ubicación</dt><dd className="wrap-anywhere">{registro.ubicacion || "—"}</dd>
            </dl>
          </section>
        </div>
      ) : (
        <form onSubmit={guardar} className="grid gap-2">
          <div className={franja + " grid gap-2 sm:grid-cols-2"}>
            {campo("nombre")}{campo("tipo")}{campo("marca")}{campo("serie")}
            <CampoSector sectores={sectores} valor={registro.area} />
            <label className={etiquetaCampo}>
              Ubicación (opcional)
              <input name="ubicacion" className={entrada} defaultValue={registro.ubicacion} maxLength={160} />
            </label>
          </div>
          <div className={franja + " " + filaEstadoFormulario}>
            {editar && campo("estado")}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={azul + " gap-2"} onClick={cerrar}><IconoAdmin tipo="volver" />Cancelar</button>
              <button className={azul + " gap-2"}><IconoAdmin tipo="guardar" />Guardar</button>
            </div>
          </div>
          {error && <p role="alert" className="font-semibold">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

function CampoSector({ sectores, valor, requerido = false }: {
  sectores: string[]; valor?: string; requerido?: boolean;
}) {
  return (
    <label className={etiquetaCampo}>
      Sector
      <select name="area" className={entrada} defaultValue={valor ?? ""} required={requerido}>
        <option value="">{requerido ? "Selecciona un sector" : "Sin sector asignado"}</option>
        {sectores.map((sector) => <option key={sector}>{sector}</option>)}
      </select>
    </label>
  );
}

function CampoEstadoRecurso({ registro, nombre = "estado" }: {
  registro: Registro; nombre?: string;
}) {
  const estados = estadosSinUsuario(registro.estado);
  return (
    <label className={etiquetaCampo}>
      Estado
      {tieneUsuario(registro) ? (
        <input className={entrada} value="Asignado" readOnly />
      ) : (
        <select name={nombre} className={entrada} defaultValue={registro.estado && estados.includes(registro.estado) ? registro.estado : "Disponible"}>
          {estados.map((estado) => <option key={estado}>{estado}</option>)}
        </select>
      )}
    </label>
  );
}

function CampoUsuarioAsignado({ registro }: { registro: Registro }) {
  const asignado = tieneUsuario(registro);
  return (
    <label className={etiquetaCampo}>
      Usuario asignado
      <input className={entrada} value={registro.usuario || (asignado ? "Usuario vinculado" : "Sin asignar")} readOnly />
      <span className="font-normal">{asignado
        ? "Desvincula este recurso desde Administración → Usuarios."
        : "Asigna este recurso desde Fichas y Actas de entrega."}</span>
    </label>
  );
}

function requisitosContrasena(contrasena: string) {
  const longitud = Array.from(contrasena).length;
  return [
    { texto: "Entre 15 y 128 caracteres", cumple: longitud >= 15 && longitud <= 128 },
    { texto: "Una letra minúscula", cumple: /\p{Ll}/u.test(contrasena) },
    { texto: "Una letra mayúscula", cumple: /\p{Lu}/u.test(contrasena) },
    { texto: "Un número", cumple: /\p{Nd}/u.test(contrasena) },
    { texto: "Un símbolo o signo de puntuación", cumple: /[\p{S}\p{P}]/u.test(contrasena) },
  ];
}

function CamposContrasena({ inicial = false, contrasena, confirmacion, cambiar, confirmar, deshabilitado = false }: {
  inicial?: boolean;
  contrasena: string;
  confirmacion: string;
  cambiar: (valor: string) => void;
  confirmar: (valor: string) => void;
  deshabilitado?: boolean;
}) {
  const id = useId();
  const noCoincide = confirmacion.length > 0 && confirmacion !== contrasena;
  return (
    <div className={contenedor + " grid gap-2"}>
      <label className={etiquetaFiltro}>
        {inicial ? "Contraseña inicial (opcional)" : "Nueva contraseña"}
        <input type="password" autoComplete="new-password" name={inicial ? "contrasenaInicial" : undefined}
          required={!inicial} value={contrasena} disabled={deshabilitado}
          aria-describedby={id + "-requisitos"} className={campoFiltro + " font-normal"}
          onChange={(evento) => cambiar(evento.target.value)} />
      </label>
      <ul id={id + "-requisitos"} className="grid gap-x-4 gap-y-1 text-xs text-brand-dark sm:grid-cols-2">
        {requisitosContrasena(contrasena).map(({ texto, cumple }) => (
          <li key={texto} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-4 shrink-0 text-center">{cumple ? "✓" : "○"}</span>
            <span className="sr-only">{cumple ? "Cumplido: " : "Pendiente: "}</span>
            {texto}
          </li>
        ))}
      </ul>
      <label className={etiquetaFiltro}>
        Confirmar contraseña
        <input type="password" autoComplete="new-password" name={inicial ? "confirmarInicial" : undefined}
          required={!inicial || Boolean(contrasena)} value={confirmacion} disabled={deshabilitado}
          aria-invalid={noCoincide || undefined} aria-describedby={noCoincide ? id + "-coincidencia" : undefined}
          className={campoFiltro + " font-normal"} onChange={(evento) => confirmar(evento.target.value)} />
      </label>
      {noCoincide && <p id={id + "-coincidencia"} className="text-xs font-semibold text-[#872e21]">Las contraseñas deben coincidir.</p>}
      {inicial && <p className="text-xs text-brand-dark">Si la dejas vacía, la cuenta quedará pendiente de contraseña.</p>}
    </div>
  );
}

function ContrasenaInicial() {
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  return (
    <CamposContrasena inicial contrasena={contrasena} confirmacion={confirmacion}
      cambiar={setContrasena} confirmar={setConfirmacion} />
  );
}

function ModalContrasenaUsuario({ usuario, cerrar, guardar, error }: {
  usuario: string;
  cerrar: () => void;
  guardar: (contrasena: string) => Promise<void>;
  error: string;
}) {
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const requisitos = requisitosContrasena(contrasena);
  const puedeGuardar = requisitos.every(({ cumple }) => cumple) && confirmacion === contrasena;

  async function validar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!puedeGuardar || enviando) return;
    setEnviando(true);
    try {
      await guardar(contrasena);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Cambiar contraseña" subtitulo={usuario} icono="contrasena" compacto="formulario" cerrar={cerrar}>
      <form method="post" onSubmit={validar} className="grid gap-3">
        <p className="text-xs text-ink-muted">Al guardar se cierran las sesiones activas de este usuario.</p>

        <CamposContrasena contrasena={contrasena} confirmacion={confirmacion}
          cambiar={setContrasena} confirmar={setConfirmacion} deshabilitado={enviando} />

        {error && <p role="alert" className="text-sm text-[#872e21]">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={cafe} onClick={cerrar} disabled={enviando}>Cancelar</button>
          <button type="submit" className={azul} disabled={!puedeGuardar || enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ModalUsuario({ dialogo, recursos, sectores, puedeRestablecer, cerrar, guardar, error }: {
  dialogo: Dialogo;
  recursos: Registro[];
  sectores: string[];
  puedeRestablecer: boolean;
  cerrar: () => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const { accion, registro } = dialogo;
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const franja = "min-w-0 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] [--borde-campo:#9ccbd4] [--texto-campo:#006681] p-3 text-[#00546a]";
  const panel = "min-w-0 rounded-lg border border-[#d7d1bf] bg-[#eee9db] p-3";
  const bloqueado = registro.visible && recursos.length > 0;

  function botones(texto: string, deshabilitado = false) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
        <button className={azul} disabled={deshabilitado}>{texto}</button>
      </div>
    );
  }

  if (accion === "Desvincular recursos") {
    return (
      <Modal titulo="Desvincular recursos" cerrar={cerrar}>
        <form onSubmit={guardar} className="grid gap-3">
          <div className={franja}><strong>{registro.nombre}</strong><p>{registro.area || "Sin sector"}</p></div>
          {recursos.length ? (
            <fieldset className="min-w-0">
              <legend className="mb-2 font-semibold">Selecciona los recursos que quieres desvincular</legend>
              <div className="grid max-h-64 gap-2 overflow-auto p-1">
                {recursos.map((item) => (
                  <label key={item.id} className="flex min-h-11 min-w-0 items-center gap-3 rounded-md border border-[#9ccbd4] bg-white px-3 py-2 text-[#00546a]">
                    <input type="checkbox" name="recursos" value={item.id} className="h-4 w-4 shrink-0 accent-[#006681]"
                      checked={seleccion.includes(item.id)} onChange={(evento) => {
                        const marcado = evento.target.checked;
                        setSeleccion((lista) => marcado ? [...lista, item.id] : lista.filter((id) => id !== item.id));
                      }} />
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      <strong className="block">{item.nombre}</strong>
                      <span className="text-xs">{[item.categoria, item.serie || `ID ${item.id}`].join(" · ")}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : <p>Este usuario no tiene equipos, móviles ni periféricos vinculados.</p>}
          {error && <p role="alert">{error}</p>}
          {botones(seleccion.length ? `Desvincular (${seleccion.length})` : "Desvincular", seleccion.length === 0)}
        </form>
      </Modal>
    );
  }

  if (accion === "Configuración") {
    return (
      <Modal titulo="Cambiar visibilidad" cerrar={cerrar}>
        <form onSubmit={guardar} className="grid gap-3">
          <p className="flex items-center gap-2">
            <IconoAdmin tipo={registro.visible ? "visible" : "oculto"} />
            <span>¿Quieres {registro.visible ? "ocultar" : "mostrar"} a <strong>{registro.nombre}</strong>?</span>
          </p>
          {bloqueado && <p>Primero desvincula los recursos asignados a este usuario.</p>}
          {error && <p role="alert">{error}</p>}
          {botones("Cambiar", bloqueado)}
        </form>
      </Modal>
    );
  }

  const editar = accion === "Editar";
  function campo(clave: "nombre" | "cargo" | "correo") {
    const etiqueta = clave === "nombre" ? "Nombre completo" : etiquetas[clave];
    return (
      <label key={clave} className={etiquetaCampo}>
        {etiqueta}
        <input className={entrada} name={clave} type={clave === "correo" ? "email" : "text"}
          defaultValue={registro[clave] ?? ""}
          required={clave === "nombre" || clave === "correo"} maxLength={160} />
      </label>
    );
  }

  return (
    <Modal titulo={accion === "Detalles" ? "Detalles del usuario" : editar ? "Editar usuario" : "Agregar usuario"}
      cerrar={cerrar} compacto={accion === "Detalles" ? false : "formulario"}>
      {accion === "Detalles" ? (
        <div className="grid gap-3">
          <div className={franja + " flex items-center gap-3"}>
            <IconoAdmin tipo="usuario" />
            <div className="min-w-0 [overflow-wrap:anywhere]"><strong>{registro.nombre}</strong><p>{registro.area || "Sin sector"} · {valor(registro, "visible")}</p></div>
          </div>
          <dl className={panel + " grid gap-3 sm:grid-cols-2"}>
            {(["cargo", "correo", "estado"] as const).map((clave) => (
              <div key={clave} className="[overflow-wrap:anywhere]">
                <dt className="font-semibold">{etiquetas[clave]}</dt><dd>{registro[clave] || "—"}</dd>
              </div>
            ))}
            <div><dt className="font-semibold">Recursos vinculados</dt><dd>{recursos.length}</dd></div>
          </dl>
        </div>
      ) : (
        <form method="post" onSubmit={guardar} className="grid gap-2">
          <div className={franja + " grid gap-2 sm:grid-cols-2"}>
            {campo("nombre")}<CampoSector sectores={sectores} valor={registro.area} requerido />
          </div>
          <div className={panel + " grid gap-2 sm:grid-cols-2"}>{campo("cargo")}{campo("correo")}</div>
          {accion === "Agregar" && puedeRestablecer && (
            <ContrasenaInicial />
          )}
          <div className={franja + " " + filaEstadoFormulario}>
            {editar && <label className={etiquetaCampo}>Estado
              <select name="estado" className={entrada} defaultValue={registro.estado || "Activo"}>
                <option>Activo</option><option>Inactivo</option>
              </select>
            </label>}
            {botones("Guardar usuario")}
          </div>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

function ModalCompatibilidad({ suministro, impresoras, cerrar, guardar, error }: {
  suministro: Registro;
  impresoras: Registro[];
  cerrar: () => void;
  guardar: (evento: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const formulario = useId();
  const [busqueda, setBusqueda] = useState("");
  const [soloSeleccionadas, setSoloSeleccionadas] = useState(false);
  const [seleccion, setSeleccion] = useState(() => new Set(
    impresoras.filter((impresora) => suministro.compatibles?.includes(impresora.id)).map((impresora) => impresora.id),
  ));
  const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
  const visibles = impresoras.filter((impresora) => {
    if (soloSeleccionadas && !seleccion.has(impresora.id)) return false;
    const texto = normalizar([impresora.nombre, impresora.marca, impresora.area, impresora.serie].join(" "));
    return palabras.every((palabra) => texto.includes(palabra));
  });

  function marcar(id: number, marcada: boolean) {
    setSeleccion((actuales) => {
      const cambios = new Set(actuales);
      if (marcada) cambios.add(id);
      else cambios.delete(id);
      return cambios;
    });
  }

  return (
    <Modal titulo="Vincular impresoras compatibles" icono="compatibilidad" cerrar={cerrar}
      pie={<div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={azul} onClick={cerrar}>Cancelar</button>
        <button type="submit" form={formulario} className={azul}>Guardar compatibilidad</button>
      </div>}>
      <form id={formulario} onSubmit={guardar} className="grid gap-3">
        {[...seleccion].map((id) => <input key={id} type="hidden" name="compatibles" value={id} />)}
        <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-[#9ccbd4] bg-[#c7e1e6] p-3 text-[#00546a]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white"><IconoAdmin tipo="stock" /></span>
          <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
            <p className="text-xs">Suministro</p>
            <p className="font-bold">{suministro.nombre}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold" role="status">
            {seleccion.size === 1 ? "1 seleccionada" : `${seleccion.size} seleccionadas`}
          </span>
        </div>

        <fieldset className="min-w-0 rounded-lg border border-[#d7d1bf] bg-white p-3">
          <legend className="px-1 font-bold">Impresoras</legend>
          <div className="grid gap-2">
            <label className={etiquetaCampo}>
              Buscar impresora
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#006681]"><IconoAdmin tipo="buscar" /></span>
                <input type="search" className={campoFiltro + " pl-11 font-normal"} placeholder="Modelo, sector o número de serie"
                  value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
              </span>
            </label>
            <p className="text-xs text-[#735956]">Marca o desmarca impresoras. La selección se conserva al buscar.</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div role="group" aria-label="Filtrar impresoras" className="inline-flex flex-wrap gap-1 rounded-lg bg-[#deecef] p-1">
                <button type="button" aria-pressed={!soloSeleccionadas} className={clasePestana(!soloSeleccionadas)}
                  onClick={() => setSoloSeleccionadas(false)}>Todas</button>
                <button type="button" aria-pressed={soloSeleccionadas} className={clasePestana(soloSeleccionadas)}
                  onClick={() => setSoloSeleccionadas(true)}>Seleccionadas</button>
              </div>
              <p role="status" className="text-xs text-[#735956]">
                {visibles.length} {visibles.length === 1 ? "impresora" : "impresoras"}
              </p>
            </div>

            {visibles.length ? (
              <ul className="grid max-h-64 gap-1.5 overflow-y-auto overscroll-contain p-1">
                {visibles.map((impresora) => {
                  const marcada = seleccion.has(impresora.id);
                  return (
                    <li key={impresora.id}>
                      <label className={"flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors " +
                        (marcada ? "border-[#86bdc9] bg-[#deecef] text-[#00546a]" : "border-[#d7d1bf] bg-white hover:border-[#9ccbd4] hover:bg-[#f5fafb]")}>
                        <input type="checkbox" className="h-4 w-4 shrink-0 accent-[#006681]" checked={marcada}
                          onChange={(evento) => marcar(impresora.id, evento.target.checked)} />
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          <strong className="block">{impresora.nombre}</strong>
                          <span className="block text-xs">
                            {[impresora.area, impresora.serie, !impresora.visible ? "Oculta" : ""].filter(Boolean).join(" · ") || "ID " + impresora.id}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-lg bg-[#f3f1eb] px-3 py-4 text-sm">
                {impresoras.length === 0 ? "No hay impresoras registradas." :
                  palabras.length ? "No hay impresoras que coincidan con la búsqueda." :
                    "Todavía no has seleccionado impresoras."}
              </p>
            )}
          </div>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
