"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type EventRecord, type SessionResponse } from "../../../lib/api";
import { WorkspaceShell } from "../../../components/workspace-shell";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from "../../../components/ui";

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
    return <main className="p-8 text-ink-muted">{error ?? "Loading event..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="events">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-ink">{eventRecord.title}</h2>
                  <Badge tone={eventRecord.status === "cancelled" ? "danger" : "success"}>{eventRecord.status}</Badge>
                </div>
                <p className="mt-1.5 max-w-3xl text-sm text-ink-muted">{eventRecord.description ?? "No description"}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-ink-subtle">Organizer</div>
                <div className="mt-0.5 text-sm font-medium text-ink">
                  {eventRecord.organizer?.displayName ?? "Group member"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-border-strong px-3 py-1 text-sm text-ink-muted">
                {new Date(eventRecord.startsAt).toLocaleDateString([], {
                  weekday: "long",
                  month: "short",
                  day: "numeric"
                })}
              </span>
              <span className="rounded-full border border-border-strong px-3 py-1 text-sm text-ink-muted">
                {formatEventWindow(eventRecord.startsAt, eventRecord.endsAt)}
              </span>
            </div>
          </CardHeader>

          <CardBody>
            <div className="flex flex-wrap gap-2">
              {([
                ["going", "Going"],
                ["maybe", "Maybe"],
                ["not_going", "Not going"]
              ] as const).map(([status, label]) => {
                const isActive = currentRsvp === status;
                const isPending = rsvpPending === status;
                return (
                  <Button
                    key={status}
                    variant={isActive ? "primary" : "secondary"}
                    onClick={() => void submitRsvp(status)}
                    disabled={Boolean(rsvpPending)}
                  >
                    {isPending ? "Saving..." : label}
                  </Button>
                );
              })}
            </div>

            {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {([
                ["going", "Going"],
                ["maybe", "Maybe"],
                ["not_going", "Not going"]
              ] as const).map(([key, label]) => (
                <div key={key} className="rounded-md border border-border bg-surface-raised px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.08em] text-ink-subtle">{label}</div>
                  <div className="mt-1.5 text-xl font-semibold text-ink">{rsvpSummary[key]}</div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-ink">RSVPs</h3>
              {eventRecord.rsvps?.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {eventRecord.rsvps.map((rsvp) => (
                    <div key={rsvp.userId} className="rounded-md border border-border bg-surface-raised px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-ink">{rsvp.user.displayName}</span>
                        <Badge tone={rsvpTone(rsvp.status)}>{formatRsvpLabel(rsvp.status)}</Badge>
                      </div>
                      {rsvp.note ? <p className="mt-1.5 text-sm text-ink-muted">{rsvp.note}</p> : null}
                      <p className="mt-1.5 text-xs text-ink-subtle">Updated {new Date(rsvp.updatedAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3">
                  <EmptyState title="No RSVPs yet" description="Responses will show up here as people answer." />
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {canManage ? (
          <Card className="xl:sticky xl:top-6 xl:self-start">
            <form onSubmit={onUpdate}>
              <CardHeader>
                <h3 className="text-base font-semibold text-ink">Manage event</h3>
                <p className="mt-1.5 text-sm text-ink-muted">Keep the plan current for the group.</p>
              </CardHeader>
              <CardBody className="space-y-3">
                <input
                  className="w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                  name="title"
                  defaultValue={eventRecord.title}
                />
                <textarea
                  className="min-h-24 w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                  name="description"
                  defaultValue={eventRecord.description ?? ""}
                />
                <input
                  className="w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                  type="datetime-local"
                  name="startsAt"
                  defaultValue={toDateTimeLocal(eventRecord.startsAt)}
                />
                <input
                  className="w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                  type="datetime-local"
                  name="endsAt"
                  defaultValue={toDateTimeLocal(eventRecord.endsAt)}
                />
                <select
                  className="w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                  name="status"
                  defaultValue={eventRecord.status}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Button className="w-full" type="submit" disabled={savePending}>
                  {savePending ? "Saving..." : "Save changes"}
                </Button>
              </CardBody>
            </form>
          </Card>
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

function rsvpTone(status: "going" | "maybe" | "not_going") {
  if (status === "going") return "success" as const;
  if (status === "maybe") return "warning" as const;
  return "neutral" as const;
}
