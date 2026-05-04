import { describe, expect, it } from "vitest";
import {
  calculateTenantMetrics,
  filterTenants,
  getTenantHealth,
  sortTenantsByOperationalPriority,
  type TenantDirectoryItem,
} from "./tenant-domain";

const tenants: TenantDirectoryItem[] = [
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
  {
    id: "tenant-jakarta-overload",
    name: "SMK Padat Jakarta",
    slug: "smk-padat-jakarta",
    province: "DKI Jakarta",
    plan: "Low Spec VPS",
    studentCap: 100,
    activeUsers: 96,
    status: "active",
  },
];

describe("filterTenants", () => {
  it("filters tenants by school name, slug, province, plan, and status", () => {
    expect(filterTenants(tenants, "morfosis").map((tenant) => tenant.id)).toEqual(["tenant-smp-morfosis"]);
    expect(filterTenants(tenants, "sma-nusantara").map((tenant) => tenant.id)).toEqual(["tenant-sma-nusantara"]);
    expect(filterTenants(tenants, "yogyakarta").map((tenant) => tenant.id)).toEqual(["tenant-sma-nusantara"]);
    expect(filterTenants(tenants, "low spec").map((tenant) => tenant.id)).toEqual(["tenant-smp-morfosis", "tenant-jakarta-overload"]);
    expect(filterTenants(tenants, "setup").map((tenant) => tenant.id)).toEqual(["tenant-sma-nusantara"]);
  });

  it("returns all tenants for empty or whitespace query", () => {
    expect(filterTenants(tenants, "")).toHaveLength(3);
    expect(filterTenants(tenants, "   ")).toHaveLength(3);
  });
});

describe("calculateTenantMetrics", () => {
  it("calculates tenant counts, active users, setup tenants, and low-spec tenants", () => {
    expect(calculateTenantMetrics(tenants)).toEqual({
      total: 3,
      active: 2,
      setup: 1,
      activeUsers: 618,
      lowSpecTenants: 2,
      averageUtilization: 20,
    });
  });
});

describe("getTenantHealth", () => {
  it("maps setup, healthy, and near-capacity tenants to health labels", () => {
    expect(getTenantHealth(tenants[1])).toEqual({ label: "Setup", tone: "default" });
    expect(getTenantHealth(tenants[0])).toEqual({ label: "Healthy", tone: "success" });
    expect(getTenantHealth(tenants[2])).toEqual({ label: "Near capacity", tone: "warning" });
  });
});

describe("sortTenantsByOperationalPriority", () => {
  it("prioritizes near-capacity active tenants, then setup tenants, then healthy tenants without mutating input", () => {
    const sorted = sortTenantsByOperationalPriority(tenants);

    expect(sorted.map((tenant) => tenant.id)).toEqual([
      "tenant-jakarta-overload",
      "tenant-sma-nusantara",
      "tenant-smp-morfosis",
    ]);
    expect(tenants.map((tenant) => tenant.id)).toEqual([
      "tenant-smp-morfosis",
      "tenant-sma-nusantara",
      "tenant-jakarta-overload",
    ]);
  });
});
