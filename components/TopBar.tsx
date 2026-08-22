"use client";

import { useState } from "react";
import { NEMOTRON_MODELS } from "@/lib/types";

export default function TopBar({
  title,
  model,
  onModelChange,
  onOpenSidebar,
  generating,
}: {
  title: string;
  model: string;
  onModelChange: (model: string) => void;
  onOpenSidebar: () => void;
  generating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = NEMOTRON_MODELS.find((m) => m.id === model) ?? NEMOTRON_MODELS[0];

  return (
    <div className="flex items-center gap-2 border-b border-hairline bg-panel/80 px-3 py-3 backdrop-blur sm:gap-3 sm:px-4 md:px-6">
      <button
        onClick={onOpenSidebar}
        className="rounded-md p-1.5 text-muted hover:bg-raised hover:text-ink md:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-sm font-semibold text-ink">{title}</h1>
        <div className="flex items-center gap-1.5 text-[11px] text-faint">
          <span
            className={`h-1.5 w-1.5 rounded-full ${generating ? "animate-pulse bg-teal" : "bg-faint"}`}
          />
          {generating ? "generating…" : "idle"}
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-hairline bg-raised px-2 py-1.5 text-[11px] text-muted transition hover:border-accent/50 hover:text-ink sm:px-2.5 sm:text-xs"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span className="hidden sm:inline">{current.label}</span>
          <span className="sm:hidden">{current.label.split(" ")[1] || current.label}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border border-hairline bg-panel p-1.5 shadow-2xl">
              {NEMOTRON_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onModelChange(m.id);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-lg px-2.5 py-2 text-left transition ${
                    m.id === model ? "bg-accent-soft ring-1 ring-accent/40" : "hover:bg-raised"
                  }`}
                >
                  <p className="text-xs font-medium text-ink">{m.label}</p>
                  <p className="text-[11px] text-faint">{m.blurb}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}