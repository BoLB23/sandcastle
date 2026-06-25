import { describe, expect, it, vi } from "vitest";
import type { RealtimeEnvelope } from "@sandcastle/shared";
import { applySubscriptionMessage, fanoutToClients } from "./server";

function createEnvelope(): RealtimeEnvelope {
  return {
    id: "evt_123",
    topic: "channel",
    action: "message.created",
    resourceId: "channel-1",
    actorId: "user-1",
    occurredAt: "2026-06-24T00:00:00.000Z",
    payload: { body: "hello" }
  };
}

function createClient() {
  return {
    subscriptions: new Set<string>(),
    isOpen: true,
    send: vi.fn<(raw: string) => void>()
  };
}

describe("realtime subscriptions", () => {
  it("fans out a channel message to two subscribed clients", () => {
    const firstClient = createClient();
    const secondClient = createClient();

    applySubscriptionMessage(
      firstClient.subscriptions,
      JSON.stringify({ type: "subscribe", topic: "channel", resourceId: "channel-1" })
    );
    applySubscriptionMessage(
      secondClient.subscriptions,
      JSON.stringify({ type: "subscribe", topic: "channel", resourceId: "channel-1" })
    );

    const envelope = createEnvelope();
    fanoutToClients([firstClient, secondClient], envelope);

    expect(firstClient.send).toHaveBeenCalledWith(JSON.stringify(envelope));
    expect(secondClient.send).toHaveBeenCalledWith(JSON.stringify(envelope));
  });

  it("does not fan out a channel message to unsubscribed clients", () => {
    const unsubscribedClient = createClient();
    const subscribedThenRemovedClient = createClient();

    applySubscriptionMessage(
      subscribedThenRemovedClient.subscriptions,
      JSON.stringify({ type: "subscribe", topic: "channel", resourceId: "channel-1" })
    );
    applySubscriptionMessage(
      subscribedThenRemovedClient.subscriptions,
      JSON.stringify({ type: "unsubscribe", topic: "channel", resourceId: "channel-1" })
    );

    fanoutToClients([unsubscribedClient, subscribedThenRemovedClient], createEnvelope());

    expect(unsubscribedClient.send).not.toHaveBeenCalled();
    expect(subscribedThenRemovedClient.send).not.toHaveBeenCalled();
  });
});
