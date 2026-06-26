"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { AuthCard, Field } from "../../../components/auth-card";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void params.then(async ({ token: nextToken }) => {
      setToken(nextToken);
      try {
        const invite = await apiFetch<{ email: string | null; expiresAt: string | null }>(`/invites/${nextToken}`);
        setEmailHint(invite.email);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Invite not found");
      }
    });
  }, [params]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      await apiFetch("/invites/accept", {
        method: "POST",
        body: JSON.stringify({
          token,
          displayName: formData.get("displayName"),
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      router.push("/channels");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to accept invite");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard title="Accept invite">
      <p className="mb-4 text-sm text-slate-400">Invite token ending in {token.slice(-6) || "......"}</p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Display name" name="displayName" placeholder="Bolt" />
        <Field label="Email" name="email" type="email" placeholder="bolt@group.local" defaultValue={emailHint ?? ""} />
        <Field label="Password" name="password" type="password" placeholder="At least 12 characters" />
        {error ? <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        <button
          className="w-full rounded-lg bg-amber-300 px-4 py-3 font-semibold text-slate-950 shadow-sm shadow-amber-950/10 transition hover:bg-amber-200 hover:shadow-md hover:shadow-amber-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={pending || !token}
        >
          {pending ? "Joining..." : "Join workspace"}
        </button>
      </form>
    </AuthCard>
  );
}
