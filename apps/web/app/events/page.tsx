"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
          startsAt: localDateTimeToIsoString(formData.get("startsAt")),
          endsAt: localDateTimeToIsoString(formData.get("endsAt"))
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

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
      ),
    [events]
  );

  if (!session) {
    return <main className="p-8 text-slate-200">{error ?? "Loading events..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="events">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <form className="rounded-lg border border-slate-800 bg-slate-950/80 p-5 xl:sticky xl:top-6 xl:self-start" onSubmit={onSubmit}>
          <div className="border-b border-slate-800 pb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">New event</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">Plan something</h2>
            <p className="mt-2 text-sm text-slate-400">Create a session with a clear time window and a short purpose.</p>
          </div>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-slate-700 focus:outline-none"
              name="title"
              placeholder="Progression night"
            />
            <textarea
              className="min-h-24 w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-slate-700 focus:outline-none"
              name="description"
              placeholder="What is this for?"
            />
            <input
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 focus:border-slate-700 focus:outline-none"
              type="datetime-local"
              name="startsAt"
            />
            <input
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 focus:border-slate-700 focus:outline-none"
              type="datetime-local"
              name="endsAt"
            />
            {error ? <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
            <button
              className="w-full rounded-lg bg-amber-300 px-4 py-3 font-medium text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={pending}
            >
              {pending ? "Saving..." : "Create event"}
            </button>
          </div>
        </form>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Upcoming</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-100">Events</h2>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3 text-right">
              <div className="text-2xl font-semibold text-slate-100">{sortedEvents.length}</div>
              <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Scheduled items</div>
            </div>
          </div>

          {sortedEvents.length ? (
            sortedEvents.map((eventRecord) => (
              <Link
                key={eventRecord.id}
                href={`/events/${eventRecord.id}`}
                className="block rounded-lg border border-slate-800 bg-slate-950/80 p-5 transition hover:border-slate-700 hover:bg-slate-950"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="w-16 shrink-0 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                        {new Date(eventRecord.startsAt).toLocaleDateString([], { month: "short" })}
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-slate-100">
                        {new Date(eventRecord.startsAt).toLocaleDateString([], { day: "numeric" })}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-slate-100">{eventRecord.title}</h3>
                        <span className={statusChipClass(eventRecord.status)}>{eventRecord.status}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                        {eventRecord.description ?? "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:max-w-[16rem] sm:justify-end">
                    <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
                      {formatEventWindow(eventRecord.startsAt, eventRecord.endsAt)}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
                      {new Date(eventRecord.startsAt).toLocaleDateString([], { weekday: "long" })}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 px-6 py-14 text-center">
              <p className="text-lg font-medium text-slate-100">No events yet</p>
              <p className="mt-2 text-sm text-slate-400">The first plan created here will show up in this feed.</p>
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}

function localDateTimeToIsoString(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return value;
  return new Date(value).toISOString();
}

function formatEventWindow(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function statusChipClass(status: EventRecord["status"]) {
  return `rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
    status === "cancelled" ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"
  }`;
}
