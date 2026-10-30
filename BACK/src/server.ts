import path from "node:path";
import { mkdirSync } from "node:fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { env } from "./config/env";
import { authRoutes } from "./routes/auth";
import { reportRoutes } from "./routes/reports";
import { adminRoutes } from "./routes/admin";
import { analyticsRoutes } from "./routes/analytics";
import { formConfigRoutes } from "./routes/formConfig";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

async function main() {
  const app = Fastify({ logger: { level: "info" }, bodyLimit: 12 * 1024 * 1024 });

  await app.register(cors, {
    origin: [env.frontendUrl, "http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(jwt, { secret: env.jwtSecret });
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 5, fields: 30 },
  });
  await app.register(fastifyStatic, { root: UPLOAD_DIR, prefix: "/uploads/" });

  app.get("/api/health", async () => ({ status: "ok", service: "projetemma-api" }));

  await app.register(authRoutes);
  await app.register(reportRoutes);
  await app.register(adminRoutes);
  await app.register(analyticsRoutes);
  await app.register(formConfigRoutes);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    if (error.code === "LIMIT_FILE_SIZE") {
      return reply.code(413).send({ message: "Photo trop volumineuse (10 Mo maximum)" });
    }
    return reply.code(error.statusCode ?? 500).send({
      message: error.statusCode ? error.message : "Erreur interne du serveur",
    });
  });

  try {
    await app.listen({ port: env.port, host: "127.0.0.1" });
  } catch (err) {
    app.log.error(err);
    await app.listen({ port: env.port, host: "0.0.0.0" });
  }
  app.log.info(`API ProjetEmma disponible sur http://localhost:${env.port}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
