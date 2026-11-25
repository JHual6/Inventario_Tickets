export type RecursoActa = {
  id: number;
  nombre: string;
  marca: string;
  tipo: string;
  categoria: "Equipo" | "Móvil" | "Periférico";
  serie: string;

  imei1?: string;
  imei2?: string;
  numero?: string;
  accesorios?: string;
  compania?: string;
  convenio?: string;
  plan?: string;
};

export type ActaEntrega = {
  referencia: string;
  fecha: string;
  ciudad: string;

  usuario: {
    nombre: string;
    cargo: string;
    correo?: string;
    sector?: string;
  };

  entregadoPor: {
    nombre: string;
    cargo: string;
  };

  recursos: {
    recurso: RecursoActa;
    condicion: "N" | "U" | "R";
    observacion: string;
  }[];
};

type Valor = string | number | null | undefined;

function escapar(valor: Valor) {
  const equivalencias: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(valor ?? "").replace(
    /[&<>"']/g,
    (caracter) => equivalencias[caracter],
  );
}

function tieneValor(valor: Valor) {
  return valor !== undefined &&
    valor !== null &&
    String(valor).trim() !== "";
}

function campo(nombre: string, valor: Valor) {
  if (!tieneValor(valor)) return "";

  return `
    <div class="dato">
      <strong>${escapar(nombre)}</strong>
      <span>${escapar(valor)}</span>
    </div>
  `;
}

function condicionTexto(condicion: "N" | "U" | "R") {
  return {
    N: "Nuevo",
    U: "Semi Nuevo",
    R: "Con Detalles",
  }[condicion];
}

function encabezado(
  acta: ActaEntrega,
  titulo: string,
  logo: string,
) {
  const fecha = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(acta.fecha));

  return `
    <header class="cabecera">
      <div>
        <h1>${escapar(titulo)}</h1>
        <p><strong>Fecha:</strong> ${escapar(fecha)}</p>
        <p><strong>Ciudad:</strong> ${escapar(acta.ciudad)}</p>
        <p><strong>Referencia:</strong> Entrega de herramientas de trabajo.</p>
        <p><strong>Identificador:</strong> ${escapar(acta.referencia)}</p>
      </div>

      <img src="${escapar(logo)}" alt="Hotel Cabaña del Lago" />
    </header>

    <section>
      <h2>Datos del colaborador</h2>

      <div class="datos">
        ${campo("Nombre", acta.usuario.nombre)}
        ${campo("Cargo", acta.usuario.cargo)}
        ${campo("Correo", acta.usuario.correo)}
        ${campo("Área", acta.usuario.sector)}
      </div>
    </section>
  `;
}

function cierre(acta: ActaEntrega) {
  return `
    <section>
      <h2>Términos y condiciones de uso</h2>

      <p>El colaborador se compromete a:</p>

      <ol>
        <li>
          Usar el equipo exclusivamente para fines laborales,
          salvo autorización expresa de la empresa.
        </li>
        <li>
          No instalar aplicaciones no autorizadas ni realizar
          modificaciones al sistema operativo.
        </li>
        <li>
          Mantener el equipo en buen estado físico y funcional.
        </li>
        <li>
          Proteger el equipo contra golpes, caídas, líquidos,
          altas temperaturas o cualquier situación que pueda dañarlo.
        </li>
        <li>
          Reportar de inmediato cualquier daño, pérdida o robo del
          equipo al área de Informática o Recursos Humanos.
        </li>
        <li>No ceder, prestar ni transferir el equipo a terceros.</li>
        <li>
          Entregar el equipo y sus accesorios en buen estado cuando
          la empresa lo requiera, por cambio de equipo, término de
          contrato o reasignación.
        </li>
      </ol>
    </section>

    <section>
      <h2>Responsabilidad del usuario</h2>

      <p>
        El colaborador reconoce que el equipo es propiedad de la
        empresa y que su uso indebido, daño por negligencia, pérdida
        o robo sin justificación podría implicar sanciones
        administrativas y/o la reposición económica del equipo,
        conforme a las políticas internas de la empresa.
      </p>
    </section>

    <section class="firmas">
      <h2>Firmas de conformidad</h2>

      <div class="firmantes">
        <div>
          <div class="linea"></div>
          <strong>${escapar(acta.entregadoPor.nombre)}</strong>
          <p>${escapar(acta.entregadoPor.cargo)}</p>
          <small>Entregado por (Firma y Timbre)</small>
        </div>

        <div>
          <div class="linea"></div>
          <strong>${escapar(acta.usuario.nombre)}</strong>
          <p>${escapar(acta.usuario.cargo)}</p>
          <small>Recibido por (Firma y RUT)</small>
        </div>
      </div>
    </section>
  `;
}

