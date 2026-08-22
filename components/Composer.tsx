"use client";

import { useEffect, useRef, useState } from "react";

export default function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="border-t border-hairline bg-panel/80 px-4 py-3 backdrop-blur md:px-8">
      <div
        className={`mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-raised px-3 py-2 transition ${
          disabled ? "border-hairline opacity-70" : "border-hairline focus-within:border-accent/60 focus-within:shadow-glow"
        }`}
      >
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask SUUAI to write, explain, or debug some code…"
          className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-base text-ink placeholder:text-faint outline-none md:text-sm"
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition enabled:hover:bg-accent-bright disabled:opacity-30"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl text-center font-mono text-[10px] text-faint">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}
