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
      if (envelope.action === "message.created" && envelope.payload?.message) {
        setMessages((current) => [...current, envelope.payload!.message!]);
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

  if (!session) {
    return <main className="p-8 text-slate-200">{error ?? "Loading channel..."}</main>;
  }

  const currentChannel = channels.find((channel) => channel.id === channelId);

  return (
    <WorkspaceShell user={session.user} active="channels">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="mb-3 text-sm uppercase tracking-[0.14em] text-slate-400">Channels</div>
          <div className="space-y-2">
            {channels.map((channel) => (
              <Link
                key={channel.id}
                href={`/channels/${channel.id}`}
                className={`block rounded-2xl px-4 py-3 ${
                  channel.id === channelId ? "bg-amber-300 text-slate-950" : "bg-slate-900 text-slate-300"
                }`}
              >
                <div className="font-medium">#{channel.name}</div>
                <div className="text-xs opacity-80">{channel.topic ?? "No topic set"}</div>
              </Link>
            ))}
          </div>
        </aside>
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="mb-4 border-b border-slate-800 pb-4">
            <h2 className="text-2xl font-semibold">#{currentChannel?.name ?? "Channel"}</h2>
            <p className="mt-1 text-sm text-slate-400">{currentChannel?.topic ?? "Private group conversation"}</p>
          </div>
          {nextCursor ? (
            <button className="mb-4 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300" onClick={() => void loadOlder()} type="button">
              Load older messages
            </button>
          ) : null}
          <div className="space-y-3">
            {messages.map((message) => (
              <article key={message.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-100">{message.author?.displayName ?? "Member"}</span>
                  <span className="text-slate-500">{new Date(message.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-slate-300">{message.body}</p>
              </article>
            ))}
          </div>
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500"
              name="body"
              placeholder="Write to the group..."
            />
            {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
            <button className="rounded-2xl bg-amber-300 px-4 py-3 font-medium text-slate-950" type="submit" disabled={pending}>
              {pending ? "Sending..." : "Send message"}
            </button>
          </form>
        </section>
      </div>
    </WorkspaceShell>
  );
}
