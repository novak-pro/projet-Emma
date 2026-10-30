import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  DamageType,
  Prisma,
  ReportStatus,
  SeverityClass,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../lib/auth";

const listQuery = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  severityClass: z.nativeEnum(SeverityClass).optional(),
  damageType: z.nativeEnum(DamageType).optional(),
  region: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const updateSchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  severityClass: z.nativeEnum(SeverityClass).nullable().optional(),
  severityScore: z.coerce.number().min(0).max(100).nullable().optional(),
  description: z.string().trim().max(2000).optional(),
});

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/admin/reports",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = listQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Filtres invalides" });
      }
      const { page, pageSize, search, region, ...filters } = parsed.data;

      const where: Prisma.ReportWhereInput = {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.severityClass ? { severityClass: filters.severityClass } : {}),
        ...(filters.damageType ? { damageType: filters.damageType } : {}),
        ...(region ? { region: { contains: region, mode: "insensitive" } } : {}),
        ...(search
          ? {
              OR: [
                { description: { contains: search, mode: "insensitive" } },
                { roadName: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
                { region: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [total, items] = await Promise.all([
        prisma.report.count({ where }),
        prisma.report.findMany({
          where,
          include: { photos: true, reviewedBy: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
    },
  );

  fastify.get(
    "/api/admin/reports/:id",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const report = await prisma.report.findUnique({
        where: { id },
        include: { photos: true, reviewedBy: { select: { id: true, name: true, email: true } } },
      });
      if (!report) {
        return reply.code(404).send({ message: "Signalement introuvable" });
      }
      return report;
    },
  );

  fastify.patch(
    "/api/admin/reports/:id",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const parsed = updateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Données invalides" });
      }
      const user = request.user as { sub: string };

      const exists = await prisma.report.findUnique({ where: { id } });
      if (!exists) {
        return reply.code(404).send({ message: "Signalement introuvable" });
      }

      const report = await prisma.report.update({
        where: { id },
        data: { ...parsed.data, reviewedById: user.sub },
        include: { photos: true, reviewedBy: { select: { id: true, name: true, email: true } } },
      });
      return report;
    },
  );

  fastify.delete(
    "/api/admin/reports/:id",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const exists = await prisma.report.findUnique({ where: { id } });
      if (!exists) {
        return reply.code(404).send({ message: "Signalement introuvable" });
      }
      await prisma.report.delete({ where: { id } });
      return { message: "Signalement supprimé" };
    },
  );

  fastify.get(
    "/api/admin/export.csv",
    { preHandler: [authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const reports = await prisma.report.findMany({ orderBy: { createdAt: "desc" } });
      const header = [
        "id",
        "createdAt",
        "latitude",
        "longitude",
        "region",
        "city",
        "roadName",
        "damageType",
        "sizeEstimate",
        "severityScore",
        "severityClass",
        "status",
        "description",
      ];
      const escape = (value: unknown) => {
        const text = value === null || value === undefined ? "" : String(value);
        return `"${text.replace(/"/g, '""')}"`;
      };
      const lines = reports.map((report) =>
        [
          report.id,
          report.createdAt.toISOString(),
          report.latitude,
          report.longitude,
          report.region,
          report.city,
          report.roadName,
          report.damageType,
          report.sizeEstimate,
          report.severityScore,
          report.severityClass,
          report.status,
          report.description,
        ]
          .map(escape)
          .join(","),
      );
      const csv = [header.join(","), ...lines].join("\n");
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="signalements.csv"')
        .send(csv);
    },
  );
}
