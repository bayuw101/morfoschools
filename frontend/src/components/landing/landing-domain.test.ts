import { describe, expect, it } from "vitest";
import {
  groupLandingValuePropsByRole,
  validateCtaLinks,
  validateFeatureCompleteness,
  type LandingCta,
  type LandingFeature,
  type LandingValueProp,
} from "./landing-domain";

const ctas: LandingCta[] = [
  { id: "demo", label: "Masuk ke Demo", href: "/login", primary: true },
  { id: "modules", label: "Jelajahi Modul", href: "#modules", primary: false },
];

const features: LandingFeature[] = [
  { id: "course", title: "Kelas & Materi", description: "Materi", section: "modules", criticalPathSafe: true },
  { id: "exam", title: "Ujian Anti Panik", description: "Inbox", section: "reliability", criticalPathSafe: true },
  { id: "ops", title: "Operasional Sekolah", description: "Admin", section: "workflow", criticalPathSafe: true },
];

const valueProps: LandingValueProp[] = [
  { role: "admin", title: "Kelola sekolah", description: "Tenant dan user" },
  { role: "teacher", title: "Buat materi", description: "Course dan ujian" },
  { role: "student", title: "Belajar", description: "Learn dan exam" },
  { role: "admin", title: "Pantau operasional", description: "Dashboard" },
];

describe("landing domain helpers", () => {
  it("validates CTA labels and internal link targets", () => {
    expect(validateCtaLinks(ctas)).toEqual({ valid: true, issues: [] });
    expect(validateCtaLinks([{ ...ctas[0], href: "https://external.example" }, { ...ctas[1], label: "" }])).toEqual({
      valid: false,
      issues: ["demo uses unsupported href https://external.example", "modules missing label"],
    });
  });

  it("validates feature completeness and required critical path safety", () => {
    expect(validateFeatureCompleteness(features, ["modules", "reliability", "workflow"])).toEqual({ complete: true, missing: [] });
    expect(validateFeatureCompleteness([{ ...features[0], criticalPathSafe: false }], ["modules", "reliability"])).toEqual({
      complete: false,
      missing: ["Kelas & Materi critical path safety", "section reliability"],
    });
  });

  it("groups value propositions by role", () => {
    expect(groupLandingValuePropsByRole(valueProps)).toEqual({
      admin: [valueProps[0], valueProps[3]],
      teacher: [valueProps[1]],
      student: [valueProps[2]],
    });
  });
});
