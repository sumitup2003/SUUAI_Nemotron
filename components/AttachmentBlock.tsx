"use client";

import { useState } from "react";

export default function AttachmentBlock({ name, content }: { name: string; content: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-hairline">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 bg-raised px-3 py-2 text-left transition hover:bg-hairline/40"
      >
        <span className="text-base leading-none">📄</span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{name}</span>
        <span className="shrink-0 font-mono text-[10px] text-faint">
          {content.length.toLocaleString()} chars
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-hairline">
          <div className="flex items-center justify-end bg-panel px-3 py-1">
            <button onClick={copy} className="font-mono text-[11px] text-faint hover:text-teal">
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>
          <pre className="max-h-64 overflow-auto bg-[#0d1117] px-3 py-2 font-mono text-[11px] leading-relaxed text-ink">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}