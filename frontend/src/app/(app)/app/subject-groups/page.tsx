"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { BookOpen, Edit3, GraduationCap, Layers3, Plus, Search, Trash2, UserPlus, Users } from "lucide-react";
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
import {
  createSubjectGroup,
  deleteSubjectGroup,
  listSubjectGroups,
  listSubjectOptions,
  updateSubjectGroup,
  type SubjectGroupPayload,
  type SubjectOption,
} from "./subject-group-api";
import {
  calculateSubjectGroupMetrics,
  filterSubjectGroups,
  filterSubjectGroupStudents,
  hasDuplicateSubjectGroup,
  type SubjectGroupRecord,
  type SubjectGroupStudentRecord,
} from "./subject-group-domain";

const subjectGroupSchema = z.object({
  name: z.string().min(3, "Nama rombel minimal 3 karakter"),
  subjectId: z.string().min(1, "Mata pelajaran wajib dipilih"),
  academicYear: z.string().min(4, "Tahun ajaran wajib diisi"),
  term: z.enum(["ganjil", "genap"], { message: "Semester wajib dipilih" }),
});

type SubjectGroupForm = z.infer<typeof subjectGroupSchema>;
type Student = SubjectGroupStudentRecord;
type SubjectGroup = SubjectGroupRecord;

const emptySubjectGroup: SubjectGroupForm = {
  name: "",
  subjectId: "",
  academicYear: "2025/2026",
  term: "ganjil",
};

const students: Student[] = [
  { id: "std-001", nis: "2025001", name: "Alya Putri", classSection: "10-A" },
  { id: "std-002", nis: "2025002", name: "Bima Prakoso", classSection: "10-A" },
  { id: "std-003", nis: "2025003", name: "Citra Maharani", classSection: "11-B" },
  { id: "std-004", nis: "2025004", name: "Daffa Ramadhan", classSection: "10-A" },
  { id: "std-005", nis: "2025005", name: "Eka Safitri", classSection: "12-C" },
];

const fallbackSubjectOptions: SubjectOption[] = [];
const termOptions = [
  { label: "Ganjil", value: "ganjil" },
  { label: "Genap", value: "genap" },
];
const classFilterOptions = [{ label: "Semua kelas", value: "all" }, ...Array.from(new Set(students.map((item) => item.classSection))).map((item) => ({ label: item, value: item }))];

