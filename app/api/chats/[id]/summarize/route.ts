import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase";

const NEMOTRON_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const KEEP_RECENT = 16;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: chat, error: chatErr } = await supabaseAdmin
    .from("chats")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();
  if (chatErr || !chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  const { data: messages, error: msgErr } = await supabaseAdmin
    .from("messages")
    .select("role, content")
    .eq("chat_id", params.id)
    .order("created_at", { ascending: true });
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  const olderCount = messages.length - KEEP_RECENT;
  const alreadyDone = chat.summary_upto || 0;
  if (olderCount <= alreadyDone) {
    return NextResponse.json({ summary: chat.summary || "" });
  }

  const toFold = messages.slice(alreadyDone, olderCount);
  if (toFold.length === 0) return NextResponse.json({ summary: chat.summary || "" });

  const transcript = toFold.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  const apiKey = process.env.NEMOTRON_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "NEMOTRON_API_KEY not set" }, { status: 500 });

  const prompt = `You maintain a running summary of an ongoing chat so the assistant can stay consistent without re-reading the full transcript every time.

Existing summary (may be empty):
${chat.summary || "(none yet)"}

New messages to fold in:
${transcript}

Write an updated, concise summary (bullet points are fine) capturing: the user's goals, key decisions, important code/requirements already established, and anything the assistant must remember. Do not include a preamble - output only the summary text.`;

  const upstream = await fetch(NEMOTRON_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: chat.model || process.env.NEMOTRON_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 600,
      stream: false,
      chat_template_kwargs: { enable_thinking: false },
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `Summarize failed (${upstream.status}): ${text}` },
      { status: 500 }
    );
  }

  const json = await upstream.json();
  const newSummary = json.choices?.[0]?.message?.content?.trim() || chat.summary || "";

  await supabaseAdmin
    .from("chats")
    .update({ summary: newSummary, summary_upto: olderCount })
    .eq("id", params.id);

  return NextResponse.json({ summary: newSummary });
}