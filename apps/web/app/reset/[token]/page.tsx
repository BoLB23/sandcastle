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
        {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        <button className="w-full rounded-2xl bg-amber-300 px-4 py-3 font-medium text-slate-950" type="submit" disabled={pending || !token}>
          {pending ? "Updating..." : "Set password"}
        </button>
      </form>
    </AuthCard>
  );
}
