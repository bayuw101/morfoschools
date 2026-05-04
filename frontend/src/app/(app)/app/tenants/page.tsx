"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Building2,
  Edit3,
  Trash2,
  MapPin,
  Plus,
  School,
  Search,
  Server,
  Users,
} from "lucide-react";
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
import { fetchApi } from "@/lib/api-client";
import {
  buildOptionsIncludingCurrent,
  calculateTenantMetrics,
  filterTenants,
  getTenantHealth,
  sortTenantsByOperationalPriority,
  type TenantDirectoryItem,
} from "./tenant-domain";

const tenantSchema = z.object({
  name: z.string().min(3, "Nama sekolah minimal 3 karakter"),
  slug: z
    .string()
    .min(3, "Slug minimal 3 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan dash"),
  province: z.string().min(1, "Provinsi wajib dipilih"),
  plan: z.string().min(1, "Plan wajib dipilih"),
  studentCap: z.coerce.number().min(1, "Kapasitas siswa wajib lebih dari 0"),
});

type TenantForm = z.infer<typeof tenantSchema>;
type Tenant = TenantForm & TenantDirectoryItem;

const initialTenants: Tenant[] = [
  {
    id: "tenant-smp-morfosis",
    name: "SMP Morfosis Demo",
    slug: "smp-morfosis-demo",
    province: "Jawa Barat",
    plan: "Low Spec VPS",
    studentCap: 1200,
    activeUsers: 428,
    status: "active",
  },
  {
    id: "tenant-sma-nusantara",
    name: "SMA Nusantara 2",
    slug: "sma-nusantara-2",
    province: "DI Yogyakarta",
    plan: "Standard",
    studentCap: 1800,
    activeUsers: 94,
    status: "setup",
  },
];

const emptyTenant: TenantForm = {
  name: "",
  slug: "",
  province: "",
  plan: "Low Spec VPS",
  studentCap: 500,
};

const baseProvinceOptions = [
  { label: "Indonesia", value: "Indonesia" },
  { label: "Jawa Barat", value: "Jawa Barat" },
  { label: "Jawa Tengah", value: "Jawa Tengah" },
  { label: "DI Yogyakarta", value: "DI Yogyakarta" },
  { label: "DKI Jakarta", value: "DKI Jakarta" },
];

const basePlanOptions = [
  { label: "Low Spec VPS", value: "Low Spec VPS" },
  { label: "Standard", value: "Standard" },
  { label: "Large School", value: "Large School" },
];

