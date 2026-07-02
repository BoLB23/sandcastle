"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { AuthCard, Field } from "../../../components/auth-card";
import { Button } from "../../../components/ui";

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
      <p className="mb-4 text-sm text-ink-muted">Invite token ending in {token.slice(-6) || "......"}</p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Display name" name="displayName" placeholder="Bolt" />
        <Field label="Email" name="email" type="email" placeholder="bolt@group.local" defaultValue={emailHint ?? ""} />
        <Field label="Password" name="password" type="password" placeholder="At least 12 characters" />
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={pending || !token}>
          {pending ? "Joining..." : "Join workspace"}
        </Button>
      </form>
    </AuthCard>
  );
}
