"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type EventRecord, type SessionResponse } from "../../../lib/api";
import { WorkspaceShell } from "../../../components/workspace-shell";

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const [eventId, setEventId] = useState("");
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(nextEventId: string) {
    const [nextSession, nextEvent] = await Promise.all([
      apiFetch<SessionResponse>("/auth/me"),
      apiFetch<EventRecord>(`/events/${nextEventId}`)
    ]);
    setSession(nextSession);
    setEventRecord(nextEvent);
  }

  useEffect(() => {
    void params.then(({ eventId: nextEventId }) => {
      setEventId(nextEventId);
      void load(nextEventId).catch((nextError) => {
        if ((nextError as Error).message.includes("Authentication")) {
          router.replace("/login");
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Unable to load event");
      });
    });
  }, [params, router]);

  async function submitRsvp(status: "going" | "maybe" | "not_going") {
    if (!eventId) return;
    await apiFetch(`/events/${eventId}/rsvp`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
    await load(eventId);
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId) return;
    const formData = new FormData(event.currentTarget);
    await apiFetch(`/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        startsAt: localDateTimeToIsoString(formData.get("startsAt")),
        endsAt: localDateTimeToIsoString(formData.get("endsAt")),
        status: formData.get("status")
      })
    });
    await load(eventId);
  }

  if (!session || !eventRecord) {
    return <main className="p-8 text-slate-200">{error ?? "Loading event..."}</main>;
  }

  const canManage = session.user.role !== "member" || session.user.id === eventRecord.organizerId;

  return (
    <WorkspaceShell user={session.user} active="events">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <h2 className="text-3xl font-semibold">{eventRecord.title}</h2>
          <p className="mt-2 text-slate-400">{eventRecord.description ?? "No description"}</p>
          <p className="mt-4 text-slate-300">
            {new Date(eventRecord.startsAt).toLocaleString()} to {new Date(eventRecord.endsAt).toLocaleString()}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-full bg-emerald-400 px-4 py-2 text-slate-950" type="button" onClick={() => void submitRsvp("going")}>Going</button>
            <button className="rounded-full bg-amber-300 px-4 py-2 text-slate-950" type="button" onClick={() => void submitRsvp("maybe")}>Maybe</button>
            <button className="rounded-full bg-slate-200 px-4 py-2 text-slate-950" type="button" onClick={() => void submitRsvp("not_going")}>Not going</button>
          </div>
          <div className="mt-8">
            <h3 className="text-lg font-semibold">RSVPs</h3>
            <div className="mt-3 space-y-3">
              {eventRecord.rsvps?.map((rsvp) => (
                <div key={rsvp.userId} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span>{rsvp.user.displayName}</span>
                    <span className="text-sm uppercase tracking-[0.14em] text-amber-300/80">{rsvp.status}</span>
                  </div>
                  {rsvp.note ? <p className="mt-1 text-sm text-slate-400">{rsvp.note}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </section>
        {canManage ? (
          <form className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5" onSubmit={onUpdate}>
            <h3 className="text-xl font-semibold">Manage event</h3>
            <div className="mt-4 space-y-3">
              <input className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3" name="title" defaultValue={eventRecord.title} />
              <textarea className="min-h-24 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3" name="description" defaultValue={eventRecord.description ?? ""} />
              <input className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3" type="datetime-local" name="startsAt" defaultValue={toDateTimeLocal(eventRecord.startsAt)} />
              <input className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3" type="datetime-local" name="endsAt" defaultValue={toDateTimeLocal(eventRecord.endsAt)} />
              <select className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3" name="status" defaultValue={eventRecord.status}>
                <option value="scheduled">Scheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button className="w-full rounded-2xl bg-amber-300 px-4 py-3 font-medium text-slate-950" type="submit">
                Save changes
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (next: number) => `${next}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDateTimeToIsoString(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return value;
  return new Date(value).toISOString();
}
