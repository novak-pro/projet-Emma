import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../lib/auth";

const configSchema = z.object({
  damageTypes: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        enabled: z.boolean().default(true),
      }),
    )
    .optional(),
  requirePhotos: z.boolean().optional(),
  requireDescription: z.boolean().optional(),
  minDescriptionLength: z.number().int().min(0).max(2000).optional(),
  fields: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(["text", "tel", "number", "textarea"]),
        required: z.boolean().default(false),
        enabled: z.boolean().default(true),
        placeholder: z.string().optional(),
      }),
    )
    .optional(),
  instructions: z.string().optional(),
});

const defaultConfig = {
  damageTypes: [
    { value: "NID_DE_POULE", label: "Nid-de-poule", enabled: true },
    { value: "FISSURE", label: "Fissure", enabled: true },
    { value: "AFFAISSEMENT", label: "Affaissement", enabled: true },
    { value: "ORNIERE", label: "Ornière", enabled: true },
    { value: "EROSION", label: "Érosion", enabled: true },
    { value: "AUTRE", label: "Autre", enabled: true },
  ],
  requirePhotos: false,
  requireDescription: true,
  minDescriptionLength: 10,
  fields: [
    { key: "reporterName", label: "Votre nom", type: "text", required: false, enabled: true },
    { key: "reporterPhone", label: "Téléphone", type: "tel", required: false, enabled: true },
    { key: "sizeEstimate", label: "Taille approximative (m²)", type: "number", required: false, enabled: true },
    { key: "roadName", label: "Route / axe concerné", type: "text", required: false, enabled: true },
  ],
  instructions: "",
};

export async function formConfigRoutes(fastify: FastifyInstance) {
  fastify.get("/api/form-config", async () => {
    const entry = await prisma.formConfig.findUnique({ where: { key: "report" } });
    if (!entry) {
      return defaultConfig;
    }
    return entry.config;
  });

  fastify.get(
    "/api/admin/form-config",
    { preHandler: [authenticate] },
    async () => {
      const entry = await prisma.formConfig.findUnique({ where: { key: "report" } });
      return entry?.config ?? defaultConfig;
    },
  );

  fastify.put(
    "/api/admin/form-config",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = configSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Configuration invalide" });
      }
      const merged = {
        ...defaultConfig,
        ...parsed.data,
        damageTypes: parsed.data.damageTypes ?? defaultConfig.damageTypes,
        fields: parsed.data.fields ?? defaultConfig.fields,
      };
      const entry = await prisma.formConfig.upsert({
        where: { key: "report" },
        create: { key: "report", config: merged },
        update: { config: merged },
      });
      return entry.config;
    },
  );

  fastify.post(
    "/api/admin/form-config/reset",
    { preHandler: [authenticate] },
    async () => {
      const entry = await prisma.formConfig.upsert({
        where: { key: "report" },
        create: { key: "report", config: defaultConfig },
        update: { config: defaultConfig },
      });
      return entry.config;
    },
  );
}
