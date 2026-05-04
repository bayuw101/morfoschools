import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiSession = {
  token?: string;
  tenantId?: string;
};

const DEFAULT_BASE_URL = "http://43.156.68.104:20128/v1";
const DEFAULT_MODEL = "MORFOSCHOOLS";
const DEFAULT_BACKEND_BASE_URL = "http://localhost:8080";
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 8_000;

const BACKEND_TOOL_GUIDE = `
MORFOSCHOOLS backend API yang boleh kamu instruksikan/gunakan:
Base URL frontend proxy membaca BACKEND_API_BASE_URL, default http://localhost:8080.
Semua request tenant-scoped wajib header:
- Authorization: Bearer <session.token>
- X-Tenant-ID: <session.tenantId>
- Content-Type: application/json

Kemampuan operasional:
1) Memeriksa jadwal ujian
   - GET /api/v1/exams
   - Untuk setiap exam: GET /api/v1/exams/{examId}/gate-windows
   - Field jadwal: publishesAt, opensAt, closesAt, targetType, targetId, password.
   - Di chat ini user bisa ketik: /jadwal-ujian

2) Menambah kelas
   - Sebelum POST /api/v1/classes, selalu cek guru via GET /api/v1/users dan filter role=teacher.
   - Jika homeroomTeacher tidak exact match dengan guru aktif, jangan buat kelas dulu. Tanyakan: "Aku tidak menemukan guru itu. Apakah guru yang kamu maksud ini: ...? Atau mau aku membuatkan data guru itu?"
   - POST /api/v1/classes
   - Body: { "name": "X-A", "gradeLevel": "10", "academicYear": "2025/2026", "homeroomTeacher": "Nama Guru", "status": "active", "studentIds": [] }
   - Di chat ini user bisa ketik: /tambah-kelas {json_body}
   - Jika perlu membuat guru: /create-teacher {"name":"Nama Guru","email":"guru@sekolah.sch.id"}

3) Create exams
   - POST /api/v1/exams
   - Body: { "title": "UTS Matematika X", "subjectName": "Matematika", "status": "draft", "durationMinutes": 90, "securityMode": "standard" }
   - status: draft|published|archived sesuai backend/UI; securityMode ikuti opsi UI yang valid.
   - Di chat ini user bisa ketik: /create-exam {json_body}

4) Add questions
   - POST /api/v1/exams/{examId}/questions
   - Body pilihan ganda: { "questionType": "multiple_choice", "prompt": "...", "position": 1, "points": 10, "options": [{"id":"a","text":"...","isCorrect":true}], "rubric": "" }
   - Body essay: { "questionType": "essay", "prompt": "...", "position": 1, "points": 10, "options": [], "rubric": "Rubrik penilaian..." }
   - Di chat ini user bisa ketik: /add-question {examId} {json_body}

Aturan keamanan:
- Untuk operasi tulis (tambah kelas/create exam/add question), jangan mengarang ID. Jika data kurang, tanyakan field yang kurang.
- Khusus create kelas: validasi homeroomTeacher ke daftar users role=teacher terlebih dahulu. Jika guru tidak ditemukan, jangan lanjut create class; tawarkan kandidat terdekat dan opsi membuat data guru.
- Jelaskan endpoint, method, header, dan JSON body yang akan dipakai.
- Jika user belum memakai command eksekusi, bantu susun command yang benar dan minta konfirmasi.
- Jika user memakai command eksekusi, server proxy akan menjalankan request backend menggunakan session login browser.
`;

