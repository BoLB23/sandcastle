"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type EventRecord, type SessionResponse } from "../../lib/api";
import { WorkspaceShell } from "../../components/workspace-shell";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Eyebrow } from "../../components/ui";

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
    return <main className="p-8 text-ink-muted">{error ?? "Loading events..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="events">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="xl:sticky xl:top-6 xl:self-start">
          <form onSubmit={onSubmit}>
            <CardHeader>
              <Eyebrow>New event</Eyebrow>
              <h2 className="mt-1.5 text-lg font-semibold text-ink">Plan something</h2>
              <p className="mt-1.5 text-sm text-ink-muted">A clear time window and a short purpose.</p>
            </CardHeader>
            <CardBody className="space-y-3">
              <input
                className="w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
                name="title"
                placeholder="Progression night"
              />
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
                name="description"
                placeholder="What is this for?"
              />
              <input
                className="w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                type="datetime-local"
                name="startsAt"
              />
              <input
                className="w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
                type="datetime-local"
                name="endsAt"
              />
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              <Button className="w-full" type="submit" disabled={pending}>
                {pending ? "Saving..." : "Create event"}
              </Button>
            </CardBody>
          </form>
        </Card>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow>Upcoming</Eyebrow>
              <h2 className="mt-1.5 text-lg font-semibold text-ink">Events</h2>
            </div>
            <span className="text-sm text-ink-muted">{sortedEvents.length} scheduled</span>
          </div>

          {sortedEvents.length ? (
            sortedEvents.map((eventRecord) => (
              <Link key={eventRecord.id} href={`/events/${eventRecord.id}`}>
                <Card className="p-5 transition hover:border-border-strong hover:bg-surface-hover">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className="w-14 shrink-0 rounded-md border border-border bg-surface-raised px-2 py-2.5 text-center">
                        <div className="text-[11px] uppercase tracking-[0.08em] text-ink-subtle">
                          {new Date(eventRecord.startsAt).toLocaleDateString([], { month: "short" })}
                        </div>
                        <div className="mt-0.5 text-xl font-semibold text-ink">
                          {new Date(eventRecord.startsAt).toLocaleDateString([], { day: "numeric" })}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-ink">{eventRecord.title}</h3>
                          <Badge tone={eventRecord.status === "cancelled" ? "danger" : "success"}>
                            {eventRecord.status}
                          </Badge>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">
                          {eventRecord.description ?? "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:max-w-[16rem] sm:justify-end">
                      <span className="rounded-full border border-border-strong px-3 py-1 text-xs text-ink-muted">
                        {formatEventWindow(eventRecord.startsAt, eventRecord.endsAt)}
                      </span>
                      <span className="rounded-full border border-border-strong px-3 py-1 text-xs text-ink-muted">
                        {new Date(eventRecord.startsAt).toLocaleDateString([], { weekday: "long" })}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <EmptyState title="No events yet" description="The first plan created here will show up in this feed." />
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
