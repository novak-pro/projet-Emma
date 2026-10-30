import type { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: import("fastify").FastifyInstance) {
  fastify.post("/api/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Email ou mot de passe invalide" });
    }

    const admin = await prisma.admin.findUnique({
      where: { email: parsed.data.email.toLowerCase().trim() },
    });

    if (!admin) {
      return reply.code(401).send({ message: "Identifiants incorrects" });
    }

    const valid = await bcrypt.compare(parsed.data.password, admin.passwordHash);
    if (!valid) {
      return reply.code(401).send({ message: "Identifiants incorrects" });
    }

    const token = fastify.jwt.sign(
      { sub: admin.id, email: admin.email, name: admin.name },
      { expiresIn: "12h" },
    );

    return {
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  });

  fastify.get(
    "/api/auth/me",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { sub: string };
      const admin = await prisma.admin.findUnique({
        where: { id: user.sub },
        select: { id: true, email: true, name: true, createdAt: true },
      });
      if (!admin) {
        return reply.code(401).send({ message: "Compte introuvable" });
      }
      return admin;
    },
  );
}
