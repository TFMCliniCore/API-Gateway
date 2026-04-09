CREATE TABLE "gateway_services" (
    "id" SERIAL NOT NULL,
    "serviceKey" VARCHAR(50) NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "targetUrl" VARCHAR(300) NOT NULL,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "gateway_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gateway_routes" (
    "id" SERIAL NOT NULL,
    "pathPrefix" VARCHAR(80) NOT NULL,
    "description" VARCHAR(300),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceId" INTEGER NOT NULL,
    CONSTRAINT "gateway_routes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gateway_request_logs" (
    "id" SERIAL NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "query" VARCHAR(1000),
    "targetUrl" VARCHAR(500),
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "clientIp" VARCHAR(100),
    "userAgent" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceId" INTEGER,
    CONSTRAINT "gateway_request_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gateway_services_serviceKey_key" ON "gateway_services"("serviceKey");
CREATE UNIQUE INDEX "gateway_routes_pathPrefix_key" ON "gateway_routes"("pathPrefix");
CREATE INDEX "gateway_routes_serviceId_idx" ON "gateway_routes"("serviceId");
CREATE INDEX "gateway_request_logs_serviceId_idx" ON "gateway_request_logs"("serviceId");
CREATE INDEX "gateway_request_logs_createdAt_idx" ON "gateway_request_logs"("createdAt");

ALTER TABLE "gateway_routes"
ADD CONSTRAINT "gateway_routes_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "gateway_services"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "gateway_request_logs"
ADD CONSTRAINT "gateway_request_logs_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "gateway_services"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

