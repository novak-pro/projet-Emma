import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env";
import { authenticate } from "../lib/auth";

const allowed = new Set(["summary", "clusters", "trends"]);

export async function analyticsRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/analytics/:name",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name } = request.params as { name: string };
      if (!allowed.has(name)) {
        return reply.code(404).send({ message: "Analyse inconnue" });
      }

      const queryIndex = request.url.indexOf("?");
      const query = queryIndex === -1 ? "" : request.url.slice(queryIndex);

      try {
        const response = await fetch(`${env.analyticsUrl}/${name}${query}`, {
          signal: AbortSignal.timeout(30000),
        });
        const payload = await response.json();
        return reply.code(response.status).send(payload);
      } catch {
        return reply.code(503).send({
          message: "Service d'analyse indisponible. Lancez le service Python (port 8000).",
        });
      }
    },
  );

  fastify.post(
    "/api/analytics/recompute",
    { preHandler: [authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const response = await fetch(`${env.analyticsUrl}/recompute`, {
          method: "POST",
          signal: AbortSignal.timeout(120000),
        });
        const payload = await response.json();
        return reply.code(response.status).send(payload);
      } catch {
        return reply.code(503).send({
          message: "Service d'analyse indisponible. Lancez le service Python (port 8000).",
        });
      }
    },
  );
}
