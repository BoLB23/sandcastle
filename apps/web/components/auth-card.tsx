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
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-300/80">{eyebrow ?? "Sandcastle"}</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-50">{title}</h1>
          </div>
          <Link className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300" href={backHref}>
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
      {label}
      <input
        className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500"
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </label>
  );
}
