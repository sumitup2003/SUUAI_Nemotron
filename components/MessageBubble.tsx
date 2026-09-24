"use client";

import { useState } from "react";
import AttachmentBlock from "./AttachmentBlock";
import CodeFileViewer from "./CodeFileViewer";
import MarkdownRenderer from "./MarkdownRenderer";
import type { Role } from "@/lib/types";

type ContentPart =
  | { type: "text"; value: string }
  | { type: "attachment"; name: string; value: string }
  | { type: "filegroup"; files: { name: string; lang: string; code: string }[] };

// Recognizes two kinds of marked-up blocks inside a message's raw markdown:
//  - [[[ATTACH name="..."]]]...[[[/ATTACH]]]  - a user-uploaded file's
//    extracted content (only ever appears in user messages)
//  - ###FILE: path\n```lang\ncode```          - one generated code file
//    (only ever appears in assistant messages, when the model follows the
//    file-format system instruction)
// Anything else is plain prose, rendered as markdown. Consecutive ###FILE
// blocks are grouped into a single tabbed CodeFileViewer.
function parseContent(content: string): ContentPart[] {
  const re =
    /(\[\[\[ATTACH name="([^"]*)"\]\]\]\n([\s\S]*?)\n\[\[\[\/ATTACH\]\]\])|(###FILE:[ \t]*([^\n]+)\n```(\w*)\n([\s\S]*?)\n```)/g;
  const parts: ContentPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let pendingFiles: { name: string; lang: string; code: string }[] = [];

  const flushFiles = () => {
    if (pendingFiles.length) {
      parts.push({ type: "filegroup", files: pendingFiles });
      pendingFiles = [];
    }
  };
  const pushText = (value: string) => {
    if (value.trim()) parts.push({ type: "text", value });
  };

  while ((match = re.exec(content))) {
    const between = content.slice(lastIndex, match.index);
    if (match[1]) {
      flushFiles();
      pushText(between);
      parts.push({ type: "attachment", name: match[2], value: match[3] });
    } else if (match[4]) {
      if (between.trim()) flushFiles();
      pushText(between);
      pendingFiles.push({ name: match[5].trim(), lang: match[6] || "", code: match[7] });
    }
    lastIndex = match.index + match[0].length;
  }
  flushFiles();
  pushText(content.slice(lastIndex));
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
          isUser ? "bg-raised text-ink" : "border border-hairline bg-panel text-ink shadow-panel"
        }`}
      >
        {streaming ? (
          <GeneratingStatus content={content} />
        ) : content ? (
          <>
            {parseContent(content).map((part, i) => {
              if (part.type === "attachment") {
                return <AttachmentBlock key={i} name={part.name} content={part.value} />;
              }
              if (part.type === "filegroup") {
                return <CodeFileViewer key={i} files={part.files} />;
              }
              return <MarkdownRenderer key={i} content={part.value} />;
            })}
            {!isUser && (
              <div className="mt-2 flex items-center gap-3 border-t border-hairline pt-2">
                <button onClick={copyMessage} className="font-mono text-[11px] text-faint transition hover:text-teal">
                  {copied ? "copied ✓" : "copy reply"}
                </button>
                <button onClick={shareMessage} className="font-mono text-[11px] text-faint transition hover:text-accent-bright">
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
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className="flex items-end gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-3 w-1 origin-bottom animate-pulse-bar rounded-full bg-accent" style={{ animationDelay: `${i * 0.15}s` }} />
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
        <span key={i} className="h-3 w-1 origin-bottom animate-pulse-bar rounded-full bg-accent" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}