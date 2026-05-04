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
   - User cukup berkata natural seperti: "tampilkan jadwal ujian". Jangan minta slash command.

2) Menambah kelas
   - Sebelum POST /api/v1/classes, selalu cek guru via GET /api/v1/users dan filter role=teacher.
   - Jika homeroomTeacher tidak exact match dengan guru aktif, jangan buat kelas dulu. Tanyakan: "Aku tidak menemukan guru itu. Apakah guru yang kamu maksud ini: ...? Atau mau aku membuatkan data guru itu?"
   - POST /api/v1/classes
   - Body: { "name": "X-A", "gradeLevel": "10", "academicYear": "2025/2026", "homeroomTeacher": "Nama Guru", "status": "active", "studentIds": [] }
   - User cukup berkata natural seperti: "buat kelas X-A dengan wali kelas Pak Budi". Jangan minta JSON/slash command.
   - Jika perlu membuat guru, minta nama lengkap dan email secara natural.

3) Create exams
   - POST /api/v1/exams
   - Body: { "title": "UTS Matematika X", "subjectName": "Matematika", "status": "draft", "durationMinutes": 90, "securityMode": "standard" }
   - status: draft|published|archived sesuai backend/UI; securityMode ikuti opsi UI yang valid.
   - User cukup berkata natural seperti: "buat ujian UTS Matematika 90 menit". Jangan minta JSON/slash command.

4) Add questions
   - POST /api/v1/exams/{examId}/questions
   - Body pilihan ganda: { "questionType": "multiple_choice", "prompt": "...", "position": 1, "points": 10, "options": [{"id":"a","text":"...","isCorrect":true}], "rubric": "" }
   - Body essay: { "questionType": "essay", "prompt": "...", "position": 1, "points": 10, "options": [], "rubric": "Rubrik penilaian..." }
   - User cukup berkata natural dan AI harus menanyakan data yang kurang. Jangan minta JSON/slash command.

Aturan keamanan:
- Untuk operasi tulis (tambah kelas/create exam/add question), jangan mengarang ID. Jika data kurang, tanyakan field yang kurang.
- Khusus create kelas: validasi homeroomTeacher ke daftar users role=teacher terlebih dahulu. Jika guru tidak ditemukan, jangan lanjut create class; tawarkan kandidat terdekat dan opsi membuat data guru.
- Jelaskan endpoint, method, header, dan JSON body yang akan dipakai.
- Jangan tampilkan JSON mentah ke user kecuali user eksplisit meminta payload teknis.
- Respons hasil backend harus manusiawi: ringkas, bullet list, tanggal Indonesia, dan berisi langkah berikutnya.
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


type PlannedAction = {
  action?: "check_exam_schedule" | "create_class" | "create_teacher" | "create_exam" | "add_question" | "ask_followup" | "none";
  params?: Record<string, unknown>;
  examId?: string;
  missing?: string[];
  question?: string;
};

type BackendExam = { id?: string; title?: string; subjectName?: string; status?: string; durationMinutes?: number; securityMode?: string };
type BackendGateWindow = { publishesAt?: string; opensAt?: string; closesAt?: string; targetType?: string; targetId?: string; password?: string };

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "belum diset";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date);
}

function formatExamSchedule(items: Array<{ exam: BackendExam; gateWindows: BackendGateWindow[] | unknown }>) {
  if (items.length === 0) return "Belum ada jadwal ujian di backend untuk tenant ini.";
  return [
    "Berikut jadwal ujian yang aku temukan dari backend:",
    "",
    ...items.map(({ exam, gateWindows }, index) => {
      const windows = Array.isArray(gateWindows) ? gateWindows : [];
      const schedule = windows.length > 0
        ? windows.map((window, windowIndex) => [
            `   Jadwal ${windowIndex + 1}:`,
            `   • Publish: ${formatDateTime(window.publishesAt)}`,
            `   • Dibuka: ${formatDateTime(window.opensAt)}`,
            `   • Ditutup: ${formatDateTime(window.closesAt)}`,
            `   • Target: ${window.targetType ?? "semua"}${window.targetId ? ` (${window.targetId})` : ""}`,
            `   • Password: ${window.password ? "aktif" : "tidak aktif"}`,
          ].join("\n"))
        : ["   Belum ada gate window/jadwal buka-tutup." ];
      return [
        `${index + 1}. ${exam.title ?? "Tanpa judul"}`,
        `   • Mapel: ${exam.subjectName ?? "-"}`,
        `   • Status: ${exam.status ?? "-"}`,
        `   • Durasi: ${exam.durationMinutes ?? "-"} menit`,
        ...schedule,
      ].join("\n");
    }),
  ].join("\n");
}

