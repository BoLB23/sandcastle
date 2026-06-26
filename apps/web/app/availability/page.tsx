"use client";

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, type AvailabilityResponse, type SessionResponse } from "../../lib/api";
import { WorkspaceShell } from "../../components/workspace-shell";

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
    return <main className="p-8 text-slate-200">{error ?? "Loading availability..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="availability">
      <section className="rounded-lg border border-slate-800 bg-slate-950/80 p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">Availability</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">Weekly evening availability</h2>
            <p className="mt-2 text-sm text-slate-400">Eastern Time, 7 PM through 11 PM.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Open slots</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">{selectedCount}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Timezone</div>
              <div className="mt-1 text-sm font-medium text-slate-100">America/New_York</div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {selectedByDay.map(({ day, count }) => (
            <div key={day} className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{day.slice(0, 3)}</div>
              <div className="mt-1 text-lg font-semibold text-slate-100">{count}/4</div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto pb-1">
          <div className="grid min-w-[760px] grid-cols-[96px_repeat(7,minmax(84px,1fr))] gap-2">
            <div />
            {days.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs uppercase tracking-[0.14em] text-slate-400">
                {day.slice(0, 3)}
              </div>
            ))}

            {hours.map((hour) => (
              <AvailabilityRow
                key={hour}
                hour={hour}
                availability={availability}
                setAvailability={setAvailability}
              />
            ))}
          </div>
        </div>

        {error ? <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-400">
            {selectedCount === 0 ? "No evening windows selected." : `${selectedCount} evening windows selected.`}
          </div>
          <button
            className="rounded-lg bg-amber-300 px-5 py-3 font-medium text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
            type="button"
            onClick={() => void onSave()}
            disabled={pending}
          >
            {pending ? "Saving..." : "Save availability"}
          </button>
        </div>
      </section>
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
      <div className="flex items-center px-2 py-3 text-sm font-medium text-slate-400">{toHourLabel(hour)}</div>
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
            className={`flex min-h-16 items-center justify-center rounded-lg border px-3 py-4 text-center text-sm font-medium transition ${
              checked
                ? "border-amber-300/50 bg-amber-300/[0.14] text-amber-100"
                : "border-slate-800 bg-slate-900/70 text-slate-500 hover:border-slate-700 hover:text-slate-300"
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
