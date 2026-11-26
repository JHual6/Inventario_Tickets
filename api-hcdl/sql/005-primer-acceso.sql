BEGIN;

ALTER TABLE cuenta ADD COLUMN IF NOT EXISTS cambio_inicial_pendiente boolean NOT NULL DEFAULT false;

UPDATE cuenta SET cambio_inicial_pendiente = true
WHERE rol = 'solicitante' AND contrasena_hash IS NULL
  AND NOT EXISTS (SELECT 1 FROM hcdl_migracion WHERE version = '005-primer-acceso');

INSERT INTO hcdl_migracion (version) VALUES ('005-primer-acceso') ON CONFLICT DO NOTHING;
COMMIT;
