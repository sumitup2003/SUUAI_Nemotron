import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/supabase";

export const runtime = "nodejs";
// Vercel kills serverless functions after a default timeout (as low as 10s
// on some plans). Code-heavy answers can take longer than that to stream
// fully, which is what causes replies to look "stuck" mid-generation - the
// connection just gets cut. This raises the ceiling to the Hobby-plan max.
export const maxDuration = 60;

const NEMOTRON_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const apiKey = process.env.NEMOTRON_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "NEMOTRON_API_KEY is not set on the server." }),
      { status: 500 }
    );
  }

    const body = await req.json();
  const { messages, model } = body as {
    messages: { role: string; content: string | Array<Record<string, unknown>> }[];
    model?: string;
  };

  const upstream = await fetch(NEMOTRON_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: model || process.env.NEMOTRON_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b",
      messages,
      temperature: 0.5,
      top_p: 0.9,
      max_tokens: 8192,
      stream: true,
      // Nemotron 3 models are reasoning-capable and otherwise stream their
      // chain-of-thought through a separate `reasoning_content` field. We
      // want plain answers in the visible chat, so thinking stays off.
      chat_template_kwargs: { enable_thinking: false },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Nemotron API error (${upstream.status}): ${text}` }),
      { status: upstream.status || 500 }
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          reader.cancel().catch(() => {});
          controller.close();
          return;
        }
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        } catch {
          // ignore partial/non-JSON chunks
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}