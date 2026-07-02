"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { apiFetch, type Channel, type MetaResponse, type SessionResponse } from "../lib/api";
import { Badge } from "./ui";

const navLinks = [
  { href: "/channels", label: "Channels", key: "channels" },
  { href: "/events", label: "Events", key: "events" },
  { href: "/availability", label: "Availability", key: "availability" }
] as const;

export function WorkspaceShell({
  user,
  active,
  activeChannelId,
  children
}: {
  user: SessionResponse["user"];
  active: "channels" | "events" | "availability";
  activeChannelId?: string;
  children: ReactNode;
}) {
  const [deployedImageTag, setDeployedImageTag] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    void apiFetch<MetaResponse>("/meta")
      .then((meta) => setDeployedImageTag(meta.deployedImageTag))
      .catch(() => setDeployedImageTag(null));
  }, []);

  useEffect(() => {
    void apiFetch<Channel[]>("/channels")
      .then(setChannels)
      .catch(() => setChannels([]));
  }, []);

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
            S
          </div>
          <span className="truncate text-sm font-semibold text-ink">Sandcastle</span>
        </div>

        <nav className="flex flex-col gap-0.5 px-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                active === link.key
                  ? "bg-accent-soft text-ink"
                  : "text-ink-muted hover:bg-surface-raised hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-subtle">Channels</p>
          <div className="flex flex-col gap-0.5">
            {channels.map((channel) => {
              const isActive = channel.id === activeChannelId;
              return (
                <Link
                  key={channel.id}
                  href={`/channels/${channel.id}`}
                  className={`group relative truncate rounded-md py-1.5 pl-3 pr-2 text-sm transition ${
                    isActive ? "bg-surface-raised text-ink" : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                  }`}
                >
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
                  ) : null}
                  <span className="truncate">#{channel.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {deployedImageTag ? (
          <p className="border-t border-border px-4 py-3 font-mono text-[11px] text-ink-subtle">{deployedImageTag}</p>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-accent text-xs font-bold text-accent-foreground">
              S
            </div>
            <span className="text-sm font-semibold">Sandcastle</span>
          </div>
          <nav className="flex gap-1 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  active === link.key ? "bg-accent-soft text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-raised text-xs font-semibold text-ink">
              {user.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="truncate text-sm font-medium leading-tight text-ink">{user.displayName}</div>
              <div className="truncate text-xs leading-tight text-ink-subtle">{user.email}</div>
            </div>
            <Badge tone="neutral">{user.role}</Badge>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
