"use client";

import { useMemo, useState } from "react";

type AuthMode = "invite" | "login" | "app";
type WorkspaceTab = "channels" | "polls" | "events" | "availability";

const channels = [
  { name: "raid-night", unread: 4, topic: "Thursday setup and final roles" },
  { name: "weekend-dropins", unread: 1, topic: "Short sessions and overflow" },
  { name: "switchback", unread: 0, topic: "Cross-game planning and clips" },
];

const messages = [
  {
    author: "Mina",
    time: "18:42",
    text: "Lobby opens at 20:00. I locked the encounter notes and updated role swaps in the thread.",
  },
  {
    author: "Jules",
    time: "18:47",
    text: "I can cover tank if Reed is delayed, but only for the first hour.",
  },
  {
    author: "Reed",
    time: "18:51",
    text: "Train is on time now. I should make ready-check with ten minutes to spare.",
  },
];

const threadItems = [
  { title: "Role swap for phase two", detail: "3 replies, last update 7m ago", status: "Active" },
  { title: "Consumables tracking", detail: "Need two more crafters", status: "Open" },
  { title: "Clip review", detail: "Queued after tonight's run", status: "Later" },
];

const polls = [
  {
    question: "Friday backup slot",
    closes: "Closes in 5h",
    options: [
      { label: "20:30 ET", votes: 6 },
      { label: "21:00 ET", votes: 9 },
      { label: "21:30 ET", votes: 2 },
    ],
  },
  {
    question: "Next co-op rotation",
    closes: "Closes tomorrow",
    options: [
      { label: "Helldivers", votes: 8 },
      { label: "Destiny dungeon", votes: 5 },
      { label: "Fortnite customs", votes: 3 },
    ],
  },
];

const events = [
  { title: "Progression Night", time: "Thu Jun 18, 8:00 PM", roster: "9 confirmed, 2 tentative", action: "Ready" },
  { title: "Clip Review", time: "Sat Jun 20, 7:30 PM", roster: "5 confirmed, 4 pending", action: "Need replies" },
  { title: "Casual Overflow", time: "Sun Jun 21, 3:00 PM", roster: "Open attendance", action: "Flexible" },
];

const players = [
  { name: "You", tag: "Bolt#1188", slots: [1, 1, 1, 0, 1, 1, 0] },
  { name: "Mina", tag: "Mina#4421", slots: [1, 1, 1, 1, 1, 0, 0] },
  { name: "Reed", tag: "Reed#7710", slots: [0, 1, 1, 1, 1, 1, 0] },
  { name: "Jules", tag: "Jules#9024", slots: [1, 0, 1, 1, 1, 1, 1] },
  { name: "Ari", tag: "Ari#6602", slots: [0, 1, 1, 1, 0, 1, 1] },
];

const slotLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <input
        className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function PreviewStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-50">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

