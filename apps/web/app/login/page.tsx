import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950/90 p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">Sandcastle</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-50">Sign in</h1>
          </div>
          <Link className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300" href="/">
            Back
          </Link>
        </div>

        <form className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            Email or handle
            <input
              className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-slate-100 placeholder:text-slate-500"
              type="email"
              name="email"
              placeholder="bolt@group.local"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Password
            <input
              className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-slate-100 placeholder:text-slate-500"
              type="password"
              name="password"
              placeholder="••••••••••"
            />
          </label>
          <button className="w-full rounded-md bg-cyan-400 px-4 py-3 font-medium text-slate-950" type="submit">
            Continue
          </button>
        </form>
        <div className="mt-4 rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-300">
          Device trust, roster access, and invite acceptance stay inside the private workspace.
        </div>
      </section>
    </main>
  );
}
