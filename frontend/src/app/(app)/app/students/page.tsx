"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  AlertTriangle,
  BookOpenCheck,
  Edit3,
  KeyRound,
  Lock,
  Trash2,
  GraduationCap,
  Mail,
  Plus,
  School,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { MetricCard } from "@/components/ui/metric-card";
import { MetricCardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/ui/panel";
import { RightPullSheet } from "@/components/ui/right-pull-sheet";
import { calculateStudentMetrics, filterStudents, type StudentDomainRecord } from "./student-domain";
import { 
  createStudent, 
  deleteStudent, 
  listClassOptions, 
  listStudents, 
  updateStudent,
  type ClassOption 
} from "./student-api";
import { updatePasswordInApi } from "../users/user-api";
import { canSubmitPasswordChange, normalizePasswordPayload, type PasswordFormValues } from "../users/password-domain";

const studentSchema = z.object({
  nisn: z.string().min(4, "NISN minimal 4 karakter"),
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  classSectionId: z.string().min(1, "Kelas administratif wajib dipilih"),
  guardianName: z.string().min(3, "Nama wali minimal 3 karakter"),
  guardianPhone: z.string().min(8, "Nomor wali minimal 8 karakter"),
  status: z.enum(["active", "inactive", "graduated"]),
});

type StudentForm = z.infer<typeof studentSchema>;
type Student = StudentForm & StudentDomainRecord & {
  classSection?: string;
  subjectGroups: string[];
  courses: number;
  exams: number;
};

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Graduated", value: "graduated" },
];

const emptyStudent: StudentForm = {
  nisn: "",
  name: "",
  email: "",
  classSectionId: "",
  guardianName: "",
  guardianPhone: "",
  status: "active",
};

function normalizeStudentRecord(student: Partial<Student>): Student {
  return {
    id: student.id ?? crypto.randomUUID(),
    userId: student.userId,
    nisn: student.nisn ?? "",
    name: student.name ?? "Tanpa nama",
    email: student.email ?? "",
    classSectionId: student.classSectionId ?? "",
    classSection: student.classSection ?? "No Class",
    guardianName: student.guardianName ?? "-",
    guardianPhone: student.guardianPhone ?? "-",
    status: student.status ?? "active",
    subjectGroups: Array.isArray(student.subjectGroups) ? student.subjectGroups : [],
    courses: typeof student.courses === "number" ? student.courses : 0,
    exams: typeof student.exams === "number" ? student.exams : 0,
    risk: student.risk ?? "normal",
  };
}

