"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  BookOpen,
  CheckCircle2,
  Cloud,
  Edit3,
  Eye,
  FileText,
  Film,
  Link2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  Youtube,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { InputGroup, InputGroupItem } from "@/components/ui/input-group";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { RightPullSheet } from "@/components/ui/right-pull-sheet";
import { TextareaField } from "@/components/ui/textarea-field";
import { Toast, type ToastItem } from "@/components/ui/toast";
import {
  calculateCourseMetrics,
  filterCourses,
  getCourseEmptyState,
  getCourseStatus,
  type AssignmentTargetRecord,
  type CourseDirectoryRecord,
  type CourseModuleRecord,
  type PrerequisiteTargetRecord,
} from "./course-domain";

const courseSchema = z.object({
  title: z.string().min(3, "Judul course minimal 3 karakter"),
  teacher: z.string().min(1, "Guru wajib dipilih"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  status: z.enum(["draft", "published"], { message: "Status wajib dipilih" }),
});

const moduleSchema = z.object({
  title: z.string().min(3, "Judul module minimal 3 karakter"),
  type: z.enum(["youtube_upload", "drive_upload", "external", "article"], {
    message: "Tipe materi wajib dipilih",
  }),
  resourceUrl: z
    .string()
    .url("Link harus berupa URL valid")
    .optional()
    .or(z.literal("")),
  duration: z.string().min(1, "Estimasi durasi wajib diisi"),
});

type CourseForm = z.infer<typeof courseSchema>;
type ModuleForm = z.infer<typeof moduleSchema>;
type CourseModule = CourseModuleRecord;
type AssignmentTarget = AssignmentTargetRecord;
type PrerequisiteTarget = PrerequisiteTargetRecord;
type Course = CourseForm & CourseDirectoryRecord;

const emptyCourse: CourseForm = {
  title: "",
  teacher: "Guru Matematika",
  description: "",
  status: "draft",
};

const emptyModule: ModuleForm = {
  title: "",
  type: "youtube_upload",
  resourceUrl: "",
  duration: "15 menit",
};

const emptyAssignments: AssignmentTarget = {
  subjectGroups: ["Matematika X - Pagi"],
  classSections: [],
  students: [],
};

const emptyPrerequisites: PrerequisiteTarget = {
  courses: [],
  exams: [],
};

const initialCourses: Course[] = [
  {
    id: "course-algebra-x",
    title: "Aljabar Linear Dasar",
    subjectGroup: "Matematika X - Pagi",
    teacher: "Guru Matematika",
    description:
      "Materi pengantar aljabar untuk kelas X dengan video singkat dan latihan bertahap.",
    status: "published",
    progress: 68,
    assignments: {
      subjectGroups: ["Matematika X - Pagi"],
      classSections: ["10-A"],
      students: ["Alya Putri"],
    },
    prerequisites: {
      courses: ["Bilangan & Operasi Dasar"],
      exams: ["Placement Test Matematika X"],
    },
    modules: [
      {
        id: "mod-1",
        title: "Konsep Variabel",
        type: "youtube_upload",
        resourceUrl: "https://youtu.be/dQw4w9WgXcQ",
        duration: "12 menit",
      },
      {
        id: "mod-2",
        title: "Latihan Persamaan",
        type: "drive_upload",
        resourceUrl: "https://drive.google.com/file/d/example/view",
        duration: "20 menit",
      },
    ],
  },
  {
    id: "course-fisika-olimpiade",
    title: "Kinematika Olimpiade",
    subjectGroup: "Olimpiade Fisika",
    teacher: "Guru Fisika",
    description:
      "Rangkaian materi persiapan olimpiade dengan pembahasan soal gerak lurus dan grafik.",
    status: "draft",
    progress: 0,
    assignments: {
      subjectGroups: ["Olimpiade Fisika"],
      classSections: ["11-B", "12-C"],
      students: [],
    },
    prerequisites: {
      courses: ["Vektor & Gerak Dasar"],
      exams: ["Pretest Fisika Olimpiade"],
    },
    modules: [
      {
        id: "mod-3",
        title: "Gerak Lurus Berubah Beraturan",
        type: "article",
        resourceUrl: "",
        duration: "25 menit",
      },
    ],
  },
];

const subjectGroupOptions = [
  "Matematika X - Pagi",
  "Olimpiade Fisika",
  "Bahasa Indonesia Remedial",
].map((item) => ({ label: item, value: item }));
const prerequisiteCourseOptions = [
  "Bilangan & Operasi Dasar",
  "Vektor & Gerak Dasar",
  "Literasi Akademik Dasar",
  "Pengantar Bahasa Indonesia",
].map((item) => ({ label: item, value: item }));
const prerequisiteExamOptions = [
  "Placement Test Matematika X",
  "Pretest Fisika Olimpiade",
  "Tes Literasi Semester",
  "Ujian Diagnostik Awal",
].map((item) => ({ label: item, value: item }));
const classSectionOptions = [
  "10-A",
  "10-B",
  "10-C",
  "11-A",
  "11-B",
  "12-C",
].map((item) => ({ label: item, value: item }));
const studentOptions = [
  "Alya Putri",
  "Bima Prakoso",
  "Citra Maharani",
  "Daffa Ramadhan",
  "Eka Safitri",
  "Fajar Nugraha",
  "Gita Lestari",
  "Hana Prameswari",
].map((item) => ({ label: item, value: item }));
const teacherOptions = [
  "Guru Matematika",
  "Guru Fisika",
  "Guru Bahasa",
  "Guru Inggris",
].map((item) => ({ label: item, value: item }));
const moduleTypeOptions = [
  { label: "Upload video to YouTube", value: "youtube_upload" },
  { label: "Upload file to Google Drive", value: "drive_upload" },
  { label: "External link", value: "external" },
  { label: "Article / internal note", value: "article" },
];

function storageIcon(type: CourseModule["type"]) {
  if (type === "youtube_upload") return Youtube;
  if (type === "drive_upload") return FileText;
  if (type === "external") return Link2;
  return BookOpen;
}

export default function CoursesPage() {
  const [courses, setCourses] = React.useState<Course[]>(initialCourses);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [modulesOpen, setModulesOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = React.useState<Course | null>(
    null,
  );
  const [query, setQuery] = React.useState("");
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [googleConnected, setGoogleConnected] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [draftAssignments, setDraftAssignments] =
    React.useState<AssignmentTarget>(emptyAssignments);
  const [draftPrerequisites, setDraftPrerequisites] =
    React.useState<PrerequisiteTarget>(emptyPrerequisites);
  const courseForm = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: emptyCourse,
  });
  const moduleForm = useForm<ModuleForm>({
    resolver: zodResolver(moduleSchema),
    defaultValues: emptyModule,
  });

  function toast(
    title: string,
    description: string,
    tone: ToastItem["tone"] = "success",
  ) {
    setToasts((current) => [
      ...current,
      { id: crypto.randomUUID(), title, description, tone },
    ]);
  }

  function openCreate() {
    setEditingCourse(null);
    setDraftAssignments(emptyAssignments);
    setDraftPrerequisites(emptyPrerequisites);
    courseForm.reset(emptyCourse);
    setSheetOpen(true);
  }

  function openEdit(course: Course) {
    setEditingCourse(course);
    setDraftAssignments(course.assignments);
    setDraftPrerequisites(course.prerequisites);
    courseForm.reset({
      title: course.title,
      teacher: course.teacher,
      description: course.description,
      status: course.status,
    });
    setSheetOpen(true);
  }

  function toggleAssignment(kind: keyof AssignmentTarget, value: string) {
    setDraftAssignments((current) => {
      const exists = current[kind].includes(value);
      return {
        ...current,
        [kind]: exists
          ? current[kind].filter((item) => item !== value)
          : [...current[kind], value],
      };
    });
  }

  function togglePrerequisite(kind: keyof PrerequisiteTarget, value: string) {
    setDraftPrerequisites((current) => {
      const exists = current[kind].includes(value);
      return {
        ...current,
        [kind]: exists
          ? current[kind].filter((item) => item !== value)
          : [...current[kind], value],
      };
    });
  }

  function openModules(course: Course) {
    setSelectedCourse(course);
    moduleForm.reset(emptyModule);
    setUploadProgress(0);
    setModulesOpen(true);
  }

  function connectGoogle() {
    setGoogleConnected(true);
    toast(
      "Google connected",
      "Simulasi OAuth berhasil. Backend nanti menukar auth code dan menyimpan refresh token terenkripsi.",
      "info",
    );
  }

  function disconnectGoogle() {
    setGoogleConnected(false);
    setUploadProgress(0);
    toast(
      "Google disconnected",
      "Akses upload Google dilepas dari akun guru ini.",
      "warning",
    );
  }

  function simulateUpload() {
    if (!googleConnected) {
      toast(
        "Hubungkan Google dulu",
        "Upload Drive/YouTube membutuhkan OAuth akun guru.",
        "warning",
      );
      return;
    }
    setUploadProgress(68);
    toast(
      "Upload session dibuat",
      "Frontend nanti upload langsung ke resumable session Google agar VPS tidak menjadi bottleneck.",
      "info",
    );
  }

  async function onCourseSubmit(values: CourseForm) {
    await new Promise((resolve) => setTimeout(resolve, 260));
    if (editingCourse) {
      setCourses((current) =>
        current.map((item) =>
          item.id === editingCourse.id
            ? {
                ...item,
                ...values,
                subjectGroup:
                  draftAssignments.subjectGroups[0] ?? item.subjectGroup,
                assignments: draftAssignments,
                prerequisites: draftPrerequisites,
              }
            : item,
        ),
      );
      toast("Course diperbarui", `${values.title} berhasil disimpan.`);
    } else {
      setCourses((current) => [
        {
          id: `course-${Date.now()}`,
          modules: [],
          progress: 0,
          assignments: draftAssignments,
          prerequisites: draftPrerequisites,
          subjectGroup: draftAssignments.subjectGroups[0] ?? "Unassigned",
          ...values,
        },
        ...current,
      ]);
      toast("Course dibuat", `${values.title} siap diisi module.`);
    }
    setSheetOpen(false);
  }

  async function onModuleSubmit(values: ModuleForm) {
    if (!selectedCourse) return;
    await new Promise((resolve) => setTimeout(resolve, 180));
    const newModule = { id: `mod-${Date.now()}`, ...values };
    setCourses((current) =>
      current.map((course) =>
        course.id === selectedCourse.id
          ? { ...course, modules: [...course.modules, newModule] }
          : course,
      ),
    );
    moduleForm.reset(emptyModule);
    toast(
      "Module ditambahkan",
      `${values.title} terhubung sebagai ${values.type}.`,
    );
  }

  function removeModule(moduleId: string) {
    if (!selectedCourse) return;
    setCourses((current) =>
      current.map((course) =>
        course.id === selectedCourse.id
          ? {
              ...course,
              modules: course.modules.filter(
                (module) => module.id !== moduleId,
              ),
            }
          : course,
      ),
    );
    toast("Module dihapus", "Struktur course diperbarui.", "warning");
  }

  const selectedCourseLive = selectedCourse
    ? (courses.find((item) => item.id === selectedCourse.id) ?? selectedCourse)
    : null;
  const filteredCourses = filterCourses(courses, query);
  const metrics = calculateCourseMetrics(courses);
  const emptyState = getCourseEmptyState(query);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            ISSUE-007
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Course Management
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Guru membuat course, menyusun module, dan menautkan metadata YouTube
            atau Google Drive tanpa membebani server sekolah.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Course
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <MetricCard
          label="Courses"
          value={String(metrics.total)}
          detail={`${metrics.draft} draft`}
          icon={BookOpen}
        />
        <MetricCard
          label="Modules"
          value={String(metrics.modules)}
          detail="Materi tersusun"
          icon={Film}
        />
        <MetricCard
          label="Published"
          value={String(metrics.published)}
          detail="Siap dibaca siswa"
          icon={Eye}
        />
      </div>

      <Alert
        tone="info"
        title="BYO storage policy"
        description="Course hanya menyimpan metadata/link YouTube dan Google Drive. Video/dokumen tetap berada di platform pemilik agar server low-spec tidak menjadi storage dan transcoding bottleneck."
      />

      <Panel className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-[color:var(--border)] px-5 py-3 lg:grid-cols-[1fr_280px] lg:items-center">
          <h2 className="font-display text-xl font-semibold">
            Course Directory
          </h2>
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
              placeholder="Search course title"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {filteredCourses.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-display text-lg font-semibold text-[color:var(--foreground)]">{emptyState.title}</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[color:var(--muted-foreground)]">{emptyState.description}</p>
            </div>
          ) : null}
          {filteredCourses.map((course) => {
            const status = getCourseStatus(course.status);
            return (
            <div
              key={course.id}
              className="grid gap-4 px-5 py-4 xl:grid-cols-[1.05fr_0.7fr_0.72fr_0.45fr_0.45fr_auto] xl:items-center"
            >
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">
                  {course.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--muted-foreground)]">
                  {course.description}
                </p>
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                <span className="font-medium text-[color:var(--foreground)]">
                  {course.teacher}
                </span>
                <br />
                {course.assignments.subjectGroups.length} groups •{" "}
                {course.assignments.classSections.length} classes •{" "}
                {course.assignments.students.length} students
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                <span className="font-medium text-[color:var(--foreground)]">
                  Prerequisites
                </span>
                <br />
                {course.prerequisites.courses.length} courses •{" "}
                {course.prerequisites.exams.length} exams
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant={status.tone}>
                  {status.label}
                </Badge>
                <span className="text-xs text-[color:var(--muted-foreground)]">
                  {course.modules.length} modules
                </span>
              </div>
              <div className="text-sm font-semibold text-[color:var(--foreground)]">
                {course.progress}% progress
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openModules(course)}
                >
                  <BookOpen className="h-4 w-4" /> Modules
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEdit(course)}
                >
                  <Edit3 className="h-4 w-4" /> Edit
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      </Panel>

      <RightPullSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        eyebrow={editingCourse ? "Edit course" : "Create course"}
        title={editingCourse ? "Update course" : "Tambah course"}
        description="Course mengikat subject group, guru, dan rangkaian module pembelajaran."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={courseForm.handleSubmit(onCourseSubmit)}
              disabled={courseForm.formState.isSubmitting}
            >
              {courseForm.formState.isSubmitting
                ? "Saving..."
                : editingCourse
                  ? "Save Changes"
                  : "Create Course"}
            </Button>
          </>
        }
      >
        <form onSubmit={courseForm.handleSubmit(onCourseSubmit)} noValidate>
          <InputGroup
            title="Course Profile"
            description="Informasi dasar yang akan dilihat guru dan siswa."
          >
            <InputGroupItem span="full">
              <FloatingInput
                label="Judul Course"
                prefix={<BookOpen className="h-4 w-4" />}
                placeholder="Aljabar Linear Dasar"
                {...courseForm.register("title")}
                error={courseForm.formState.errors.title?.message}
              />
            </InputGroupItem>
            <InputGroupItem span="full">
              <FloatingSelect
                label="Guru"
                options={teacherOptions}
                {...courseForm.register("teacher")}
                error={courseForm.formState.errors.teacher?.message}
              />
            </InputGroupItem>
            <InputGroupItem span="full">
              <TextareaField
                label="Deskripsi Course"
                prefix={<FileText className="h-4 w-4" />}
                rows={5}
                {...courseForm.register("description")}
                error={courseForm.formState.errors.description?.message}
              />
            </InputGroupItem>
            <InputGroupItem span="half">
              <FloatingSelect
                label="Status"
                options={[
                  { label: "Draft", value: "draft" },
                  { label: "Published", value: "published" },
                ]}
                {...courseForm.register("status")}
                error={courseForm.formState.errors.status?.message}
              />
            </InputGroupItem>
          </InputGroup>

          <Panel tone="muted" className="mt-5 p-5 shadow-none">
            <div className="mb-5">
              <p className="font-semibold">Audience Assignment</p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                Gunakan targeting bertingkat: pilih group/kelas dalam jumlah
                besar lewat selector ringkas, lalu tambahkan exception
                individual bila perlu.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  key: "subjectGroups" as const,
                  label: "Subject Groups",
                  options: subjectGroupOptions,
                  helper:
                    "Rombel akademik/mapel untuk assignment lintas kelas.",
                },
                {
                  key: "classSections" as const,
                  label: "Class Sections",
                  options: classSectionOptions,
                  helper:
                    "Kelas administratif reguler, cocok untuk target massal.",
                },
                {
                  key: "students" as const,
                  label: "Individual Students",
                  options: studentOptions,
                  helper: "Exception per siswa tanpa membuat kelas/group baru.",
                },
              ].map((section) => {
                const selected = draftAssignments[section.key];
                return (
                  <div
                    key={section.key}
                    className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
                  >
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{section.label}</p>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
                          {section.helper}
                        </p>
                      </div>
                      <Badge variant={selected.length ? "success" : "default"}>
                        {selected.length} selected
                      </Badge>
                    </div>
                    <FloatingSelect
                      label={`Tambah ${section.label}`}
                      options={[
                        { label: "Pilih target", value: "" },
                        ...section.options.filter(
                          (option) => !selected.includes(option.value),
                        ),
                      ]}
                      value=""
                      onChange={(event) =>
                        event.target.value &&
                        toggleAssignment(section.key, event.target.value)
                      }
                    />
                    <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                      {selected.length ? (
                        selected.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleAssignment(section.key, item)}
                            className="rounded-full border border-[color:var(--brand)] bg-[color:var(--brand)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-85"
                          >
                            {item} ×
                          </button>
                        ))
                      ) : (
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          Belum ada target.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel tone="muted" className="mt-5 p-5 shadow-none">
            <div className="mb-5">
              <p className="font-semibold">Prerequisites</p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                Atur syarat akses course berdasarkan completion course lain atau
                hasil exam sebelumnya. Validasi akhir akan dihitung di
                eligibility engine agar tidak membebani request siswa.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  key: "courses" as const,
                  label: "Required Courses",
                  options: prerequisiteCourseOptions,
                  helper: "Siswa harus menyelesaikan course ini dulu.",
                },
                {
                  key: "exams" as const,
                  label: "Required Exams",
                  options: prerequisiteExamOptions,
                  helper: "Siswa harus lulus/selesai exam ini dulu.",
                },
              ].map((section) => {
                const selected = draftPrerequisites[section.key];
                return (
                  <div
                    key={section.key}
                    className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
                  >
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{section.label}</p>
                        <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
                          {section.helper}
                        </p>
                      </div>
                      <Badge variant={selected.length ? "success" : "default"}>
                        {selected.length} required
                      </Badge>
                    </div>
                    <FloatingSelect
                      label={`Tambah ${section.label}`}
                      options={[
                        { label: "Pilih prerequisite", value: "" },
                        ...section.options.filter(
                          (option) => !selected.includes(option.value),
                        ),
                      ]}
                      value=""
                      onChange={(event) =>
                        event.target.value &&
                        togglePrerequisite(section.key, event.target.value)
                      }
                    />
                    <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                      {selected.length ? (
                        selected.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() =>
                              togglePrerequisite(section.key, item)
                            }
                            className="rounded-full border border-[color:var(--brand)] bg-[color:var(--brand)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-85"
                          >
                            {item} ×
                          </button>
                        ))
                      ) : (
                        <span className="text-xs text-[color:var(--muted-foreground)]">
                          Tidak ada prerequisite.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </form>
      </RightPullSheet>

      <RightPullSheet
        open={modulesOpen}
        onOpenChange={setModulesOpen}
        eyebrow="Course modules"
        title={
          selectedCourseLive
            ? `Modules: ${selectedCourseLive.title}`
            : "Modules"
        }
        description="Tambahkan module dan tautkan resource metadata dari YouTube, Google Drive, atau artikel internal."
        footer={<Button onClick={() => setModulesOpen(false)}>Done</Button>}
      >
        <div className="space-y-6">
          <Alert
            tone="warning"
            title="Permission reminder"
            description="Pastikan video YouTube berstatus unlisted/public dan file Google Drive sudah dibagikan ke siswa. Critical path ujian tidak boleh bergantung pada API eksternal."
          />

          <Panel tone="muted" className="p-5 shadow-none">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-3 text-[color:var(--brand-strong)]">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-[color:var(--foreground)]">
                    Google OAuth connection
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                    {googleConnected
                      ? "Connected as guru.morfosis@gmail.com. Upload akan memakai Drive/YouTube milik guru."
                      : "Hubungkan akun Google guru untuk upload file ke Drive dan video ke YouTube milik mereka sendiri."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--muted-foreground)]">
                    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1">
                      drive.file
                    </span>
                    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1">
                      youtube.upload
                    </span>
                    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1">
                      openid email profile
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {googleConnected ? (
                  <Button
                    variant="secondary"
                    className="h-12 rounded-2xl px-4"
                    onClick={disconnectGoogle}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color:var(--surface-subtle)]">
                      <ShieldCheck className="h-[18px] w-[18px]" />
                    </span>{" "}
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    className="h-12 rounded-2xl px-4"
                    onClick={connectGoogle}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full">
                      <Cloud className="h-[18px] w-[18px]" />
                    </span>{" "}
                    Connect Google
                  </Button>
                )}
              </div>
            </div>
          </Panel>

          <form
            className="space-y-4"
            onSubmit={moduleForm.handleSubmit(onModuleSubmit)}
            noValidate
          >
            <InputGroup
              title="New Module"
              description="Pilih upload ke Google atau external link. Backend nanti hanya menyimpan metadata resource."
            >
              <InputGroupItem span="full">
                <FloatingInput
                  label="Judul Module"
                  prefix={<BookOpen className="h-4 w-4" />}
                  {...moduleForm.register("title")}
                  error={moduleForm.formState.errors.title?.message}
                />
              </InputGroupItem>
              <InputGroupItem span="half">
                <FloatingSelect
                  label="Resource Type"
                  options={moduleTypeOptions}
                  {...moduleForm.register("type")}
                  error={moduleForm.formState.errors.type?.message}
                />
              </InputGroupItem>
              <InputGroupItem span="half">
                <FloatingInput
                  label="Durasi"
                  placeholder="15 menit"
                  {...moduleForm.register("duration")}
                  error={moduleForm.formState.errors.duration?.message}
                />
              </InputGroupItem>
              <InputGroupItem span="full">
                <FloatingInput
                  label="Resource URL / hasil upload"
                  prefix={<Link2 className="h-4 w-4" />}
                  placeholder="Terisi otomatis setelah upload, atau isi external link"
                  {...moduleForm.register("resourceUrl")}
                  error={moduleForm.formState.errors.resourceUrl?.message}
                />
              </InputGroupItem>
            </InputGroup>
            <div className="rounded-[20px] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-subtle)] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <UploadCloud className="mt-1 h-5 w-5 text-[color:var(--brand-strong)]" />
                  <div>
                    <p className="font-semibold">
                      Teacher-owned upload simulation
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                      Drive/YouTube upload akan memakai resumable session supaya
                      file besar tidak transit penuh di VPS low-spec.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 rounded-2xl px-4"
                  onClick={simulateUpload}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full">
                    <UploadCloud className="h-[18px] w-[18px]" />
                  </span>{" "}
                  Simulate Upload
                </Button>
              </div>
              {uploadProgress > 0 ? (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-medium text-[color:var(--muted-foreground)]">
                    <span>Uploading to Google</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[color:var(--border)]">
                    <div
                      className="h-full rounded-full bg-[color:var(--brand)]"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
                    <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />{" "}
                    Metadata preview siap disimpan setelah upload selesai.
                  </p>
                </div>
              ) : null}
            </div>
            <Button type="submit" disabled={moduleForm.formState.isSubmitting}>
              <Plus className="h-4 w-4" /> Add Module
            </Button>
          </form>

          <div className="space-y-3">
            {selectedCourseLive?.modules.map((module) => {
              const Icon = storageIcon(module.type);
              return (
                <div
                  key={module.id}
                  className="flex items-center justify-between gap-4 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[color:var(--surface-subtle)] p-3 text-[color:var(--brand-strong)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">
                        {module.title}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                        {module.type} • {module.duration}
                      </p>
                      {module.resourceUrl ? (
                        <p className="mt-1 max-w-[360px] truncate text-xs text-[color:var(--muted-foreground)]">
                          {module.resourceUrl}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => removeModule(module.id)}
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </RightPullSheet>

      <div className="fixed bottom-5 right-5 z-[95] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((item) => (
          <Toast
            key={item.id}
            toast={item}
            onDismiss={(id) =>
              setToasts((current) =>
                current.filter((toastItem) => toastItem.id !== id),
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
