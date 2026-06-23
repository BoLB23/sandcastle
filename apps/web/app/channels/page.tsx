"use client";

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
      <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-slate-300">
        {channels.length ? "Opening the first channel..." : "No channels are available yet."}
      </div>
    </WorkspaceShell>
  );
}
