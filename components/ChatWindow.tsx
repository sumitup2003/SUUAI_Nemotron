"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { Message } from "@/lib/types";

const SUGGESTIONS = [
  "Write a Python function to deduplicate a list while preserving order",
  "Explain this SQL query line by line",
  "Convert this for-loop to a list comprehension",
  "Find the bug in my React useEffect",
];

function greetingWord() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Still up";
}

export default function ChatWindow({
  messages,
  streamingContent,
  isStreaming,
  onSuggestion,
  userName,
}: {
  messages: Message[];
  streamingContent: string;
  isStreaming: boolean;
  onSuggestion: (text: string) => void;
  userName?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center sm:px-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
          <div className="h-3 w-3 rounded-sm bg-accent shadow-glow" />
        </div>
        <h2 className="font-display text-lg font-semibold text-ink">
          {greetingWord()}
          {userName ? `, ${userName}` : ""} — what are we building today?
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Ask for code, a review, a fix, or an explanation — SUUAI streams the answer
          straight from Nemotron.
        </p>
        <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="rounded-xl border border-hairline bg-panel px-3.5 py-2.5 text-left text-xs text-muted transition hover:border-accent/50 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-5 overflow-y-auto px-3 py-6 sm:px-4 md:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {isStreaming && (
          <MessageBubble role="assistant" content={streamingContent} streaming />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}