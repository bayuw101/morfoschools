"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  DoorOpen,
  Edit3,
  FileQuestion,
  Filter,
  Layers3,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  AlertTriangle,
  PenTool,
  Plus,
  Search,
  ShieldCheck,
  Timer,
  Trash2,
  Users,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { InputGroup, InputGroupItem } from "@/components/ui/input-group";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/panel";
import { TextareaField } from "@/components/ui/textarea-field";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { DatetimeField } from "@/components/ui/datetime-field";
import { RightPullSheet } from "@/components/ui/right-pull-sheet";

import {
  type Exam,
  type ExamForm,
  type GateRule,
  type Prerequisites,
  type Question,
  type QuestionForm,
  type Targeting,
  classSectionOptions,
  emptyExam,
  emptyGateRule,
  emptyPrerequisites,
  emptyQuestion,
  emptyTargeting,
  examSchema,
  initialExams,
  prerequisiteCourseOptions,
  prerequisiteExamOptions,
  questionSchema,
  studentOptions,
  subjectGroupOptions,
  subjectOptions,
} from "../data";
import { fetchApi } from "@/lib/api-client";

export default function ExamManagerPage() {
  const params = useParams<{ id: string }>();
  const examId = params.id;
  const initialSelectedExam =
    examId === "new"
      ? null
      : (initialExams.find((exam) => exam.id === examId) ?? initialExams[0]);

  const [exams, setExams] = React.useState<Exam[]>(initialExams);
  const [questionOpen, setQuestionOpen] = React.useState(false);
  const [editingQuestion, setEditingQuestion] = React.useState<Question | null>(null);
  const [selectedExam, setSelectedExam] = React.useState<Exam | null>(
    initialSelectedExam,
  );
  const [isCreatingNew, setIsCreatingNew] = React.useState(examId === "new");
  const [query, setQuery] = React.useState("");
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const [draftTargeting, setDraftTargeting] = React.useState<Targeting>(
    selectedExam?.targeting || emptyTargeting,
  );
  const [draftPrerequisites, setDraftPrerequisites] =
    React.useState<Prerequisites>(
      selectedExam?.prerequisites || emptyPrerequisites,
    );
  const [draftGateRules, setDraftGateRules] = React.useState<GateRule[]>(
    selectedExam?.gateRules?.length ? selectedExam.gateRules : [emptyGateRule],
  );

  const examForm = useForm<ExamForm>({
    resolver: zodResolver(examSchema),
    defaultValues: emptyExam,
  });

  const questionForm = useForm<QuestionForm>({
    resolver: zodResolver(questionSchema),
    defaultValues: emptyQuestion,
  });

  const questionType = questionForm.watch("type");
  const correctOptionIds = questionForm.watch("correctOptionIds") ?? [];
  const scoringMode = questionForm.watch("scoringMode") ?? "all_or_nothing";

  const selectedExamLive = isCreatingNew
    ? null
    : selectedExam
      ? (exams.find((exam) => exam.id === selectedExam.id) ?? selectedExam)
      : null;
  const eligibilityPreview = React.useMemo(() => {
    const requiredCourses = draftPrerequisites.courses;
    const requiredExams = draftPrerequisites.exams;
    const learners = [
      { name: "Budi Santoso", className: "10-A", courses: ["Aljabar Linear Dasar", "Vektor & Gerak Dasar"], exams: ["Placement Test Matematika X"], score: 82 },
      { name: "Siti Aminah", className: "10-A", courses: ["Aljabar Linear Dasar"], exams: [], score: 48 },
      { name: "John Doe", className: "10-B", courses: [], exams: ["Placement Test Matematika X"], score: 50 },
      { name: "Rani Prameswari", className: "11-B", courses: ["Vektor & Gerak Dasar"], exams: ["Pretest Fisika Olimpiade"], score: 76 },
    ];

    return learners.map((learner) => {
      const missingCourses = requiredCourses.filter((item) => !learner.courses.includes(item));
      const missingExams = requiredExams.filter((item) => !learner.exams.includes(item));
      const reasons = [
        ...missingCourses.map((item) => `Course belum completed: ${item}`),
        ...missingExams.map((item) => `Exam belum lulus/selesai: ${item}`),
      ];
      return {
        ...learner,
        eligible: reasons.length === 0,
        reasons,
      };
    });
  }, [draftPrerequisites]);

  const eligibleCount = eligibilityPreview.filter((item) => item.eligible).length;
  const blockedCount = eligibilityPreview.length - eligibleCount;

  // Sinkronisasi form dengan exam yang sedang dipilih di kolom kiri
  React.useEffect(() => {
    if (isCreatingNew) {
      examForm.reset(emptyExam);
      setDraftTargeting(emptyTargeting);
      setDraftPrerequisites(emptyPrerequisites);
      setDraftGateRules([emptyGateRule]);
    } else if (selectedExamLive) {
      examForm.reset({
        title: selectedExamLive.title,
        subject: selectedExamLive.subject,
        duration: selectedExamLive.duration,
        status: selectedExamLive.status,
        rules: selectedExamLive.rules,
        securityMode: selectedExamLive.securityMode ?? "secure_required",
      });
      setDraftTargeting(selectedExamLive.targeting);
      setDraftPrerequisites(selectedExamLive.prerequisites);
      setDraftGateRules(
        selectedExamLive.gateRules.length ? selectedExamLive.gateRules : [emptyGateRule],
      );
    }
  }, [selectedExamLive, isCreatingNew, examForm]);

  const filteredExams = exams.filter((exam) =>
    `${exam.title} ${exam.subject}`.toLowerCase().includes(query.toLowerCase()),
  );

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

  function toggleTarget(
    key: keyof Targeting | keyof Prerequisites,
    value: string,
  ) {
    setDraftTargeting((prev) => {
      const k = key as keyof Targeting;
      const arr = prev[k] as string[];
      if (arr.includes(value)) {
        return { ...prev, [k]: arr.filter((i) => i !== value) };
      }
      return { ...prev, [k]: [...arr, value] };
    });
  }

  function togglePrerequisite(
    key: keyof Targeting | keyof Prerequisites,
    value: string,
  ) {
    setDraftPrerequisites((prev) => {
      const k = key as keyof Prerequisites;
      const arr = prev[k] as string[];
      if (arr.includes(value)) {
        return { ...prev, [k]: arr.filter((i) => i !== value) };
      }
      return { ...prev, [k]: [...arr, value] };
    });
  }

  function duplicateExam(exam: Exam) {
    const duplicated: Exam = {
      ...exam,
      id: `exam-${Date.now()}`,
      title: `${exam.title} (Copy)`,
      status: "draft",
      submissions: 0,
      questions: exam.questions.map((q) => ({
        ...q,
        id: `q-${Date.now()}-${Math.random()}`,
      })),
    };
    setExams((current) => [duplicated, ...current]);
    toast("Exam diduplikasi", "Draft baru berhasil dibuat.");
  }

  function openCreate() {
    setIsCreatingNew(true);
    setSelectedExam(null);
  }

  function openCreateQuestion() {
    setEditingQuestion(null);
    questionForm.reset({
      ...emptyQuestion,
      options: [
        { id: "A", text: "" },
        { id: "B", text: "" },
        { id: "C", text: "" },
        { id: "D", text: "" },
      ],
      correctOptionIds: [],
      scoringMode: "all_or_nothing",
    });
    setQuestionOpen(true);
  }

  function openEditQuestion(question: Question) {
    setEditingQuestion(question);
    questionForm.reset({
      prompt: question.prompt,
      type: question.type,
      points: question.points,
      answerKey: question.answerKey,
      options: question.options ?? [],
      correctOptionId: question.correctOptionId,
      correctOptionIds: question.correctOptionIds ?? (question.correctOptionId ? [question.correctOptionId] : []),
      scoringMode: question.scoringMode ?? "all_or_nothing",
    });
    setQuestionOpen(true);
  }

  function openQuestionFromBank() {
    setEditingQuestion(null);
    questionForm.reset({
      prompt: "Contoh soal dari bank: Jika gaya 20 N bekerja pada benda bermassa 4 kg, berapa percepatannya?",
      type: "multiple_choice",
      points: "10",
      answerKey: "A, C",
      options: [
        { id: "A", text: "5 m/s²" },
        { id: "B", text: "4 m/s²" },
        { id: "C", text: "20/4 m/s²" },
        { id: "D", text: "80 m/s²" },
      ],
      correctOptionIds: ["A", "C"],
      scoringMode: "partial",
    });
    setQuestionOpen(true);
  }

  function removeQuestion(id: string) {
    if (!selectedExamLive) return;
    setExams((current) =>
      current.map((item) =>
        item.id === selectedExamLive.id
          ? {
              ...item,
              questions: item.questions.filter((q) => q.id !== id),
            }
          : item,
      ),
    );
  }

  function addGateRule() {
    setDraftGateRules((prev) => [
      ...prev,
      { ...emptyGateRule, id: `gate-${Date.now()}` },
    ]);
  }

  function removeGateRule(id: string) {
    setDraftGateRules((prev) => prev.filter((r) => r.id !== id));
  }

  function updateGateRule(id: string, updates: Partial<GateRule>) {
    setDraftGateRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
  }

  function toggleGateTarget(ruleId: string, targetValue: string) {
    setDraftGateRules((prev) =>
      prev.map((rule) => {
        if (rule.id !== ruleId) return rule;
        const newTargets = rule.targets.includes(targetValue)
          ? rule.targets.filter((t) => t !== targetValue)
          : [...rule.targets, targetValue];
        return { ...rule, targets: newTargets };
      }),
    );
  }

  function deriveTargetingFromGateRules(rules: GateRule[]): Targeting {
    return rules.reduce<Targeting>(
      (acc, rule) => {
        if (rule.scope === "group") {
          acc.subjectGroups = Array.from(new Set([...acc.subjectGroups, ...rule.targets]));
        }
        if (rule.scope === "class") {
          acc.classSections = Array.from(new Set([...acc.classSections, ...rule.targets]));
        }
        if (rule.scope === "student") {
          acc.students = Array.from(new Set([...acc.students, ...rule.targets]));
        }
        return acc;
      },
      { subjectGroups: [], classSections: [], students: [] },
    );
  }

  async function onExamSubmit(values: ExamForm) {
    const nextTargeting = deriveTargetingFromGateRules(draftGateRules);
    try {
      if (isCreatingNew) {
        const res = await fetchApi<{ data: any }>("/api/v1/exams", {
          method: "POST",
          body: JSON.stringify({
            title: values.title,
            subjectName: values.subject || "Matematika X",
            durationMinutes: parseInt(values.duration) || 90,
            securityMode: values.securityMode,
            status: values.status,
            createdBy: "user"
          }),
        });
        const newExamId = res.data?.id || `exam-${Date.now()}`;
        const newExam: Exam = {
          id: newExamId,
          questions: [],
          submissions: 0,
          targeting: nextTargeting,
          prerequisites: draftPrerequisites,
          gateRules: draftGateRules,
          ...values,
        };
        setExams((current) => [newExam, ...current]);
        setSelectedExam(newExam);
        setIsCreatingNew(false);
        toast("Exam dibuat", `${values.title} berhasil disimpan di sistem.`);
      } else if (selectedExamLive) {
        await fetchApi(`/api/v1/exams/${selectedExamLive.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: values.title,
            subjectName: values.subject || "Matematika X",
            durationMinutes: parseInt(values.duration) || 90,
            securityMode: values.securityMode,
            status: values.status,
            createdBy: "user"
          }),
        });
        setExams((current) =>
          current.map((item) =>
            item.id === selectedExamLive.id
              ? {
                  ...item,
                  ...values,
                  targeting: nextTargeting,
                  prerequisites: draftPrerequisites,
                  gateRules: draftGateRules,
                }
              : item,
          ),
        );
        toast("Exam diperbarui", `${values.title} berhasil disimpan ke sistem.`);
      }
    } catch (e) {
      toast("Error", "Gagal menyimpan exam ke backend.", "error");
    }
  }

  async function onQuestionSubmit(values: QuestionForm) {
    if (!selectedExamLive) return;
    await new Promise((resolve) => setTimeout(resolve, 180));
    const normalizedValues: QuestionForm = values.type === "multiple_choice"
      ? {
          ...values,
          correctOptionIds: values.correctOptionIds ?? [],
          correctOptionId: values.correctOptionIds?.[0] ?? values.correctOptionId,
          answerKey: values.correctOptionIds?.length
            ? values.correctOptionIds.join(", ")
            : values.answerKey,
          scoringMode: values.scoringMode ?? "all_or_nothing",
        }
      : values;

    if (editingQuestion) {
      setExams((current) =>
        current.map((item) =>
          item.id === selectedExamLive.id
            ? {
                ...item,
                questions: item.questions.map((q) =>
                  q.id === editingQuestion.id ? { ...q, ...normalizedValues } : q,
                ),
              }
            : item,
        ),
      );
    } else {
      const newQ: Question = {
        ...normalizedValues,
        id: `q-${Date.now()}`,
      };
      setExams((current) =>
        current.map((item) =>
          item.id === selectedExamLive.id
            ? {
                ...item,
                questions: [...item.questions, newQ],
              }
            : item,
        ),
      );
    }
    setQuestionOpen(false);
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <a href="/app/exams" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            <ArrowLeft className="h-4 w-4" /> ISSUE-009 / Exam Manager
          </a>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            {selectedExamLive?.title ?? "Exam Manager"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Konfigurasi ujian dan question manager berada dalam satu halaman detail: kiri untuk settings, kanan untuk bank soal.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/exams/${examId}/monitor`}>
            <Button variant="secondary">
              Monitor Live
            </Button>
          </Link>
          <Link href={`/app/exams/${examId}/grading`}>
            <Button variant="secondary">
              Grade Submissions
            </Button>
          </Link>
          <Link href={`/app/exams/${examId}/performance`}>
            <Button variant="secondary">
              Load Test
            </Button>
          </Link>
          <Button onClick={examForm.handleSubmit(onExamSubmit)} disabled={examForm.formState.isSubmitting}>
            {examForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <div className="min-w-0">
<form
  onSubmit={examForm.handleSubmit(onExamSubmit)}
  noValidate
  className="flex flex-col gap-5"
>
  <Panel className="overflow-hidden p-0">
    <div className="border-b border-[color:var(--border)] px-5 py-4 flex items-center justify-between">
      <div>
        <h2 className="font-display text-xl font-semibold">
          {isCreatingNew ? "Create Exam" : "Edit Exam"}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          {isCreatingNew ? "Lengkapi profil awal ujian." : "Atur properti dan gate penjadwalan ujian."}
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={examForm.formState.isSubmitting}>
          {examForm.formState.isSubmitting
            ? "Saving..."
            : isCreatingNew
              ? "Create Exam"
              : "Save Changes"}
        </Button>
      </div>
    </div>
    <div className="p-5">
      <InputGroup
        title="Exam Profile"
        description="Informasi dasar exam yang dilihat guru dan siswa."
      >
        <InputGroupItem span="full">
          <FloatingInput
            label="Judul Exam"
            prefix={<PenTool className="h-4 w-4" />}
            placeholder="UTS Matematika X"
            {...examForm.register("title")}
            error={examForm.formState.errors.title?.message}
          />
        </InputGroupItem>
        <InputGroupItem span="half">
          <FloatingSelect
            label="Subject"
            options={subjectOptions}
            {...examForm.register("subject")}
            error={examForm.formState.errors.subject?.message}
          />
        </InputGroupItem>
        <InputGroupItem span="half">
          <FloatingInput
            label="Duration"
            prefix={<Timer className="h-4 w-4" />}
            {...examForm.register("duration")}
            error={examForm.formState.errors.duration?.message}
          />
        </InputGroupItem>
        <InputGroupItem span="half">
          <FloatingSelect
            label="Status"
            options={[
              { label: "Draft", value: "draft" },
              { label: "Scheduled", value: "scheduled" },
              { label: "Published", value: "published" },
            ]}
            {...examForm.register("status")}
            error={examForm.formState.errors.status?.message}
          />
        </InputGroupItem>
        <InputGroupItem span="half">
          <FloatingSelect
            label="Exam security mode"
            options={[
              { label: "Secure mode wajib (fullscreen + violation tracking)", value: "secure_required" },
              { label: "Guru mengizinkan unsecure mode", value: "unsecure_allowed" },
            ]}
            {...examForm.register("securityMode")}
            error={examForm.formState.errors.securityMode?.message}
          />
        </InputGroupItem>
        <InputGroupItem span="full">
          <TextareaField
            label="Rules"
            prefix={<ListChecks className="h-4 w-4" />}
            rows={4}
            {...examForm.register("rules")}
            error={examForm.formState.errors.rules?.message}
          />
        </InputGroupItem>
      </InputGroup>
    </div>
  </Panel>

  <Panel className="p-5">
    <div className="mb-5">
      <p className="font-semibold text-lg">Target & Gate Rules</p>
      <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
        Setiap target ujian memiliki jadwal publish/open/close sendiri. Tambahkan row untuk kelas, group belajar, atau siswa tertentu.
      </p>
    </div>

    <div className="space-y-3">
      {draftGateRules.map((rule, index) => {
        const targetOptions =
          rule.scope === "class"
            ? classSectionOptions
            : rule.scope === "group"
              ? subjectGroupOptions
              : studentOptions;
        return (
          <div
            key={rule.id}
            className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4"
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Badge variant="default">Target Row {index + 1}</Badge>
                <p className="mt-2 text-sm font-semibold">
                  {rule.targets.length ? rule.targets.join(", ") : "Belum ada target"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                  Jadwal dapat dioverride khusus untuk row target ini.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => removeGateRule(rule.id)}
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <FloatingSelect
                label="Target type"
                value={rule.scope}
                onChange={(event) =>
                  updateGateRule(rule.id, {
                    scope: event.target.value as GateRule["scope"],
                    targets: [],
                  })
                }
                options={[
                  { label: "Kelas", value: "class" },
                  { label: "Group belajar / rombel", value: "group" },
                  { label: "Individu", value: "student" },
                ]}
              />
              <FloatingSelect
                label="Tambah target"
                value=""
                onChange={(event) => {
                  if (event.target.value) {
                    toggleGateTarget(rule.id, event.target.value);
                  }
                }}
                options={[
                  { label: "Pilih target", value: "" },
                  ...targetOptions.filter((opt) => !rule.targets.includes(opt.value)),
                ]}
              />
              {rule.targets.length > 0 && (
                <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto xl:col-span-2">
                  {rule.targets.map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => toggleGateTarget(rule.id, target)}
                      className="rounded-full border border-[color:var(--brand)] bg-[color:var(--brand)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-85"
                    >
                      {target} ×
                    </button>
                  ))}
                </div>
              )}
              <DatetimeField
                label="Publish at"
                value={rule.publishAt}
                onChange={(val) => updateGateRule(rule.id, { publishAt: val })}
              />
              <DatetimeField
                label="Open at"
                value={rule.openAt}
                onChange={(val) => updateGateRule(rule.id, { openAt: val })}
              />
              <DatetimeField
                label="Close at"
                value={rule.closeAt}
                onChange={(val) => updateGateRule(rule.id, { closeAt: val })}
              />
              <FloatingSelect
                label="Gate protection"
                value={rule.passwordEnabled ? "true" : "false"}
                onChange={(event) =>
                  updateGateRule(rule.id, {
                    passwordEnabled: event.target.value === "true",
                  })
                }
                options={[
                  { label: "No password required", value: "false" },
                  { label: "Require password", value: "true" },
                ]}
              />
              {rule.passwordEnabled ? (
                <div className="xl:col-span-2">
                  <FloatingInput
                    label="Gate password"
                    prefix={<LockKeyhole className="h-4 w-4" />}
                    value={rule.password}
                    onChange={(event) =>
                      updateGateRule(rule.id, { password: event.target.value })
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={addGateRule}
        className="flex w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-[color:var(--border)] bg-transparent py-5 text-sm font-semibold text-[color:var(--muted-foreground)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
      >
        <Plus className="h-5 w-5" /> Add Target Row
      </button>
    </div>
  </Panel>

  <Panel className="p-5">
    <div className="mb-5 ">
      <div>
        <p className="font-semibold text-lg">Prerequisites</p>
      </div>
      <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
        Atur syarat sebelum siswa eligible membuka exam.
      </p>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      {[
        {
          key: "courses",
          label: "Required Courses",
          options: prerequisiteCourseOptions,
          helper: "Course harus completed.",
        },
        {
          key: "exams",
          label: "Required Exams",
          options: prerequisiteExamOptions,
          helper: "Exam harus selesai/lulus.",
        },
      ].map((section) => (
        <div
          key={section.key}
          className="flex flex-col gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4"
        >
          <div>
            <p className="text-sm font-semibold">{section.label}</p>
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              {section.helper}
            </p>
          </div>
          <FloatingSelect
            label={`Pilih ${section.label.toLowerCase()}`}
            value=""
            onChange={(e) => {
              if (e.target.value) {
                togglePrerequisite(section.key as any, e.target.value);
              }
            }}
            options={[
              { label: "Pilih...", value: "" },
              ...section.options.filter(
                (opt) => !(draftPrerequisites[section.key as keyof Prerequisites] || []).includes(opt.value),
              ),
            ]}
          />
          {(draftPrerequisites[section.key as keyof Prerequisites]?.length ?? 0) > 0 && (
            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pt-1">
              {draftPrerequisites[section.key as keyof Prerequisites]?.map((item: string) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => togglePrerequisite(section.key as any, item)}
                  className="flex items-center gap-1 rounded-full border border-[color:var(--brand)] bg-[color:var(--brand)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-85"
                >
                  <span>{item}</span>
                  <span className="opacity-70">×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </Panel>

  <Panel className="p-5">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="font-semibold text-lg">Eligibility Preview</p>
        <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
          Simulasi materialized eligibility untuk melihat siswa yang bisa membuka exam berdasarkan course/exam prerequisites.
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          toast(
            "Eligibility recalculated",
            "Preview dihitung ulang dari event course completion dan exam result mock.",
            "info",
          )
        }
      >
        <RefreshCw className="h-4 w-4" /> Recalculate
      </Button>
    </div>

    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Eligible</p>
        <p className="mt-2 text-2xl font-bold text-[color:var(--foreground)]">{eligibleCount}</p>
      </div>
      <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Blocked</p>
        <p className="mt-2 text-2xl font-bold text-[color:var(--foreground)]">{blockedCount}</p>
      </div>
      <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Inputs</p>
        <p className="mt-2 text-2xl font-bold text-[color:var(--foreground)]">
          {draftPrerequisites.courses.length + draftPrerequisites.exams.length}
        </p>
      </div>
    </div>

    <div className="divide-y divide-[color:var(--border)] rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)]">
      {eligibilityPreview.map((student) => (
        <div key={student.name} className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{student.name}</p>
              <span className="text-xs text-[color:var(--muted-foreground)]">{student.className}</span>
              <Badge variant={student.eligible ? "success" : "default"}>
                {student.eligible ? "Eligible" : "Blocked"}
              </Badge>
            </div>
            {student.reasons.length ? (
              <div className="mt-2 space-y-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
                {student.reasons.map((reason) => (
                  <p key={reason} className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> {reason}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
                Semua prerequisite terpenuhi. Siswa akan masuk tabel exam_eligible_students saat publish/recalculate.
              </p>
            )}
          </div>
          <p className="text-sm font-semibold text-[color:var(--foreground)]">Readiness {student.score}%</p>
        </div>
      ))}
    </div>
  </Panel>


</form>
        </div>
        <div className="min-w-0">
          <Panel className="overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
              <div>
                <h2 className="font-display text-xl font-semibold">Questions Manager</h2>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Kelola bank soal exam ini tanpa pindah halaman.</p>
              </div>
              <Button onClick={openCreateQuestion}>
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            </div>
            <div className="p-5">
<div className="flex flex-col gap-4">
  <div className="divide-y divide-[color:var(--border)] rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)]">
    {selectedExamLive?.questions.map((question, index) => (
      <div key={question.id} className="px-5 py-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <Badge
              variant={
                question.type === "essay" ? "default" : "success"
              }
            >
              Q{index + 1} • {question.type.replace("_", " ")} •{" "}
              {question.points} pts
            </Badge>
            <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--foreground)]">
              {question.prompt}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openEditQuestion(question)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => removeQuestion(question.id)}
              className="hover:border-red-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {question.type === "multiple_choice" &&
        question.options?.length ? (
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => {
              const isCorrect =
                question.correctOptionIds?.includes(option.id) ??
                option.id === question.correctOptionId;
              return (
                <div
                  key={option.id}
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 text-xs ${
                    isCorrect
                      ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--foreground)]"
                      : "border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--muted-foreground)]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                      isCorrect
                        ? "bg-[color:var(--brand)] text-white"
                        : "bg-[color:var(--border)]"
                    }`}
                  >
                    {isCorrect ? (
                      <Check className="h-3 w-3" />
                    ) : null}
                  </span>
                  <span>
                    <span className="font-semibold">{option.id}.</span>{" "}
                    {option.text}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
        <p className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-3 text-xs leading-5 text-[color:var(--muted-foreground)]">
          <span className="font-semibold text-[color:var(--foreground)]">
            {question.type === "essay" ? "Rubric" : "Answer key"}:
          </span>{" "}
          {question.answerKey}
        </p>
      </div>
    ))}
    {(!selectedExamLive?.questions || selectedExamLive.questions.length === 0) && (
      <p className="p-8 text-center text-sm text-[color:var(--muted-foreground)]">Belum ada soal dalam bank soal ini.</p>
    )}
  </div>
</div>
            </div>
          </Panel>
        </div>
      </div>

      <RightPullSheet
        open={questionOpen}
        onOpenChange={setQuestionOpen}
        eyebrow="Question bank"
        title={editingQuestion ? "Edit question" : "Add question"}
        description="Tambah multiple choice, short answer, atau essay. Tipe soal mengubah field answer/options secara dinamis."
        footer={
          <>
            <Button variant="secondary" onClick={() => setQuestionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={questionForm.handleSubmit(onQuestionSubmit)}>
              {editingQuestion ? "Save Changes" : "Add Question"}
            </Button>
          </>
        }
      >
  <form onSubmit={questionForm.handleSubmit(onQuestionSubmit)} noValidate>
    <InputGroup
      title="Question"
      description="Question bank awal untuk exam authoring."
    >
      <InputGroupItem span="full">
        <TextareaField
          label="Prompt"
          prefix={<FileQuestion className="h-4 w-4" />}
          rows={5}
          {...questionForm.register("prompt")}
          error={questionForm.formState.errors.prompt?.message}
        />
      </InputGroupItem>
      <InputGroupItem span="half">
        <FloatingSelect
          label="Type"
          options={[
            { label: "Multiple Choice", value: "multiple_choice" },
            { label: "Short Answer", value: "short_answer" },
            { label: "Essay", value: "essay" },
          ]}
          {...questionForm.register("type")}
          error={questionForm.formState.errors.type?.message}
        />
      </InputGroupItem>
      <InputGroupItem span="half">
        <FloatingInput
          label="Points"
          {...questionForm.register("points")}
          error={questionForm.formState.errors.points?.message}
        />
      </InputGroupItem>
      {questionType === "multiple_choice" ? (
        <InputGroupItem span="full">
          <div className="space-y-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                Multiple choice options
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const currentOptions =
                      questionForm.getValues("options") || [];
                    const nextId = String.fromCharCode(
                      65 + currentOptions.length,
                    );
                    questionForm.setValue("options", [
                      ...currentOptions,
                      { id: nextId, text: "" },
                    ]);
                  }}
                  className="flex h-8 items-center gap-1.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-xs font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add option
                </button>
              </div>
            </div>
            <FloatingSelect
              label="How should multiple correct answers be graded?"
              value={scoringMode}
              onChange={(event) =>
                questionForm.setValue(
                  "scoringMode",
                  event.target.value as QuestionForm["scoringMode"],
                )
              }
              options={[
                { label: "Require all selected answers to be correct", value: "all_or_nothing" },
                { label: "Award partial credit for each correct answer", value: "partial" },
                { label: "Grade by percentage of correct selections", value: "percentage" },
              ]}
            />
            {questionForm.watch("options")?.map((option, index) => {
              const isChecked = correctOptionIds.includes(option.id);
              return (
                <div key={option.id} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const current = questionForm.getValues("correctOptionIds") ?? [];
                      const next = current.includes(option.id)
                        ? current.filter((id) => id !== option.id)
                        : [...current, option.id];
                      questionForm.setValue("correctOptionIds", next);
                      questionForm.setValue("correctOptionId", next[0] ?? "");
                      questionForm.setValue("answerKey", next.join(", "));
                    }}
                    className={`flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-[22px] border transition-colors ${
                      isChecked
                        ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                        : "border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--muted-foreground)] hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
                    }`}
                  >
                    <CheckCircle2
                      className={`h-6 w-6 ${isChecked ? "opacity-100" : "opacity-30"}`}
                    />
                  </button>
                  <div className="flex-1">
                    <FloatingInput
                      label={`Option ${option.id}`}
                      value={option.text}
                      onChange={(e) => {
                        const opts =
                          questionForm.getValues("options") || [];
                        opts[index].text = e.target.value;
                        questionForm.setValue("options", opts);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-[62px] w-[62px] shrink-0 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] hover:border-red-400 hover:text-red-500"
                    onClick={() => {
                      const opts =
                        questionForm.getValues("options") || [];
                      questionForm.setValue(
                        "options",
                        opts.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              );
            })}
            {!questionForm.watch("options")?.length && (
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Belum ada opsi jawaban.
              </p>
            )}
            {questionForm.formState.errors.answerKey && (
              <p className="mt-2 text-xs font-medium text-red-500">
                Pilih satu atau beberapa jawaban benar dengan mengklik tombol centang di sebelah kiri.
              </p>
            )}
          </div>
        </InputGroupItem>
      ) : (
        <InputGroupItem span="full">
          <TextareaField
            label={
              questionType === "essay" ? "Grading rubric" : "Exact answer"
            }
            prefix={<CheckCircle2 className="h-4 w-4" />}
            rows={3}
            {...questionForm.register("answerKey")}
            error={questionForm.formState.errors.answerKey?.message}
          />
        </InputGroupItem>
      )}

      <InputGroupItem span="full">
        <div className="rounded-[22px] border-2 border-dashed border-[color:var(--border)] p-5 text-center">
          <Database className="mx-auto mb-3 h-8 w-8 text-[color:var(--muted-foreground)]" />
          <p className="text-sm font-semibold">
            Ambil dari Database Soal
          </p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
            Pilih soal dari bank, lalu review/edit di form ini sebelum masuk ke list exam.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            size="sm"
            onClick={openQuestionFromBank}
          >
            Review Soal dari Bank
          </Button>
        </div>
      </InputGroupItem>
    </InputGroup>
  </form>
      </RightPullSheet>
    </div>
  );
}
