import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { prisma } from "@sandcastle/db";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function registerAuth(app: FastifyInstance) {
  app.decorateRequest("user", undefined);

  app.addHook("preHandler", async (request) => {
    const token = request.cookies.session;
    if (!token) return;
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) return;
    request.user = {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      role: session.user.role
    };
  });
}

export function requireUser(request: FastifyRequest, reply: FastifyReply): AuthUser {
  if (!request.user) {
    reply.code(401).send({ error: "Authentication required" });
    throw new Error("unauthenticated");
  }
  return request.user;
}

export async function createPasswordSession(reply: FastifyReply, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  await createSession(reply, user.id);
  return true;
}

export async function createSession(reply: FastifyReply, userId: string) {
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  reply.setCookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
