"use client";

import AttachmentBlock from "./AttachmentBlock";
import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import type { Role } from "@/lib/types";

type ContentPart =
  | { type: "text"; value: string }
  | { type: "attachment"; name: string; value: string };

function splitAttachments(content: string): ContentPart[] {
  const re = /\[\[\[ATTACH name="([^"]*)"\]\]\]\n([\s\S]*?)\n\[\[\[\/ATTACH\]\]\]/g;
  const parts: ContentPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content))) {
    if (match.index > lastIndex) parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    parts.push({ type: "attachment", name: match[1], value: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) parts.push({ type: "text", value: content.slice(lastIndex) });
  return parts;
}

export default function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: Role;
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareMessage = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: content, title: "Nemo response" });
      } else {
        await navigator.clipboard.writeText(content);
      }
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      // user closed the native share sheet - ignore
    }
  };

  return (
    <div className={`flex animate-fade-up gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-semibold ${
          isUser ? "bg-raised text-muted" : "bg-accent/20 text-accent ring-1 ring-accent/30"
        }`}
      >
        {isUser ? "you" : "nx"}
      </div>
      <div
        className={`min-w-0 max-w-[85%] sm:max-w-[78ch] break-words rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-raised text-ink"
            : "border border-hairline bg-panel text-ink shadow-panel"
        }`}
      >
        {streaming ? (
          <GeneratingStatus content={content} />
        ) : content ? (
          <>
            {splitAttachments(content).map((part, i) =>
              part.type === "attachment" ? (
                <AttachmentBlock key={i} name={part.name} content={part.value} />
              ) : (
                part.value.trim() && <MarkdownRenderer key={i} content={part.value} />
              )
            )}
            {!isUser && (
              <div className="mt-2 flex items-center gap-3 border-t border-hairline pt-2">
                <button
                  onClick={copyMessage}
                  className="font-mono text-[11px] text-faint transition hover:text-teal"
                >
                  {copied ? "copied ✓" : "copy reply"}
                </button>
                <button
                  onClick={shareMessage}
                  className="font-mono text-[11px] text-faint transition hover:text-accent-bright"
                >
                  {shared ? "shared ✓" : "share"}
                </button>
              </div>
            )}
          </>
        ) : (
          <ThinkingDots />
        )}
      </div>
    </div>
  );
}

function GeneratingStatus({ content }: { content: string }) {
  // While a reply is streaming, raw partial markdown/code looks like a
  // messy, half-formed wall of text that forces scrolling. Show a calm
  // status instead and reveal the fully rendered, highlighted answer
  // only once the stream finishes.
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className="flex items-end gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-3 w-1 origin-bottom animate-pulse-bar rounded-full bg-accent"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-shimmer font-mono text-xs">
        {words === 0 ? "Thinking…" : `Generating… ${words} words so far`}
      </span>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-end gap-0.5 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-3 w-1 origin-bottom animate-pulse-bar rounded-full bg-accent"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}