import crypto from "node:crypto";
import { availabilityDays, availabilityHours } from "@sandcastle/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testUser = {
  id: "cm00000000000000000000001",
  email: "owner@example.com",
  displayName: "Owner User",
  avatarUrl: null,
  role: "owner",
  passwordHash: null,
  emailVerifiedAt: new Date("2026-06-24T00:00:00.000Z"),
  createdAt: new Date("2026-06-24T00:00:00.000Z"),
  updatedAt: new Date("2026-06-24T00:00:00.000Z")
};

const loginUser = {
  ...testUser,
  passwordHash: "hashed:correct horse battery staple"
};

const inviteToken = "generated-test-token";
const inviteTokenHash = crypto.createHash("sha256").update(inviteToken).digest("hex");
const futureDate = new Date("2026-07-01T12:00:00.000Z");
const futureDateIso = futureDate.toISOString();

const inviteRecord = {
  id: "cm00000000000000000000010",
  tokenHash: inviteTokenHash,
  email: "guest@example.com",
  createdBy: testUser.id,
  acceptedBy: null,
  expiresAt: futureDate,
  acceptedAt: null,
  createdAt: new Date("2026-06-24T00:00:00.000Z")
};

const resetTargetUser = {
  id: "cm00000000000000000000011",
  email: "reset@example.com",
  displayName: "Reset Target",
  avatarUrl: null,
  role: "member",
  passwordHash: "hashed:old-password",
  emailVerifiedAt: new Date("2026-06-24T00:00:00.000Z"),
  createdAt: new Date("2026-06-24T00:00:00.000Z"),
  updatedAt: new Date("2026-06-24T00:00:00.000Z")
};

const resetRecord = {
  id: "cm00000000000000000000012",
  tokenHash: inviteTokenHash,
  userId: resetTargetUser.id,
  createdBy: testUser.id,
  expiresAt: futureDate,
  usedAt: null,
  createdAt: new Date("2026-06-24T00:00:00.000Z")
};

const currentProfile = {
  userId: testUser.id,
  bio: "Keep it simple",
  timezone: "America/New_York",
  updatedAt: new Date("2026-06-24T00:00:00.000Z")
};

const prismaMock = vi.hoisted(() => ({
  session: {
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn()
  },
  user: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn()
  },
  userProfile: {
    upsert: vi.fn()
  },
  invite: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  passwordResetToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn()
  },
  availabilitySetting: {
    createMany: vi.fn(),
    findMany: vi.fn()
  },
  message: {
    create: vi.fn()
  },
  rsvp: {
    upsert: vi.fn()
  },
  $transaction: vi.fn()
}));

const bcryptCompareMock = vi.hoisted(() => vi.fn());
const bcryptHashMock = vi.hoisted(() => vi.fn());
const nanoidMock = vi.hoisted(() => vi.fn(() => inviteToken));
const redisPublishMock = vi.hoisted(() => vi.fn());
const redisConnectMock = vi.hoisted(() => vi.fn());
const redisQuitMock = vi.hoisted(() => vi.fn());
const redisDisconnectMock = vi.hoisted(() => vi.fn());

vi.mock("@sandcastle/db", () => ({
  prisma: prismaMock
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: bcryptCompareMock,
    hash: bcryptHashMock
  }
}));

vi.mock("nanoid", () => ({
  nanoid: nanoidMock
}));

vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({
    status: "ready",
    on: vi.fn(),
    connect: redisConnectMock,
    publish: redisPublishMock,
    quit: redisQuitMock,
    disconnect: redisDisconnectMock
  }))
}));

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

async function createApp() {
  const { buildApp } = await import("./app");
  return buildApp();
}

