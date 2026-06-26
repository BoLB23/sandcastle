"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { apiFetch, type MetaResponse, type SessionResponse } from "../lib/api";

export function WorkspaceShell({
  user,
  active,
  children
}: {
  user: SessionResponse["user"];
  active: "channels" | "events" | "availability";
  children: ReactNode;
}) {
  const links = [
    { href: "/channels", label: "Channels", key: "channels" },
    { href: "/events", label: "Events", key: "events" },
    { href: "/availability", label: "Availability", key: "availability" }
  ] as const;
  const [deployedImageTag, setDeployedImageTag] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<MetaResponse>("/meta")
      .then((meta) => setDeployedImageTag(meta.deployedImageTag))
      .catch(() => setDeployedImageTag(null));
  }, []);

  return (
    <main className="min-h-screen bg-[#111827] px-4 py-5 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-4 rounded-lg border border-white/10 bg-[#172033]/95 p-4 shadow-xl shadow-black/20 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-amber-300 text-lg font-black text-slate-950 shadow-lg shadow-amber-950/20">
                S
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/90">Sandcastle</p>
                <h1 className="truncate text-2xl font-semibold tracking-normal text-white md:text-3xl">Private group workspace</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              The shared room for plans, conversations, and who is free tonight.
            </p>
            {deployedImageTag ? (
              <p className="mt-3 w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-slate-400">
                {deployedImageTag}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-200 font-semibold text-slate-950">
              {user.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-white">{user.displayName}</div>
              <div className="truncate text-xs text-slate-400">{user.email}</div>
              <div className="mt-1 w-fit rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
                {user.role}
              </div>
            </div>
          </div>
        </header>
        <nav className="mb-5 flex flex-wrap gap-2 rounded-lg border border-white/10 bg-[#0f172a]/80 p-1.5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                active === link.key ? "bg-amber-300 text-slate-950 shadow-sm shadow-amber-950/20" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </main>
  );
}
