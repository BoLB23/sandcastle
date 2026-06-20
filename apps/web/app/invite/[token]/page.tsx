import Link from "next/link";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950/90 p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">Sandcastle</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-50">Accept invite</h1>
          </div>
          <Link className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300" href="/">
            Back
          </Link>
        </div>

        <p className="mt-4 text-sm text-slate-400">Invite token ending in {token.slice(-6)}</p>

        <form className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            Display name
            <input
              className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-slate-100"
              name="displayName"
              placeholder="Bolt"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Gamertag
            <input
              className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-slate-100"
              name="gamertag"
              placeholder="Bolt#1188"
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Email
            <input
              className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-slate-100"
              type="email"
              name="email"
              placeholder="bolt@group.local"
            />
          </label>
          <button className="w-full rounded-md bg-cyan-400 px-4 py-3 font-medium text-slate-950" type="submit">
            Accept invite
          </button>
        </form>
        <div className="mt-4 rounded-md border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
          Joining grants access to group channels, polls, event signups, and weekly availability planning.
        </div>
      </section>
    </main>
  );
}
