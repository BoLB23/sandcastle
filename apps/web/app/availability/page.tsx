"use client";

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type AvailabilityResponse, type SessionResponse } from "../../lib/api";
import { WorkspaceShell } from "../../components/workspace-shell";
import { Button, Card, CardBody, CardHeader, Eyebrow } from "../../components/ui";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const hours = ["19", "20", "21", "22"] as const;

export default function AvailabilityPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [nextSession, nextAvailability] = await Promise.all([
          apiFetch<SessionResponse>("/auth/me"),
          apiFetch<AvailabilityResponse>("/availability")
        ]);
        setSession(nextSession);
        setAvailability(nextAvailability);
      } catch (nextError) {
        if ((nextError as Error).message.includes("Authentication")) {
          router.replace("/login");
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "Unable to load availability");
      }
    })();
  }, [router]);

  async function onSave() {
    if (!availability) return;
    setPending(true);
    setError(null);
    try {
      const next = await apiFetch<AvailabilityResponse>("/availability", {
        method: "PUT",
        body: JSON.stringify({ slots: availability.slots })
      });
      setAvailability(next);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save availability");
    } finally {
      setPending(false);
    }
  }

  const selectedCount = availability?.slots.filter((slot) => slot.available).length ?? 0;
  const selectedByDay = days.map((day) => ({
    day,
    count: availability?.slots.filter((slot) => slot.day === day && slot.available).length ?? 0
  }));

  if (!session || !availability) {
    return <main className="p-8 text-ink-muted">{error ?? "Loading availability..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="availability">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Eyebrow>Availability</Eyebrow>
            <h2 className="mt-1.5 text-lg font-semibold text-ink">Weekly evening availability</h2>
            <p className="mt-1.5 text-sm text-ink-muted">Eastern Time, 7 PM through 11 PM.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <div className="rounded-md border border-border bg-surface-raised px-4 py-2.5">
              <div className="text-xs uppercase tracking-[0.08em] text-ink-subtle">Open slots</div>
              <div className="mt-0.5 text-xl font-semibold text-ink">{selectedCount}</div>
            </div>
            <div className="rounded-md border border-border bg-surface-raised px-4 py-2.5">
              <div className="text-xs uppercase tracking-[0.08em] text-ink-subtle">Timezone</div>
              <div className="mt-0.5 text-sm font-medium text-ink">America/New_York</div>
            </div>
          </div>
        </CardHeader>

        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            {selectedByDay.map(({ day, count }) => (
              <div key={day} className="rounded-md border border-border bg-surface-raised px-4 py-2.5">
                <div className="text-xs uppercase tracking-[0.08em] text-ink-subtle">{day.slice(0, 3)}</div>
                <div className="mt-0.5 text-base font-semibold text-ink">{count}/4</div>
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto pb-1">
            <div className="grid min-w-[760px] grid-cols-[96px_repeat(7,minmax(84px,1fr))] gap-2">
              <div />
              {days.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-xs uppercase tracking-[0.08em] text-ink-subtle">
                  {day.slice(0, 3)}
                </div>
              ))}

              {hours.map((hour) => (
                <AvailabilityRow key={hour} hour={hour} availability={availability} setAvailability={setAvailability} />
              ))}
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-ink-muted">
              {selectedCount === 0 ? "No evening windows selected." : `${selectedCount} evening windows selected.`}
            </div>
            <Button onClick={() => void onSave()} disabled={pending}>
              {pending ? "Saving..." : "Save availability"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </WorkspaceShell>
  );
}

function AvailabilityRow({
  hour,
  availability,
  setAvailability
}: {
  hour: string;
  availability: AvailabilityResponse;
  setAvailability: Dispatch<SetStateAction<AvailabilityResponse | null>>;
}) {
  return (
    <>
      <div className="flex items-center px-2 py-3 text-sm font-medium text-ink-muted">{toHourLabel(hour)}</div>
      {days.map((day) => {
        const slot = availability.slots.find((entry) => entry.day === day && entry.hour === hour);
        const checked = slot?.available ?? false;

        return (
          <button
            key={`${day}-${hour}`}
            type="button"
            aria-pressed={checked}
            onClick={() =>
              setAvailability((current) =>
                current
                  ? {
                      ...current,
                      slots: current.slots.map((entry) =>
                        entry.day === day && entry.hour === hour
                          ? { ...entry, available: !checked }
                          : entry
                      )
                    }
                  : current
              )
            }
            className={`flex min-h-16 items-center justify-center rounded-md border px-3 py-4 text-center text-sm font-medium transition ${
              checked
                ? "border-accent/50 bg-accent-soft text-ink"
                : "border-border bg-surface-raised text-ink-subtle hover:border-border-strong hover:text-ink-muted"
            }`}
          >
            {checked ? "Available" : "Busy"}
          </button>
        );
      })}
    </>
  );
}

function toHourLabel(hour: string) {
  const value = Number(hour);
  return value === 12 ? "12 PM" : value > 12 ? `${value - 12} PM` : `${value} AM`;
}