describe("buildApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    bcryptCompareMock.mockResolvedValue(true);
    bcryptHashMock.mockImplementation(async (value: string) => `hashed:${value}`);
    nanoidMock.mockReturnValue(inviteToken);

    redisConnectMock.mockResolvedValue(undefined);
    redisPublishMock.mockResolvedValue(1);
    redisQuitMock.mockResolvedValue("OK");
    redisDisconnectMock.mockReturnValue(undefined);

    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock as never));
    prismaMock.session.findUnique.mockResolvedValue({
      user: testUser,
      expiresAt: new Date(Date.now() + 60_000)
    });
    prismaMock.session.create.mockResolvedValue({ id: "session" });
    prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });

    prismaMock.user.findUnique.mockImplementation(async ({ where }: { where: { email?: string; id?: string } }) => {
      if (where.email === loginUser.email) return loginUser;
      if (where.id === resetTargetUser.id) return resetTargetUser;
      return null;
    });
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      ...testUser,
      profile: currentProfile
    });
    prismaMock.user.create.mockResolvedValue({
      id: "cm00000000000000000000013",
      email: "new@example.com",
      displayName: "New User",
      avatarUrl: null,
      role: "member"
    });
    prismaMock.user.update.mockResolvedValue({
      ...resetTargetUser,
      passwordHash: "hashed:new-password"
    });
    prismaMock.user.findMany.mockResolvedValue([]);

    prismaMock.userProfile.upsert.mockResolvedValue(currentProfile);
    prismaMock.invite.create.mockResolvedValue({
      id: inviteRecord.id,
      tokenHash: inviteRecord.tokenHash
    });
    prismaMock.invite.findUnique.mockImplementation(async ({ where }: { where: { tokenHash: string } }) =>
      where.tokenHash === inviteTokenHash ? inviteRecord : null
    );
    prismaMock.invite.update.mockResolvedValue({
      ...inviteRecord,
      acceptedBy: "cm00000000000000000000013",
      acceptedAt: new Date("2026-06-24T00:00:00.000Z")
    });
    prismaMock.passwordResetToken.create.mockResolvedValue({
      id: resetRecord.id,
      tokenHash: resetRecord.tokenHash
    });
    prismaMock.passwordResetToken.findUnique.mockImplementation(async ({ where }: { where: { tokenHash: string } }) =>
      where.tokenHash === inviteTokenHash ? resetRecord : null
    );
    prismaMock.passwordResetToken.update.mockResolvedValue({
      ...resetRecord,
      usedAt: new Date("2026-06-24T00:00:00.000Z")
    });
    prismaMock.availabilitySetting.createMany.mockResolvedValue({ count: 28 });
    prismaMock.availabilitySetting.findMany.mockResolvedValue([]);
  });

  it("returns 400 for invalid JSON bodies instead of surfacing a server error", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/channels/cm00000000000000000000002/messages",
      cookies: { session: "valid-session" },
      payload: { body: "" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "Invalid request" });

    await app.close();
  });

  it("creates channel messages from the route id and body payload", async () => {
    const message = {
      id: "cm00000000000000000000003",
      channelId: "cm00000000000000000000002",
      authorId: testUser.id,
      body: "See you tonight",
      deletedAt: null,
      editedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: {
        id: testUser.id,
        displayName: testUser.displayName,
        avatarUrl: testUser.avatarUrl
      }
    };
    prismaMock.message.create.mockResolvedValue(message);

    const app = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/channels/cm00000000000000000000002/messages",
      cookies: { session: "valid-session" },
      payload: { body: "See you tonight" }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          channelId: "cm00000000000000000000002",
          authorId: testUser.id,
          body: "See you tonight"
        }
      })
    );
    expect(redisPublishMock).toHaveBeenCalledWith("sandcastle:events", expect.any(String));

    await app.close();
  });

  it("accepts RSVP status from the body while using the route event id", async () => {
    prismaMock.rsvp.upsert.mockResolvedValue({
      eventId: "cm00000000000000000000004",
      userId: testUser.id,
      status: "going",
      note: null,
      updatedAt: new Date()
    });

    const app = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/events/cm00000000000000000000004/rsvp",
      cookies: { session: "valid-session" },
      payload: { status: "going" }
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMock.rsvp.upsert).toHaveBeenCalledWith({
      where: {
        eventId_userId: {
          eventId: "cm00000000000000000000004",
          userId: testUser.id
        }
      },
      create: {
        eventId: "cm00000000000000000000004",
        userId: testUser.id,
        status: "going",
        note: null
      },
      update: {
        status: "going",
        note: null
      }
    });

    await app.close();
  });

  it("logs in, reads the session-backed profile, and logs out cleanly", async () => {
    const app = await createApp();

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: loginUser.email,
        password: "correct horse battery staple"
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.json()).toMatchObject({ ok: true });
    expect(prismaMock.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: loginUser.id,
          token: crypto.createHash("sha256").update(inviteToken).digest("hex")
        })
      })
    );

    const meResponse = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { session: "valid-session" }
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json()).toMatchObject({
      user: {
        id: testUser.id,
        email: testUser.email,
        displayName: testUser.displayName,
        avatarUrl: testUser.avatarUrl,
        role: testUser.role
      },
      profile: {
        ...currentProfile,
        updatedAt: currentProfile.updatedAt.toISOString()
      }
    });

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: { session: "valid-session" }
    });

    expect(logoutResponse.statusCode).toBe(200);
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: {
        token: crypto.createHash("sha256").update("valid-session").digest("hex")
      }
    });

    await app.close();
  });

  it("creates and looks up invites for authorized users", async () => {
    const app = await createApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/invites",
      cookies: { session: "valid-session" },
      payload: {
        email: "guest@example.com",
        expiresAt: futureDateIso
      }
    });

    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.json()).toMatchObject({
      inviteUrl: `http://localhost:3000/invite/${inviteToken}`
    });
    expect(prismaMock.invite.create).toHaveBeenCalledWith({
      data: {
        tokenHash: inviteTokenHash,
        email: "guest@example.com",
        expiresAt: futureDate,
        createdBy: testUser.id
      }
    });

    const lookupResponse = await app.inject({
      method: "GET",
      url: `/invites/${inviteToken}`
    });

    expect(lookupResponse.statusCode).toBe(200);
    expect(lookupResponse.json()).toMatchObject({
      email: "guest@example.com",
      expiresAt: futureDateIso
    });

    await app.close();
  });

  it("accepts invites and seeds the new user session", async () => {
    const createdUser = {
      id: "cm00000000000000000000013",
      email: "guest@example.com",
      displayName: "Guest User",
      avatarUrl: null,
      role: "member"
    };
    prismaMock.user.create.mockResolvedValue(createdUser);

    const app = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/invites/accept",
      payload: {
        token: inviteToken,
        email: "guest@example.com",
        password: "correct horse battery staple",
        displayName: "Guest User"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: "guest@example.com",
        displayName: "Guest User",
        passwordHash: "hashed:correct horse battery staple",
        emailVerifiedAt: expect.any(Date),
        profile: {
          create: {}
        }
      }
    });
    expect(prismaMock.invite.update).toHaveBeenCalledWith({
      where: { id: inviteRecord.id },
      data: {
        acceptedBy: createdUser.id,
        acceptedAt: expect.any(Date)
      }
    });
    expect(prismaMock.availabilitySetting.createMany).toHaveBeenCalledWith({
      data: buildDefaultAvailability(createdUser.id)
    });
    expect(prismaMock.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: createdUser.id,
        token: inviteTokenHash
      })
    });

    await app.close();
  });

  it("creates reset links and applies password resets", async () => {
    const app = await createApp();

    const createResponse = await app.inject({
      method: "POST",
      url: "/reset-links",
      cookies: { session: "valid-session" },
      payload: {
        userId: resetTargetUser.id
      }
    });

    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.json()).toMatchObject({
      resetUrl: `http://localhost:3000/reset/${inviteToken}`
    });
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        tokenHash: inviteTokenHash,
        userId: resetTargetUser.id,
        createdBy: testUser.id,
        expiresAt: expect.any(Date)
      }
    });

    const acceptResponse = await app.inject({
      method: "POST",
      url: "/reset/accept",
      payload: {
        token: inviteToken,
        password: "new-reset-password"
      }
    });

    expect(acceptResponse.statusCode).toBe(200);
    expect(acceptResponse.json()).toMatchObject({ ok: true });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: resetTargetUser.id },
      data: {
        passwordHash: "hashed:new-reset-password"
      }
    });
    expect(prismaMock.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: resetRecord.id },
      data: {
        usedAt: expect.any(Date)
      }
    });
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: resetTargetUser.id
      }
    });

    await app.close();
  });
});
