"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, REALTIME_URL, type Channel, type Message, type MessagePage, type SessionResponse } from "../../../lib/api";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { Badge, Button, EmptyState } from "../../../components/ui";

export default function ChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  const router = useRouter();
  const [channelId, setChannelId] = useState("");
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    void params.then(({ channelId: nextChannelId }) => setChannelId(nextChannelId));
  }, [params]);

  useEffect(() => {
    if (!channelId) return;
    void (async () => {
      try {
        const [nextSession, channels, page] = await Promise.all([
          apiFetch<SessionResponse>("/auth/me"),
          apiFetch<Channel[]>("/channels"),
          apiFetch<MessagePage>(`/channels/${channelId}/messages`)
        ]);
        setSession(nextSession);
        setCurrentChannel(channels.find((entry) => entry.id === channelId) ?? null);
        setMessages(page.items);
        setNextCursor(page.nextCursor);
      } catch (nextError) {
        if ((nextError as Error).message.includes("Authentication")) {
          router.replace("/login");
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Unable to load channel");
      }
    })();
  }, [channelId, router]);

  useEffect(() => {
    if (!channelId) return;
    const socket = new WebSocket(REALTIME_URL);
    socketRef.current = socket;
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "subscribe", topic: "channel", resourceId: channelId }));
    });
    socket.addEventListener("message", (event) => {
      const envelope = JSON.parse(event.data) as { action?: string; payload?: { message?: Message } };
      const incomingMessage = envelope.payload?.message;
      if (envelope.action === "message.created" && incomingMessage) {
        setMessages((current) => [...current, incomingMessage]);
      }
    });
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [channelId]);

  async function loadOlder() {
    if (!nextCursor || !channelId) return;
    const page = await apiFetch<MessagePage>(`/channels/${channelId}/messages?cursor=${nextCursor}`);
    setMessages((current) => [...page.items, ...current]);
    setNextCursor(page.nextCursor);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!channelId) return;
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await apiFetch(`/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: formData.get("body")
        })
      });
      form.reset();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send message");
    } finally {
      setPending(false);
    }
  }

  const messagesByDay = groupMessagesByDay(messages);

  if (!session) {
    return <main className="p-8 text-ink-muted">{error ?? "Loading channel..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="channels" activeChannelId={channelId}>
      <div className="flex h-[calc(100vh-6.5rem)] flex-col rounded-lg border border-border bg-surface">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-ink">#{currentChannel?.name ?? "Channel"}</h2>
              {currentChannel?.isDefault ? <Badge tone="accent">Default</Badge> : null}
            </div>
            <p className="truncate text-sm text-ink-muted">{currentChannel?.topic ?? "Private group conversation"}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {nextCursor ? (
            <button
              className="mb-4 rounded-md border border-border-strong px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-border-strong hover:text-ink"
              onClick={() => void loadOlder()}
              type="button"
            >
              Load older messages
            </button>
          ) : null}

          {messages.length ? (
            <div className="space-y-5">
              {messagesByDay.map(([dateLabel, dayMessages]) => (
                <div key={dateLabel}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] uppercase tracking-[0.08em] text-ink-subtle">{dateLabel}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-3">
                    {dayMessages.map((message) => {
                      const isSelf = message.authorId === session.user.id;
                      return (
                        <article key={message.id} className="flex gap-3">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-raised text-xs font-semibold text-ink">
                            {(isSelf ? session.user.displayName : message.author?.displayName ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium text-ink">
                                {isSelf ? "You" : message.author?.displayName ?? "Member"}
                              </span>
                              <span className="text-xs text-ink-subtle">
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink">{message.body}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No messages yet" description="Start the conversation in this room." />
          )}
        </div>

        <form className="shrink-0 border-t border-border px-5 py-4" onSubmit={onSubmit}>
          <div className="flex items-end gap-3">
            <textarea
              className="min-h-[44px] w-full resize-none rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
              name="body"
              placeholder={`Message #${currentChannel?.name ?? "channel"}`}
              rows={1}
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Sending..." : "Send"}
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        </form>
      </div>
    </WorkspaceShell>
  );
}

function groupMessagesByDay(messages: Message[]) {
  const grouped = new Map<string, Message[]>();
  for (const message of messages) {
    const label = new Date(message.createdAt).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
    const current = grouped.get(label);
    if (current) current.push(message);
    else grouped.set(label, [message]);
  }
  return Array.from(grouped.entries());
}
