# Inventario HCDL con Docker Compose

## Configuración inicial en Windows

1. Abre Docker Desktop. Si tienes Next.js o la API corriendo en PowerShell, detén esos procesos con Ctrl+C.
2. Desde la carpeta donde levantaste PostgreSQL con el Compose anterior (normalmente `base-datos`), ejecuta estos comandos en PowerShell. Guarda el nombre que imprime el segundo comando.

   ```powershell
   $db = docker compose ps -aq db
   docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' $db
   docker compose stop db
   ```

   Si el contenedor anterior ya fue eliminado, busca el nombre del volumen existente con `docker volume ls`. Usa el volumen de la base en la que ya funciona el inicio de sesión.

3. Extrae este paquete sobre la raíz de `inventario-hcdl`, donde están `package.json` y `compose.yaml`. Si la raíz todavía no tiene un `.env`, copia la plantilla.

   ```powershell
   Copy-Item .env.docker.example .env
   ```

   En el `.env` de la raíz, agrega o ajusta `HCDL_DB_VOLUME` con el nombre exacto del volumen y `POSTGRES_PASSWORD` con la contraseña de PostgreSQL que ya usabas en `base-datos/.env`. Si la contraseña contiene `$`, las comillas simples permiten conservarlo literalmente.

4. Desde la raíz del proyecto, levanta los tres servicios.

   ```powershell
   docker compose up -d --build --wait
   ```

   Entra en [http://127.0.0.1:3000/acceso](http://127.0.0.1:3000/acceso) con tu cuenta de siempre. Compose comprueba PostgreSQL primero, luego la API y por último la conexión de Next.js con la API.

## Uso diario

| Tarea | Comando desde la raíz |
| --- | --- |
| Iniciar el sistema | `docker compose up -d --wait` |
| Detenerlo | `docker compose stop` |
| Revisar el estado | `docker compose ps` |
| Revisar los registros | `docker compose logs --tail=60 db api app` |
| Consultar PostgreSQL | `docker compose exec db psql -U hcdl -d hcdl` |

Next.js detecta cambios en `src` y `public` desde el host. Si cambias la API o las dependencias, vuelve a ejecutar `docker compose up -d --build --wait`.

El volumen de PostgreSQL se declara como externo para reutilizar tus datos y cuentas. Para volver al Compose antiguo, detén primero los servicios de este proyecto antes de levantar la base desde su carpeta anterior.
