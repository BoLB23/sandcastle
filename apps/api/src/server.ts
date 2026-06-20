import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { prisma } from "@sandcastle/db";
import {
  availabilityResponseSchema,
  createAvailabilityScheduleSchema,
  createChannelSchema,
  createEventSchema,
  createMessageSchema,
  createPollSchema,
  inviteAcceptSchema,
  profileSchema,
  rankAvailabilityWindows,
  rsvpSchema,
  voteSchema
} from "@sandcastle/shared";
import { env } from "./env";
import { createPasswordSession, createSession, hashPassword, registerAuth, requireUser } from "./auth";
import { nanoid } from "nanoid";
import crypto from "node:crypto";
import { z } from "zod";

const app = Fastify({ logger: true });

await app.register(cors, { origin: env.PUBLIC_APP_URL, credentials: true });
await app.register(cookie, { secret: env.AUTH_SECRET });
await app.register(multipart);
await registerAuth(app);

app.get("/healthz", async () => ({ ok: true, service: "api" }));

app.post("/auth/login", async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  if (!body.email || !body.password) return reply.code(400).send({ error: "Email and password are required" });
  const session = await createPasswordSession(reply, body.email.toLowerCase(), body.password);
  if (!session) return reply.code(401).send({ error: "Invalid login" });
  return { ok: true };
});

app.post("/auth/logout", async (request, reply) => {
  const token = request.cookies.session;
  if (token) await prisma.session.deleteMany({ where: { token } });
  reply.clearCookie("session", { path: "/" });
  return { ok: true };
});