function actaInformaticos(
  acta: ActaEntrega,
  recursos: ActaEntrega["recursos"],
  logo: string,
) {
  return `
    <article class="acta">
      ${encabezado(acta, "ACTA DE ENTREGA DE EQUIPO INFORMÁTICO", logo)}

      <section>
        <h2>Descripción de dispositivos</h2>

        <table>
          <thead>
            <tr>
              <th>Cantidad</th>
              <th>Elemento</th>
              <th>Marca / Modelo</th>
              <th>N.º de serie</th>
              <th>Condición</th>
            </tr>
          </thead>

          <tbody>
            ${recursos
              .map(
                ({ recurso, condicion, observacion }) => `
                  <tr>
                    <td>1</td>
                    <td>${escapar(recurso.tipo)}</td>
                    <td>
                      ${escapar(`${recurso.marca} ${recurso.nombre}`)}
                    </td>
                    <td>${escapar(recurso.serie)}</td>
                    <td>${condicionTexto(condicion)}</td>
                  </tr>

                  ${
                    tieneValor(observacion)
                      ? `
                        <tr>
                          <td colspan="5" class="observacion">
                            <strong>Observaciones:</strong>
                            ${escapar(observacion)}
                          </td>
                        </tr>
                      `
                      : ""
                  }
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>

      ${cierre(acta)}
    </article>
  `;
}

function actaCelulares(
  acta: ActaEntrega,
  recursos: ActaEntrega["recursos"],
  logo: string,
) {
  return `
    <article class="acta">
      ${encabezado(acta, "ACTA DE ENTREGA DE EQUIPO CELULAR", logo)}

      <section>
        <h2>Detalles del equipo</h2>

        ${recursos
          .map(
            ({ recurso, condicion, observacion }) => `
              <div class="celular">
                <h3>
                  ${escapar(`${recurso.marca} ${recurso.nombre}`)}
                </h3>

                <div class="datos">
                  ${campo("Marca", recurso.marca)}
                  ${campo("Modelo", recurso.nombre)}
                  ${campo("N.º de serie", recurso.serie)}
                  ${campo("Condición", condicionTexto(condicion))}
                  ${campo("IMEI 1", recurso.imei1)}
                  ${campo("IMEI 2", recurso.imei2)}
                  ${campo("Número telefónico", recurso.numero)}
                  ${campo("Accesorios", recurso.accesorios)}
                  ${campo("Empresa", recurso.compania)}
                  ${campo("Tipo de convenio", recurso.convenio)}
                  ${campo("Plan", recurso.plan)}
                </div>

                ${
                  tieneValor(observacion)
                    ? `
                      <p class="observacion">
                        <strong>Observaciones:</strong>
                        ${escapar(observacion)}
                      </p>
                    `
                    : ""
                }
              </div>
            `,
          )
          .join("")}
      </section>

      ${cierre(acta)}
    </article>
  `;
}

export async function exportarActaEntrega(
  acta: ActaEntrega,
  ventana = window.open("", "_blank"),
): Promise<void> {
  if (acta.recursos.length === 0) {
    throw new Error("El acta no contiene recursos.");
  }

  if (!ventana) {
    throw new Error(
      "El navegador bloqueó el acta. Permite las ventanas emergentes para este sitio.",
    );
  }

  try {
    const logo = new URL("/logo.png", window.location.origin).href;

    const informaticos = acta.recursos.filter(
      ({ recurso }) => recurso.categoria !== "Móvil",
    );

    const celulares = acta.recursos.filter(
      ({ recurso }) => recurso.categoria === "Móvil",
    );

    const documentos = [
      informaticos.length
        ? actaInformaticos(acta, informaticos, logo)
        : "",
      celulares.length
        ? actaCelulares(acta, celulares, logo)
        : "",
    ].join("");

    ventana.document.open();
    ventana.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>${escapar(`Acta de entrega - ${acta.usuario.nombre}`)}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            @page {
              size: A4 portrait;
              margin: 13mm;
            }

            body {
              margin: 0;
              background: white;
              color: #202020;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 10px;
              line-height: 1.45;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .acta {
              max-width: 740px;
              margin: 0 auto;
            }

            .acta + .acta {
              break-before: page;
              page-break-before: always;
            }

            .cabecera {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              margin-bottom: 16px;
            }

            .cabecera img {
              width: 95px;
              height: 65px;
              object-fit: contain;
            }

            h1 {
              margin: 0 0 12px;
              font-size: 16px;
            }

            .cabecera p {
              margin: 3px 0;
            }

            h2 {
              margin: 17px 0 12px;
              padding: 8px 12px;
              background: #4D5D3D;
              color: white;
              font-size: 11px;
              text-transform: uppercase;
              break-after: avoid;
            }

            h3 {
              margin: 0 0 10px;
              font-size: 12px;
            }

            .datos {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 24px;
            }

            .dato {
              display: flex;
              min-width: 0;
              border: 1px solid #4D5D3D;
            }

            .dato strong {
              flex: 0 0 90px;
              padding: 6px;
              background: #DCE2D4;
            }

            .dato span {
              min-width: 0;
              padding: 6px;
              overflow-wrap: anywhere;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th, td {
              padding: 8px 6px;
              border: 1px solid #C9D1C3;
              text-align: left;
              overflow-wrap: anywhere;
            }

            th {
              background: #DCE2D4;
            }

            thead {
              display: table-header-group;
            }

            tr, .dato {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .celular {
              margin-bottom: 12px;
              padding: 12px;
              border: 1px solid #4D5D3D;
              break-inside: avoid;
            }

            .observacion {
              background: #F3F4EF;
              white-space: pre-wrap;
            }

            p.observacion {
              margin-bottom: 0;
              padding: 8px;
            }

            ol {
              padding-left: 20px;
            }

            li {
              margin-bottom: 3px;
            }

            .firmas {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .firmantes {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 55px;
              padding: 35px 20px 10px;
              text-align: center;
            }

            .linea {
              margin-bottom: 7px;
              border-top: 1px solid #333;
            }

            .firmantes p {
              margin: 3px 0;
            }

            .firmantes small {
              color: #666;
            }

            .acciones {
              margin-bottom: 20px;
              padding: 12px;
              background: #F3F1EB;
              text-align: center;
            }

            .acciones button {
              padding: 9px 16px;
              border: 0;
              border-radius: 5px;
              background: #007C9C;
              color: white;
              cursor: pointer;
            }

            @media screen {
              body {
                padding: 20px;
              }

              .acta + .acta {
                margin-top: 40px;
                padding-top: 30px;
                border-top: 1px dashed #999;
              }
            }

            @media print {
              .acciones {
                display: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="acciones">
            <button id="imprimir" type="button">
              Imprimir / Guardar PDF
            </button>
          </div>

          ${documentos}
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
            function finalizar() {
              if (imagen.naturalWidth === 0) {
                imagen.style.display = "none";
              }

              resolve();
            }

            if (imagen.complete) {
              finalizar();
              return;
            }

            imagen.onload = finalizar;
            imagen.onerror = finalizar;
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