export default function StudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [classOptions, setClassOptions] = React.useState<ClassOption[]>([]);
  const [loadingStudents, setLoadingStudents] = React.useState(true);

  React.useEffect(() => {
    Promise.all([listStudents(), listClassOptions()])
      .then(([items, options]) => {
        setStudents(items.map(normalizeStudentRecord));
        setClassOptions(options);
      })
      .catch((err) => console.error("Failed to fetch", err))
      .finally(() => setLoadingStudents(false));
  }, []);

  const [query, setQuery] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);
  const [confirmStudent, setConfirmStudent] = React.useState<Student | null>(null);
  const [passwordStudent, setPasswordStudent] = React.useState<Student | null>(null);
  const [passwordValues, setPasswordValues] = React.useState<PasswordFormValues>({
    password: "",
    confirmPassword: "",
  });
  const [isPasswordOpen, setIsPasswordOpen] = React.useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = 
    useForm<StudentForm>({
      resolver: zodResolver(studentSchema),
      defaultValues: emptyStudent,
    });

  const classIdValue = watch("classSectionId");
  const statusValue = watch("status");

  const filteredStudents = filterStudents(students, query);

  function openCreate() {
    setEditingStudent(null);
    reset({ ...emptyStudent, classSectionId: classOptions[0]?.value ?? "" });
    setSheetOpen(true);
  }

  function openEdit(student: Student) {
    setEditingStudent(student);
    reset({
      nisn: student.nisn,
      name: student.name,
      email: student.email,
      classSectionId: student.classSectionId,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      status: student.status,
    });
    setSheetOpen(true);
  }

  async function onSubmit(values: StudentForm) {
    try {
      let saved;
      if (editingStudent) {
        saved = await updateStudent(editingStudent.id, values);
      } else {
        saved = await createStudent(values);
      }

      const normalizedSaved = normalizeStudentRecord(saved);
      if (editingStudent) {
        setStudents((current) => current.map((student) => student.id === editingStudent.id ? normalizeStudentRecord({ ...student, ...normalizedSaved }) : student));
      } else {
        setStudents((current) => [normalizedSaved, ...current]);
      }
      setSheetOpen(false);
    } catch (error) {
      console.error(error);
    }
  }

  function openPassword(student: Student) {
    setPasswordStudent(student);
    setPasswordValues({ password: "", confirmPassword: "" });
    setIsPasswordOpen(true);
  }

  async function updateStudentPassword() {
    if (!passwordStudent?.userId || !canSubmitPasswordChange(passwordValues)) return;
    try {
      await updatePasswordInApi(passwordStudent.userId, normalizePasswordPayload(passwordValues));
      setPasswordStudent(null);
      setIsPasswordOpen(false);
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteStudentAction() {
    if (!confirmStudent) return;
    try {
      await deleteStudent(confirmStudent.id);
      setStudents((current) => current.filter((student) => student.id !== confirmStudent.id));
      setConfirmStudent(null);
    } catch (error) {
      console.error(error);
    }
  }

  const metrics = calculateStudentMetrics(students);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            ISSUE-004.2 • Student Management
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Manage Students
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Kelola master data murid, kelas administratif aktif, kontak wali, dan ringkasan assignment akademik tanpa mencampur data course/exam runtime.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Student
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        {loadingStudents ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard label="Students" value={String(metrics.total)} detail="Master data murid" icon={Users} />
        <MetricCard label="Active" value={String(metrics.active)} detail="Bisa ikut course/exam" icon={ShieldCheck} />
        <MetricCard label="Need attention" value={String(metrics.attention)} detail="Offline/violation/low progress" icon={AlertTriangle} />
        <MetricCard label="Classes" value={String(metrics.classSections)} detail="Administrative sections" icon={School} />
          </>
        )}
      </div>

      <Alert
        tone="info"
        title="Student bukan sekadar User"
        description="User account mengatur login/role. Student profile menyimpan NISN, kelas administratif, wali, dan enrollment evidence yang dipakai eligibility course/exam."
      />

      <Panel className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-[color:var(--border)] px-5 py-3 lg:grid-cols-[1fr_280px] lg:items-center">
          <h2 className="font-display text-xl font-semibold">Student Directory</h2>
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
              placeholder="Search name, NISN, class"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-[color:var(--border)]">
          {loadingStudents ? (
            <TableSkeleton rows={4} columns={3} />
          ) : filteredStudents.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm font-semibold text-[color:var(--muted-foreground)]">
              Belum ada siswa untuk tenant ini.
            </div>
          ) : filteredStudents.map((student) => (
            <div key={student.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_0.55fr_0.75fr_0.55fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[color:var(--foreground)]">{student.name}</p>
                  <Badge variant={student.status === "active" ? "success" : "default"}>{student.status}</Badge>
                  {student.risk === "attention" ? <Badge variant="default">attention</Badge> : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">NISN {student.nisn} • {student.email}</p>
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                <span className="font-medium text-[color:var(--foreground)]">{student.classSection}</span>
                <br /> Administrative class
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                <span className="font-medium text-[color:var(--foreground)]">{student.subjectGroups.length} subject groups</span>
                <br /> {student.subjectGroups.join(", ") || "Belum ada assignment"}
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                <span className="font-medium text-[color:var(--foreground)]">{student.courses} courses</span>
                <br /> {student.exams} exams eligible
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(student)}>
                  <Edit3 className="h-4 w-4" /> Manage
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openPassword(student)}>
                  <KeyRound className="h-4 w-4" /> Password
                </Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmStudent(student)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <RightPullSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        eyebrow="Student profile"
        title={editingStudent ? `Manage ${editingStudent.name}` : "Add Student"}
        description="Master data murid dan kelas administratif. Assignment akademik tetap dikelola lewat Subject Groups/Course/Exam targeting."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Student"}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FloatingInput label="NISN" error={errors.nisn?.message} {...register("nisn")} placeholder="2400x" />
            <FloatingSelect label="Status" options={statusOptions} error={errors.status?.message} {...register("status")} value={statusValue} onChange={(e) => setValue("status", e.target.value as any, { shouldValidate: true, shouldDirty: true })} />
          </div>
          <FloatingInput label="Nama murid" error={errors.name?.message} {...register("name")} placeholder="Budi Santoso" />
          <FloatingInput label="Email login" type="email" error={errors.email?.message} {...register("email")} placeholder="budi@sekolah.id" />
          <FloatingSelect label="Kelas administratif aktif" options={classOptions} error={errors.classSectionId?.message} {...register("classSectionId")} value={classIdValue} onChange={(e) => setValue("classSectionId", e.target.value, { shouldValidate: true, shouldDirty: true })} />

          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5">
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <UserRound className="h-4 w-4 text-[color:var(--brand)]" /> Guardian contact
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FloatingInput label="Nama wali" error={errors.guardianName?.message} {...register("guardianName")} />
              <FloatingInput label="Nomor wali" error={errors.guardianPhone?.message} {...register("guardianPhone")} />
            </div>
          </div>

          {editingStudent ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5">
                <div className="mb-2 flex items-center gap-2 font-semibold"><GraduationCap className="h-4 w-4 text-[color:var(--brand)]" /> Academic assignment</div>
                <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{editingStudent.subjectGroups.join(", ") || "Belum ada subject group"}</p>
              </div>
              <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5">
                <div className="mb-2 flex items-center gap-2 font-semibold"><BookOpenCheck className="h-4 w-4 text-[color:var(--brand)]" /> Eligibility</div>
                <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">{editingStudent.courses} courses • {editingStudent.exams} exams</p>
              </div>
            </div>
          ) : null}

          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5">
            <div className="mb-2 flex items-center gap-2 font-semibold"><Mail className="h-4 w-4 text-[color:var(--brand)]" /> Invite behavior</div>
            <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">Saat backend aktif, penyimpanan student bisa otomatis membuat user login student atau menghubungkan ke user yang sudah ada berdasarkan email/NISN.</p>
          </div>
        </form>
      </RightPullSheet>

      <RightPullSheet
        open={isPasswordOpen}
        onOpenChange={setIsPasswordOpen}
        eyebrow="Security account"
        title={passwordStudent ? `Change password ${passwordStudent.name}` : "Change password"}
        description="Ganti password login siswa. Backend akan meng-hash password sebelum disimpan."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsPasswordOpen(false)}>Cancel</Button>
            <Button 
              onClick={updateStudentPassword} 
              disabled={!canSubmitPasswordChange(passwordValues)}
              variant="primary"
            >
              Update Password
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <Alert tone="warning" title="Password security" description="Password minimal 8 karakter dan harus cocok. Siswa akan ter-logout dari semua device setelah password diganti." />
          <div className="space-y-5">
            <FloatingInput label="New Password" type="password" prefix={<Lock className="h-4 w-4" />} value={passwordValues.password} onChange={(e) => setPasswordValues(p => ({ ...p, password: e.target.value }))} />
            <FloatingInput label="Confirm New Password" type="password" prefix={<ShieldCheck className="h-4 w-4" />} value={passwordValues.confirmPassword} onChange={(e) => setPasswordValues(p => ({ ...p, confirmPassword: e.target.value }))} />
            {passwordValues.password && passwordValues.confirmPassword && passwordValues.password !== passwordValues.confirmPassword && (
              <p className="text-xs font-semibold text-[color:var(--danger)]">Password tidak cocok.</p>
            )}
          </div>
        </div>
      </RightPullSheet>

      <ConfirmDialog
        open={Boolean(confirmStudent)}
        onOpenChange={(open) => !open && setConfirmStudent(null)}
        title="Delete student?"
        description="Master data siswa ini akan dihapus dari backend tenant aktif."
        confirmLabel="Delete Student"
        tone="danger"
        onConfirm={deleteStudentAction}
        details={confirmStudent ? `${confirmStudent.name} • NISN ${confirmStudent.nisn}` : undefined}
      />
    </div>
  );
}
