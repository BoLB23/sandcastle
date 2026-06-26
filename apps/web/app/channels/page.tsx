"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type Channel, type SessionResponse } from "../../lib/api";
import { WorkspaceShell } from "../../components/workspace-shell";

export default function ChannelsIndexPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [nextSession, nextChannels] = await Promise.all([
          apiFetch<SessionResponse>("/auth/me"),
          apiFetch<Channel[]>("/channels")
        ]);
        setSession(nextSession);
        setChannels(nextChannels);
        if (nextChannels[0]) {
          router.replace(`/channels/${nextChannels[0].id}`);
        }
      } catch (nextError) {
        if ((nextError as Error).message.includes("Authentication")) {
          router.replace("/login");
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Unable to load channels");
      }
    })();
  }, [router]);

  if (!session) {
    return <main className="p-8 text-slate-200">{error ?? "Loading channels..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="channels">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">Channels</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-100">Conversations</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                {channels.length
                  ? "Opening the most recent shared room now."
                  : "No channels are available in this workspace yet."}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-right">
              <div className="text-2xl font-semibold text-slate-100">{channels.length}</div>
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Visible rooms</div>
            </div>
          </div>

          {channels.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {channels.slice(0, 4).map((channel, index) => (
                <div
                  key={channel.id}
                  className={`rounded-lg border px-4 py-4 ${
                    index === 0
                      ? "border-amber-300/40 bg-amber-300/10"
                      : "border-slate-800 bg-slate-900/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium text-slate-100">#{channel.name}</span>
                    {channel.isDefault ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-950">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                    {channel.topic ?? "Private group conversation"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-6 py-10 text-center">
              <p className="text-lg font-medium text-slate-100">Nothing to open yet</p>
              <p className="mt-2 text-sm text-slate-400">
                New rooms will appear here as soon as they are created.
              </p>
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-slate-800 bg-slate-950/80 p-5">
          <h3 className="text-lg font-semibold text-slate-100">Room list</h3>
          <div className="mt-4 space-y-2">
            {channels.length ? (
              channels.map((channel, index) => (
                <Link
                  key={channel.id}
                  href={`/channels/${channel.id}`}
                  className={`block rounded-lg border px-4 py-3 transition ${
                    index === 0
                      ? "border-amber-300/50 bg-amber-300/10 text-slate-100"
                      : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium">#{channel.name}</span>
                    {channel.isDefault ? (
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">
                    {channel.topic ?? "No topic set"}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-400">
                Workspace channels will appear here.
              </div>
            )}
          </div>
        </aside>
      </section>
    </WorkspaceShell>
  );
}
