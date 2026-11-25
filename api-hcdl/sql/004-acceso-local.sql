BEGIN;

ALTER TABLE cuenta ADD COLUMN IF NOT EXISTS contrasena_hash text;

CREATE TABLE IF NOT EXISTS sesion_cuenta (
  huella text PRIMARY KEY,
  cuenta_id integer NOT NULL REFERENCES cuenta(id) ON DELETE CASCADE,
  vence_en timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sesion_cuenta_vencimiento ON sesion_cuenta(vence_en);
CREATE INDEX IF NOT EXISTS sesion_cuenta_cuenta ON sesion_cuenta(cuenta_id);

INSERT INTO hcdl_migracion (version) VALUES ('004-acceso-local') ON CONFLICT DO NOTHING;
COMMIT;
