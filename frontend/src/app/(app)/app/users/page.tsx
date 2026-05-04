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
import { DirectoryTableSkeleton, MetricCardSkeleton } from "@/components/ui/skeleton";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { fetchApi } from "@/lib/api-client";
import { getSession } from "@/lib/auth";
import {
  calculateUserMetrics,
  filterUsers,
  getDefaultUserFormValues,
  getRoleLabel,
  type UserDirectoryItem,
  type UserRole,
  type UserStatus,
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
type TenantOption = { label: string; value: string };
type TenantResponse = {
  id: string;
  name: string;
  slug: string;
  province: string;
  plan: string;
  status: string;
  studentCap: number;
  activeUsers: number;
};

type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  tenantId?: string;
  tenantName?: string;
};

const DEMO_TENANT_ID = "00000000-0000-4000-8000-000000000001";
const fallbackTenantOptions: TenantOption[] = [
  { label: "SMA Morfosis Demo", value: DEMO_TENANT_ID },
];

function resolveCurrentTenant(): TenantOption {
  if (typeof window === "undefined") return fallbackTenantOptions[0];
  const session = getSession();
  return {
    label: session?.tenantName ?? fallbackTenantOptions[0].label,
    value: session?.tenantId ?? fallbackTenantOptions[0].value,
  };
}

function toTenantOptions(tenants: TenantResponse[]): TenantOption[] {
  return tenants.map((tenant) => ({ label: tenant.name, value: tenant.id }));
}

function mapApiUser(user: ApiUser, currentTenant: TenantOption, tenants: TenantOption[]): User {
  const tenantId = user.tenantId ?? currentTenant.value;
  const tenantName = user.tenantName ?? tenants.find((tenant) => tenant.value === tenantId)?.label ?? currentTenant.label;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    tenantId,
    tenantName,
    lastSeen: "—",
  };
}

const emptyUser: UserForm = getDefaultUserFormValues(fallbackTenantOptions);
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
  const [tenantOptions, setTenantOptions] = React.useState<TenantOption[]>(fallbackTenantOptions);
  const [currentTenant, setCurrentTenant] = React.useState<TenantOption>(fallbackTenantOptions[0]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);

  React.useEffect(() => {
    const sessionTenant = resolveCurrentTenant();
    setCurrentTenant(sessionTenant);

    Promise.all([
      fetchApi<{ data: TenantResponse[] }>("/api/v1/tenants"),
      fetchApi<{ data: ApiUser[] }>("/api/v1/users"),
    ])
      .then(([tenantResponse, userResponse]) => {
        const options = toTenantOptions(tenantResponse.data || []);
        const mergedTenantOptions = options.length > 0 ? options : [sessionTenant];
        setTenantOptions(mergedTenantOptions);
        setUsers((userResponse.data || []).map((user) => mapApiUser(user, sessionTenant, mergedTenantOptions)));
      })
      .catch((err) => console.error("Failed to fetch users", err))
      .finally(() => setLoadingUsers(false));
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
    setValue,
    watch,
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
    reset({ ...emptyUser, tenantId: currentTenant.value });
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
    const tenantName = tenantOptions.find((tenant) => tenant.value === values.tenantId)?.label ?? currentTenant.label;
    const method = editingUser ? "PATCH" : "POST";
    const endpoint = editingUser ? `/api/v1/users/${editingUser.id}` : "/api/v1/users";
    
    try {
      const savedUser = await fetchApi<ApiUser>(endpoint, {
        method,
        headers: { "X-Tenant-ID": values.tenantId },
        body: JSON.stringify({ name: values.name, email: values.email, role: values.role }),
      });

      if (editingUser && editingUser.tenantId !== values.tenantId) {
        await fetchApi(`/api/v1/users/${editingUser.id}`, {
          method: "DELETE",
          headers: { "X-Tenant-ID": editingUser.tenantId },
        });
      }
      const hydratedUser: User = {
        ...mapApiUser(savedUser, { label: tenantName, value: values.tenantId }, tenantOptions),
        tenantId: values.tenantId,
        tenantName,
      };

      if (editingUser) {
        setUsers((current) => current.map((item) => item.id === editingUser.id ? { ...item, ...hydratedUser } : item));
        toast("User updated", `${values.name} berhasil diperbarui.`);
      } else {
        setUsers((current) => [hydratedUser, ...current]);
        toast("User created", `${values.name} siap menerima invitation flow.`);
      }
      setSheetOpen(false);
    } catch (error) {
      toast("Request failed", (error as Error).message, "warning");
    }
  }

  function deactivateUser() {
    if (!confirmUser) return;
    fetchApi(`/api/v1/users/${confirmUser.id}`, {
      method: "DELETE",
      headers: { "X-Tenant-ID": confirmUser.tenantId },
    })
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
        {loadingUsers ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
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
          </>
        )}
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
          {loadingUsers ? (
            <DirectoryTableSkeleton
              rows={4}
              kind="users"
              className="md:grid-cols-[1.3fr_0.9fr_0.5fr_0.5fr_auto_auto]"
            />
          ) : filteredUsers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm font-semibold text-[color:var(--muted-foreground)]">
              Belum ada user untuk tenant ini.
            </div>
          ) : filteredUsers.map((user) => (
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
                value={watch("tenantId")}
                onChange={(event) => setValue("tenantId", event.target.value, { shouldDirty: true, shouldValidate: true })}
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
                value={watch("role")}
                onChange={(event) => setValue("role", event.target.value as UserForm["role"], { shouldDirty: true, shouldValidate: true })}
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
