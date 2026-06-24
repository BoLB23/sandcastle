import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { prisma } from "@sandcastle/db";
import {
  acceptResetSchema,
  authSessionUserSchema,
  createChannelSchema,
  createEventSchema,
  createInviteSchema,
  createResetLinkSchema,
  inviteAcceptSchema,
  listMessagesQuerySchema,
  loginSchema,
  profileSchema,
  roleSchema,
  rsvpSchema,
  updateAvailabilitySchema,
  updateEventSchema
} from "@sandcastle/shared";
import { env } from "./env";
import {
  clearSession,
  createPasswordSession,
  createSession,
  hashPassword,
  hashToken,
  registerAuth,
  requirePermission,
  requireUser
} from "./auth";
import Redis from "ioredis";
import { nanoid } from "nanoid";
import { ZodError, z } from "zod";

const availabilityDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const;

const availabilityHours = ["19", "20", "21", "22"] as const;
const createMessageBodySchema = z.object({
  body: z.string().min(1).max(4000)
});

type MessageRecord = Awaited<ReturnType<typeof prisma.message.findFirstOrThrow>>;

export async function buildApp() {
  const app = Fastify({ logger: true });
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 2000 });
  let redisReady = false;

  app.setErrorHandler((error, request, reply) => {
    if (reply.sent) return;
    if (error instanceof Error && (error.message === "unauthenticated" || error.message === "forbidden")) {
      return;
    }

    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Invalid request",
        issues: error.issues
      });
    }

    request.log.error({ err: error }, "unhandled api error");
    return reply.code(500).send({ error: "Internal server error" });
  });

  redis.on("error", (error: unknown) => {
    app.log.error({ err: error }, "api redis publish error");
  });

  await app.register(cors, { origin: env.PUBLIC_APP_URL, credentials: true });
  await app.register(cookie, { secret: env.AUTH_SECRET });
  await registerAuth(app);

  app.addHook("onClose", async () => {
    if (redis.status !== "end") {
      await redis.quit().catch(() => redis.disconnect());
    }
  });

  app.get("/healthz", async () => ({ ok: true, service: "api" }));

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const ok = await createPasswordSession(reply, body.email, body.password);
    if (!ok) return reply.code(401).send({ error: "Invalid login" });
    return { ok: true };
  });

  app.post("/auth/logout", async (request, reply) => {
    await clearSession(request, reply);
    return { ok: true };
  });

  app.get("/auth/me", async (request, reply) => {
    const user = requireUser(request, reply);
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { profile: true }
    });

    return {
      user: authSessionUserSchema.parse({
        id: current.id,
        email: current.email,
        displayName: current.displayName,
        avatarUrl: current.avatarUrl,
        role: current.role
      }),
      profile: current.profile
    };
  });

  app.get("/members", async (request, reply) => {
    requirePermission(request, reply, "resets.manage");
    const members = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { displayName: "asc" }],
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true
      }
    });

    return members.map((member) => ({
      ...member,
      role: roleSchema.parse(member.role)
    }));
  });

  app.post("/invites", async (request, reply) => {
    const user = requirePermission(request, reply, "invites.manage");
    const body = createInviteSchema.parse(request.body);
    const rawToken = nanoid(40);

    await prisma.invite.create({
      data: {
        tokenHash: hashToken(rawToken),
        email: body.email,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        createdBy: user.id
      }
    });

    return {
      inviteUrl: `${env.PUBLIC_APP_URL}/invite/${rawToken}`
    };
  });

  app.get("/invites/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const invite = await prisma.invite.findUnique({
      where: { tokenHash: hashToken(token) }
    });

    if (!invite || invite.acceptedAt || (invite.expiresAt && invite.expiresAt < new Date())) {
      return reply.code(404).send({ error: "Invite not found" });
    }

    return {
      email: invite.email,
      expiresAt: invite.expiresAt?.toISOString() ?? null
    };
  });

  app.post("/invites/accept", async (request, reply) => {
    const body = inviteAcceptSchema.parse(request.body);
    const invite = await prisma.invite.findUnique({ where: { tokenHash: hashToken(body.token) } });

    if (!invite || invite.acceptedAt || (invite.expiresAt && invite.expiresAt < new Date())) {
      return reply.code(400).send({ error: "Invite is invalid or expired" });
    }

    if (invite.email && invite.email !== body.email) {
      return reply.code(403).send({ error: "Invite is restricted to a different email address" });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: body.email,
          displayName: body.displayName,
          passwordHash,
          emailVerifiedAt: new Date(),
          profile: {
            create: {}
          }
        }
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: {
          acceptedBy: created.id,
          acceptedAt: new Date()
        }
      });

      await tx.availabilitySetting.createMany({
        data: buildDefaultAvailability(created.id)
      });

      return created;
    });

    await createSession(reply, user.id);
    return { ok: true };
  });

  app.post("/reset-links", async (request, reply) => {
    const user = requirePermission(request, reply, "resets.manage");
    const body = createResetLinkSchema.parse(request.body);
    const target = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!target) return reply.code(404).send({ error: "User not found" });

    const rawToken = nanoid(40);
    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashToken(rawToken),
        userId: target.id,
        createdBy: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60)
      }
    });

    return {
      resetUrl: `${env.PUBLIC_APP_URL}/reset/${rawToken}`
    };
  });

  app.post("/reset/accept", async (request, reply) => {
    const body = acceptResetSchema.parse(request.body);
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(body.token) }
    });

    if (!token || token.usedAt || token.expiresAt < new Date()) {
      return reply.code(400).send({ error: "Reset link is invalid or expired" });
    }

    const nextPasswordHash = await hashPassword(body.password);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash: nextPasswordHash }
      });
      await tx.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() }
      });
      await tx.session.deleteMany({ where: { userId: token.userId } });
    });

    return { ok: true };
  });

  app.put("/profile", async (request, reply) => {
    const user = requireUser(request, reply);
    const body = profileSchema.parse(request.body);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: body.displayName,
        avatarUrl: body.avatarUrl ?? null
      }
    });

    return prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        bio: body.bio ?? null
      },
      update: {
        bio: body.bio ?? null
      }
    });
  });

  app.get("/channels", async (request, reply) => {
    requireUser(request, reply);
    return prisma.channel.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
  });

  app.post("/channels", async (request, reply) => {
    requirePermission(request, reply, "channels.manage");
    const body = createChannelSchema.parse(request.body);
    return prisma.channel.create({ data: body });
  });

  app.get("/channels/:id/messages", async (request, reply) => {
    requireUser(request, reply);
    const { id } = request.params as { id: string };
    const query = listMessagesQuerySchema.parse(request.query ?? {});
    const rows = await prisma.message.findMany({
      where: { channelId: id, deletedAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1
          }
        : {}),
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    const next = rows.length > query.limit ? rows.pop() ?? null : null;
    return {
      items: rows.reverse(),
      nextCursor: next?.id ?? null
    };
  });

  app.post("/channels/:id/messages", async (request, reply) => {
    const user = requirePermission(request, reply, "messages.create");
    const { id } = request.params as { id: string };
    const body = createMessageBodySchema.parse(request.body);

    const message = await prisma.message.create({
      data: {
        channelId: id,
        authorId: user.id,
        body: body.body
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    await publishEnvelope(redis, () => {
      redisReady = true;
    }, {
      id: nanoid(),
      topic: "channel",
      action: "message.created",
      resourceId: id,
      actorId: user.id,
      occurredAt: new Date().toISOString(),
      payload: {
        channelId: id,
        message
      }
    }, app.log);

    return message;
  });

  app.patch("/messages/:id", async (request, reply) => {
    const user = requireUser(request, reply);
    const { id } = request.params as { id: string };
    const body = createMessageBodySchema.parse(request.body);
    const existing = await prisma.message.findUnique({ where: { id } });

    if (!existing || existing.deletedAt) return reply.code(404).send({ error: "Message not found" });
    if (existing.authorId !== user.id && user.role === "member") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    return prisma.message.update({
      where: { id },
      data: {
        body: body.body,
        editedAt: new Date()
      }
    });
  });

  app.delete("/messages/:id", async (request, reply) => {
    const user = requireUser(request, reply);
    const { id } = request.params as { id: string };
    const existing = await prisma.message.findUnique({ where: { id } });

    if (!existing || existing.deletedAt) return reply.code(404).send({ error: "Message not found" });
    if (existing.authorId !== user.id && user.role === "member") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    return prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  });

  app.get("/events", async (request, reply) => {
    requireUser(request, reply);
    return prisma.event.findMany({
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      include: {
        rsvps: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarUrl: true }
            }
          }
        }
      }
    });
  });

  app.get("/events/:id", async (request, reply) => {
    requireUser(request, reply);
    const { id } = request.params as { id: string };
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, displayName: true, avatarUrl: true }
        },
        rsvps: {
          include: {
            user: {
              select: { id: true, displayName: true, avatarUrl: true }
            }
          },
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!event) return reply.code(404).send({ error: "Event not found" });
    return event;
  });

  app.post("/events", async (request, reply) => {
    const user = requirePermission(request, reply, "events.create");
    const body = createEventSchema.parse(request.body);
    return prisma.event.create({
      data: {
        organizerId: user.id,
        title: body.title,
        description: body.description ?? null,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt)
      }
    });
  });

  app.patch("/events/:id", async (request, reply) => {
    const user = requireUser(request, reply);
    const { id } = request.params as { id: string };
    const body = updateEventSchema.parse(request.body);
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) return reply.code(404).send({ error: "Event not found" });
    if (event.organizerId !== user.id && user.role === "member") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    return prisma.event.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
        ...(body.startsAt ? { startsAt: new Date(body.startsAt) } : {}),
        ...(body.endsAt ? { endsAt: new Date(body.endsAt) } : {}),
        ...(body.status ? { status: body.status } : {})
      }
    });
  });

  app.post("/events/:id/rsvp", async (request, reply) => {
    const user = requirePermission(request, reply, "rsvps.manage");
    const { id } = request.params as { id: string };
    const body = rsvpSchema.parse(request.body);

    return prisma.rsvp.upsert({
      where: { eventId_userId: { eventId: id, userId: user.id } },
      create: {
        eventId: id,
        userId: user.id,
        status: body.status,
        note: body.note ?? null
      },
      update: {
        status: body.status,
        note: body.note ?? null
      }
    });
  });

  app.get("/availability", async (request, reply) => {
    const user = requireUser(request, reply);
    const slots = await prisma.availabilitySetting.findMany({
      where: { userId: user.id },
      orderBy: [{ day: "asc" }, { hour: "asc" }]
    });

    if (slots.length === 0) {
      const created = buildDefaultAvailability(user.id);
      await prisma.availabilitySetting.createMany({ data: created });
      return {
        timezone: "America/New_York",
        startHourEt: 19,
        slotMinutes: 60,
        slots: created
      };
    }

    return {
      timezone: "America/New_York",
      startHourEt: 19,
      slotMinutes: 60,
      slots: slots.map((slot) => ({
        day: slot.day,
        hour: slot.hour,
        available: slot.available
      }))
    };
  });

  app.put("/availability", async (request, reply) => {
    const user = requirePermission(request, reply, "availability.manage");
    const body = updateAvailabilitySchema.parse(request.body);

    await prisma.$transaction(async (tx) => {
      await tx.availabilitySetting.deleteMany({ where: { userId: user.id } });
      await tx.availabilitySetting.createMany({
        data: body.slots.map((slot) => ({
          userId: user.id,
          day: slot.day,
          hour: slot.hour,
          available: slot.available
        }))
      });
    });

    return {
      timezone: "America/New_York",
      startHourEt: 19,
      slotMinutes: 60,
      slots: body.slots
    };
  });

  return app;
}

async function publishEnvelope(
  redis: Redis,
  markReady: () => void,
  envelope: {
    id: string;
    topic: string;
    action: string;
    resourceId: string;
    actorId?: string;
    occurredAt: string;
    payload: unknown;
  },
  log: { warn: (payload: unknown, message: string) => void }
) {
  try {
    if (redis.status === "wait") {
      await redis.connect();
      markReady();
    }

    await redis.publish("sandcastle:events", JSON.stringify(envelope));
  } catch (error) {
    log.warn({ err: error, envelope }, "Failed to publish realtime envelope after durable write");
  }
}

function buildDefaultAvailability(userId: string) {
  return availabilityDays.flatMap((day) =>
    availabilityHours.map((hour) => ({
      userId,
      day,
      hour,
      available: false
    }))
  );
}