function getConfig() {
  return {
    baseUrl: (process.env.AI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL ?? DEFAULT_MODEL,
    backendBaseUrl: (process.env.BACKEND_API_BASE_URL ?? DEFAULT_BACKEND_BASE_URL).replace(/\/$/, ""),
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

function latestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content.trim() ?? "";
}

function backendHeaders(session: AiSession) {
  if (!session.token || !session.tenantId) return null;
  return {
    Authorization: `Bearer ${session.token}`,
    "X-Tenant-ID": session.tenantId,
    "Content-Type": "application/json",
  };
}

async function readBackendJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Backend ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function normalizeLookup(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9@.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type BackendUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  status?: string;
};

function teacherCandidates(teacherName: string, teachers: BackendUser[]) {
  const needle = normalizeLookup(teacherName);
  if (!needle) return [];
  return teachers
    .map((teacher) => {
      const name = normalizeLookup(teacher.name);
      const email = normalizeLookup(teacher.email);
      const score =
        name === needle || email === needle
          ? 100
          : name.includes(needle) || needle.includes(name)
            ? 70
            : email.includes(needle) || needle.includes(email)
              ? 55
              : needle
                  .split(" ")
                  .filter((part) => part.length > 2 && name.includes(part)).length * 15;
      return { teacher, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.teacher);
}

function formatTeacherList(teachers: BackendUser[]) {
  if (teachers.length === 0) return "Tidak ada kandidat guru yang mirip.";
  return teachers
    .map((teacher, index) => `${index + 1}. ${teacher.name ?? "Tanpa nama"} (${teacher.email ?? "tanpa email"}) — status: ${teacher.status ?? "unknown"}`)
    .join("\n");
}

async function handleBackendCommand(command: string, session: AiSession, backendBaseUrl: string) {
  const headers = backendHeaders(session);
  if (!headers) {
    return "Aku butuh session login browser yang valid untuk mengakses backend. Silakan login ulang, lalu coba lagi.";
  }

  if (command === "/jadwal-ujian" || command.toLowerCase().startsWith("/jadwal-ujian ")) {
    const exams = await readBackendJson(`${backendBaseUrl}/api/v1/exams`, { headers });
    const data = Array.isArray(exams?.data) ? exams.data : [];
    const withWindows = await Promise.all(
      data.slice(0, 20).map(async (exam: { id?: string; title?: string; subjectName?: string; status?: string }) => {
        if (!exam.id) return { exam, gateWindows: [] };
        const windows = await readBackendJson(`${backendBaseUrl}/api/v1/exams/${encodeURIComponent(exam.id)}/gate-windows`, { headers }).catch((error) => ({ error: error instanceof Error ? error.message : "unknown_error" }));
        return { exam, gateWindows: Array.isArray(windows?.data) ? windows.data : windows };
      }),
    );
    return `Jadwal ujian dari backend (${backendBaseUrl}):\n\n${JSON.stringify(withWindows, null, 2)}`;
  }

  if (command.toLowerCase().startsWith("/tambah-kelas ")) {
    const body = JSON.parse(command.slice("/tambah-kelas ".length));
    const homeroomTeacher = String(body?.homeroomTeacher ?? "").trim();
    if (homeroomTeacher) {
      const users = await readBackendJson(`${backendBaseUrl}/api/v1/users`, { headers });
      const teachers = (Array.isArray(users?.data) ? users.data : []).filter((user: BackendUser) => user.role === "teacher");
      const exactTeacher = teachers.find((teacher: BackendUser) => normalizeLookup(teacher.name) === normalizeLookup(homeroomTeacher) || normalizeLookup(teacher.email) === normalizeLookup(homeroomTeacher));
      if (!exactTeacher) {
        const candidates = teacherCandidates(homeroomTeacher, teachers);
        return `Aku belum membuat kelas karena tidak menemukan guru bernama "${homeroomTeacher}" di data guru.\n\nApakah guru yang kamu maksud ini?\n${formatTeacherList(candidates)}\n\nKalau bukan, apakah kamu mau aku membuatkan data guru itu dulu?\nGunakan command:\n/create-teacher {"name":"${homeroomTeacher}","email":"isi-email-guru@sekolah.sch.id"}\n\nSetelah guru dibuat atau nama guru dikoreksi, jalankan lagi /tambah-kelas dengan homeroomTeacher yang sesuai.`;
      }
      body.homeroomTeacher = exactTeacher.name ?? homeroomTeacher;
    }
    const created = await readBackendJson(`${backendBaseUrl}/api/v1/classes`, { method: "POST", headers, body: JSON.stringify(body) });
    return `Kelas berhasil dibuat via POST /api/v1/classes:\n\n${JSON.stringify(created, null, 2)}`;
  }

  if (command.toLowerCase().startsWith("/create-teacher ")) {
    const body = JSON.parse(command.slice("/create-teacher ".length));
    const created = await readBackendJson(`${backendBaseUrl}/api/v1/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, role: "teacher" }),
    });
    return `Data guru berhasil dibuat via POST /api/v1/users:\n\n${JSON.stringify(created, null, 2)}\n\nSekarang kamu bisa menjalankan /tambah-kelas memakai homeroomTeacher: ${created?.name ?? body?.name}.`;
  }

  if (command.toLowerCase().startsWith("/create-exam ")) {
    const body = JSON.parse(command.slice("/create-exam ".length));
    const created = await readBackendJson(`${backendBaseUrl}/api/v1/exams`, { method: "POST", headers, body: JSON.stringify(body) });
    return `Exam berhasil dibuat via POST /api/v1/exams:\n\n${JSON.stringify(created, null, 2)}`;
  }

  if (command.toLowerCase().startsWith("/add-question ")) {
    const rest = command.slice("/add-question ".length).trim();
    const firstSpace = rest.indexOf(" ");
    if (firstSpace < 1) throw new Error("Format: /add-question {examId} {json_body}");
    const examId = rest.slice(0, firstSpace).trim();
    const body = JSON.parse(rest.slice(firstSpace + 1));
    const created = await readBackendJson(`${backendBaseUrl}/api/v1/exams/${encodeURIComponent(examId)}/questions`, { method: "POST", headers, body: JSON.stringify(body) });
    return `Question berhasil ditambahkan via POST /api/v1/exams/${examId}/questions:\n\n${JSON.stringify(created, null, 2)}`;
  }

  return null;
}

export async function POST(request: Request) {
  const { baseUrl, apiKey, model, backendBaseUrl } = getConfig();

  if (!apiKey) {
    return NextResponse.json({ error: "AI_API_KEY belum dikonfigurasi di server." }, { status: 500 });
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

  const session = ((payload as { session?: AiSession }).session ?? {}) as AiSession;
  const latest = latestUserMessage(messages);
  if (latest.startsWith("/")) {
    try {
      const commandResult = await handleBackendCommand(latest, session, backendBaseUrl);
      if (commandResult) {
        return NextResponse.json({ message: { role: "assistant", content: commandResult }, model: "morfoschools-backend" });
      }
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Command backend gagal." }, { status: 400 });
    }
  }

  const systemPrompt: ChatMessage = {
    role: "system",
    content: `Kamu adalah MORFOSCHOOLS AI Agent untuk LMS sekolah Indonesia. Jawab dalam Bahasa Indonesia yang jelas, praktis, dan aman. Bantu guru/admin terkait kelas, siswa, course, exam, grading, jadwal ujian, dan operasional sekolah. Jangan mengklaim sudah membaca data tenant nyata kecuali data itu diberikan eksplisit di chat atau lewat hasil command backend. Critical path ujian tidak boleh bergantung pada API eksternal.\n\n${BACKEND_TOOL_GUIDE}`,
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
      return NextResponse.json({ error: `9router error (${upstreamResponse.status}): ${upstreamError}` }, { status: 502 });
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menghubungi 9router." }, { status: 502 });
  }
}
