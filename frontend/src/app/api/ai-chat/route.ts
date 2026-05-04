import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const DEFAULT_BASE_URL = "http://43.156.68.104:20128/v1";
const DEFAULT_MODEL = "MORFOSCHOOLS";
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 8_000;

function getConfig() {
  return {
    baseUrl: (process.env.AI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL ?? DEFAULT_MODEL,
  };
}

function normalizeMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value)) return null;

  const messages = value
    .slice(-MAX_MESSAGES)
    .map((message) => {
      if (!message || typeof message !== "object") return null;
      const candidate = message as Partial<ChatMessage>;
      if (candidate.role !== "user" && candidate.role !== "assistant" && candidate.role !== "system") return null;
      if (typeof candidate.content !== "string") return null;
      const content = candidate.content.trim().slice(0, MAX_CONTENT_LENGTH);
      if (!content) return null;
      return { role: candidate.role, content } satisfies ChatMessage;
    })
    .filter((message): message is ChatMessage => Boolean(message));

  return messages.length > 0 ? messages : null;
}

export async function POST(request: Request) {
  const { baseUrl, apiKey, model } = getConfig();

  if (!apiKey) {
    return NextResponse.json(
      { error: "AI_API_KEY belum dikonfigurasi di server." },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const messages = normalizeMessages((payload as { messages?: unknown }).messages);
  if (!messages) {
    return NextResponse.json({ error: "Minimal kirim satu message user/assistant." }, { status: 400 });
  }

  const systemPrompt: ChatMessage = {
    role: "system",
    content:
      "Kamu adalah MORFOSCHOOLS AI Agent untuk LMS sekolah Indonesia. Jawab dalam Bahasa Indonesia yang jelas, praktis, dan aman. Bantu guru/admin terkait kelas, siswa, course, exam, grading, dan operasional sekolah. Jangan mengklaim sudah membaca data tenant nyata kecuali data itu diberikan eksplisit di chat. Critical path ujian tidak boleh bergantung pada API eksternal.",
  };

  try {
    const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [systemPrompt, ...messages],
        temperature: 0.4,
        stream: false,
      }),
    });

    const responseText = await upstreamResponse.text();
    let responseJson: unknown = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }

    if (!upstreamResponse.ok) {
      const upstreamError =
        typeof responseJson === "object" && responseJson && "error" in responseJson
          ? JSON.stringify((responseJson as { error: unknown }).error)
          : responseText.slice(0, 500);
      return NextResponse.json(
        { error: `9router error (${upstreamResponse.status}): ${upstreamError}` },
        { status: 502 },
      );
    }

    const assistantContent =
      typeof responseJson === "object" &&
      responseJson &&
      "choices" in responseJson &&
      Array.isArray((responseJson as { choices: unknown }).choices)
        ? ((responseJson as { choices: Array<{ message?: { content?: unknown } }> }).choices[0]?.message?.content ?? "")
        : "";

    if (typeof assistantContent !== "string" || !assistantContent.trim()) {
      return NextResponse.json({ error: "Response AI kosong atau tidak dikenali." }, { status: 502 });
    }

    return NextResponse.json({
      message: { role: "assistant", content: assistantContent.trim() },
      model,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghubungi 9router." },
      { status: 502 },
    );
  }
}
