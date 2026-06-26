"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { AuthCard, Field } from "../../../components/auth-card";

export default function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void params.then(({ token: nextToken }) => setToken(nextToken));
  }, [params]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      await apiFetch("/reset/accept", {
        method: "POST",
        body: JSON.stringify({
          token,
          password: formData.get("password")
        })
      });
      router.push("/login");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to reset password");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard title="Reset password">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="New password" name="password" type="password" placeholder="At least 12 characters" />
        {error ? <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        <button
          className="w-full rounded-lg bg-amber-300 px-4 py-3 font-semibold text-slate-950 shadow-sm shadow-amber-950/10 transition hover:bg-amber-200 hover:shadow-md hover:shadow-amber-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={pending || !token}
        >
          {pending ? "Updating..." : "Set password"}
        </button>
      </form>
    </AuthCard>
  );
}
