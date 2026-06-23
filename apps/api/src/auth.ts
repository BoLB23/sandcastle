import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { prisma } from "@sandcastle/db";
import { roleCan, type PermissionAction, type Role } from "@sandcastle/shared";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function registerAuth(app: FastifyInstance) {
  app.decorateRequest("user", undefined);

  app.addHook("preHandler", async (request) => {
    const rawToken = request.cookies[SESSION_COOKIE];
    if (!rawToken) return;

    const session = await prisma.session.findUnique({
      where: { token: hashToken(rawToken) },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) return;

    request.user = {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      avatarUrl: session.user.avatarUrl,
      role: session.user.role as Role
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

export function requirePermission(
  request: FastifyRequest,
  reply: FastifyReply,
  action: PermissionAction
): AuthUser {
  const user = requireUser(request, reply);
  if (!roleCan(user.role, action)) {
    reply.code(403).send({ error: "Forbidden" });
    throw new Error("forbidden");
  }

  return user;
}

export async function createPasswordSession(reply: FastifyReply, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return false;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return false;

  await createSession(reply, user.id);
  return true;
}

export async function createSession(reply: FastifyReply, userId: string) {
  const rawToken = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await prisma.session.create({
    data: {
      token: hashToken(rawToken),
      userId,
      expiresAt
    }
  });

  reply.setCookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function clearSession(request: FastifyRequest, reply: FastifyReply) {
  const rawToken = request.cookies[SESSION_COOKIE];
  if (rawToken) {
    await prisma.session.deleteMany({ where: { token: hashToken(rawToken) } });
  }

  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
