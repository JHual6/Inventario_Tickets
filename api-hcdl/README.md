# API HCDL

Usa Node.js 24 y una base PostgreSQL con el esquema inicial de HCDL. Copia
`.env.example` a `.env` y coloca la contraseña de PostgreSQL. `HCDL_ORIGEN`
debe coincidir con la dirección desde la que se abre el frontend Next.js.

## Migración y cuentas

Si ya usabas la versión de acceso local, conserva los datos y cuentas existentes.
Si falta la migración, ejecuta desde la raíz. Ajusta la ruta de `base-datos` a
la carpeta que usaste para iniciar PostgreSQL:

```powershell
Get-Content -Raw .\api-hcdl\sql\004-acceso-local.sql | docker compose --env-file ..\base-datos\.env -f ..\base-datos\compose.yaml exec -T db psql -X -v ON_ERROR_STOP=1 -U hcdl -d hcdl
```

Para crear una contraseña para una cuenta de prueba existente o restablecerla,
ejecuta dentro de `api-hcdl` después de `npm.cmd ci`:

```powershell
npm.cmd run clave -- colaborador1@hcdl.example
npm.cmd run clave -- ti1@hcdl.example
npm.cmd run clave -- admin@hcdl.example
```

Cada comando imprime una nueva contraseña y cierra las sesiones de esa cuenta.
En la base, los roles siguen siendo `solicitante`, `tecnico` y `administrador`.
La aplicación concede el mismo acceso operativo de TI a los dos últimos.
