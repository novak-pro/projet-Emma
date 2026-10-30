-- CreateEnum
CREATE TYPE "DamageType" AS ENUM ('NID_DE_POULE', 'FISSURE', 'AFFAISSEMENT', 'ORNIERE', 'EROSION', 'AUTRE');

-- CreateEnum
CREATE TYPE "SeverityClass" AS ENUM ('LEGERE', 'MODEREE', 'GRAVE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('NOUVEAU', 'CONFIRME', 'EN_REPARATION', 'REPARE', 'REJETE');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "roadName" TEXT,
    "damageType" "DamageType" NOT NULL,
    "sizeEstimate" DOUBLE PRECISION,
    "description" TEXT,
    "severityScore" DOUBLE PRECISION,
    "severityClass" "SeverityClass",
    "status" "ReportStatus" NOT NULL DEFAULT 'NOUVEAU',
    "reporterName" TEXT,
    "reporterPhone" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "params" JSONB,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Report_latitude_longitude_idx" ON "Report"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Report_region_createdAt_idx" ON "Report"("region", "createdAt");

-- CreateIndex
CREATE INDEX "Report_severityClass_idx" ON "Report"("severityClass");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "Photo_reportId_idx" ON "Photo"("reportId");

-- CreateIndex
CREATE INDEX "AnalysisRun_type_createdAt_idx" ON "AnalysisRun"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
