# Inventario HCDL integrado

La interfaz original de Next.js usa la API local de HCDL para el acceso, el
inventario de equipos, los tickets, las fichas de usuario y las actas de entrega.
La base PostgreSQL sigue en Docker. Usa Node.js 24 y abre el frontend desde el
mismo computador durante las pruebas.

## Si ya tienes PostgreSQL y cuentas funcionando

Extrae este ZIP en una carpeta nueva, junto a la carpeta donde dejaste la base,
y abre esa nueva carpeta en PowerShell. Detén la API anterior si usa el puerto
3001. Conserva tu contenedor, su volumen y las cuentas existentes. Esta versión
utiliza la misma migración `004-acceso-local` del paquete anterior.

En la terminal de la API:

```powershell
Set-Location .\api-hcdl
Copy-Item .env.example .env
notepad .env
```

En `api-hcdl/.env`, rellena `PGPASSWORD` con la misma contraseña que usa
PostgreSQL. Si el proyecto de base guarda su configuración en
`base-datos/.env`, el valor corresponde a `POSTGRES_PASSWORD` allí. Si tu base
usa otro puerto, ajusta `PGPORT`. Los valores predeterminados son base y usuario
`hcdl`, y puerto 5433 en el computador.

```powershell
npm.cmd ci
npm.cmd start
```

En otra terminal, desde la raíz de esta carpeta:

```powershell
npm.cmd ci
npm.cmd run dev -- --hostname 127.0.0.1
```

Abre [Inventario HCDL](http://127.0.0.1:3000). El frontend puede arrancar sin
`.env.local`. Si cambias la dirección de la API, copia `.env.local.example` y
edita `HCDL_API_URL`. Si cambias la dirección del navegador, actualiza
`HCDL_ORIGEN` en la API para que coincidan el protocolo, el host y el puerto.
El Compose original del frontend sigue incluido. Estas instrucciones ejecutan
Next.js y la API con Node en Windows y PostgreSQL en Docker.

La ruta `http://127.0.0.1:3001/api/salud` confirma que la API encuentra PostgreSQL
y la migración de acceso. Si indica que falta `004-acceso-local`, aplícala
siguiendo [la configuración de la API](api-hcdl/README.md).

## Qué probar

1. Inicia sesión como colaborador. En **Mis equipos** aparecen tus dispositivos
   asignados. En **Mis solicitudes** puedes asociar uno de ellos a un ticket y
   consultar su historial.
2. Entra como técnico o administrador de TI. Ambos ven todos los tickets,
   incluidos los que aún no tienen técnico. Pueden registrar solicitudes por
   colaboradores y cambiar responsable, prioridad, estado y observación.
3. Desde **Inventario → Equipos**, busca un equipo por nombre, modelo,
   nombre de sistema, marca o serie. La búsqueda se aplica antes de
   paginar y admite términos en cualquier orden. Puedes combinarla con marca y
   estado. El historial de equipos muestra entregas y devoluciones guardadas.
4. Desde **Fichas y Actas de entrega**, selecciona un usuario y un dispositivo
   disponible. La entrega se guarda en PostgreSQL antes de abrir el PDF y el
   dispositivo pasa a figurar asignado al colaborador. Si se bloquea la ventana
   de impresión, puedes volver a exportar la última acta desde la misma vista.

**Inventario, Administración, Usuarios, Sectores y Dashboard** consultan PostgreSQL.
Administración guarda altas, ediciones, visibilidad, asignaciones y
desvinculaciones. La compatibilidad y los movimientos de suministros también
quedan registrados en la base. El stock se modifica con **Agregar stock** o con
un **Cambio de suministro** para conservar el historial.

La base de demostración puede incluir registros de ejemplo como datos
persistentes. Las cuentas de usuarios nuevos usan el comando de contraseña de
la API. La pantalla de actas permite reexportar la última entrega durante la
visita a la página.
