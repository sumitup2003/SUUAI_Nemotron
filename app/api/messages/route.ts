import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase";

async function assertOwnsChat(userId: string, chatId: string) {
  const { data } = await supabaseAdmin
    .from("chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", userId)
    .single();
  return Boolean(data);
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chatId = req.nextUrl.searchParams.get("chat_id");
  if (!chatId) return NextResponse.json({ error: "chat_id is required" }, { status: 400 });
  if (!(await assertOwnsChat(user.id, chatId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { chat_id, role, content } = body;
  if (!chat_id || !role) {
    return NextResponse.json({ error: "chat_id and role are required" }, { status: 400 });
  }
  if (!(await assertOwnsChat(user.id, chat_id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({ chat_id, role, content: content ?? "" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin
    .from("chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chat_id);

  return NextResponse.json(data);
}