export default function SubjectGroupsPage() {
  const [groups, setGroups] = React.useState<SubjectGroup[]>([]);
  const [subjectOptions, setSubjectOptions] = React.useState<SubjectOption[]>(fallbackSubjectOptions);
  const [loadingGroups, setLoadingGroups] = React.useState(true);

  React.useEffect(() => {
    Promise.all([listSubjectGroups(), listSubjectOptions()])
      .then(([items, options]) => {
        setGroups(items);
        setSubjectOptions(options);
      })
      .catch((error) => toast("Gagal memuat subject groups", (error as Error).message, "warning"))
      .finally(() => setLoadingGroups(false));
  }, []);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [membersOpen, setMembersOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<SubjectGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<SubjectGroup | null>(null);
  const [confirmGroup, setConfirmGroup] = React.useState<SubjectGroup | null>(null);
  const [query, setQuery] = React.useState("");
  const [classFilter, setClassFilter] = React.useState("all");
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<SubjectGroupForm>({ resolver: zodResolver(subjectGroupSchema), defaultValues: emptySubjectGroup });

  const subjectIdValue = watch("subjectId");
  const termValue = watch("term");
  const subjectNameById = React.useMemo(() => new Map(subjectOptions.map((subject) => [subject.value, subject.label])), [subjectOptions]);

  function toast(title: string, description: string, tone: ToastItem["tone"] = "success") {
    setToasts((current) => [...current, { id: crypto.randomUUID(), title, description, tone }]);
  }

  function openCreate() {
    setEditingGroup(null);
    reset({ ...emptySubjectGroup, subjectId: subjectOptions[0]?.value ?? "" });
    setSheetOpen(true);
  }

  function openEdit(group: SubjectGroup) {
    setEditingGroup(group);
    reset({ name: group.name, subjectId: group.subjectId, academicYear: group.academicYear, term: group.term === "genap" ? "genap" : "ganjil" });
    setSheetOpen(true);
  }

  function openMembers(group: SubjectGroup) {
    setSelectedGroup(group);
    setQuery("");
    setClassFilter("all");
    setMembersOpen(true);
  }

  async function onSubmit(values: SubjectGroupForm) {
    if (hasDuplicateSubjectGroup(groups, { name: values.name, academicYear: values.academicYear, ignoreId: editingGroup?.id })) {
      toast("Subject group duplikat", `${values.name} sudah ada di tahun ajaran ${values.academicYear}.`, "warning");
      return;
    }

    const payload: SubjectGroupPayload = {
      subjectId: values.subjectId,
      name: values.name,
      academicYear: values.academicYear,
      term: values.term,
    };

    try {
      if (editingGroup) {
        const updated = await updateSubjectGroup(editingGroup.id, payload);
        setGroups((current) => current.map((item) => item.id === editingGroup.id ? { ...updated, studentIds: item.studentIds } : item));
        toast("Subject group diperbarui", `${values.name} berhasil disimpan.`);
      } else {
        const created = await createSubjectGroup(payload);
        setGroups((current) => [{ ...created, subject: subjectNameById.get(created.subjectId) ?? created.subject, studentIds: [] }, ...current]);
        toast("Subject group dibuat", `${values.name} siap menerima siswa lintas kelas.`);
      }
      setSheetOpen(false);
    } catch (error) {
      toast("Subject group gagal disimpan", (error as Error).message, "warning");
    }
  }

  async function deleteGroup() {
    if (!confirmGroup) return;
    try {
      await deleteSubjectGroup(confirmGroup.id);
      setGroups((current) => current.filter((group) => group.id !== confirmGroup.id));
      toast("Subject group dihapus", `${confirmGroup.name} berhasil dihapus.`);
      setConfirmGroup(null);
    } catch (error) {
      toast("Delete gagal", (error as Error).message, "warning");
    }
  }

  function toggleStudent(studentId: string) {
    if (!selectedGroup) return;
    const student = students.find((item) => item.id === studentId);
    const activeGroup = groups.find((group) => group.id === selectedGroup.id) ?? selectedGroup;
    const enrolled = activeGroup.studentIds.includes(studentId);
    setGroups((current) => current.map((group) => group.id === activeGroup.id ? { ...group, studentIds: enrolled ? group.studentIds.filter((id) => id !== studentId) : [...group.studentIds, studentId] } : group));
    toast(enrolled ? "Siswa dilepas" : "Siswa ditambahkan", `${student?.name ?? "Siswa"} ${enrolled ? "keluar dari" : "masuk ke"} ${activeGroup.name}.`);
  }

  const selectedGroupLive = selectedGroup ? groups.find((item) => item.id === selectedGroup.id) ?? selectedGroup : null;
  const filteredStudents = filterSubjectGroupStudents(students, { query, classSection: classFilter });
  const filteredGroups = filterSubjectGroups(groups, query);
  const metrics = calculateSubjectGroupMetrics(groups);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">ISSUE-006</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Subject Groups</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">Kelola rombongan belajar akademik lintas class section untuk mata pelajaran tertentu.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tambah Subject Group</Button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {loadingGroups ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard label="Active Groups" value={String(metrics.active)} detail={`${metrics.draft} draft`} icon={Layers3} />
        <MetricCard label="Subjects" value={String(metrics.subjects)} detail="Mata pelajaran terhubung" icon={BookOpen} />
        <MetricCard label="Cross-section Students" value={String(metrics.students)} detail={`${metrics.averageSize} avg/group`} icon={Users} />
          </>
        )}
      </div>

      <Alert tone="info" title="Academic grouping" description="Subject Group berbeda dari Class Section: satu rombel akademik bisa berisi siswa dari beberapa kelas administratif." />

      <Panel className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-[color:var(--border)] px-5 py-3 lg:grid-cols-[1fr_280px] lg:items-center">
          <h2 className="font-display text-xl font-semibold">Subject Group Directory</h2>
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
              placeholder="Search subject group"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {loadingGroups ? (
            <DirectoryTableSkeleton
              rows={4}
              kind="groups"
              className="md:grid-cols-[1.1fr_0.8fr_0.9fr_0.5fr_auto]"
            />
          ) : filteredGroups.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm font-semibold text-[color:var(--muted-foreground)]">
              Belum ada subject group untuk tenant ini.
            </div>
          ) : filteredGroups.map((group) => (
            <div key={group.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.1fr_0.8fr_0.9fr_0.5fr_auto] md:items-center">
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">{group.name}</p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{group.academicYear}</p>
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">{group.subject}</div>
              <div className="text-sm text-[color:var(--muted-foreground)]">{group.teacher}</div>
              <div className="flex flex-col gap-2"><Badge variant={group.status === "active" ? "success" : "default"}>{group.status}</Badge><span className="text-sm font-semibold text-[color:var(--foreground)]">{group.studentIds.length} siswa</span></div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => openMembers(group)}><UserPlus className="h-4 w-4" /> Members</Button>
                <Button size="sm" variant="secondary" onClick={() => openEdit(group)}><Edit3 className="h-4 w-4" /> Edit</Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmGroup(group)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <RightPullSheet open={sheetOpen} onOpenChange={setSheetOpen} eyebrow={editingGroup ? "Edit group" : "Create group"} title={editingGroup ? "Update subject group" : "Tambah subject group"} description="Hubungkan mata pelajaran, guru pengampu, dan rombel akademik lintas kelas." footer={<><Button variant="secondary" onClick={() => setSheetOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>{isSubmitting ? "Saving..." : editingGroup ? "Save Changes" : "Create Group"}</Button></>}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <InputGroup title="Subject Group Profile" description="Identitas rombel akademik dan guru pengampu.">
            <InputGroupItem span="full"><FloatingInput label="Nama Subject Group" prefix={<Layers3 className="h-4 w-4" />} placeholder="Matematika X - Pagi" {...register("name")} error={errors.name?.message} /></InputGroupItem>
            <InputGroupItem span="half"><FloatingSelect label="Mata Pelajaran" startAdornment={<BookOpen className="h-4 w-4" />} options={subjectOptions} {...register("subjectId")} value={subjectIdValue} onChange={(event) => setValue("subjectId", event.target.value, { shouldDirty: true, shouldValidate: true })} error={errors.subjectId?.message} disabled={!subjectOptions.length} /></InputGroupItem>
            <InputGroupItem span="half"><FloatingSelect label="Semester" startAdornment={<GraduationCap className="h-4 w-4" />} options={termOptions} {...register("term")} value={termValue} onChange={(event) => setValue("term", event.target.value as SubjectGroupForm["term"], { shouldDirty: true, shouldValidate: true })} error={errors.term?.message} /></InputGroupItem>
            <InputGroupItem span="half"><FloatingInput label="Tahun Ajaran" placeholder="2025/2026" {...register("academicYear")} error={errors.academicYear?.message} /></InputGroupItem>
          </InputGroup>
        </form>
      </RightPullSheet>

      <RightPullSheet open={membersOpen} onOpenChange={setMembersOpen} eyebrow="Cross-section enrollment" title={selectedGroupLive ? `Kelola member ${selectedGroupLive.name}` : "Kelola member"} description="Pilih siswa dari class section berbeda untuk masuk ke rombel akademik ini." footer={<Button onClick={() => setMembersOpen(false)}>Done</Button>}>
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]"><FloatingInput label="Cari siswa" prefix={<Search className="h-4 w-4" />} value={query} onChange={(event) => setQuery(event.target.value)} /><FloatingSelect label="Filter kelas" options={classFilterOptions} value={classFilter} onChange={(event) => setClassFilter(event.target.value)} /></div>
          <div className="space-y-3">
            {filteredStudents.map((student) => {
              const enrolled = selectedGroupLive?.studentIds.includes(student.id) ?? false;
              return <div key={student.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4"><div><p className="font-semibold text-[color:var(--foreground)]">{student.name}</p><p className="mt-1 text-xs text-[color:var(--muted-foreground)]">NIS {student.nis} • {student.classSection}</p></div><Button size="sm" variant={enrolled ? "secondary" : "primary"} onClick={() => toggleStudent(student.id)}>{enrolled ? "Remove" : "Add"}</Button></div>;
            })}
          </div>
        </div>
      </RightPullSheet>

      <ConfirmDialog
        open={Boolean(confirmGroup)}
        onOpenChange={(open) => !open && setConfirmGroup(null)}
        title="Delete subject group?"
        description="Rombel akademik ini akan dihapus dari backend tenant aktif."
        confirmLabel="Delete Group"
        tone="danger"
        onConfirm={deleteGroup}
        details={confirmGroup ? `${confirmGroup.name} • ${confirmGroup.academicYear}` : undefined}
      />

      <div className="fixed bottom-5 right-5 z-[95] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((item) => <Toast key={item.id} toast={item} onDismiss={(id) => setToasts((current) => current.filter((toastItem) => toastItem.id !== id))} />)}
      </div>
    </div>
  );
}
