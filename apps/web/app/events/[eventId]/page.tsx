"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type EventRecord, type SessionResponse } from "../../../lib/api";
import { WorkspaceShell } from "../../../components/workspace-shell";

type RsvpStatus = "going" | "maybe" | "not_going";

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const router = useRouter();
  const [eventId, setEventId] = useState("");
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [eventRecord, setEventRecord] = useState<EventRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rsvpPending, setRsvpPending] = useState<RsvpStatus | null>(null);
  const [savePending, setSavePending] = useState(false);

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
    setRsvpPending(status);
    setError(null);
    try {
      await apiFetch(`/events/${eventId}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      await load(eventId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update RSVP");
    } finally {
      setRsvpPending(null);
    }
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId) return;
    const formData = new FormData(event.currentTarget);
    setSavePending(true);
    setError(null);
    try {
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save event");
    } finally {
      setSavePending(false);
    }
  }

  const canManage = session && eventRecord ? session.user.role !== "member" || session.user.id === eventRecord.organizerId : false;
  const currentRsvp = session && eventRecord ? eventRecord.rsvps?.find((rsvp) => rsvp.userId === session.user.id)?.status ?? null : null;
  const rsvpSummary = eventRecord ? summarizeRsvps(eventRecord) : { going: 0, maybe: 0, not_going: 0 };

  if (!session || !eventRecord) {
    return <main className="p-8 text-slate-200">{error ?? "Loading event..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="events">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-6">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-3xl font-semibold text-slate-100">{eventRecord.title}</h2>
                  <span className={statusChipClass(eventRecord.status)}>{eventRecord.status}</span>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">
                  {eventRecord.description ?? "No description"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-right">
                <div className="text-sm text-slate-400">Organizer</div>
                <div className="mt-1 font-medium text-slate-100">
                  {eventRecord.organizer?.displayName ?? "Group member"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-300">
                {new Date(eventRecord.startsAt).toLocaleDateString([], {
                  weekday: "long",
                  month: "short",
                  day: "numeric"
                })}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-300">
                {formatEventWindow(eventRecord.startsAt, eventRecord.endsAt)}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {([
              ["going", "Going"],
              ["maybe", "Maybe"],
              ["not_going", "Not going"]
            ] as const).map(([status, label]) => {
              const isActive = currentRsvp === status;
              const isPending = rsvpPending === status;
              return (
                <button
                  key={status}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-amber-300 bg-amber-300 text-slate-950"
                      : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-600"
                  }`}
                  type="button"
                  onClick={() => void submitRsvp(status)}
                  disabled={Boolean(rsvpPending)}
                >
                  {isPending ? "Saving..." : label}
                </button>
              );
            })}
          </div>

          {error ? <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {([
              ["going", "Going"],
              ["maybe", "Maybe"],
              ["not_going", "Not going"]
            ] as const).map(([key, label]) => (
              <div key={key} className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-100">{rsvpSummary[key]}</div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-100">RSVPs</h3>
            {eventRecord.rsvps?.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {eventRecord.rsvps.map((rsvp) => (
                  <div key={rsvp.userId} className="rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-100">{rsvp.user.displayName}</span>
                      <span className={rsvpChipClass(rsvp.status)}>{formatRsvpLabel(rsvp.status)}</span>
                    </div>
                    {rsvp.note ? <p className="mt-2 text-sm text-slate-400">{rsvp.note}</p> : null}
                    <p className="mt-2 text-xs text-slate-500">
                      Updated {new Date(rsvp.updatedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-6 py-10 text-center">
                <p className="text-lg font-medium text-slate-100">No RSVPs yet</p>
                <p className="mt-2 text-sm text-slate-400">Responses will show up here as people answer.</p>
              </div>
            )}
          </div>
        </section>

        {canManage ? (
          <form className="rounded-lg border border-slate-800 bg-slate-950/80 p-5 xl:sticky xl:top-6 xl:self-start" onSubmit={onUpdate}>
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-semibold text-slate-100">Manage event</h3>
              <p className="mt-2 text-sm text-slate-400">Keep the plan current for the group.</p>
            </div>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 focus:border-slate-700 focus:outline-none"
                name="title"
                defaultValue={eventRecord.title}
              />
              <textarea
                className="min-h-24 w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 focus:border-slate-700 focus:outline-none"
                name="description"
                defaultValue={eventRecord.description ?? ""}
              />
              <input
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 focus:border-slate-700 focus:outline-none"
                type="datetime-local"
                name="startsAt"
                defaultValue={toDateTimeLocal(eventRecord.startsAt)}
              />
              <input
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 focus:border-slate-700 focus:outline-none"
                type="datetime-local"
                name="endsAt"
                defaultValue={toDateTimeLocal(eventRecord.endsAt)}
              />
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 focus:border-slate-700 focus:outline-none"
                name="status"
                defaultValue={eventRecord.status}
              >
                <option value="scheduled">Scheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                className="w-full rounded-lg bg-amber-300 px-4 py-3 font-medium text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                type="submit"
                disabled={savePending}
              >
                {savePending ? "Saving..." : "Save changes"}
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

function summarizeRsvps(eventRecord: EventRecord) {
  return (eventRecord.rsvps ?? []).reduce(
    (accumulator, rsvp) => {
      accumulator[rsvp.status] += 1;
      return accumulator;
    },
    { going: 0, maybe: 0, not_going: 0 }
  );
}

function formatEventWindow(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function formatRsvpLabel(status: "going" | "maybe" | "not_going") {
  return status === "not_going" ? "Not going" : status;
}

function statusChipClass(status: EventRecord["status"]) {
  return `rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
    status === "cancelled" ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"
  }`;
}

function rsvpChipClass(status: "going" | "maybe" | "not_going") {
  if (status === "going") return "rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-200";
  if (status === "maybe") return "rounded-full bg-amber-300/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-amber-200";
  return "rounded-full bg-slate-200/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300";
}
