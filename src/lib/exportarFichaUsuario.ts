type Valor = string | number | null | undefined;

type UsuarioFicha = {
  nombre: string;
  cargo: string;
  sector?: string;
  correo?: string;
  telefono?: string;
  estado?: string;
};

type RecursoFicha = {
  id: number;
  nombre: string;
  marca: string;
  tipo: string;
  categoria: "Equipo" | "Móvil" | "Periférico";
  serie: string;

  procesador?: string;
  ram?: string;
  almacenamiento?: string;
  tarjetaVideo?: string;
  sistemaOperativo?: string;
  antivirus?: string;
  office?: string;

  tarjetaWifi?: string;
  macWifi?: string;
  tarjetaEthernet?: string;
  macEthernet?: string;
  ip?: string;

  imei1?: string;
  imei2?: string;
  numero?: string;
  accesorios?: string;
  compania?: string;
  convenio?: string;
  plan?: string;

  fechaRevision?: string;
};

function escapar(valor: Valor): string {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => {
    const equivalencias: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return equivalencias[caracter];
  });
}

function tieneValor(valor: Valor): boolean {
  return valor !== null &&
    valor !== undefined &&
    String(valor).trim() !== "";
}

function filas(campos: [string, Valor][]) {
  return campos
    .filter(([, valor]) => tieneValor(valor))
    .map(
      ([nombre, valor]) => `
        <tr>
          <th scope="row">${escapar(nombre)}</th>
          <td>${escapar(valor)}</td>
        </tr>
      `,
    )
    .join("");
}

function bloque(titulo: string, campos: [string, Valor][]) {
  const contenido = filas(campos);

  if (!contenido) return "";

  return `
    <section class="bloque">
      <h2>${escapar(titulo)}</h2>
      <table>
        <tbody>${contenido}</tbody>
      </table>
    </section>
  `;
}

function esMonitor(recurso: RecursoFicha) {
  return recurso.tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("monitor");
}

