"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, REALTIME_URL, type Channel, type Message, type MessagePage, type SessionResponse } from "../../../lib/api";
import { WorkspaceShell } from "../../../components/workspace-shell";

export default function ChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  const router = useRouter();
  const [channelId, setChannelId] = useState("");
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
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
        const [nextSession, nextChannels, page] = await Promise.all([
          apiFetch<SessionResponse>("/auth/me"),
          apiFetch<Channel[]>("/channels"),
          apiFetch<MessagePage>(`/channels/${channelId}/messages`)
        ]);
        setSession(nextSession);
        setChannels(nextChannels);
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

  const currentChannel = channels.find((channel) => channel.id === channelId);
  const messagesByDay = groupMessagesByDay(messages);

  if (!session) {
    return <main className="p-8 text-slate-200">{error ?? "Loading channel..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="channels">
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-800 bg-slate-950/80 p-4 lg:sticky lg:top-6 lg:self-start">
          <div className="mb-4 flex items-end justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Channels</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">Workspace rooms</div>
            </div>
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
              {channels.length}
            </span>
          </div>
          <div className="space-y-2">
            {channels.map((channel) => {
              const isActive = channel.id === channelId;
              return (
                <Link
                  key={channel.id}
                  href={`/channels/${channel.id}`}
                  className={`block rounded-lg border px-4 py-3 transition ${
                    isActive
                      ? "border-amber-300/50 bg-amber-300/10 text-slate-100 shadow-[0_0_0_1px_rgba(252,211,77,0.15)]"
                      : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate font-medium">#{channel.name}</div>
                    {channel.isDefault ? (
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-400">
                    {channel.topic ?? "No topic set"}
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        <section className="rounded-lg border border-slate-800 bg-slate-950/80">
          <div className="border-b border-slate-800 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-slate-100">#{currentChannel?.name ?? "Channel"}</h2>
                  {currentChannel?.isDefault ? (
                    <span className="rounded-full bg-amber-300 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-950">
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  {currentChannel?.topic ?? "Private group conversation"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-right">
                <div className="text-lg font-semibold text-slate-100">{messages.length}</div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Messages loaded</div>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6">
            {nextCursor ? (
              <button
                className="mb-5 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-slate-100"
                onClick={() => void loadOlder()}
                type="button"
              >
                Load older messages
              </button>
            ) : null}

            {messages.length ? (
              <div className="space-y-6">
                {messagesByDay.map(([dateLabel, dayMessages]) => (
                  <div key={dateLabel}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-800" />
                      <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{dateLabel}</span>
                      <div className="h-px flex-1 bg-slate-800" />
                    </div>
                    <div className="space-y-3">
                      {dayMessages.map((message) => {
                        const isSelf = message.authorId === session.user.id;
                        return (
                          <article
                            key={message.id}
                            className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[min(100%,44rem)] rounded-[24px] border px-4 py-3 shadow-sm sm:px-5 ${
                                isSelf
                                  ? "border-amber-300/40 bg-amber-300/10 text-slate-100"
                                  : "border-slate-800 bg-slate-900/85 text-slate-100"
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between gap-4 text-xs">
                                <span className={`font-medium ${isSelf ? "text-amber-100" : "text-slate-300"}`}>
                                  {isSelf ? "You" : message.author?.displayName ?? "Member"}
                                </span>
                                <span className={isSelf ? "text-amber-100/80" : "text-slate-500"}>
                                  {new Date(message.createdAt).toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit"
                                  })}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-inherit sm:text-[15px]">
                                {message.body}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center">
                <p className="text-lg font-medium text-slate-100">No messages yet</p>
                <p className="mt-2 text-sm text-slate-400">Start the conversation in this room.</p>
              </div>
            )}

            <form className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4 sm:p-5" onSubmit={onSubmit}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-100">New message</div>
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Live</div>
              </div>
              <textarea
                className="min-h-28 w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-slate-700 focus:outline-none"
                name="body"
                placeholder="Write to the group..."
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {error ? (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500"> </div>
                )}
                <button
                  className="rounded-lg bg-amber-300 px-5 py-3 font-medium text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                  type="submit"
                  disabled={pending}
                >
                  {pending ? "Sending..." : "Send message"}
                </button>
              </div>
            </form>
          </div>
        </section>
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
