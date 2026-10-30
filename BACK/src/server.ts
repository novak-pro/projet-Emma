import { mkdirSync } from "node:fs";
import Fastify, { type FastifyError } from "fastify";
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

const UPLOAD_DIR = env.uploadDir;
mkdirSync(UPLOAD_DIR, { recursive: true });

async function main() {
  const app = Fastify({ logger: { level: "info" }, bodyLimit: 12 * 1024 * 1024 });

  await app.register(cors, {
    origin: [
      env.frontendUrl,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      /\.vercel\.app$/,
    ],
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

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error(error);
    if (error.code === "LIMIT_FILE_SIZE") {
      return reply.code(413).send({ message: "Photo trop volumineuse (10 Mo maximum)" });
    }
    return reply.code(error.statusCode ?? 500).send({
      message: error.statusCode ? error.message : "Erreur interne du serveur",
    });
  });

  await app.listen({ port: env.port, host: env.host });
  app.log.info(`API ProjetEmma disponible sur http://${env.host}:${env.port}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