function summarizeCreated(label: string, item: Record<string, unknown>) {
  const lines = [`${label} berhasil dibuat.`];
  if (item.id) lines.push(`ID: ${item.id}`);
  if (item.name) lines.push(`Nama: ${item.name}`);
  if (item.title) lines.push(`Judul: ${item.title}`);
  if (item.email) lines.push(`Email: ${item.email}`);
  if (item.subjectName) lines.push(`Mapel: ${item.subjectName}`);
  if (item.gradeLevel) lines.push(`Tingkat: ${item.gradeLevel}`);
  if (item.academicYear) lines.push(`Tahun ajaran: ${item.academicYear}`);
  if (item.status) lines.push(`Status: ${item.status}`);
  return lines.join("\n");
}

function naturalIntent(text: string) {
  const normalized = normalizeLookup(text);
  const wantsSchedule = normalized.includes("jadwal") && normalized.includes("ujian");
  const wantsCreate = ["buat", "bikin", "tambah", "create", "add"].some((word) => normalized.includes(word));
  if (wantsSchedule) return "check_exam_schedule";
  if (wantsCreate && normalized.includes("kelas")) return "create_class";
  if (wantsCreate && (normalized.includes("guru") || normalized.includes("teacher"))) return "create_teacher";
  if (wantsCreate && (normalized.includes("exam") || normalized.includes("ujian"))) return "create_exam";
  return "none";
}


async function planBackendAction(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[], latest: string): Promise<PlannedAction> {
  const planningPrompt: ChatMessage = {
    role: "system",
    content: `Kamu adalah intent planner untuk MORFOSCHOOLS AI. Balas HANYA JSON valid, tanpa markdown. Jangan menjalankan aksi. Ekstrak niat user dari percakapan.
Action yang tersedia:
- check_exam_schedule: user ingin melihat/mengecek/menampilkan jadwal ujian.
- create_class: user ingin membuat/menambah kelas. params: name, gradeLevel, academicYear, homeroomTeacher, status, studentIds.
- create_teacher: user menyetujui membuat guru atau meminta tambah guru. params: name, email.
- create_exam: user ingin membuat ujian/exam. params: title, subjectName, status, durationMinutes, securityMode.
- add_question: user ingin menambah soal. wajib examId dan params questionType, prompt, position, points, options, rubric.
- ask_followup: data wajib belum lengkap. Sertakan missing dan question natural dalam Bahasa Indonesia.
- none: bukan aksi backend.

Rules:
- Untuk create_class wajib minimal name, gradeLevel, academicYear, homeroomTeacher. Jika kurang, ask_followup.
- Untuk create_teacher wajib name dan email. Jika kurang, ask_followup.
- Untuk create_exam wajib title, subjectName, durationMinutes. Default status=draft, securityMode=standard jika tidak disebut.
- Untuk add_question wajib examId, questionType, prompt, position, points. Jika pilihan ganda, options wajib.
- Jangan minta user menulis JSON atau slash command. Tanyakan data secara natural.

Contoh output: {"action":"check_exam_schedule","params":{}}
Contoh followup: {"action":"ask_followup","missing":["homeroomTeacher"],"question":"Wali kelasnya siapa?"}`,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [planningPrompt, ...messages, { role: "user", content: `Latest user message: ${latest}` }], temperature: 0, stream: false }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`planner_failed_${response.status}: ${raw.slice(0, 300)}`);
  const parsed = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
  const content = parsed.choices?.[0]?.message?.content?.trim() ?? "{}";
  const jsonText = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(jsonText) as PlannedAction;
}

