"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  AlertTriangle,
  BookOpenCheck,
  Edit3,
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
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { MetricCard } from "@/components/ui/metric-card";
import { MetricCardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Panel } from "@/components/ui/panel";
import { RightPullSheet } from "@/components/ui/right-pull-sheet";
import { calculateStudentMetrics, filterStudents, type StudentDomainRecord } from "./student-domain";
import { fetchApi } from "@/lib/api-client";

const studentSchema = z.object({
  nisn: z.string().min(4, "NISN minimal 4 karakter"),
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  classSection: z.string().min(1, "Kelas administratif wajib dipilih"),
  guardianName: z.string().min(3, "Nama wali minimal 3 karakter"),
  guardianPhone: z.string().min(8, "Nomor wali minimal 8 karakter"),
  status: z.enum(["active", "inactive", "graduated"]),
});

type StudentForm = z.infer<typeof studentSchema>;
type Student = StudentForm & StudentDomainRecord & {
  subjectGroups: string[];
  courses: number;
  exams: number;
};

const classOptions = ["10-A", "10-B", "10-C", "11-B", "12-C"].map((value) => ({ label: value, value }));
const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Graduated", value: "graduated" },
];

const emptyStudent: StudentForm = {
  nisn: "",
  name: "",
  email: "",
  classSection: "10-A",
  guardianName: "",
  guardianPhone: "",
  status: "active",
};

const initialStudents: Student[] = [
  {
    id: "std-24001",
    nisn: "24001",
    name: "Budi Santoso",
    email: "budi@morfosis.local",
    classSection: "10-A",
    guardianName: "Pak Santoso",
    guardianPhone: "081234567001",
    status: "active",
    subjectGroups: ["Matematika X - Pagi", "Bahasa Indonesia Remedial"],
    courses: 5,
    exams: 3,
    risk: "normal",
  },
  {
    id: "std-24002",
    nisn: "24002",
    name: "Siti Aminah",
    email: "siti@morfosis.local",
    classSection: "10-A",
    guardianName: "Ibu Aminah",
    guardianPhone: "081234567002",
    status: "active",
    subjectGroups: ["Matematika X - Pagi"],
    courses: 4,
    exams: 3,
    risk: "attention",
  },
  {
    id: "std-24003",
    nisn: "24003",
    name: "John Doe",
    email: "john@morfosis.local",
    classSection: "10-B",
    guardianName: "Jane Doe",
    guardianPhone: "081234567003",
    status: "inactive",
    subjectGroups: ["Olimpiade Fisika"],
    courses: 2,
    exams: 1,
    risk: "attention",
  },
];

export default function StudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = React.useState(true);
  React.useEffect(() => {
    fetchApi<{ data: Student[] }>("/api/v1/students")
      .then(res => setStudents(res.data || []))
      .catch(err => console.error("Failed to fetch students", err))
      .finally(() => setLoadingStudents(false));
  }, []);

  const [query, setQuery] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: emptyStudent,
  });

  const filteredStudents = filterStudents(students, query);

  function openCreate() {
    setEditingStudent(null);
    reset(emptyStudent);
    setSheetOpen(true);
  }

  function openEdit(student: Student) {
    setEditingStudent(student);
    reset({
      nisn: student.nisn,
      name: student.name,
      email: student.email,
      classSection: student.classSection,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      status: student.status,
    });
    setSheetOpen(true);
  }

  async function onSubmit(values: StudentForm) {
    await new Promise((resolve) => setTimeout(resolve, 300));
const method = editingStudent ? "PATCH" : "POST";
    const endpoint = editingStudent ? `/api/v1/students/${editingStudent.id}` : "/api/v1/students";
    
    try {
      const saved = await fetchApi<Student>(endpoint, {
        method,
        body: JSON.stringify(values),
      });

      if (editingStudent) {
        setStudents((current) => current.map((student) => student.id === editingStudent.id ? { ...student, ...saved } : student));
      } else {
        setStudents((current) => [saved, ...current]);
      }
      setSheetOpen(false);
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
              <Button size="sm" variant="secondary" onClick={() => openEdit(student)}>
                <Edit3 className="h-4 w-4" /> Manage
              </Button>
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
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FloatingInput label="NISN" error={errors.nisn?.message} {...register("nisn")} />
            <FloatingSelect label="Status" options={statusOptions} error={errors.status?.message} {...register("status")} />
          </div>
          <FloatingInput label="Nama murid" error={errors.name?.message} {...register("name")} />
          <FloatingInput label="Email login" type="email" error={errors.email?.message} {...register("email")} />
          <FloatingSelect label="Kelas administratif aktif" options={classOptions} error={errors.classSection?.message} {...register("classSection")} />

          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5">
            <div className="mb-4 flex items-center gap-2 font-semibold">
              <UserRound className="h-4 w-4 text-[color:var(--brand)]" /> Guardian contact
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
    </div>
  );
}
