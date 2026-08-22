"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm rounded-2xl border border-hairline bg-panel p-6 shadow-panel">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 ring-1 ring-accent/40">
            <div className="h-2 w-2 rounded-sm bg-accent shadow-glow" />
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Nemo
          </span>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="font-display text-sm font-semibold text-ink">Check your email</p>
            <p className="mt-1.5 text-xs text-muted">
              We sent a sign-in link to <span className="text-ink">{email}</span>. Open it on
              this device to continue.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 font-mono text-[11px] text-faint hover:text-ink"
            >
              use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-hairline bg-raised px-3 py-2.5 text-base text-ink placeholder:text-faint outline-none focus:border-accent/60 sm:text-sm"
            />
            {error && <p className="mt-2 text-xs text-danger">{error}</p>}
            <button
              disabled={loading}
              className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white transition enabled:hover:bg-accent-bright disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send sign-in link"}
            </button>
            <p className="mt-3 text-center text-[11px] text-faint">
              No password needed — we'll email you a link.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}