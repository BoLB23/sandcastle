"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type Channel, type SessionResponse } from "../../lib/api";
import { WorkspaceShell } from "../../components/workspace-shell";
import { EmptyState } from "../../components/ui";

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
    return <main className="p-8 text-ink-muted">{error ?? "Loading channels..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="channels">
      <EmptyState
        title="No channels yet"
        description="New rooms will appear in the sidebar as soon as they are created."
      />
    </WorkspaceShell>
  );
}
