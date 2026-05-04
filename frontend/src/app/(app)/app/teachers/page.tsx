"use client";

import React from "react";
import { Edit3, GraduationCap, KeyRound, Mail, Plus, Search, ShieldCheck, UserRound, Users } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { InputGroup, InputGroupItem } from "@/components/ui/input-group";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { RightPullSheet } from "@/components/ui/right-pull-sheet";
import { DirectoryTableSkeleton, MetricCardSkeleton } from "@/components/ui/skeleton";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { fetchApi } from "@/lib/api-client";
import { canSubmitPasswordChange, normalizePasswordPayload, type PasswordFormValues } from "../users/password-domain";
import { calculateTeacherMetrics, filterTeachers, mapUserToTeacher, type ApiUser, type TeacherDirectoryItem } from "./teacher-domain";

const teacherSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  courseOfferingId: z.string().optional(),
});

type TeacherForm = z.infer<typeof teacherSchema>;
type SelectOption = { label: string; value: string };
type ApiCourseOffering = { id: string; subjectName?: string; className?: string; academicYear?: string; term?: string };
type ApiTeachingAssignment = { id: string; courseOfferingId: string; teacherId: string; teacherName?: string; role: string; status: string };

const emptyTeacher: TeacherForm = { name: "", email: "", courseOfferingId: "" };

function mapOfferingToOption(offering: ApiCourseOffering): SelectOption {
  const label = [offering.subjectName, offering.className, offering.academicYear, offering.term]
    .filter(Boolean)
    .join(" • ");
  return { label: label || offering.id, value: offering.id };
}

