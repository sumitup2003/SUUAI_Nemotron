"use client";

import { useMemo, useState } from "react";
import type { Chat, Task } from "@/lib/types";
import ThemeToggle from "./ThemeToggle";

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onPinChat: (id: string, pinned: boolean) => void;
  tasks: Task[];
  onAddTask: (title: string) => void;
  onToggleTask: (id: string, done: boolean) => void;
  onDeleteTask: (id: string) => void;
  open: boolean;
  onClose: () => void;
  userEmail: string;
  onSignOut: () => void;
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onPinChat,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  open,
  onClose,
  userEmail,
  onSignOut,
}: SidebarProps) {
  const [tab, setTab] = useState<"chats" | "tasks">("chats");
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newTask, setNewTask] = useState("");

  const filteredChats = useMemo(() => {
    if (!query.trim()) return chats;
    return chats.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));
  }, [chats, query]);

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const startRename = (chat: Chat) => {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };
  const commitRename = () => {
    if (renamingId && renameValue.trim()) onRenameChat(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        className={`fixed z-40 flex h-full w-[85vw] max-w-[300px] flex-col border-r border-hairline bg-panel transition-transform duration-200 md:static md:w-[280px] md:max-w-none md:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center gap-2 px-4 pt-5 pb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 ring-1 ring-accent/40">
            <div className="h-2 w-2 rounded-sm bg-accent shadow-glow" />
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            SUUAI
          </span>
          <span className="ml-auto rounded-full border border-hairline px-2 py-0.5 font-mono text-[10px] text-faint">
            nemotron
          </span>
        </div>

        <div className="px-3">
          <button
            onClick={onNewChat}
            className="group flex w-full items-center gap-2 rounded-lg border border-hairline bg-raised px-3 py-2.5 text-sm font-medium text-ink transition hover:border-accent/50 hover:bg-accent-soft"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1v13M1 7.5h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            New chat
            <span className="ml-auto font-mono text-[10px] text-faint group-hover:text-accent">💭</span>
          </button>
        </div>

        <div className="mx-3 mt-4 flex gap-1 rounded-lg bg-raised p-1">
          {(["chats", "tasks"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition ${
                tab === t ? "bg-accent text-white shadow-glow" : "text-muted hover:text-ink"
              }`}
            >
              {t === "tasks" && pending.length > 0 ? `Tasks · ${pending.length}` : t}
            </button>
          ))}
        </div>

        {tab === "chats" ? (
          <>
            <div className="px-3 pt-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats…"
                className="w-full rounded-md border border-hairline bg-base px-2.5 py-1.5 text-xs text-ink placeholder:text-faint outline-none focus:border-accent/60"
              />
            </div>

            <div className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
              {filteredChats.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-faint">
                  {chats.length === 0 ? "No chats yet — start one above." : "No matches."}
                </p>
              )}
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat.id);
                    onClose();
                  }}
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                    activeChatId === chat.id
                      ? "bg-accent-soft text-ink ring-1 ring-accent/40"
                      : "text-muted hover:bg-raised hover:text-ink"
                  }`}
                >
                  {chat.pinned && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0 text-amber">
                      <path d="M12 2l2.4 6.6L21 10l-5.5 4.3L17 21l-5-3.8L7 21l1.5-6.7L3 10l6.6-1.4L12 2z" fill="currentColor" />
                    </svg>
                  )}
                  {renamingId === chat.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={commitRename}
                      onKeyDown={(e) => e.key === "Enter" && commitRename()}
                      className="w-full rounded border border-accent/60 bg-base px-1.5 py-0.5 text-xs outline-none"
                    />
                  ) : (
                    <span className="flex-1 truncate">{chat.title}</span>
                  )}
                  <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                    <button
                      title="Pin"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPinChat(chat.id, !chat.pinned);
                      }}
                      className="rounded p-1 text-faint hover:bg-hairline hover:text-amber"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2l2.4 6.6L21 10l-5.5 4.3L17 21l-5-3.8L7 21l1.5-6.7L3 10l6.6-1.4L12 2z" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      title="Rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(chat);
                      }}
                      className="rounded p-1 text-faint hover:bg-hairline hover:text-ink"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M4 20h4L18.5 9.5a1.5 1.5 0 000-2.1l-1.9-1.9a1.5 1.5 0 00-2.1 0L4 15v5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="rounded p-1 text-faint hover:bg-danger/10 hover:text-danger"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden px-3 pt-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTask.trim()) return;
                onAddTask(newTask.trim());
                setNewTask("");
              }}
              className="flex gap-1.5"
            >
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a task…"
                className="w-full rounded-md border border-hairline bg-base px-2.5 py-1.5 text-xs text-ink placeholder:text-faint outline-none focus:border-accent/60"
              />
              <button className="rounded-md bg-accent px-2.5 text-sm text-white transition hover:bg-accent-bright">
                +
              </button>
            </form>

            <div className="mt-3 flex-1 space-y-3 overflow-y-auto pb-4">
              <div className="space-y-1">
                {pending.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={onToggleTask} onDelete={onDeleteTask} />
                ))}
                {pending.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-faint">All caught up.</p>
                )}
              </div>
              {done.length > 0 && (
                <div>
                  <p className="px-1 pb-1 font-mono text-[10px] uppercase tracking-wide text-faint">
                    Done · {done.length}
                  </p>
                  <div className="space-y-1 opacity-50">
                    {done.map((task) => (
                      <TaskRow key={task.id} task={task} onToggle={onToggleTask} onDelete={onDeleteTask} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-hairline px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-lg px-1.5 py-1.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-[10px] text-muted">
              {userEmail.slice(0, 1).toUpperCase()}
            </div>
             <span className="min-w-0 flex-1 truncate text-xs text-muted">{userEmail}</span>
            <ThemeToggle />
            <button
              onClick={onSignOut}
              title="Sign out"
              className="shrink-0 rounded p-1 text-faint hover:bg-hairline hover:text-danger"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="border-t border-hairline px-4 py-3 text-[11px] text-faint">
          SUUAI by SUMIT · sumitwork25@gmail.com · open source project 
        </div>
      </aside>
    </>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-raised">
      <button
        onClick={() => onToggle(task.id, !task.done)}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          task.done ? "border-teal bg-teal text-base" : "border-hairline"
        }`}
      >
        {task.done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className={`flex-1 truncate ${task.done ? "text-faint line-through" : "text-ink"}`}>
        {task.title}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="hidden shrink-0 rounded p-0.5 text-faint hover:text-danger group-hover:block"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}