function AuthCard({
  mode,
  onModeChange,
  onEnterApp,
}: {
  mode: Exclude<AuthMode, "app">;
  onModeChange: (mode: Exclude<AuthMode, "app">) => void;
  onEnterApp: () => void;
}) {
  const isInvite = mode === "invite";

  return (
    <section className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-6 shadow-2xl shadow-black/30">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">Sandcastle</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-50">Friend-group ops</h1>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-300">
              Private
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-md border border-slate-800 bg-slate-900 p-1">
            {(["invite", "login"] as const).map((item) => (
              <button
                key={item}
                className={cx(
                  "rounded-md px-3 py-2 text-sm font-medium transition",
                  mode === item ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-slate-800",
                )}
                onClick={() => onModeChange(item)}
                type="button"
              >
                {item === "invite" ? "Use invite" : "Sign in"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {isInvite ? (
              <>
                <Field label="Invite code" placeholder="SC-RAID-7K2" />
                <Field label="Display name" placeholder="Bolt" />
                <Field label="Gamertag" placeholder="Bolt#1188" />
                <div className="rounded-md border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                  This invite joins you to the friend roster, active channels, and shared event board for the week.
                </div>
                <button
                  className="w-full rounded-md bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  onClick={onEnterApp}
                  type="button"
                >
                  Join workspace
                </button>
              </>
            ) : (
              <>
                <Field label="Email or handle" placeholder="bolt@group.local" />
                <Field label="Password" placeholder="••••••••••" type="password" />
                <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                  <span>Remember this device</span>
                  <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs text-emerald-300">Allowed</span>
                </div>
                <button
                  className="w-full rounded-md bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  onClick={onEnterApp}
                  type="button"
                >
                  Enter workspace
                </button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <PreviewStat label="Live channels" value="3" detail="All group rooms pinned" />
            <PreviewStat label="Tonight's RSVPs" value="9 / 11" detail="2 tentative" />
            <PreviewStat label="Best session" value="Thu 8:30" detail="5 core members free" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">Channel preview</h2>
                <span className="text-xs text-slate-400">raid-night</span>
              </div>
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={`${message.author}-${message.time}`} className="rounded-md border border-slate-800 bg-slate-900/80 p-3">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-100">{message.author}</span>
                      <span className="text-slate-500">{message.time}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{message.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <h2 className="text-sm font-semibold text-slate-100">Current poll</h2>
                <p className="mt-1 text-sm text-slate-400">Friday backup slot</p>
                <div className="mt-4 space-y-3">
                  {[64, 100, 22].map((percent, index) => (
                    <div key={percent} className="space-y-1">
                      <div className="flex justify-between text-sm text-slate-300">
                        <span>{["20:30 ET", "21:00 ET", "21:30 ET"][index]}</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800">
                        <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <h2 className="text-sm font-semibold text-slate-100">Availability heatmap</h2>
                <div className="mt-4 grid grid-cols-7 gap-2">
                  {players[0].slots.map((active, index) => (
                    <div
                      key={slotLabels[index]}
                      className={cx(
                        "flex h-14 items-center justify-center rounded-md border text-sm",
                        active ? "border-emerald-400/20 bg-emerald-400/15 text-emerald-200" : "border-slate-800 bg-slate-900 text-slate-500",
                      )}
                    >
                      {slotLabels[index]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AppShell() {
  const [authMode, setAuthMode] = useState<Exclude<AuthMode, "app">>("invite");
  const [screen, setScreen] = useState<AuthMode>("invite");
  const [tab, setTab] = useState<WorkspaceTab>("channels");

  const recommendedSession = useMemo(() => {
    const counts = slotLabels.map((label, index) => ({
      label,
      count: players.filter((player) => player.slots[index]).length,
    }));
    return [...counts].sort((a, b) => b.count - a.count)[0];
  }, []);

  if (screen !== "app") {
    return (
      <AuthCard
        mode={authMode}
        onEnterApp={() => setScreen("app")}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setScreen(mode);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-slate-100 md:px-6">
      <div className="grid min-h-[calc(100vh-2rem)] gap-4 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
        <aside className="rounded-lg border border-slate-800 bg-slate-950/90 p-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">Workspace</p>
            <h1 className="mt-2 text-xl font-semibold text-slate-50">Sandcastle</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Private coordination for raids, drop-ins, and shared schedules.
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Channels</p>
            <div className="mt-3 space-y-2">
              {channels.map((channel, index) => (
                <button
                  key={channel.name}
                  className={cx(
                    "flex w-full items-center justify-between rounded-md border px-3 py-3 text-left transition",
                    index === 0 ? "border-cyan-400/25 bg-cyan-400/10" : "border-slate-800 bg-slate-900/60 hover:border-slate-700",
                  )}
                  onClick={() => setTab("channels")}
                  type="button"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-100">#{channel.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{channel.topic}</div>
                  </div>
                  <span
                    className={cx(
                      "rounded-full px-2 py-1 text-xs",
                      channel.unread ? "bg-cyan-400/15 text-cyan-200" : "bg-slate-800 text-slate-400",
                    )}
                  >
                    {channel.unread || "ok"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Profile</p>
            <div className="mt-3 flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-slate-100">Bolt</div>
                <div className="mt-1 text-sm text-slate-400">Bolt#1188</div>
              </div>
              <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-xs text-emerald-300">Ready</span>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-300">
              <div className="flex justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
                <span>Role</span>
                <span>Flex tank</span>
              </div>
              <div className="flex justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
                <span>Voice</span>
                <span>Connected</span>
              </div>
              <div className="flex justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
                <span>Region</span>
                <span>US East</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="rounded-lg border border-slate-800 bg-slate-950/90 p-4">
          <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-100">#raid-night</div>
              <div className="mt-1 text-sm text-slate-400">Finalize tonight&apos;s roster, backup slot, and fallback roles.</div>
            </div>
            <div className="grid grid-cols-4 gap-2 rounded-md border border-slate-800 bg-slate-900 p-1">
              {(["channels", "polls", "events", "availability"] as const).map((item) => (
                <button
                  key={item}
                  className={cx(
                    "rounded-md px-3 py-2 text-sm capitalize transition",
                    tab === item ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-slate-800",
                  )}
                  onClick={() => setTab(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {tab === "channels" ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-lg border border-slate-800 bg-slate-950">
                <div className="space-y-3 p-4">
                  {messages.map((message) => (
                    <article key={`${message.author}-${message.time}`} className="rounded-md border border-slate-800 bg-slate-900/70 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-100">{message.author}</div>
                        <div className="text-xs text-slate-500">{message.time}</div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{message.text}</p>
                    </article>
                  ))}
                </div>
                <div className="border-t border-slate-800 p-4">
                  <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-500">
                    Reply to channel, drop a clip, or start a thread
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-100">Thread panel</h2>
                  <span className="text-xs text-slate-500">3 open</span>
                </div>
                <div className="space-y-3">
                  {threadItems.map((item) => (
                    <button
                      key={item.title}
                      className="w-full rounded-md border border-slate-800 bg-slate-900/70 p-3 text-left transition hover:border-slate-700"
                      type="button"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-100">{item.title}</span>
                        <span className="rounded-full bg-cyan-400/15 px-2 py-1 text-[11px] text-cyan-200">{item.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "polls" ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {polls.map((poll) => {
                const max = Math.max(...poll.options.map((option) => option.votes));
                return (
                  <section key={poll.question} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-base font-semibold text-slate-100">{poll.question}</h2>
                        <p className="mt-1 text-sm text-slate-400">{poll.closes}</p>
                      </div>
                      <button className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300" type="button">
                        Vote
                      </button>
                    </div>
                    <div className="mt-5 space-y-4">
                      {poll.options.map((option) => (
                        <div key={option.label}>
                          <div className="mb-2 flex justify-between text-sm text-slate-300">
                            <span>{option.label}</span>
                            <span>{option.votes} votes</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800">
                            <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${(option.votes / max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}

          {tab === "events" ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                {events.map((event) => (
                  <section key={event.title} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-slate-100">{event.title}</h2>
                        <p className="mt-1 text-sm text-slate-400">{event.time}</p>
                      </div>
                      <span className="rounded-md bg-slate-900 px-3 py-2 text-xs text-slate-300">{event.action}</span>
                    </div>
                    <div className="mt-4 rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-300">
                      {event.roster}
                    </div>
                  </section>
                ))}
              </div>

              <aside className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <h2 className="text-sm font-semibold text-slate-100">Event notes</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="rounded-md border border-slate-800 bg-slate-900 p-3">Ready-check starts 15 minutes before progression night.</div>
                  <div className="rounded-md border border-slate-800 bg-slate-900 p-3">Backup slot opens automatically if two tentatives stay unresolved.</div>
                  <div className="rounded-md border border-slate-800 bg-slate-900 p-3">Clip review pulls highlights from thread bookmarks.</div>
                </div>
              </aside>
            </div>
          ) : null}

          {tab === "availability" ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] border-b border-slate-800 bg-slate-900/70">
                  <div className="border-r border-slate-800 px-4 py-3 text-sm font-medium text-slate-300">Member</div>
                  {slotLabels.map((label) => (
                    <div key={label} className="px-2 py-3 text-center text-sm font-medium text-slate-300">
                      {label}
                    </div>
                  ))}
                </div>

                {players.map((player) => (
                  <div key={player.tag} className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] border-b border-slate-800 last:border-b-0">
                    <div className="border-r border-slate-800 px-4 py-4">
                      <div className="text-sm font-medium text-slate-100">{player.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{player.tag}</div>
                    </div>
                    {player.slots.map((active, index) => (
                      <div key={`${player.tag}-${slotLabels[index]}`} className="flex items-center justify-center px-2 py-3">
                        <div
                          className={cx(
                            "h-10 w-full max-w-[56px] rounded-md border",
                            active ? "border-emerald-400/20 bg-emerald-400/15" : "border-slate-800 bg-slate-900",
                          )}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </section>

              <aside className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <h2 className="text-sm font-semibold text-slate-100">Recommended session</h2>
                <div className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <div className="text-sm text-cyan-100">{recommendedSession.label} evening slot</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-50">{recommendedSession.count} available</div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
                    Core roster overlap is strongest on {recommendedSession.label}.
                  </div>
                  <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
                    Friday remains a viable backup if Ari confirms by noon.
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </section>

        <aside className="rounded-lg border border-slate-800 bg-slate-950/90 p-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-semibold text-slate-100">Roster pulse</h2>
            <div className="mt-4 space-y-3">
              {[
                ["Online now", "7"],
                ["Tentative", "2"],
                ["Needs reply", "4"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950 px-3 py-3 text-sm">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-medium text-slate-100">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
            <h2 className="text-sm font-semibold text-slate-100">Gamertags</h2>
            <div className="mt-4 space-y-2">
              {players.map((player) => (
                <div key={player.tag} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm">
                  <span className="text-slate-300">{player.name}</span>
                  <span className="text-slate-100">{player.tag}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            className="mt-4 w-full rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-600"
            onClick={() => setScreen(authMode)}
            type="button"
          >
            Sign out
          </button>
        </aside>
      </div>
    </main>
  );
}