export default function TeachersPage() {
  const [teachers, setTeachers] = React.useState<TeacherDirectoryItem[]>([]);
  const [loadingTeachers, setLoadingTeachers] = React.useState(true);
  const [courseOfferingOptions, setCourseOfferingOptions] = React.useState<SelectOption[]>([]);
  const [teachingAssignments, setTeachingAssignments] = React.useState<ApiTeachingAssignment[]>([]);
  const [query, setQuery] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState<TeacherDirectoryItem | null>(null);
  const [passwordTeacher, setPasswordTeacher] = React.useState<TeacherDirectoryItem | null>(null);
  const [passwordValues, setPasswordValues] = React.useState<PasswordFormValues>({ password: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TeacherForm>({
    resolver: zodResolver(teacherSchema),
    defaultValues: emptyTeacher,
  });

  React.useEffect(() => {
    Promise.all([
      fetchApi<{ data: ApiUser[] }>("/api/v1/users"),
      fetchApi<{ data: ApiCourseOffering[] }>("/api/v1/academic/course-offerings"),
      fetchApi<{ data: ApiTeachingAssignment[] }>("/api/v1/academic/teaching-assignments"),
    ])
      .then(([usersResponse, offeringsResponse, assignmentsResponse]) => {
        setTeachers((usersResponse.data || []).map(mapUserToTeacher).filter((teacher) => teacher !== null));
        setCourseOfferingOptions((offeringsResponse.data || []).map(mapOfferingToOption));
        setTeachingAssignments(assignmentsResponse.data || []);
      })
      .catch((error) => console.error("Failed to fetch teacher references", error))
      .finally(() => setLoadingTeachers(false));
  }, []);

  function toast(title: string, description: string, tone: ToastItem["tone"] = "success") {
    setToasts((current) => [...current, { id: crypto.randomUUID(), title, description, tone }]);
  }

  function openCreate() {
    setEditingTeacher(null);
    reset(emptyTeacher);
    setSheetOpen(true);
  }

  function getTeacherAssignments(teacherId: string) {
    return teachingAssignments.filter((assignment) => assignment.teacherId === teacherId && assignment.status !== "inactive");
  }

  function openEdit(teacher: TeacherDirectoryItem) {
    setEditingTeacher(teacher);
    reset({ name: teacher.name, email: teacher.email, courseOfferingId: getTeacherAssignments(teacher.id)[0]?.courseOfferingId ?? "" });
    setSheetOpen(true);
  }

  function openPassword(teacher: TeacherDirectoryItem) {
    setPasswordTeacher(teacher);
    setPasswordValues({ password: "", confirmPassword: "" });
  }

  async function onSubmit(values: TeacherForm) {
    const endpoint = editingTeacher ? `/api/v1/users/${editingTeacher.id}` : "/api/v1/users";
    const method = editingTeacher ? "PATCH" : "POST";
    try {
      const saved = await fetchApi<ApiUser>(endpoint, {
        method,
        body: JSON.stringify({ name: values.name, email: values.email, role: "teacher" }),
      });
      const teacher = mapUserToTeacher(saved);
      if (!teacher) throw new Error("Saved user is not a teacher");
      if (values.courseOfferingId) {
        const assignment = await fetchApi<ApiTeachingAssignment>("/api/v1/academic/teaching-assignments", {
          method: "POST",
          body: JSON.stringify({ courseOfferingId: values.courseOfferingId, teacherId: teacher.id, role: "primary" }),
        });
        setTeachingAssignments((current) => [assignment, ...current.filter((item) => item.id !== assignment.id)]);
      }
      setTeachers((current) => editingTeacher ? current.map((item) => item.id === editingTeacher.id ? teacher : item) : [teacher, ...current]);
      toast(editingTeacher ? "Teacher updated" : "Teacher invited", `${values.name} tersimpan sebagai guru${values.courseOfferingId ? " dan sudah punya mapel yang diampu" : ""}.`);
      setSheetOpen(false);
    } catch (error) {
      toast("Request failed", (error as Error).message, "warning");
    }
  }

  async function updatePassword() {
    if (!passwordTeacher || !canSubmitPasswordChange(passwordValues)) return;
    setSavingPassword(true);
    try {
      await fetchApi(`/api/v1/users/${passwordTeacher.id}/password`, {
        method: "PATCH",
        body: JSON.stringify(normalizePasswordPayload(passwordValues)),
      });
      setTeachers((current) => current.map((item) => item.id === passwordTeacher.id ? { ...item, status: item.status === "invited" ? "active" : item.status } : item));
      toast("Password updated", `${passwordTeacher.name} sekarang bisa login.`);
      setPasswordTeacher(null);
    } catch (error) {
      toast("Gagal update password", (error as Error).message, "warning");
    } finally {
      setSavingPassword(false);
    }
  }

  const metrics = calculateTeacherMetrics(teachers);
  const filteredTeachers = filterTeachers(teachers, query);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">ISSUE-004.3 • Teacher Management</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Manage Teachers</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Kelola akun guru sebagai user role teacher, termasuk invitation, profil dasar, dan credential login.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Invite Teacher</Button>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        {loadingTeachers ? <><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /><MetricCardSkeleton /></> : <>
          <MetricCard label="Teachers" value={String(metrics.total)} detail="Total akun guru" icon={Users} />
          <MetricCard label="Active" value={String(metrics.active)} detail="Bisa login" icon={ShieldCheck} />
          <MetricCard label="Invited" value={String(metrics.invited)} detail="Menunggu credential" icon={Mail} />
          <MetricCard label="Disabled" value={String(metrics.disabled)} detail="Tidak aktif" icon={GraduationCap} />
        </>}
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-[color:var(--border)] px-5 py-3 lg:grid-cols-[1fr_280px] lg:items-center">
          <h2 className="font-display text-xl font-semibold">Teacher Directory</h2>
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <input className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]" placeholder="Search teacher" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {loadingTeachers ? <DirectoryTableSkeleton rows={4} kind="users" className="md:grid-cols-[1.3fr_0.7fr_0.5fr_auto_auto]" /> : filteredTeachers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm font-semibold text-[color:var(--muted-foreground)]">Belum ada guru untuk tenant ini.</div>
          ) : filteredTeachers.map((teacher) => {
            const assignedOfferings = getTeacherAssignments(teacher.id)
              .map((assignment) => courseOfferingOptions.find((option) => option.value === assignment.courseOfferingId)?.label)
              .filter((label): label is string => Boolean(label));
            return (
            <div key={teacher.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.1fr_1fr_0.45fr_auto_auto] md:items-center">
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">{teacher.name}</p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{teacher.email}</p>
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                <span className="font-medium text-[color:var(--foreground)]">Mapel diampu</span>
                <br />
                {assignedOfferings.length ? assignedOfferings.join(", ") : "Belum ditugaskan"}
              </div>
              <Badge variant={teacher.status === "active" ? "success" : "default"}>{teacher.status}</Badge>
              <Button variant="secondary" size="sm" onClick={() => openEdit(teacher)}><Edit3 className="h-4 w-4" /> Edit</Button>
              <Button variant="secondary" size="sm" onClick={() => openPassword(teacher)}><KeyRound className="h-4 w-4" /> Password</Button>
            </div>
            );
          })}
        </div>
      </Panel>

      <RightPullSheet open={sheetOpen} onOpenChange={setSheetOpen} eyebrow={editingTeacher ? "Edit teacher" : "Invite teacher"} title={editingTeacher ? "Update teacher" : "Invite guru"} description="Guru disimpan sebagai user role teacher agar bisa dipakai sebagai pengajar di course dan kelas.">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <InputGroup title="Teacher Identity" description="Data akun dasar guru.">
            <InputGroupItem span="full"><FloatingInput label="Nama Lengkap" prefix={<UserRound className="h-4 w-4" />} {...register("name")} error={errors.name?.message} /></InputGroupItem>
            <InputGroupItem span="full"><FloatingInput label="Email" prefix={<Mail className="h-4 w-4" />} {...register("email")} error={errors.email?.message} /></InputGroupItem>
          </InputGroup>
          <InputGroup title="Mata Pelajaran Diampu" description="Pilih course offering agar guru jelas mengajar mapel apa dan kelas mana." className="mt-5">
            <InputGroupItem span="full">
              <FloatingSelect
                label="Mata Pelajaran + Kelas"
                options={[{ label: "Belum ditugaskan", value: "" }, ...courseOfferingOptions]}
                {...register("courseOfferingId")}
                error={errors.courseOfferingId?.message}
              />
              <p className="mt-2 text-xs leading-5 text-[color:var(--muted-foreground)]">
                Ini menyimpan teaching assignment: guru → course offering. Course creation nanti hanya memilih mapel/kelas, bukan memilih nama guru sebagai mapel.
              </p>
            </InputGroupItem>
          </InputGroup>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Teacher"}</Button>
          </div>
        </form>
      </RightPullSheet>

      <RightPullSheet open={passwordTeacher !== null} onOpenChange={(open) => !open && setPasswordTeacher(null)} eyebrow="Set password" title={passwordTeacher ? `Update password ${passwordTeacher.name}` : "Update password"} description="Password disimpan sebagai bcrypt hash di backend.">
        <InputGroup title="Teacher Credential" description="Minimal 8 karakter. Konfirmasi harus sama.">
          <InputGroupItem span="full"><FloatingInput label="Password baru" type="password" prefix={<KeyRound className="h-4 w-4" />} value={passwordValues.password} onChange={(event) => setPasswordValues((current) => ({ ...current, password: event.target.value }))} /></InputGroupItem>
          <InputGroupItem span="full"><FloatingInput label="Konfirmasi password" type="password" prefix={<KeyRound className="h-4 w-4" />} value={passwordValues.confirmPassword} onChange={(event) => setPasswordValues((current) => ({ ...current, confirmPassword: event.target.value }))} error={passwordValues.confirmPassword && passwordValues.password.trim() !== passwordValues.confirmPassword.trim() ? "Konfirmasi password belum sama" : undefined} /></InputGroupItem>
        </InputGroup>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setPasswordTeacher(null)}>Cancel</Button>
          <Button onClick={updatePassword} disabled={savingPassword || !canSubmitPasswordChange(passwordValues)}>{savingPassword ? "Saving..." : "Save Password"}</Button>
        </div>
      </RightPullSheet>

      <div className="fixed right-4 top-4 z-[90] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((item) => <Toast key={item.id} toast={item} onDismiss={(id) => setToasts((current) => current.filter((toastItem) => toastItem.id !== id))} />)}
      </div>
    </div>
  );
}
