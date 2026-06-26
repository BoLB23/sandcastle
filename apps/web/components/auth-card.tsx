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
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section className="relative w-full max-w-md overflow-hidden rounded-lg border border-slate-700/70 bg-slate-950/75 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] shadow-black/30 backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/60 to-transparent" />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-amber-200/80">{eyebrow ?? "Sandcastle"}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50">{title}</h1>
          </div>
          <Link
            className="shrink-0 rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 shadow-sm shadow-black/20 transition hover:border-amber-200/40 hover:bg-slate-900 hover:text-white"
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
    <label className="block text-sm font-medium text-slate-200">
      <span className="text-sm text-slate-100">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-900/85 px-4 py-3 text-slate-100 shadow-inner shadow-black/10 placeholder:text-slate-500 focus:border-amber-200/50 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200/30 focus:ring-offset-2 focus:ring-offset-slate-950"
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </label>
  );
}