app.get("/auth/google/start", async (_request, reply) => {
  if (!env.GOOGLE_CLIENT_ID) return reply.code(501).send({ error: "Google OAuth is not configured" });
  const state = nanoid(32);
  reply.setCookie("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600
  });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.PUBLIC_APP_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account"
  });
  return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get("/auth/google/callback", async (request, reply) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return reply.code(501).send({ error: "Google OAuth is not configured" });
  }
  const query = request.query as { code?: string; state?: string };
  if (!query.code || query.state !== request.cookies.google_oauth_state) {
    return reply.code(400).send({ error: "Invalid Google OAuth callback" });
  }
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code: query.code,
      grant_type: "authorization_code",
      redirect_uri: `${env.PUBLIC_APP_URL}/api/auth/google/callback`
    })
  });
  if (!tokenResponse.ok) return reply.code(401).send({ error: "Google token exchange failed" });
  const tokenJson = (await tokenResponse.json()) as { access_token: string; expires_in?: number };
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${tokenJson.access_token}` }
  });
  if (!profileResponse.ok) return reply.code(401).send({ error: "Google profile lookup failed" });
  const googleProfile = (await profileResponse.json()) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };
  const email = googleProfile.email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const invite = await prisma.invite.findFirst({
      where: { email, acceptedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
    });
    if (!invite) return reply.code(403).send({ error: "Google account is not invited" });
    user = await prisma.user.create({
      data: {
        email,
        displayName: googleProfile.name ?? email.split("@")[0],
        avatarUrl: googleProfile.picture,
        emailVerifiedAt: new Date(),
        profile: { create: {} },
        notificationPrefs: { create: {} }
      }
    });
    await prisma.invite.update({ where: { id: invite.id }, data: { acceptedBy: user.id, acceptedAt: new Date() } });
  }
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: googleProfile.sub } },
    create: {
      userId: user.id,
      provider: "google",
      providerAccountId: googleProfile.sub,
      accessToken: tokenJson.access_token,
      expiresAt: tokenJson.expires_in ? Math.floor(Date.now() / 1000) + tokenJson.expires_in : null
    },
    update: {
      accessToken: tokenJson.access_token,
      expiresAt: tokenJson.expires_in ? Math.floor(Date.now() / 1000) + tokenJson.expires_in : null
    }
  });
  await createSession(reply, user.id);
  reply.clearCookie("google_oauth_state", { path: "/" });
  return reply.redirect(env.PUBLIC_APP_URL);
});

app.get("/auth/me", async (request, reply) => {
  const user = requireUser(request, reply);
  return prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, displayName: true, avatarUrl: true, role: true, profile: true, notificationPrefs: true }
  });
});

app.post("/invites", async (request, reply) => {
  const user = requireUser(request, reply);
  const body = request.body as { email?: string; expiresAt?: string };
  const rawToken = nanoid(40);
  const tokenHash = hashToken(rawToken);
  await prisma.invite.create({
    data: {
      tokenHash,
      email: body.email?.toLowerCase(),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdBy: user.id
    }
  });
  return { inviteUrl: `${env.PUBLIC_APP_URL}/invite/${rawToken}` };
});

app.post("/invites/accept", async (request, reply) => {
  const body = inviteAcceptSchema.extend({
    email: z.string().email(),
    password: z.string().min(8).max(128)
  }).parse(request.body);
  const invite = await prisma.invite.findUnique({ where: { tokenHash: hashToken(body.token) } });
  if (!invite || invite.acceptedAt || (invite.expiresAt && invite.expiresAt < new Date())) {
    return reply.code(400).send({ error: "Invite is invalid or expired" });
  }
  const email = body.email.toLowerCase();
  if (invite.email && invite.email !== email) {
    return reply.code(403).send({ error: "Invite is restricted to a different email address" });
  }
  const passwordHash = await hashPassword(body.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        displayName: body.displayName,
        passwordHash,
        profile: { create: {} },
        notificationPrefs: { create: {} }
      }
    });
    await tx.invite.update({ where: { id: invite.id }, data: { acceptedBy: created.id, acceptedAt: new Date() } });
    return created;
  });
  await createSession(reply, user.id);
  return { ok: true };
});

app.put("/profile", async (request, reply) => {
  const user = requireUser(request, reply);
  const body = profileSchema.parse(request.body);
  await prisma.user.update({
    where: { id: user.id },
    data: { displayName: body.displayName, avatarUrl: body.avatarUrl }
  });
  return prisma.userProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      gamertag: body.gamertag,
      favoriteGames: body.favoriteGames,
      typicalPlayTimes: body.typicalPlayTimes
    },
    update: {
      gamertag: body.gamertag,
      favoriteGames: body.favoriteGames,
      typicalPlayTimes: body.typicalPlayTimes
    }
  });
});

app.get("/channels", async (request, reply) => {
  requireUser(request, reply);
  return prisma.channel.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
});

app.post("/channels", async (request, reply) => {
  requireUser(request, reply);
  const body = createChannelSchema.parse(request.body);
  return prisma.channel.create({ data: body });
});

app.get("/channels/:id/messages", async (request, reply) => {
  requireUser(request, reply);
  const { id } = request.params as { id: string };
  return prisma.message.findMany({
    where: { channelId: id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, displayName: true, avatarUrl: true } }, reactions: true, pins: true, attachments: true }
  });
});

app.post("/messages", async (request, reply) => {
  const user = requireUser(request, reply);
  const body = createMessageSchema.parse(request.body);
  const message = await prisma.message.create({
    data: {
      channelId: body.channelId,
      authorId: user.id,
      body: body.body,
      attachments: body.attachmentIds.length ? { connect: body.attachmentIds.map((id) => ({ id })) } : undefined
    }
  });
  if (body.parentMessageId) {
    const thread = await prisma.thread.upsert({
      where: { rootMessageId: body.parentMessageId },
      create: { rootMessageId: body.parentMessageId },
      update: {}
    });
    await prisma.threadReply.create({ data: { threadId: thread.id, messageId: message.id } });
  }
  return message;
});

app.patch("/messages/:id", async (request, reply) => {
  const user = requireUser(request, reply);
  const { id } = request.params as { id: string };
  const body = request.body as { body?: string };
  const nextBody = body.body?.trim();
  if (!nextBody) return reply.code(400).send({ error: "Body is required" });
  const existing = await prisma.message.findUnique({ where: { id }, select: { authorId: true, deletedAt: true } });
  if (!existing || existing.deletedAt) return reply.code(404).send({ error: "Message not found" });
  if (!canManageMessage(user, existing.authorId)) return reply.code(403).send({ error: "You cannot edit this message" });
  const message = await prisma.$transaction(async (tx) => {
    const updated = await tx.message.update({ where: { id }, data: { body: nextBody, editedAt: new Date() } });
    await tx.messageEdit.create({ data: { messageId: id, editorId: user.id, body: nextBody } });
    return updated;
  });
  return message;
});

app.delete("/messages/:id", async (request, reply) => {
  const user = requireUser(request, reply);
  const { id } = request.params as { id: string };
  const existing = await prisma.message.findUnique({ where: { id }, select: { authorId: true, deletedAt: true } });
  if (!existing || existing.deletedAt) return reply.code(404).send({ error: "Message not found" });
  if (!canManageMessage(user, existing.authorId)) return reply.code(403).send({ error: "You cannot delete this message" });
  return prisma.message.update({ where: { id }, data: { deletedAt: new Date() } });
});

app.post("/polls", async (request, reply) => {
  const user = requireUser(request, reply);
  const body = createPollSchema.parse(request.body);
  return prisma.poll.create({
    data: {
      channelId: body.channelId,
      eventId: body.eventId,
      creatorId: user.id,
      title: body.title,
      description: body.description,
      type: body.type,
      anonymous: body.anonymous,
      deadline: body.deadline ? new Date(body.deadline) : null,
      options: { create: body.options.map((label, sortOrder) => ({ label, sortOrder })) }
    },
    include: { options: true }
  });
});

app.post("/votes", async (request, reply) => {
  const user = requireUser(request, reply);
  const body = voteSchema.parse(request.body);
  return prisma.vote.upsert({
    where: { pollId_userId: { pollId: body.pollId, userId: user.id } },
    create: {
      pollId: body.pollId,
      userId: user.id,
      options: {
        create: body.optionIds.map((optionId, index) => ({
          optionId,
          rank: body.rankedOptionIds?.indexOf(optionId) ?? index
        }))
      }
    },
    update: {
      options: {
        deleteMany: {},
        create: body.optionIds.map((optionId, index) => ({
          optionId,
          rank: body.rankedOptionIds?.indexOf(optionId) ?? index
        }))
      }
    },
    include: { options: true }
  });
});

app.post("/events", async (request, reply) => {
  const user = requireUser(request, reply);
  const body = createEventSchema.parse(request.body);
  return prisma.event.create({
    data: {
      organizerId: user.id,
      title: body.title,
      description: body.description,
      proposedTimes: { create: body.proposedTimes.map((time) => ({ startsAt: new Date(time.startsAt), endsAt: new Date(time.endsAt) })) }
    },
    include: { proposedTimes: true, rsvps: true }
  });
});

app.post("/rsvps", async (request, reply) => {
  const user = requireUser(request, reply);
  const body = rsvpSchema.parse(request.body);
  return prisma.rsvp.upsert({
    where: { eventId_userId: { eventId: body.eventId, userId: user.id } },
    create: { eventId: body.eventId, userId: user.id, status: body.status, note: body.note },
    update: { status: body.status, note: body.note }
  });
});

app.post("/availability", async (request, reply) => {
  const user = requireUser(request, reply);
  const body = createAvailabilityScheduleSchema.parse(request.body);
  const weekStart = new Date(body.weekStartsOn);
  const slots = buildWeekSlots(weekStart, body.slotMinutes);
  return prisma.availabilitySchedule.create({
    data: {
      creatorId: user.id,
      title: body.title,
      weekStartsOn: weekStart,
      slotMinutes: body.slotMinutes,
      slots: { create: slots }
    },
    include: { slots: true }
  });
});

app.post("/availability/responses", async (request, reply) => {
  const user = requireUser(request, reply);
  const body = availabilityResponseSchema.parse(request.body);
  const response = await prisma.availabilityResponse.upsert({
    where: { scheduleId_userId: { scheduleId: body.scheduleId, userId: user.id } },
    create: {
      scheduleId: body.scheduleId,
      userId: user.id,
      slots: { create: body.slotIds.map((slotId) => ({ slotId })) }
    },
    update: {
      submittedAt: new Date(),
      slots: { deleteMany: {}, create: body.slotIds.map((slotId) => ({ slotId })) }
    }
  });
  await recomputeRecommendations(body.scheduleId);
  return response;
});

app.get("/availability/:id/recommendations", async (request, reply) => {
  requireUser(request, reply);
  const { id } = request.params as { id: string };
  return prisma.availabilityRecommendation.findMany({ where: { scheduleId: id }, orderBy: [{ availableCount: "desc" }, { score: "desc" }] });
});

app.get("/notifications", async (request, reply) => {
  const user = requireUser(request, reply);
  return prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
});

async function recomputeRecommendations(scheduleId: string) {
  const schedule = await prisma.availabilitySchedule.findUnique({
    where: { id: scheduleId },
    include: { slots: true, responses: { include: { slots: true } } }
  });
  if (!schedule) return;
  const users = await prisma.user.findMany({ select: { id: true } });
  const ranked = rankAvailabilityWindows(
    schedule.slots,
    schedule.responses.map((response) => ({ userId: response.userId, slotIds: response.slots.map((slot) => slot.slotId) })),
    users.map((u) => u.id),
    5
  );
  await prisma.availabilityRecommendation.deleteMany({ where: { scheduleId } });
  await prisma.availabilityRecommendation.createMany({
    data: ranked.map((window) => ({
      scheduleId,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      availableCount: window.availableUserIds.length,
      totalCount: users.length,
      availableIds: window.availableUserIds,
      score: window.score
    }))
  });
}

function buildWeekSlots(weekStart: Date, slotMinutes: number) {
  const slots: { startsAt: Date; endsAt: Date }[] = [];
  for (let day = 0; day < 7; day += 1) {
    for (const hour of [19, 20, 21, 22]) {
      const startsAt = new Date(weekStart);
      startsAt.setDate(weekStart.getDate() + day);
      startsAt.setHours(hour, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + slotMinutes * 60 * 1000);
      slots.push({ startsAt, endsAt });
    }
  }
  return slots;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function canManageMessage(user: { id: string; role: string }, authorId: string) {
  return user.id === authorId || user.role === "owner" || user.role === "admin";
}

await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
