export type TenantStatus = "active" | "setup";
export type TenantHealthTone = "success" | "warning" | "default";

export type TenantDirectoryItem = {
  id: string;
  name: string;
  slug: string;
  province: string;
  plan: string;
  studentCap: number;
  activeUsers: number;
  status: TenantStatus;
};

export type TenantMetrics = {
  total: number;
  active: number;
  setup: number;
  activeUsers: number;
  lowSpecTenants: number;
  averageUtilization: number;
};

export function filterTenants(tenants: TenantDirectoryItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return tenants;
  }

  return tenants.filter((tenant) =>
    [tenant.name, tenant.slug, tenant.province, tenant.plan, tenant.status]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export function calculateTenantMetrics(
  tenants: TenantDirectoryItem[],
): TenantMetrics {
  const activeUsers = tenants.reduce((sum, item) => sum + item.activeUsers, 0);
  const studentCap = tenants.reduce((sum, item) => sum + item.studentCap, 0);

  return {
    total: tenants.length,
    active: tenants.filter((item) => item.status === "active").length,
    setup: tenants.filter((item) => item.status === "setup").length,
    activeUsers,
    lowSpecTenants: tenants.filter((item) =>
      item.plan.toLowerCase().includes("low spec"),
    ).length,
    averageUtilization: studentCap ? Math.round((activeUsers / studentCap) * 100) : 0,
  };
}

export function getTenantHealth(tenant: TenantDirectoryItem): {
  label: string;
  tone: TenantHealthTone;
} {
  if (tenant.status === "setup") {
    return { label: "Setup", tone: "default" };
  }

  const utilization = tenant.studentCap
    ? tenant.activeUsers / tenant.studentCap
    : 0;

  if (utilization >= 0.9) {
    return { label: "Near capacity", tone: "warning" };
  }

  return { label: "Healthy", tone: "success" };
}

function getTenantOperationalPriority(tenant: TenantDirectoryItem) {
  const utilization = tenant.studentCap
    ? tenant.activeUsers / tenant.studentCap
    : 0;

  if (tenant.status === "active" && utilization >= 0.9) {
    return 0;
  }

  if (tenant.status === "setup") {
    return 1;
  }

  return 2;
}

export function sortTenantsByOperationalPriority(
  tenants: TenantDirectoryItem[],
): TenantDirectoryItem[] {
  return [...tenants].sort((left, right) => {
    const priorityDiff = getTenantOperationalPriority(left) - getTenantOperationalPriority(right);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const leftUtilization = left.studentCap ? left.activeUsers / left.studentCap : 0;
    const rightUtilization = right.studentCap ? right.activeUsers / right.studentCap : 0;
    const utilizationDiff = rightUtilization - leftUtilization;

    if (utilizationDiff !== 0) {
      return utilizationDiff;
    }

    return left.name.localeCompare(right.name);
  });
}


export type SelectOption = { label: string; value: string };

export function buildOptionsIncludingCurrent(
  baseOptions: SelectOption[],
  currentValue: string,
): SelectOption[] {
  const normalizedValue = currentValue.trim();
  if (!normalizedValue || baseOptions.some((option) => option.value === normalizedValue)) {
    return baseOptions;
  }

  return [{ label: normalizedValue, value: normalizedValue }, ...baseOptions];
}
