"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import Login from "@/components/Login";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import ChatWindow from "@/components/ChatWindow";
import Composer from "@/components/Composer";
import {
  CONTEXT_WINDOW_MESSAGES,
  SUMMARIZE_TRIGGER_MESSAGES,
  VISION_MODEL_ID,
  TRUNCATION_SENTINEL,
  MAX_AUTO_CONTINUATIONS,
  FILE_FORMAT_SYSTEM_PROMPT,
  type Chat,
  type Message,
  type Task,
} from "@/lib/types";

type PayloadMessage = { role: "system" | "user" | "assistant"; content: string | Array<Record<string, unknown>> };

export default function Home() {
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const user: User | null = session?.user ?? null;

  const [chats, setChats] = useState<Chat[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingChatId, setStreamingChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Lets the stop button reach whichever request is currently in flight,
  // and lets sendMessage tell the difference between the user pressing
  // stop and the 45s inactivity watchdog firing on its own.
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);

  const stopGeneration = useCallback(() => {
    stopRequestedRef.current = true;
    abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setChats([]);
        setTasks([]);
        setActiveChatId(null);
        setMessages([]);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(() => {
    supabaseClient.auth.signOut();
  }, []);

  const authedFetch = useCallback(
    (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      const token = session?.access_token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(url, { ...init, headers });
    },
    [session]
  );

  const userName = useMemo(() => {
    if (!user?.email) return "";
    return user.email.split("@")[0];
  }, [user]);

  const loadChats = useCallback(async () => {
    const res = await authedFetch("/api/chats");
    if (res.ok) setChats(await res.json());
  }, [authedFetch]);

  const loadTasks = useCallback(async () => {
    const res = await authedFetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }, [authedFetch]);

  useEffect(() => {
    if (!user) return;
    loadChats();
    loadTasks();
  }, [user, loadChats, loadTasks]);

  useEffect(() => {
    if (!activeChatId || !user) {
      setMessages([]);
      return;
    }
    authedFetch(`/api/messages?chat_id=${activeChatId}`)
      .then((r) => r.json())
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [activeChatId, user, authedFetch]);

  const createChat = useCallback(async () => {
    const res = await authedFetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New chat" }),
    });
    const chat: Chat = await res.json();
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    return chat;
  }, [authedFetch]);

  const uploadFile = useCallback(
    async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("chat_id", activeChatId || "unfiled");
      const res = await authedFetch("/api/upload", { method: "POST", body: fd });
      let data: { url?: string; name?: string; type?: string; size?: number; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.status === 413
            ? "That file is still too large to upload, even after compression."
            : `Upload failed (${res.status}). Please try again.`
        );
      }
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data as { url: string; name: string; type: string; size: number };
    },
    [authedFetch, activeChatId]
  );

  // Streams one /api/chat call to completion, invoking onDelta with the
  // full accumulated text so far after every chunk. Returns whether the
  // model's reply was cut off by the token limit (finish_reason: "length"),
  // detected via a sentinel the API route appends to the stream.
  const streamOnce = useCallback(
    async (
      payloadMessages: PayloadMessage[],
      model: string,
      signal: AbortSignal,
      onDelta: (text: string) => void
    ): Promise<{ text: string; truncated: boolean }> => {
      const res = await authedFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages, model }),
        signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to reach Nemotron API");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const truncatedSoFar = full.includes(TRUNCATION_SENTINEL);
        onDelta(truncatedSoFar ? full.replace(TRUNCATION_SENTINEL, "") : full);
      }

      const truncated = full.includes(TRUNCATION_SENTINEL);
      return { text: full.replace(TRUNCATION_SENTINEL, ""), truncated };
    },
    [authedFetch]
  );

  const sendMessage = useCallback(
    async (text: string, images?: string[]) => {
      setError(null);
      let chat = activeChat;
      if (!chat) chat = await createChat();

      const userMsg: Message = {
        id: crypto.randomUUID(),
        chat_id: chat.id,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      authedFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat.id, role: "user", content: text }),
      }).catch(() => {});

      if (chat.title === "New chat") {
        const title = text.slice(0, 48) + (text.length > 48 ? "…" : "");
        authedFetch(`/api/chats/${chat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        }).catch(() => {});
        setChats((prev) => prev.map((c) => (c.id === chat!.id ? { ...c, title } : c)));
      }

      setIsStreaming(true);
      setStreamingChatId(chat.id);
      setStreamingContent("");

      const allSoFar = [...messages, userMsg];
      const priorRecent = allSoFar.slice(0, -1).slice(-(CONTEXT_WINDOW_MESSAGES - 1));
      const currentContent: string | Array<Record<string, unknown>> =
        images && images.length > 0
          ? [
              { type: "text", text: text || "Describe what you see." },
              ...images.map((url) => ({ type: "image_url", image_url: { url } })),
            ]
          : text;

      const basePayload: PayloadMessage[] = [
        { role: "system", content: FILE_FORMAT_SYSTEM_PROMPT },
        ...(chat.summary
          ? [{ role: "system" as const, content: `Summary of earlier conversation so far:\n${chat.summary}` }]
          : []),
        ...priorRecent.map((m) => ({ role: m.role, content: m.content } as PayloadMessage)),
        { role: "user", content: currentContent },
      ];
      const modelForThisTurn = images && images.length > 0 ? VISION_MODEL_ID : chat.model;

      const INACTIVITY_LIMIT_MS = 45000;
      stopRequestedRef.current = false;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
      const resetInactivityTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => controller.abort(), INACTIVITY_LIMIT_MS);
      };

      let combined = "";
      let currentPayload = basePayload;
      let continuations = 0;
      let hitStreamError = false;

      try {
        while (true) {
          resetInactivityTimer();
          const { text: chunkText, truncated } = await streamOnce(
            currentPayload,
            modelForThisTurn,
            controller.signal,
            (partial) => {
              resetInactivityTimer();
              setStreamingContent(combined + partial);
            }
          );
          combined += chunkText;

          if (!truncated || continuations >= MAX_AUTO_CONTINUATIONS) break;
          continuations += 1;
          currentPayload = [
            ...currentPayload,
            { role: "assistant", content: combined },
            {
              role: "user",
              content:
                "Continue exactly where you left off. Do not repeat anything already written, and don't add any preamble - just keep going.",
            },
          ];
        }
            } catch (e) {
        hitStreamError = true;
        const aborted = e instanceof DOMException && e.name === "AbortError";
        if (aborted && stopRequestedRef.current) {
          // User pressed stop - not an error, just finish up with
          // whatever was generated so far.
        } else {
          setError(
            aborted
              ? "The response stalled and was stopped after 45s of silence. Try again, or switch to the Lightning 30B model — it's the fastest."
              : e instanceof Error
              ? e.message
              : "Something went wrong"
          );
        }
      } finally {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        abortControllerRef.current = null;
      }

      const full = combined;
      if (full) {
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          chat_id: chat.id,
          role: "assistant",
          content: full,
          created_at: new Date().toISOString(),
        };
        if (activeChatIdRef.current === chat.id) {
          setMessages((prev) => [...prev, assistantMsg]);
        }
        authedFetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chat.id, role: "assistant", content: full }),
        }).catch(() => {});

        if (allSoFar.length + 1 > SUMMARIZE_TRIGGER_MESSAGES) {
          authedFetch(`/api/chats/${chat.id}/summarize`, { method: "POST" })
            .then((r) => r.json())
            .then((data) => {
              if (data?.summary) {
                setChats((prev) => prev.map((c) => (c.id === chat!.id ? { ...c, summary: data.summary } : c)));
              }
            })
            .catch(() => {});
        }
      } else if (!hitStreamError) {
        setError("No response was generated. Please try again.");
      }

      setIsStreaming(false);
      setStreamingChatId(null);
      setStreamingContent("");
    },
    [activeChat, messages, createChat, authedFetch, streamOnce]
  );

  const deleteChat = useCallback(
    async (id: string) => {
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) setActiveChatId(null);
      await authedFetch(`/api/chats/${id}`, { method: "DELETE" });
    },
    [activeChatId, authedFetch]
  );

  const renameChat = useCallback(
    async (id: string, title: string) => {
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
      await authedFetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    },
    [authedFetch]
  );

  const pinChat = useCallback(
    async (id: string, pinned: boolean) => {
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, pinned } : c)));
      await authedFetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
    },
    [authedFetch]
  );

  const setModel = useCallback(
    async (model: string) => {
      if (!activeChatId) return;
      setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, model } : c)));
      await authedFetch(`/api/chats/${activeChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
    },
    [activeChatId, authedFetch]
  );

  const addTask = useCallback(
    async (title: string) => {
      const res = await authedFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const task: Task = await res.json();
      setTasks((prev) => [task, ...prev]);
    },
    [authedFetch]
  );

  const toggleTask = useCallback(
    async (id: string, done: boolean) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
      await authedFetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
    },
    [authedFetch]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await authedFetch(`/api/tasks/${id}`, { method: "DELETE" });
    },
    [authedFetch]
  );

  if (authLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-base">
        <div className="h-2 w-2 animate-pulse rounded-sm bg-accent" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-base">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChat={() => {
          setActiveChatId(null);
          setSidebarOpen(false);
        }}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
        onPinChat={pinChat}
        tasks={tasks}
        onAddTask={addTask}
        onToggleTask={toggleTask}
        onDeleteTask={deleteTask}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={user.email || ""}
        onSignOut={signOut}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={activeChat?.title || "New chat"}
          model={activeChat?.model || "nvidia/nemotron-3.5-lightning-30b-a3b"}
          onModelChange={setModel}
          onOpenSidebar={() => setSidebarOpen(true)}
          generating={isStreaming && streamingChatId === activeChatId}
        />

        <ChatWindow
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={isStreaming && streamingChatId === activeChatId}
          onSuggestion={sendMessage}
          userName={userName}
        />

        {error && (
          <div className="mx-auto mb-2 max-w-3xl px-4">
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          </div>
        )}

        <Composer
          onSend={sendMessage}
          disabled={isStreaming && streamingChatId === activeChatId}
          isStreaming={isStreaming && streamingChatId === activeChatId}
          onStop={stopGeneration}
          uploadFile={uploadFile}
        />
      </div>
    </div>
  );
}