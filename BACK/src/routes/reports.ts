import { randomUUID } from "node:crypto";
import { createWriteStream, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { DamageType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { reverseGeocode, searchPlaces } from "../lib/geocode";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

const reportSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  damageType: z.nativeEnum(DamageType),
  region: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  roadName: z.string().trim().max(180).optional(),
  sizeEstimate: z.coerce.number().min(0).max(100000).optional(),
  description: z.string().trim().max(2000).optional(),
  reporterName: z.string().trim().max(120).optional(),
  reporterPhone: z.string().trim().max(40).optional(),
}).passthrough();

const extensionByMime: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

const reverseQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const searchQuery = z.object({ q: z.string().trim().min(3).max(200) });

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.post("/api/reports", async (request: FastifyRequest, reply: FastifyReply) => {
    const fields: Record<string, string> = {};
    const savedFiles: string[] = [];

    if (!request.isMultipart()) {
      return reply.code(415).send({ message: "Le formulaire doit être envoyé en multipart/form-data" });
    }

    try {
      for await (const part of request.parts()) {
        if (part.type === "file") {
          if (!part.mimetype.startsWith("image/")) {
            part.file.resume();
            continue;
          }
          const extension = extensionByMime[part.mimetype] ?? ".jpg";
          const filename = `${randomUUID()}${extension}`;
          await pipeline(part.file, createWriteStream(path.join(UPLOAD_DIR, filename)));
          savedFiles.push(filename);
        } else {
          fields[part.fieldname] = String(part.value);
        }
      }
    } catch {
      savedFiles.forEach((file) => {
        try {
          unlinkSync(path.join(UPLOAD_DIR, file));
        } catch {
          void file;
        }
      });
      return reply.code(400).send({ message: "Fichiers ou champs invalides" });
    }

    const parsed = reportSchema.safeParse(fields);
    if (!parsed.success) {
      savedFiles.forEach((file) => {
        try {
          unlinkSync(path.join(UPLOAD_DIR, file));
        } catch {
          void file;
        }
      });
      return reply.code(400).send({
        message: "Données du signalement invalides",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const report = await prisma.report.create({
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        damageType: data.damageType,
        region: data.region || null,
        city: data.city || null,
        roadName: data.roadName || null,
        sizeEstimate: data.sizeEstimate ?? null,
        description: data.description || null,
        reporterName: data.reporterName || null,
        reporterPhone: data.reporterPhone || null,
        photos: {
          create: savedFiles.map((file) => ({ url: `/uploads/${file}` })),
        },
      },
      include: { photos: true },
    });

    return reply.code(201).send({ message: "Signalement enregistré", report });
  });

  fastify.get("/api/geocode/reverse", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = reverseQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Coordonnées invalides" });
    }
    try {
      return await reverseGeocode(parsed.data.lat, parsed.data.lng);
    } catch {
      return reply.code(502).send({ message: "Service de géocodage indisponible" });
    }
  });

  fastify.get("/api/geocode/search", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = searchQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Recherche trop courte" });
    }
    try {
      return await searchPlaces(parsed.data.q);
    } catch {
      return reply.code(502).send({ message: "Service de recherche indisponible" });
    }
  });
}
