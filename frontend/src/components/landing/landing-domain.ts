export type LandingCta = {
  id: string;
  label: string;
  href: string;
  primary: boolean;
};

export type LandingFeatureSection = "modules" | "reliability" | "workflow";

export type LandingFeature = {
  id: string;
  title: string;
  description: string;
  section: LandingFeatureSection;
  criticalPathSafe: boolean;
  required?: boolean;
};

export type LandingRole = "admin" | "teacher" | "student" | "operator";

export type LandingValueProp = {
  id?: string;
  role: LandingRole;
  title: string;
  text?: string;
  description?: string;
};

export type LandingValidationResult = {
  valid: boolean;
  issues: string[];
};

export type LandingFeatureCompleteness = {
  complete: boolean;
  missing: string[];
};

export function getPrimaryCta(ctas: LandingCta[]): LandingCta | undefined {
  return ctas.find((cta) => cta.primary);
}

export function validateCtaLinks(ctas: LandingCta[]): LandingValidationResult {
  const issues = ctas.flatMap((cta) => {
    const currentIssues: string[] = [];
    if (!cta.label.trim()) currentIssues.push(`${cta.id} missing label`);
    if (!cta.href.trim()) currentIssues.push(`${cta.id} missing href`);
    else if (!cta.href.startsWith("/") && !cta.href.startsWith("#")) {
      currentIssues.push(`${cta.id} uses unsupported href ${cta.href}`);
    }
    return currentIssues;
  });

  return { valid: issues.length === 0, issues };
}

export function validateFeatureCompleteness(
  features: LandingFeature[],
  requiredSections: LandingFeatureSection[],
): LandingFeatureCompleteness {
  const missing: string[] = [];

  for (const feature of features) {
    if (!feature.title.trim()) missing.push(`${feature.id} title`);
    if (!feature.description.trim()) missing.push(`${feature.title || feature.id} description`);
    if (!feature.criticalPathSafe) missing.push(`${feature.title || feature.id} critical path safety`);
  }

  for (const section of requiredSections) {
    if (!features.some((feature) => feature.section === section)) missing.push(`section ${section}`);
  }

  return { complete: missing.length === 0, missing };
}

export function validateLandingFeatureCompleteness(features: LandingFeature[]): LandingFeatureCompleteness {
  return validateFeatureCompleteness(features.filter((feature) => feature.required ?? true), ["modules", "reliability", "workflow"]);
}

export function groupLandingValuePropsByRole<T extends LandingValueProp>(
  valueProps: T[],
): Partial<Record<LandingRole, T[]>> {
  return valueProps.reduce<Partial<Record<LandingRole, T[]>>>((groups, valueProp) => {
    groups[valueProp.role] = [...(groups[valueProp.role] ?? []), valueProp];
    return groups;
  }, {});
}

export const groupValuePropsByRole = groupLandingValuePropsByRole;
