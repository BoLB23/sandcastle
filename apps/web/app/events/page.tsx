"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type EventRecord, type SessionResponse } from "../../lib/api";
import { WorkspaceShell } from "../../components/workspace-shell";

export default function EventsPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    const [nextSession, nextEvents] = await Promise.all([
      apiFetch<SessionResponse>("/auth/me"),
      apiFetch<EventRecord[]>("/events")
    ]);
    setSession(nextSession);
    setEvents(nextEvents);
  }

  useEffect(() => {
    void load().catch((nextError) => {
      if ((nextError as Error).message.includes("Authentication")) {
        router.replace("/login");
        return;
      }
      setError(nextError instanceof Error ? nextError.message : "Unable to load events");
    });
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      await apiFetch("/events", {
        method: "POST",
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          startsAt: formData.get("startsAt"),
          endsAt: formData.get("endsAt")
        })
      });
      await load();
      (event.currentTarget as HTMLFormElement).reset();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create event");
    } finally {
      setPending(false);
    }
  }

  if (!session) {
    return <main className="p-8 text-slate-200">{error ?? "Loading events..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="events">
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5" onSubmit={onSubmit}>
          <h2 className="text-xl font-semibold">Create event</h2>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3" name="title" placeholder="Progression night" />
            <textarea className="min-h-24 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3" name="description" placeholder="What is this for?" />
            <input className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3" type="datetime-local" name="startsAt" />
            <input className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3" type="datetime-local" name="endsAt" />
            {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
            <button className="w-full rounded-2xl bg-amber-300 px-4 py-3 font-medium text-slate-950" type="submit" disabled={pending}>
              {pending ? "Saving..." : "Create event"}
            </button>
          </div>
        </form>
        <div className="space-y-4">
          {events.map((eventRecord) => (
            <Link key={eventRecord.id} href={`/events/${eventRecord.id}`} className="block rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-100">{eventRecord.title}</h3>
                <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.14em] ${eventRecord.status === "cancelled" ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"}`}>
                  {eventRecord.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{eventRecord.description ?? "No description"}</p>
              <p className="mt-3 text-sm text-slate-300">
                {new Date(eventRecord.startsAt).toLocaleString()} to {new Date(eventRecord.endsAt).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </WorkspaceShell>
  );
}