export default function TenantsPage() {
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const filteredTenants = sortTenantsByOperationalPriority(filterTenants(tenants, query));
  const metrics = calculateTenantMetrics(tenants);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingTenant, setEditingTenant] = React.useState<Tenant | null>(null);
  const [confirmTenant, setConfirmTenant] = React.useState<Tenant | null>(null);

  React.useEffect(() => {
    fetchApi<{ data: Tenant[] }>("/api/v1/tenants")
      .then((res) => setTenants(res.data || []))
      .catch((err) => console.error("Failed to load tenants", err))
      .finally(() => setLoadingTenants(false));
  }, []);

  const form = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
    defaultValues: emptyTenant,
  });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  function openCreate() {
    setEditingTenant(null);
    reset(emptyTenant);
    setSheetOpen(true);
  }

  function openEdit(tenant: Tenant) {
    setEditingTenant(tenant);
    reset({
      name: tenant.name,
      slug: tenant.slug,
      province: tenant.province,
      plan: tenant.plan,
      studentCap: tenant.studentCap,
    });
    setSheetOpen(true);
  }

  function deleteTenant() {
    if (!confirmTenant) return;
    fetchApi(`/api/v1/tenants/${confirmTenant.id}`, { method: "DELETE" })
      .then(() => setTenants((current) => current.filter((tenant) => tenant.id !== confirmTenant.id)))
      .finally(() => setConfirmTenant(null));
  }

  async function onSubmit(values: TenantForm) {
    if (editingTenant) {
      const updated = await fetchApi<Tenant>(`/api/v1/tenants/${editingTenant.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      setTenants((current) =>
        current.map((item) => (item.id === editingTenant.id ? updated : item)),
      );
    } else {
      const created = await fetchApi<Tenant>("/api/v1/tenants", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setTenants((current) => [created, ...current]);
    }
    setSheetOpen(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-strong)]">
            ISSUE-004
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Tenant Management
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            Kelola sekolah sebagai tenant terisolasi. Create/edit sekarang
            memakai right-pulled modal drawer.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New Tenant
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {loadingTenants ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
          label="Total Tenant"
          value={String(metrics.total)}
          detail="Sekolah terdaftar"
          icon={Building2}
        />
        <MetricCard
          label="Active Users"
          value={String(metrics.activeUsers)}
          detail="Dari semua tenant"
          icon={Users}
        />
        <MetricCard
          label="Low Spec"
          value={String(metrics.lowSpecTenants)}
          detail={`${metrics.averageUtilization}% avg utilization`}
          icon={Server}
        />
          </>
        )}
      </div>

      <Alert
        tone="info"
        title="Multi-tenant guardrail"
        description="Semua data domain berikutnya wajib membawa tenant_id context. Untuk phase awal kita pakai shared schema agar hemat resource di VPS low-spec."
      />

      <Panel className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-[color:var(--border)] px-5 py-3 lg:grid-cols-[1fr_280px] lg:items-center">
          <h2 className="font-display text-xl font-semibold">
            Tenant Directory
          </h2>
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3">
            <Search className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
              placeholder="Search tenant"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="divide-y divide-[color:var(--border)]">
          {loadingTenants ? (
            <DirectoryTableSkeleton
              rows={4}
              kind="tenants"
              className="md:grid-cols-[1.4fr_0.9fr_0.7fr_0.5fr_auto]"
            />
          ) : filteredTenants.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm font-semibold text-[color:var(--muted-foreground)]">
              Belum ada tenant yang cocok.
            </div>
          ) : filteredTenants.map((tenant) => {
            const health = getTenantHealth(tenant);
            return (
            <div
              key={tenant.id}
              className="grid gap-4 px-5 py-4 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.5fr_auto] md:items-center"
            >
              <div>
                <p className="font-semibold text-[color:var(--foreground)]">
                  {tenant.name}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                  {tenant.slug} • {tenant.province}
                </p>
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                {tenant.plan}
              </div>
              <div className="text-sm text-[color:var(--muted-foreground)]">
                {tenant.activeUsers}/{tenant.studentCap} users
              </div>
              <Badge variant={health.tone}>
                {health.label}
              </Badge>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEdit(tenant)}
                >
                  <Edit3 className="h-4 w-4" /> Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmTenant(tenant)}>
                  <Trash2 className="h-4 w-4" /> Delete
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
        eyebrow={editingTenant ? "Edit tenant" : "Create tenant"}
        title={editingTenant ? "Update sekolah" : "Tambah sekolah baru"}
        description="Drawer modal ini ditarik dari kanan dengan pull handle, sticky footer, dan field Morfostocks."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : editingTenant
                  ? "Save Changes"
                  : "Create Tenant"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <InputGroup
            title="Tenant Profile"
            description="Identitas dan kapasitas tenant sekolah."
          >
            <InputGroupItem span="full">
              <FloatingInput
                label="Nama Sekolah"
                prefix={<School className="h-4 w-4" />}
                {...register("name")}
                error={errors.name?.message}
              />
            </InputGroupItem>
            <InputGroupItem span="full">
              <FloatingInput
                label="Slug Tenant"
                prefix={<Building2 className="h-4 w-4" />}
                {...register("slug")}
                error={errors.slug?.message}
                helperText="Contoh: smp-morfosis-demo"
              />
            </InputGroupItem>
            <InputGroupItem span="half">
              <FloatingSelect
                label="Provinsi"
                startAdornment={<MapPin className="h-4 w-4" />}
                options={buildOptionsIncludingCurrent(baseProvinceOptions, watch("province"))}
                {...register("province")}
                value={watch("province")}
                onChange={(event) => setValue("province", event.target.value, { shouldDirty: true, shouldValidate: true })}
                error={errors.province?.message}
              />
            </InputGroupItem>
            <InputGroupItem span="half">
              <FloatingSelect
                label="Plan"
                startAdornment={<Server className="h-4 w-4" />}
                options={buildOptionsIncludingCurrent(basePlanOptions, watch("plan"))}
                {...register("plan")}
                value={watch("plan")}
                onChange={(event) => setValue("plan", event.target.value, { shouldDirty: true, shouldValidate: true })}
                error={errors.plan?.message}
              />
            </InputGroupItem>
            <InputGroupItem span="full">
              <FloatingInput
                label="Kapasitas Siswa"
                type="number"
                prefix={<Users className="h-4 w-4" />}
                {...register("studentCap")}
                error={errors.studentCap?.message}
              />
            </InputGroupItem>
          </InputGroup>
        </form>
      </RightPullSheet>

      <ConfirmDialog
        open={Boolean(confirmTenant)}
        onOpenChange={(open) => !open && setConfirmTenant(null)}
        title="Delete tenant?"
        description="Tenant sekolah ini akan dihapus dari backend. Pastikan tidak ada data aktif yang masih dibutuhkan."
        confirmLabel="Delete Tenant"
        tone="danger"
        onConfirm={deleteTenant}
        details={confirmTenant ? `${confirmTenant.name} • ${confirmTenant.slug}` : undefined}
      />
    </div>
  );
}
