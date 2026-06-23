"use client";

import Link from "next/link";
import { ReactNode } from "react";
import type { SessionResponse } from "../lib/api";

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17324a,transparent_38%),linear-gradient(180deg,#071019,#08131e)] px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80">Sandcastle</p>
            <h1 className="mt-2 text-3xl font-semibold">Private group workspace</h1>
            <p className="mt-2 text-sm text-slate-400">Auth, messaging, events, and evening availability only.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            <div className="font-medium text-slate-100">{user.displayName}</div>
            <div>{user.email}</div>
            <div className="mt-1 uppercase tracking-[0.14em] text-amber-300/80">{user.role}</div>
          </div>
        </header>
        <nav className="mb-6 flex flex-wrap gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm ${
                active === link.key ? "bg-amber-300 text-slate-950" : "border border-slate-800 bg-slate-950/80 text-slate-300"
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
