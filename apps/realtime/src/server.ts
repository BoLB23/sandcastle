import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import Redis from "ioredis";
import { nanoid } from "nanoid";
import { prisma } from "@sandcastle/db";
import { realtimeEnvelopeSchema, type RealtimeEnvelope, type RealtimeTopic } from "@sandcastle/shared";
import { env } from "./env";
import crypto from "node:crypto";

type Client = {
  socket: WebSocket;
  userId: string;
  subscriptions: Set<string>;
};

const clients = new Map<WebSocket, Client>();
const publisher = createRedisClient("publisher");
const subscriber = createRedisClient("subscriber");

const server = http.createServer((request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "realtime", connections: clients.size }));
    return;
  }
  response.writeHead(404);
  response.end();
});

const wss = new WebSocketServer({ server, path: "/ws" });

await connectRedis();
subscriber.on("message", (_channel: string, raw: string) => {
  const parsed = realtimeEnvelopeSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return;
  fanout(parsed.data);
});

wss.on("connection", async (socket, request) => {
  const urlToken = new URL(request.url ?? "", "http://localhost").searchParams.get("token");
  const token = getCookie(request.headers.cookie, "session") ?? urlToken;
  const session = token
    ? await prisma.session.findUnique({ where: { token: hashToken(token) }, include: { user: true } })
    : null;

  if (!session || session.expiresAt < new Date()) {
    socket.close(1008, "unauthorized");
    return;
  }

  const client: Client = { socket, userId: session.userId, subscriptions: new Set() };
  clients.set(socket, client);
  void publish("presence", "user.online", session.userId, session.userId, {
    userId: session.userId,
    displayName: session.user.displayName
  });

  socket.on("message", (raw) => handleClientMessage(client, raw.toString()));
  socket.on("close", () => {
    clients.delete(socket);
    void publish("presence", "user.offline", session.userId, session.userId, { userId: session.userId });
  });
});

function handleClientMessage(client: Client, raw: string) {
  const message = JSON.parse(raw) as { type?: string; topic?: RealtimeTopic; resourceId?: string };
  if (message.type === "subscribe" && message.topic && message.resourceId) {
    client.subscriptions.add(`${message.topic}:${message.resourceId}`);
    client.socket.send(JSON.stringify({ type: "subscribed", topic: message.topic, resourceId: message.resourceId }));
  }
  if (message.type === "unsubscribe" && message.topic && message.resourceId) {
    client.subscriptions.delete(`${message.topic}:${message.resourceId}`);
  }
}

function fanout(envelope: RealtimeEnvelope) {
  const key = `${envelope.topic}:${envelope.resourceId}`;
  for (const client of clients.values()) {
    const shouldSend =
      client.subscriptions.has(key) || envelope.topic === "presence";
    if (shouldSend && client.socket.readyState === client.socket.OPEN) {
      client.socket.send(JSON.stringify(envelope));
    }
  }
}

export async function publish(topic: RealtimeTopic, action: string, resourceId: string, actorId: string | undefined, payload: unknown) {
  const envelope: RealtimeEnvelope = {
    id: nanoid(),
    topic,
    action,
    resourceId,
    actorId,
    occurredAt: new Date().toISOString(),
    payload
  };
  await publisher.publish("sandcastle:events", JSON.stringify(envelope));
}

server.listen(env.REALTIME_PORT, "0.0.0.0", () => {
  console.log(`realtime listening on ${env.REALTIME_PORT}`);
});

function createRedisClient(name: string) {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy(times) {
      return times < 5 ? Math.min(times * 200, 1000) : null;
    }
  });

  client.on("error", (error) => {
    console.error(`[realtime:${name}:redis] ${error.message}`);
  });

  return client;
}

async function connectRedis() {
  try {
    await Promise.all([publisher.connect(), subscriber.connect()]);
    await subscriber.subscribe("sandcastle:events");
  } catch (error) {
    console.error("Failed to initialize realtime Redis connections");
    throw error;
  }
}

function getCookie(header: string | undefined, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rawValue.join("="));
  }
  return undefined;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
