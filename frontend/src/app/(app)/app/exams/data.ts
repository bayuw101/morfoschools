import * as z from "zod";

export const examSchema = z.object({
  title: z.string().min(3, "Judul exam minimal 3 karakter"),
  subject: z.string().min(1, "Subject wajib dipilih"),
  duration: z.string().min(1, "Durasi wajib diisi"),
  status: z.enum(["draft", "scheduled", "published"], {
    message: "Status wajib dipilih",
  }),
  rules: z.string().min(10, "Rules minimal 10 karakter"),
  securityMode: z.enum(["secure_required", "unsecure_allowed"]).default("secure_required"),
});

export const questionSchema = z.object({
  prompt: z.string().min(10, "Pertanyaan minimal 10 karakter"),
  type: z.enum(["multiple_choice", "short_answer", "essay"], {
    message: "Tipe soal wajib dipilih",
  }),
  points: z.string().min(1, "Poin wajib diisi"),
  answerKey: z.string().min(1, "Kunci/rubrik wajib diisi"),
  options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  correctOptionId: z.string().optional(),
  correctOptionIds: z.array(z.string()).optional(),
  scoringMode: z.enum(["all_or_nothing", "partial", "percentage"]).optional(),
});

export type ExamForm = z.infer<typeof examSchema>;
export type QuestionForm = z.infer<typeof questionSchema>;
export type QuestionOption = { id: string; text: string };
export type Question = QuestionForm & {
  id: string;
  options?: QuestionOption[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  scoringMode?: "all_or_nothing" | "partial" | "percentage";
};
export type Targeting = {
  subjectGroups: string[];
  classSections: string[];
  students: string[];
};
export type Prerequisites = {
  courses: string[];
  exams: string[];
};
export type GateRule = {
  id: string;
  scope: "class" | "group" | "student";
  targets: string[];
  passwordEnabled: boolean;
  password: string;
  publishAt: string;
  openAt: string;
  closeAt: string;
};
export type Exam = ExamForm & {
  id: string;
  questions: Question[];
  targeting: Targeting;
  prerequisites: Prerequisites;
  gateRules: GateRule[];
  submissions: number;
};

export const emptyExam: ExamForm = {
  title: "",
  subject: "Matematika X",
  duration: "90 menit",
  status: "draft",
  rules:
    "Kerjakan mandiri. Sistem akan menyimpan jawaban otomatis dan submit akhir memakai digital receipt.",
  securityMode: "secure_required",
};

export const emptyQuestion: QuestionForm = {
  prompt: "",
  type: "multiple_choice",
  points: "10",
  answerKey: "",
};

export const emptyTargeting: Targeting = {
  subjectGroups: ["Matematika X - Pagi"],
  classSections: [],
  students: [],
};

export const emptyPrerequisites: Prerequisites = {
  courses: [],
  exams: [],
};

export const emptyGateRule: GateRule = {
  id: "gate-default",
  scope: "class",
  targets: [],
  passwordEnabled: false,
  password: "",
  publishAt: "",
  openAt: "",
  closeAt: "",
};

export const initialExams: Exam[] = [
  {
    id: "exam-mid-math-x",
    title: "UTS Matematika X",
    subject: "Matematika X",
    duration: "90 menit",
    status: "scheduled",
    rules:
      "Kerjakan mandiri, tidak membuka tab lain, jawaban auto-save lokal sebelum submit final.",
    securityMode: "secure_required",
    submissions: 0,
    targeting: {
      subjectGroups: ["Matematika X - Pagi"],
      classSections: ["10-A"],
      students: [],
    },
    prerequisites: {
      courses: ["Aljabar Linear Dasar"],
      exams: ["Placement Test Matematika X"],
    },
    gateRules: [
      {
        id: "gate-10a",
        scope: "class",
        targets: ["10-A", "10-B"],
        passwordEnabled: true,
        password: "MATH-UTS",
        publishAt: "2026-05-04T07:00",
        openAt: "2026-05-06T08:00",
        closeAt: "2026-05-06T10:00",
      },
    ],
    questions: [
      {
        id: "q-1",
        prompt: "Jika 2x + 5 = 17, berapakah nilai x?",
        type: "multiple_choice",
        points: "10",
        answerKey: "B",
        options: [
          { id: "A", text: "5" },
          { id: "B", text: "6" },
          { id: "C", text: "7" },
          { id: "D", text: "8" },
        ],
        correctOptionId: "B",
      },
      {
        id: "q-2",
        prompt:
          "Jelaskan langkah penyelesaian sistem persamaan linear dua variabel.",
        type: "essay",
        points: "20",
        answerKey:
          "Rubrik: konsep eliminasi/substitusi, langkah runtut, kesimpulan benar.",
      },
    ],
  },
  {
    id: "exam-physics-pretest",
    title: "Pretest Fisika Olimpiade",
    subject: "Fisika",
    duration: "60 menit",
    status: "draft",
    rules:
      "Pretest diagnostik. Hasil dipakai untuk membuka course Kinematika Olimpiade.",
    securityMode: "secure_required",
    submissions: 0,
    targeting: {
      subjectGroups: ["Olimpiade Fisika"],
      classSections: ["11-B", "12-C"],
      students: [],
    },
    prerequisites: {
      courses: ["Vektor & Gerak Dasar"],
      exams: [],
    },
    gateRules: [
      {
        ...emptyGateRule,
        id: "gate-olimpiade",
        scope: "group",
        targets: ["Olimpiade Fisika"],
      },
    ],
    questions: [
      {
        id: "q-3",
        prompt: "Apa perbedaan jarak dan perpindahan?",
        type: "essay",
        points: "15",
        answerKey: "Rubrik: skalar vs vektor, contoh kasus, satuan benar.",
      },
    ],
  },
];

export const subjectOptions = [
  "Matematika X",
  "Fisika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
].map((item) => ({ label: item, value: item }));

export const subjectGroupOptions = [
  "Matematika X - Pagi",
  "Olimpiade Fisika",
  "Bahasa Indonesia Remedial",
].map((item) => ({ label: item, value: item }));

export const classSectionOptions = ["10-A", "10-B", "10-C", "11-B", "12-C"].map(
  (item) => ({
    label: item,
    value: item,
  }),
);

export const studentOptions = [
  "24001 - Budi Santoso",
  "24002 - Siti Aminah",
  "24003 - John Doe",
].map((item) => ({
  label: item,
  value: item,
}));

export const prerequisiteCourseOptions = [
  "Aljabar Linear Dasar",
  "Trigonometri",
  "Vektor & Gerak Dasar",
].map((item) => ({
  label: item,
  value: item,
}));

export const prerequisiteExamOptions = [
  "Placement Test Matematika X",
  "UTS Ganjil",
  "Kuis Bab 1",
].map((item) => ({
  label: item,
  value: item,
}));
