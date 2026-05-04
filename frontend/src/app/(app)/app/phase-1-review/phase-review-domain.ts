export type ReviewRole = "admin" | "teacher" | "student" | "operator";
export type ReviewStatus = "ready" | "draft" | "blocked";

export type ReviewSurface = {
  label: string;
  href: string;
  required: boolean;
};

export type ReviewFlow = {
  id: string;
  title: string;
  role: ReviewRole;
  status: ReviewStatus;
  surfaces: ReviewSurface[];
};

export type ReviewSurfaceCompleteness = {
  complete: boolean;
  missing: string[];
};

export type BackendReadinessCategory = "data" | "reliability" | "operability" | "security";

export type BackendReadinessItem = {
  id: string;
  category: BackendReadinessCategory;
  label: string;
  detail: string;
  ready: boolean;
};

export type BackendReadinessSummary = {
  total: number;
  ready: number;
  blocked: number;
  categories: Partial<Record<BackendReadinessCategory, number>>;
};

export function validateReviewSurfaceCompleteness(flows: ReviewFlow[]): ReviewSurfaceCompleteness {
  const missing = flows.flatMap((flow) =>
    flow.surfaces
      .filter((surface) => surface.required && !surface.href.trim())
      .map((surface) => `${flow.title}: ${surface.label}`),
  );

  return { complete: missing.length === 0, missing };
}

export function groupReviewSurfacesByFlow(flows: ReviewFlow[]): Partial<Record<ReviewRole, string[]>> {
  return flows.reduce<Partial<Record<ReviewRole, string[]>>>((groups, flow) => {
    groups[flow.role] = [...(groups[flow.role] ?? []), ...flow.surfaces.map((surface) => surface.href).filter(Boolean)];
    return groups;
  }, {});
}

export function calculateBackendReadinessSummary(items: BackendReadinessItem[]): BackendReadinessSummary {
  return items.reduce<BackendReadinessSummary>(
    (summary, item) => {
      summary.total += 1;
      if (item.ready) summary.ready += 1;
      else summary.blocked += 1;
      summary.categories[item.category] = (summary.categories[item.category] ?? 0) + 1;
      return summary;
    },
    { total: 0, ready: 0, blocked: 0, categories: {} },
  );
}
