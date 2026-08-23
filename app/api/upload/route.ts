import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

// Vercel serverless functions cap request bodies around 4.5MB - stay safely
// under that so uploads fail with a clear message instead of a cryptic 413.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const chatId = (form.get("chat_id") as string) || "unfiled";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is larger than 4MB" }, { status: 413 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${chatId}/${crypto.randomUUID()}-${safeName}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from("attachments")
    .upload(path, bytes, { contentType: file.type || "application/octet-stream" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from("attachments").getPublicUrl(path);

  return NextResponse.json({
    url: data.publicUrl,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
  });
}