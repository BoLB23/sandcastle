"use client";

import { useEffect, useState } from "react";
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

  if (!session || !availability) {
    return <main className="p-8 text-slate-200">{error ?? "Loading availability..."}</main>;
  }

  return (
    <WorkspaceShell user={session.user} active="availability">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
        <h2 className="text-2xl font-semibold">Weekly evening availability</h2>
        <p className="mt-2 text-sm text-slate-400">Fixed Eastern Time windows only: 7 PM to 11 PM.</p>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-2">
            <thead>
              <tr>
                <th />
                {days.map((day) => (
                  <th key={day} className="px-3 py-2 text-left text-sm uppercase tracking-[0.14em] text-slate-400">
                    {day.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => (
                <tr key={hour}>
                  <td className="px-3 py-2 text-sm text-slate-400">{toHourLabel(hour)}</td>
                  {days.map((day) => {
                    const slot = availability.slots.find((entry) => entry.day === day && entry.hour === hour);
                    return (
                      <td key={`${day}-${hour}`} className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={slot?.available ?? false}
                          onChange={(event) =>
                            setAvailability((current) =>
                              current
                                ? {
                                    ...current,
                                    slots: current.slots.map((entry) =>
                                      entry.day === day && entry.hour === hour
                                        ? { ...entry, available: event.target.checked }
                                        : entry
                                    )
                                  }
                                : current
                            )
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        <button className="mt-6 rounded-2xl bg-amber-300 px-4 py-3 font-medium text-slate-950" type="button" onClick={() => void onSave()} disabled={pending}>
          {pending ? "Saving..." : "Save availability"}
        </button>
      </section>
    </WorkspaceShell>
  );
}

function toHourLabel(hour: string) {
  const value = Number(hour);
  return value === 12 ? "12 PM" : value > 12 ? `${value - 12} PM` : `${value} AM`;
}
