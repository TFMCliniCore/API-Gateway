-- Agregar campos de auditoría a gateway_request_logs
ALTER TABLE "gateway_request_logs" ADD COLUMN IF NOT EXISTS "usuarioId"  INTEGER;
ALTER TABLE "gateway_request_logs" ADD COLUMN IF NOT EXISTS "sucursalId" INTEGER;
ALTER TABLE "gateway_request_logs" ADD COLUMN IF NOT EXISTS "accion"     VARCHAR(20);
ALTER TABLE "gateway_request_logs" ADD COLUMN IF NOT EXISTS "recurso"    VARCHAR(80);
ALTER TABLE "gateway_request_logs" ADD COLUMN IF NOT EXISTS "detalle"    VARCHAR(500);

-- Índices para consultas de auditoría
CREATE INDEX IF NOT EXISTS "gateway_request_logs_usuarioId_idx"  ON "gateway_request_logs"("usuarioId");
CREATE INDEX IF NOT EXISTS "gateway_request_logs_sucursalId_idx" ON "gateway_request_logs"("sucursalId");
CREATE INDEX IF NOT EXISTS "gateway_request_logs_accion_idx"     ON "gateway_request_logs"("accion");
CREATE INDEX IF NOT EXISTS "gateway_request_logs_recurso_idx"    ON "gateway_request_logs"("recurso");
CREATE INDEX IF NOT EXISTS "gateway_request_logs_createdAt_idx"  ON "gateway_request_logs"("createdAt");