async function runPlannedAction(plan: PlannedAction, session: AiSession, backendBaseUrl: string) {
  const headers = backendHeaders(session);
  if (!headers) return "Aku butuh session login browser yang valid untuk mengakses backend. Silakan login ulang, lalu coba lagi.";

  if (plan.action === "ask_followup") {
    return plan.question ?? `Aku masih butuh data berikut: ${(plan.missing ?? []).join(", ")}.`;
  }

  if (plan.action === "check_exam_schedule") {
    const exams = await readBackendJson(`${backendBaseUrl}/api/v1/exams`, { headers });
    const data = Array.isArray(exams?.data) ? exams.data : [];
    const withWindows = await Promise.all(
      data.slice(0, 20).map(async (exam: BackendExam) => {
        if (!exam.id) return { exam, gateWindows: [] };
        const windows = await readBackendJson(`${backendBaseUrl}/api/v1/exams/${encodeURIComponent(exam.id)}/gate-windows`, { headers }).catch(() => ({ data: [] }));
        return { exam, gateWindows: Array.isArray(windows?.data) ? windows.data : [] };
      }),
    );
    return formatExamSchedule(withWindows);
  }

  if (plan.action === "create_class") {
    const body = { status: "active", studentIds: [], ...(plan.params ?? {}) } as Record<string, unknown>;
    const homeroomTeacher = String(body.homeroomTeacher ?? "").trim();
    if (!body.name || !body.gradeLevel || !body.academicYear || !homeroomTeacher) {
      return "Aku bisa buat kelasnya, tapi masih butuh nama kelas, tingkat/grade, tahun ajaran, dan nama wali kelas/guru.";
    }
    const users = await readBackendJson(`${backendBaseUrl}/api/v1/users`, { headers });
    const teachers = (Array.isArray(users?.data) ? users.data : []).filter((user: BackendUser) => user.role === "teacher");
    const exactTeacher = teachers.find((teacher: BackendUser) => normalizeLookup(teacher.name) === normalizeLookup(homeroomTeacher) || normalizeLookup(teacher.email) === normalizeLookup(homeroomTeacher));
    if (!exactTeacher) {
      const candidates = teacherCandidates(homeroomTeacher, teachers);
      return `Aku belum membuat kelas karena tidak menemukan guru bernama "${homeroomTeacher}" di data guru.

Apakah guru yang kamu maksud ini?
${formatTeacherList(candidates)}

Kalau bukan, apakah kamu mau aku membuatkan data guru itu dulu? Jika iya, beri aku nama lengkap dan email guru tersebut.`;
    }
    body.homeroomTeacher = exactTeacher.name ?? homeroomTeacher;
    const created = await readBackendJson(`${backendBaseUrl}/api/v1/classes`, { method: "POST", headers, body: JSON.stringify(body) });
    return summarizeCreated("Kelas", created as Record<string, unknown>);
  }

  if (plan.action === "create_teacher") {
    const body = { ...(plan.params ?? {}), role: "teacher" } as Record<string, unknown>;
    if (!body.name || !body.email) return "Aku bisa membuat data guru, tapi aku butuh nama lengkap dan email guru terlebih dahulu.";
    const created = await readBackendJson(`${backendBaseUrl}/api/v1/users`, { method: "POST", headers, body: JSON.stringify(body) });
    return `${summarizeCreated("Data guru", created as Record<string, unknown>)}

Sekarang aku bisa lanjut membuat kelas dengan guru tersebut sebagai wali kelas.`;
  }

  if (plan.action === "create_exam") {
    const body = { status: "draft", securityMode: "standard", ...(plan.params ?? {}) } as Record<string, unknown>;
    if (!body.title || !body.subjectName || !body.durationMinutes) return "Aku bisa membuat exam, tapi masih butuh judul ujian, mata pelajaran, dan durasi ujian.";
    const created = await readBackendJson(`${backendBaseUrl}/api/v1/exams`, { method: "POST", headers, body: JSON.stringify(body) });
    return summarizeCreated("Exam", created as Record<string, unknown>);
  }

  if (plan.action === "add_question") {
    if (!plan.examId) return "Aku butuh examId ujian yang akan ditambahkan soal.";
    const body = plan.params ?? {};
    const created = await readBackendJson(`${backendBaseUrl}/api/v1/exams/${encodeURIComponent(plan.examId)}/questions`, { method: "POST", headers, body: JSON.stringify(body) });
    return summarizeCreated("Soal", created as Record<string, unknown>);
  }

  return null;
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

  const detectedIntent = naturalIntent(latest);
  if (detectedIntent !== "none") {
    try {
      const plan = await planBackendAction(baseUrl, apiKey, model, messages, latest);
      if (!plan.action || plan.action === "none") {
        plan.action = detectedIntent;
      }
      const actionResult = await runPlannedAction(plan, session, backendBaseUrl);
      if (actionResult) {
        return NextResponse.json({ message: { role: "assistant", content: actionResult }, model: "morfoschools-backend" });
      }
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Aksi backend gagal diproses." }, { status: 400 });
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
