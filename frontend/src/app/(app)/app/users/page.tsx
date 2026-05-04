"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import { InputGroup, InputGroupItem } from "@/components/ui/input-group";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { RightPullSheet } from "@/components/ui/right-pull-sheet";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { fetchApi } from "@/lib/api-client";
import {
  calculateUserMetrics,
  filterUsers,
  getDefaultUserFormValues,
  getRoleLabel,
  type UserDirectoryItem,
} from "./user-domain";

const userSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  tenantId: z.string().min(1, "Tenant wajib dipilih"),
  role: z.enum(["admin", "teacher", "student"], {
    message: "Role wajib dipilih",
  }),
});

type UserForm = z.infer<typeof userSchema>;
type User = UserForm & UserDirectoryItem;

const tenantOptions = [
  { label: "SMP Morfosis Demo", value: "tenant-smp-morfosis" },
  { label: "SMA Nusantara 2", value: "tenant-sma-nusantara" },
];

const emptyUser: UserForm = getDefaultUserFormValues(tenantOptions);
const initialUsers: User[] = [
  {
    id: "usr-admin-001",
    tenantId: "tenant-smp-morfosis",
    tenantName: "SMP Morfosis Demo",
    name: "Admin Sekolah",
    email: "admin@morfosis.local",
    role: "admin",
    status: "active",
    lastSeen: "Baru saja",
  },
  {
    id: "usr-guru-001",
    tenantId: "tenant-smp-morfosis",
    tenantName: "SMP Morfosis Demo",
    name: "Guru Matematika",
    email: "guru@morfosis.local",
    role: "teacher",
    status: "active",
    lastSeen: "5 menit lalu",
  },
  {
    id: "usr-siswa-001",
    tenantId: "tenant-smp-morfosis",
    tenantName: "SMP Morfosis Demo",
    name: "Siswa Demo",
    email: "siswa@morfosis.local",
    role: "student",
    status: "invited",
    lastSeen: "Belum login",
  },
];

export default function UsersPage() {
  const [users, setUsers] = React.useState<User[]>(initialUsers);
  React.useEffect(() => {
    fetchApi<{ data: User[] }>('/api/v1/users')
      .then(res => setUsers(res.data || []))
      .catch(err => console.error("Failed to fetch users", err));
  }, []);

  const [query, setQuery] = React.useState("");
  const filteredUsers = filterUsers(users, query);
  const metrics = calculateUserMetrics(users);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [confirmUser, setConfirmUser] = React.useState<User | null>(null);
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: emptyUser,
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
    setEditingUser(null);
    reset(emptyUser);
    setSheetOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    reset({
      name: user.name,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });
    setSheetOpen(true);
  }

  async function onSubmit(values: UserForm) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    // const tenantName =
      tenantOptions.find((tenant) => tenant.value === values.tenantId)?.label ??
      "Unknown Tenant";
const method = editingUser ? "PATCH" : "POST";
    const endpoint = editingUser ? `/api/v1/users/${editingUser.id}` : "/api/v1/users";
    
    try {
      const savedUser = await fetchApi<User>(endpoint, {
        method,
        body: JSON.stringify(values),
      });

      if (editingUser) {
        setUsers((current) => current.map((item) => item.id === editingUser.id ? { ...item, ...savedUser } : item));
        toast("User updated", `${values.name} berhasil diperbarui.`);
      } else {
        setUsers((current) => [savedUser, ...current]);
        toast("User created", `${values.name} siap menerima invitation flow.`);
      }
      setSheetOpen(false);
    } catch (error) {
      toast("Request failed", (error as Error).message, "warning");
    }
  }

  function deactivateUser() {
    if (!confirmUser) return;
    fetchApi(`/api/v1/users/${confirmUser.id}`, { method: "DELETE" })
      .then(() => {
        setUsers((current) => current.filter((item) => item.id !== confirmUser.id));
        toast("User dihapus", `${confirmUser.name} telah dihapus.`);
        setConfirmUser(null);
      })
      .catch((err) => toast("Gagal", err.message, "warning"));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            ISSUE-004
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            User & Role Management
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Kelola Admin, Guru, dan Murid lintas tenant. Create/edit memakai
            right-pulled modal drawer.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Invite User
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <MetricCard
          label="Total User"
          value={String(metrics.total)}
          detail={`${metrics.active} aktif · ${metrics.invited} invited`}
          icon={Users}
        />
        <MetricCard
          label="Guru"
          value={String(metrics.teachers)}
          detail="Pengajar aktif/diundang"
          icon={GraduationCap}
        />
        <MetricCard
          label="Admin"
          value={String(metrics.admins)}
          detail="Pengelola tenant"
          icon={ShieldCheck}
        />
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-[color:var(--border)] px-5 py-3 lg:grid-cols-[1fr_280px] lg:items-center">
          <h2 className="font-display text-xl font-semibold">User Directory</h2>
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
              placeholder="Search user"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="grid gap-4 px-5 py-4 md:grid-cols-[1.3fr_0.9fr_0.5fr_0.5fr_auto_auto] md:items-center"
            >
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">
                  {user.name}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                  {user.email}
                </p>
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                {user.tenantName}
              </div>
              <Badge>{getRoleLabel(user.role)}</Badge>
              <Badge variant={user.status === "active" ? "success" : "default"}>
                {user.status}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openEdit(user)}
              >
                <Edit3 className="h-4 w-4" /> Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmUser(user)}
              >
                Deactivate
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <RightPullSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        eyebrow={editingUser ? "Edit user" : "Invite user"}
        title={editingUser ? "Update user access" : "Invite anggota sekolah"}
        description="Role dan tenant dipilih lewat custom select; form tetap Zod validated dan bebas native browser validation."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : editingUser
                  ? "Save Changes"
                  : "Send Invite"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <InputGroup
            title="User Identity"
            description="Atur akses pengguna sesuai tenant dan role."
          >
            <InputGroupItem span="full">
              <FloatingInput
                label="Nama Lengkap"
                prefix={<UserRound className="h-4 w-4" />}
                {...register("name")}
                error={errors.name?.message}
              />
            </InputGroupItem>
            <InputGroupItem span="full">
              <FloatingInput
                label="Email"
                prefix={<Mail className="h-4 w-4" />}
                {...register("email")}
                error={errors.email?.message}
              />
            </InputGroupItem>
            <InputGroupItem span="half">
              <FloatingSelect
                label="Tenant"
                startAdornment={<School className="h-4 w-4" />}
                options={tenantOptions}
                {...register("tenantId")}
                error={errors.tenantId?.message}
              />
            </InputGroupItem>
            <InputGroupItem span="half">
              <FloatingSelect
                label="Role"
                startAdornment={<ShieldCheck className="h-4 w-4" />}
                options={[
                  { label: "Admin", value: "admin" },
                  { label: "Guru", value: "teacher" },
                  { label: "Murid", value: "student" },
                ]}
                {...register("role")}
                error={errors.role?.message}
              />
            </InputGroupItem>
          </InputGroup>
        </form>
      </RightPullSheet>

      <ConfirmDialog
        open={confirmUser !== null}
        onOpenChange={(open) => !open && setConfirmUser(null)}
        title="Nonaktifkan user?"
        description="Aksi ini memakai custom confirmation dialog, bukan native confirm()."
        confirmLabel="Nonaktifkan"
        cancelLabel="Batal"
        tone="danger"
        onConfirm={deactivateUser}
        details={
          confirmUser
            ? `${confirmUser.name} akan dikeluarkan dari sesi aktif dan perlu diundang ulang.`
            : undefined
        }
      />
      <div className="fixed right-4 top-4 z-[90] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
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
