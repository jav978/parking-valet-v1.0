-- Endurecimiento del flujo de tickets:
-- 1) Período de gracia configurable por lote (cortesía antes de cobrar).
-- 2) Índice único parcial: una placa no puede tener DOS tickets ACTIVOS
--    simultáneos (protección a nivel de BD contra condición de carrera
--    entre operadores). Idempotente para entornos existentes.

ALTER TABLE "parking_lots" ADD COLUMN IF NOT EXISTS "grace_minutes" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "tickets_active_plate_unique"
  ON "tickets" ("plate_number")
  WHERE "status" = 'ACTIVE' AND "deleted_at" IS NULL;