export async function exportarFichaUsuario(
  usuario: UsuarioFicha,
  recursos: RecursoFicha[],
): Promise<void> {
  // Se abre antes de esperar imágenes para evitar bloqueos de ventanas.
  const ventana = window.open("", "_blank");

  if (!ventana) {
    throw new Error(
      "El navegador bloqueó la ficha. Permite las ventanas emergentes para este sitio.",
    );
  }

  try {
    const fecha = new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());

    const equipos = recursos.filter(
      (item) => item.categoria === "Equipo",
    );

    const moviles = recursos.filter(
      (item) => item.categoria === "Móvil",
    );

    const monitores = recursos.filter(
      (item) => item.categoria === "Periférico" && esMonitor(item),
    );

    const perifericos = recursos.filter(
      (item) => item.categoria === "Periférico" && !esMonitor(item),
    );

    const informacionEquipos = equipos
      .map((equipo, indice) =>
        bloque(
          equipos.length > 1
            ? `Información del equipo ${indice + 1}`
            : "Información del equipo",
          [
            ["Número de serie", equipo.serie],
            ["Tipo", equipo.tipo],
            ["Marca / Modelo", `${equipo.marca} ${equipo.nombre}`],
            ["Procesador", equipo.procesador],
            ["Memoria RAM", equipo.ram],
            ["Almacenamiento", equipo.almacenamiento],
            ["Tarjeta de video", equipo.tarjetaVideo],
            ["Sistema operativo", equipo.sistemaOperativo],
            ["Antivirus", equipo.antivirus],
            ["Office", equipo.office],
            ["Fecha de revisión", equipo.fechaRevision],
          ],
        ),
      )
      .join("");

    const conectividad = equipos
      .map((equipo) =>
        bloque(`Redes y conectividad · ${equipo.nombre}`, [
          ["WiFi", equipo.tarjetaWifi],
          ["Dirección MAC WiFi", equipo.macWifi],
          ["Ethernet", equipo.tarjetaEthernet],
          ["Dirección MAC Ethernet", equipo.macEthernet],
          ["Dirección IP", equipo.ip],
        ]),
      )
      .join("");

    const informacionMonitores = monitores
      .map((monitor, indice) =>
        bloque(
          monitores.length > 1 ? `Monitor ${indice + 1}` : "Monitor",
          [
            ["Marca / Modelo", `${monitor.marca} ${monitor.nombre}`],
            ["Número de serie", monitor.serie],
          ],
        ),
      )
      .join("");

    const informacionMoviles = moviles
      .map((movil, indice) =>
        bloque(
          moviles.length > 1 ? `Celular ${indice + 1}` : "Celular",
          [
            ["Marca / Modelo", `${movil.marca} ${movil.nombre}`],
            ["Número de serie", movil.serie],
            ["IMEI 1", movil.imei1],
            ["IMEI 2", movil.imei2],
            ["N.º telefónico", movil.numero],
            ["Accesorios", movil.accesorios],
            ["Empresa", movil.compania],
            ["Convenio", movil.convenio],
            ["Plan", movil.plan],
          ],
        ),
      )
      .join("");

    const informacionPerifericos = perifericos.length
      ? `
        <section class="bloque">
          <h2>Periféricos</h2>
          <table class="perifericos">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Marca / Modelo</th>
                <th>Número de serie</th>
              </tr>
            </thead>
            <tbody>
              ${perifericos
                .map(
                  (item) => `
                    <tr>
                      <td>${escapar(item.tipo)}</td>
                      <td>${escapar(`${item.marca} ${item.nombre}`)}</td>
                      <td>${escapar(item.serie)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </section>
      `
      : "";

    const columnaIzquierda =
      informacionEquipos + informacionPerifericos;

    const columnaDerecha =
      conectividad + informacionMonitores + informacionMoviles;

    const dosColumnas = Boolean(columnaIzquierda && columnaDerecha);
    const logo = new URL("/logo.png", window.location.origin).href;

    ventana.document.open();
    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapar(`Ficha de usuario - ${usuario.nombre}`)}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            @page {
              size: A4 landscape;
              /* Sin espacio vertical para los textos automáticos del navegador. */
              margin: 0 10mm;
            }

            body {
              margin: 0;
              color: #006681;
              background: white;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 10px;
              line-height: 1.4;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .documento {
              max-width: 1100px;
              margin: 0 auto;
            }

            .cabecera {
              display: flex;
              align-items: center;
              gap: 20px;
              padding: 12px 18px;
              margin-bottom: 12px;
              background: #006681;
              color: white;
            }

            .cabecera img {
              width: 110px;
              height: 54px;
              object-fit: contain;
            }

            .cabecera-texto {
              border-left: 1px solid #84BDCB;
              padding-left: 20px;
            }

            h1 {
              margin: 0;
              font-size: 25px;
              font-weight: 600;
            }

            .subtitulo {
              margin: 3px 0 0;
              font-size: 11px;
            }

            .datos-usuario {
              display: grid;
              grid-template-columns: 1.35fr 1fr 1fr;
              gap: 12px;
              margin-bottom: 12px;
            }

            .datos-panel {
              border: 1px solid #9CCBD4;
              padding: 12px;
            }

            .dato + .dato {
              margin-top: 9px;
            }

            .etiqueta {
              display: block;
              margin-bottom: 2px;
              font-weight: 700;
            }

            .valor {
              overflow-wrap: anywhere;
            }

            .columnas {
              display: grid;
              grid-template-columns: 1.15fr 1fr;
              align-items: start;
              gap: 12px;
            }

            .columnas.una-columna {
              grid-template-columns: 1fr;
            }

            .bloque {
              margin-bottom: 12px;
              border: 1px solid #9CCBD4;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            h2 {
              margin: 0;
              padding: 9px 13px;
              background: #006681;
              color: white;
              font-size: 15px;
              font-weight: 500;
              break-after: avoid;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th, td {
              padding: 7px 12px;
              text-align: left;
              vertical-align: top;
              overflow-wrap: anywhere;
            }

            tbody th {
              width: 35%;
              font-weight: 600;
            }

            tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .perifericos thead {
              background: #F3F1EB;
            }

            .perifericos th {
              font-size: 10px;
            }

            .vacio {
              padding: 30px;
              border: 1px solid #9CCBD4;
              text-align: center;
            }

            .acciones {
              margin-bottom: 16px;
              padding: 12px;
              background: #F3F1EB;
              color: #61453F;
              text-align: center;
              font-size: 13px;
            }

            .acciones button {
              margin-left: 12px;
              border: 0;
              border-radius: 5px;
              padding: 9px 16px;
              background: #007C9C;
              color: white;
              cursor: pointer;
            }

            @media screen {
              body {
                padding: 20px;
              }
            }

            @media print {
              .acciones {
                display: none;
              }

              .documento {
                max-width: none;
                padding-block: 10mm;
                -webkit-box-decoration-break: clone;
                box-decoration-break: clone;
              }

              /* Flujo de impresión más estable entre páginas. */
              .columnas {
                display: block;
                columns: 2;
                column-gap: 12px;
              }

              .columnas.una-columna {
                columns: 1;
              }

              .columna {
                display: contents;
              }
            }
          </style>
        </head>

        <body>
          <div class="acciones">
            Selecciona “Guardar como PDF” en el destino de impresión.
            <button id="imprimir" type="button">Imprimir / Guardar PDF</button>
          </div>

          <main class="documento">
            <header class="cabecera">
              <img src="${escapar(logo)}" alt="Hotel Cabaña del Lago" />

              <div class="cabecera-texto">
                <h1>Ficha de gestión de activos TI</h1>
                <p class="subtitulo">
                  Información de los recursos asignados al usuario
                </p>
              </div>
            </header>

            <section class="datos-usuario">
              <div class="datos-panel">
                ${dato("Usuario", usuario.nombre)}
                ${dato("Cargo", usuario.cargo)}
                ${dato("Departamento", usuario.sector)}
              </div>

              <div class="datos-panel">
                ${dato("Fecha de emisión", fecha)}
                ${dato("Estado", usuario.estado)}
              </div>

              <div class="datos-panel">
                ${dato("Correo", usuario.correo)}
                ${dato("Teléfono", usuario.telefono)}
              </div>
            </section>

            ${
              recursos.length === 0
                ? '<p class="vacio">El usuario no tiene recursos asignados.</p>'
                : `
                  <div class="columnas ${dosColumnas ? "" : "una-columna"}">
                    <div class="columna">${columnaIzquierda}</div>
                    <div class="columna">${columnaDerecha}</div>
                  </div>
                `
            }
          </main>
        </body>
      </html>
    `);
    ventana.document.close();

    ventana.document
      .getElementById("imprimir")
      ?.addEventListener("click", () => ventana.print());

    await Promise.all(
      Array.from(ventana.document.images).map(
        (imagen) =>
          new Promise<void>((resolve) => {
            if (imagen.complete) {
              resolve();
              return;
            }

            imagen.onload = () => resolve();
            imagen.onerror = () => {
              imagen.style.display = "none";
              resolve();
            };
          }),
      ),
    );

    await ventana.document.fonts.ready;

    if (!ventana.closed) {
      ventana.focus();
      ventana.print();
    }
  } catch (error) {
    if (!ventana.closed) ventana.close();
    throw error;
  }
}

function dato(etiqueta: string, valor: Valor) {
  if (!tieneValor(valor)) return "";

  return `
    <div class="dato">
      <span class="etiqueta">${escapar(etiqueta)}</span>
      <span class="valor">${escapar(valor)}</span>
    </div>
  `;
}