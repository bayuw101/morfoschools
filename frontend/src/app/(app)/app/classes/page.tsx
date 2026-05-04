"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { BookUser, CalendarDays, Edit3, GraduationCap, Plus, School, Search, Trash2, UserPlus, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { InputGroup, InputGroupItem } from "@/components/ui/input-group";
import { MetricCard } from "@/components/ui/metric-card";
import { DirectoryTableSkeleton, MetricCardSkeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/ui/panel";
import { RightPullSheet } from "@/components/ui/right-pull-sheet";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { fetchApi } from "@/lib/api-client";
import {
  buildTeacherOptions,
  calculateClassMetrics,
  filterClasses,
  filterStudentsForEnrollment,
  getClassEmptyState,
  hasDuplicateClassSection,
  type ClassSectionRecord,
  type StudentEnrollmentRecord,
} from "./class-domain";

const classSectionSchema = z.object({
  name: z.string().min(2, "Nama kelas wajib diisi"),
  gradeLevel: z.string().min(1, "Tingkat wajib dipilih"),
  academicYear: z.string().min(4, "Tahun ajaran wajib diisi"),
  homeroomTeacher: z.string().min(1, "Wali kelas wajib dipilih"),
  status: z.enum(["active", "inactive"], { message: "Status wajib dipilih" }),
});

type ClassSectionForm = z.infer<typeof classSectionSchema>;
type Student = StudentEnrollmentRecord;
type ClassSection = ClassSectionForm & ClassSectionRecord;

const emptyClassSection: ClassSectionForm = {
  name: "",
  gradeLevel: "10",
  academicYear: "2025/2026",
  homeroomTeacher: "Bu Rani Wulandari",
  status: "active",
};

const initialStudents: Student[] = [
  { id: "std-001", nis: "2025001", name: "Alya Putri", currentClassId: "cls-10a" },
  { id: "std-002", nis: "2025002", name: "Bima Prakoso", currentClassId: "cls-10a" },
  { id: "std-003", nis: "2025003", name: "Citra Maharani", currentClassId: "cls-11b" },
  { id: "std-004", nis: "2025004", name: "Daffa Ramadhan" },
  { id: "std-005", nis: "2025005", name: "Eka Safitri" },
];

const initialClassSections: ClassSection[] = [
  { id: "cls-10a", name: "10-A", gradeLevel: "10", academicYear: "2025/2026", homeroomTeacher: "Bu Rani Wulandari", status: "active", studentIds: ["std-001", "std-002"] },
  { id: "cls-11b", name: "11-B", gradeLevel: "11", academicYear: "2025/2026", homeroomTeacher: "Pak Arif Setiawan", status: "active", studentIds: ["std-003"] },
  { id: "cls-12c", name: "12-C", gradeLevel: "12", academicYear: "2024/2025", homeroomTeacher: "Bu Maya Kartika", status: "inactive", studentIds: [] },
];

const gradeOptions = ["7", "8", "9", "10", "11", "12"].map((grade) => ({ label: `Kelas ${grade}`, value: grade }));
const fallbackTeacherNames = ["Ibu Ratna Biologi", "Bu Rani Wulandari", "Pak Arif Setiawan", "Bu Maya Kartika", "Pak Dimas Nugroho"];

export default function ClassesPage() {
  const [classes, setClasses] = React.useState<ClassSection[]>([]);
  const [loadingClasses, setLoadingClasses] = React.useState(true);
  React.useEffect(() => {
    fetchApi<{ data: ClassSection[] }>("/api/v1/classes")
      .then(res => setClasses(res.data || []))
      .catch(err => console.error("Failed to fetch classes", err))
      .finally(() => setLoadingClasses(false));
  }, []);

  const [students, setStudents] = React.useState<Student[]>(initialStudents);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<ClassSection | null>(null);
  const [selectedClass, setSelectedClass] = React.useState<ClassSection | null>(null);
  const [confirmClass, setConfirmClass] = React.useState<ClassSection | null>(null);
  const [query, setQuery] = React.useState("");
  const [studentQuery, setStudentQuery] = React.useState("");
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ClassSectionForm>({ resolver: zodResolver(classSectionSchema), defaultValues: emptyClassSection });
  const teacherOptions = React.useMemo(() => buildTeacherOptions(classes, fallbackTeacherNames), [classes]);

  function toast(title: string, description: string, tone: ToastItem["tone"] = "success") {
    setToasts((current) => [...current, { id: crypto.randomUUID(), title, description, tone }]);
  }

  function openCreate() {
    setEditingClass(null);
    reset(emptyClassSection);
    setSheetOpen(true);
  }

  function openEdit(item: ClassSection) {
    setEditingClass(item);
    reset({ name: item.name, gradeLevel: item.gradeLevel, academicYear: item.academicYear, homeroomTeacher: item.homeroomTeacher, status: item.status });
    setSheetOpen(true);
  }

  function openManage(item: ClassSection) {
    setSelectedClass(item);
    setStudentQuery("");
    setManageOpen(true);
  }

  async function onSubmit(values: ClassSectionForm) {
    await new Promise((resolve) => setTimeout(resolve, 280));
    const duplicate = hasDuplicateClassSection(classes, {
      name: values.name,
      academicYear: values.academicYear,
      ignoreId: editingClass?.id,
    });
    if (duplicate) {
      toast("Class section sudah ada", `${values.name} sudah dipakai pada tahun ajaran ${values.academicYear}.`, "warning");
      return;
    }

const method = editingClass ? "PATCH" : "POST";
    const endpoint = editingClass ? `/api/v1/classes/${editingClass.id}` : "/api/v1/classes";
    
    try {
      const saved = await fetchApi<ClassSection>(endpoint, {
        method,
        body: JSON.stringify(values),
      });

      if (editingClass) {
        setClasses((current) => current.map((item) => item.id === editingClass.id ? { ...item, ...saved } : item));
        toast("Class section diperbarui", `${values.name} berhasil disimpan.`);
      } else {
        setClasses((current) => [saved, ...current]);
        toast("Class section dibuat", `${values.name} siap menerima enrollment siswa.`);
      }
      setSheetOpen(false);
    } catch (error) {
      toast("Error", (error as Error).message, "warning");
    }
  }

  function deleteClass() {
    if (!confirmClass) return;
    fetchApi(`/api/v1/classes/${confirmClass.id}`, { method: "DELETE" })
      .then(() => setClasses((current) => current.filter((item) => item.id !== confirmClass.id)))
      .finally(() => setConfirmClass(null));
  }

  function toggleStudent(student: Student) {
    if (!selectedClass) return;
    const alreadyEnrolledHere = student.currentClassId === selectedClass.id;
    const otherClass = classes.find((item) => item.id === student.currentClassId && item.id !== selectedClass.id);

    if (!alreadyEnrolledHere && otherClass) {
      toast("Siswa sudah punya kelas", `${student.name} sudah terdaftar di ${otherClass.name}.`, "warning");
      return;
    }

    setStudents((current) => current.map((item) => item.id === student.id ? { ...item, currentClassId: alreadyEnrolledHere ? undefined : selectedClass.id } : item));
    setClasses((current) => current.map((item) => {
      if (item.id !== selectedClass.id) return item;
      return {
        ...item,
        studentIds: alreadyEnrolledHere ? item.studentIds.filter((id) => id !== student.id) : [...item.studentIds, student.id],
      };
    }));
    toast(alreadyEnrolledHere ? "Siswa dilepas" : "Siswa ditambahkan", `${student.name} ${alreadyEnrolledHere ? "dikeluarkan dari" : "masuk ke"} ${selectedClass.name}.`);
  }

  const metrics = calculateClassMetrics(classes, students);
  const filteredClasses = filterClasses(classes, query);
  const classEmptyState = getClassEmptyState({ totalClasses: classes.length, query });
  const selectedClassLive = selectedClass ? classes.find((item) => item.id === selectedClass.id) ?? selectedClass : null;
  const filteredStudents = filterStudentsForEnrollment(students, studentQuery);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">ISSUE-005</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Class Sections</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">Kelola rombongan belajar administratif seperti 10-A, 11-B, dan enrollment siswa per tahun ajaran.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Class Section</Button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {loadingClasses ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard label="Active Classes" value={String(metrics.active)} detail={`${metrics.inactive} inactive`} icon={School} />
            <MetricCard label="Enrolled Students" value={String(metrics.enrolledStudents)} detail={`${metrics.unassignedStudents} belum punya kelas`} icon={Users} />
            <MetricCard label="Average Size" value={String(metrics.averageClassSize)} detail="Siswa per class section" icon={CalendarDays} />
          </>
        )}
      </div>

      <Alert tone="info" title="Administrative hierarchy" description="Class Section hanya untuk pengelompokan administratif siswa. Subject group/rombel akademik akan dipisah pada ISSUE-006." />

      <Panel className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-[color:var(--border)] px-5 py-3 lg:grid-cols-[1fr_280px] lg:items-center">
          <h2 className="font-display text-xl font-semibold">Class Directory</h2>
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
              placeholder="Search class section"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {loadingClasses ? (
            <DirectoryTableSkeleton
              rows={4}
              kind="classes"
              className="md:grid-cols-[1fr_0.7fr_1fr_0.6fr_auto]"
            />
          ) : filteredClasses.length > 0 ? filteredClasses.map((item) => (
            <div key={item.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_0.7fr_1fr_0.6fr_auto] md:items-center">
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">{item.name}</p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">Grade {item.gradeLevel} • {item.academicYear}</p>
              </div>
              <Badge variant={item.status === "active" ? "success" : "default"}>{item.status}</Badge>
              <div className="text-sm text-[color:var(--muted-foreground)]">{item.homeroomTeacher}</div>
              <div className="text-sm font-semibold text-[color:var(--foreground)]">{item.studentIds.length} siswa</div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => openManage(item)}><UserPlus className="h-4 w-4" /> Students</Button>
                <Button size="sm" variant="secondary" onClick={() => openEdit(item)}><Edit3 className="h-4 w-4" /> Edit</Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmClass(item)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--surface-subtle)] text-[color:var(--muted-foreground)]">
                <School className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-[color:var(--foreground)]">{classEmptyState.title}</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--muted-foreground)]">{classEmptyState.description}</p>
              <Button className="mt-5" variant="secondary" onClick={classEmptyState.canResetSearch ? () => setQuery("") : openCreate}>
                {classEmptyState.actionLabel}
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <RightPullSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        eyebrow={editingClass ? "Edit class" : "Create class"}
        title={editingClass ? "Update class section" : "Tambah class section"}
        description="Buat kelas administratif per tahun ajaran. Satu nama kelas tidak boleh duplicate dalam tahun ajaran yang sama."
        footer={<><Button variant="secondary" onClick={() => setSheetOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>{isSubmitting ? "Saving..." : editingClass ? "Save Changes" : "Create Class"}</Button></>}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <InputGroup title="Class Profile" description="Identitas rombongan belajar administratif.">
            <InputGroupItem span="full"><FloatingInput label="Nama Class Section" prefix={<School className="h-4 w-4" />} placeholder="10-A" {...register("name")} error={errors.name?.message} /></InputGroupItem>
            <InputGroupItem span="half"><FloatingSelect label="Grade Level" startAdornment={<GraduationCap className="h-4 w-4" />} options={gradeOptions} {...register("gradeLevel")} value={watch("gradeLevel")} onChange={(event) => setValue("gradeLevel", event.target.value, { shouldDirty: true, shouldValidate: true })} error={errors.gradeLevel?.message} /></InputGroupItem>
            <InputGroupItem span="half"><FloatingInput label="Tahun Ajaran" prefix={<CalendarDays className="h-4 w-4" />} placeholder="2025/2026" {...register("academicYear")} error={errors.academicYear?.message} /></InputGroupItem>
            <InputGroupItem span="half"><FloatingSelect label="Wali Kelas" startAdornment={<BookUser className="h-4 w-4" />} options={teacherOptions} {...register("homeroomTeacher")} value={watch("homeroomTeacher")} onChange={(event) => setValue("homeroomTeacher", event.target.value, { shouldDirty: true, shouldValidate: true })} error={errors.homeroomTeacher?.message} /></InputGroupItem>
            <InputGroupItem span="half"><FloatingSelect label="Status" options={[{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} {...register("status")} value={watch("status")} onChange={(event) => setValue("status", event.target.value as ClassSectionForm["status"], { shouldDirty: true, shouldValidate: true })} error={errors.status?.message} /></InputGroupItem>
          </InputGroup>
        </form>
      </RightPullSheet>

      <RightPullSheet
        open={manageOpen}
        onOpenChange={setManageOpen}
        eyebrow="Student enrollment"
        title={selectedClassLive ? `Kelola siswa ${selectedClassLive.name}` : "Kelola siswa"}
        description="Satu siswa hanya boleh berada pada satu class section aktif untuk tahun ajaran berjalan."
        footer={<Button onClick={() => setManageOpen(false)}>Done</Button>}
      >
        <div className="space-y-5">
          <FloatingInput label="Cari siswa" prefix={<Search className="h-4 w-4" />} value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} />
          <div className="space-y-3">
            {filteredStudents.map((student) => {
              const className = classes.find((item) => item.id === student.currentClassId)?.name;
              const enrolledHere = student.currentClassId === selectedClassLive?.id;
              return (
                <div key={student.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{student.name}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">NIS {student.nis} {className ? `• ${className}` : "• Belum punya kelas"}</p>
                  </div>
                  <Button size="sm" variant={enrolledHere ? "secondary" : "primary"} onClick={() => toggleStudent(student)}>{enrolledHere ? "Remove" : "Add"}</Button>
                </div>
              );
            })}
          </div>
        </div>
      </RightPullSheet>

      <ConfirmDialog
        open={Boolean(confirmClass)}
        onOpenChange={(open) => !open && setConfirmClass(null)}
        title="Delete class section?"
        description="Class section ini akan dihapus dari backend tenant aktif."
        confirmLabel="Delete Class"
        tone="danger"
        onConfirm={deleteClass}
        details={confirmClass ? `${confirmClass.name} • ${confirmClass.academicYear}` : undefined}
      />

      <div className="fixed bottom-5 right-5 z-[95] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((item) => <Toast key={item.id} toast={item} onDismiss={(id) => setToasts((current) => current.filter((toastItem) => toastItem.id !== id))} />)}
      </div>
    </div>
  );
}
