"use client";

import Link from "next/link";
import { ReactNode } from "react";

export function AuthCard({
  title,
  eyebrow,
  children,
  backHref = "/login"
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  backHref?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-accent text-xs font-bold text-accent-foreground">
                S
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-subtle">{eyebrow ?? "Sandcastle"}</p>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          </div>
          <Link
            className="shrink-0 rounded-md border border-border px-3.5 py-2 text-sm font-medium text-ink-muted transition hover:border-border-strong hover:text-ink"
            href={backHref}
          >
            Back
          </Link>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      <span className="text-sm text-ink">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-border bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </label>
  );
}
