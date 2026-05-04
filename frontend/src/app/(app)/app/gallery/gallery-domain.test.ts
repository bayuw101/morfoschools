import { describe, expect, it } from "vitest";
import {
  filterGalleryItems,
  getEmptyGalleryState,
  groupGalleryItemsByCategory,
  validateGalleryMetadata,
  type GalleryItem,
} from "./gallery-domain";

const items: GalleryItem[] = [
  { id: "button", title: "Buttons", category: "foundation", description: "Button variants", route: "/app/gallery#buttons", status: "ready" },
  { id: "form", title: "Floating Fields", category: "forms", description: "Zod friendly inputs", route: "/app/gallery#forms", status: "ready" },
  { id: "toast", title: "Toast", category: "feedback", description: "Custom feedback", route: "/app/gallery#toast", status: "draft" },
];

describe("gallery domain helpers", () => {
  it("groups gallery items by category", () => {
    expect(groupGalleryItemsByCategory(items)).toEqual({
      foundation: [items[0]],
      forms: [items[1]],
      feedback: [items[2]],
    });
  });

  it("filters gallery items by title, category, description, or status", () => {
    expect(filterGalleryItems(items, "floating").map((item) => item.id)).toEqual(["form"]);
    expect(filterGalleryItems(items, "feedback").map((item) => item.id)).toEqual(["toast"]);
    expect(filterGalleryItems(items, "ready").map((item) => item.id)).toEqual(["button", "form"]);
    expect(filterGalleryItems(items, "  ")).toHaveLength(3);
  });

  it("validates required surface metadata", () => {
    expect(validateGalleryMetadata(items)).toEqual({ valid: true, missing: [] });
    expect(validateGalleryMetadata([{ ...items[0], route: "" }])).toEqual({ valid: false, missing: ["Buttons route"] });
  });

  it("returns an empty state for missing categories or no search result", () => {
    expect(getEmptyGalleryState("forms", "missing")).toEqual({
      title: "Tidak ada komponen cocok",
      description: "Kategori forms belum memiliki item yang cocok dengan pencarian \"missing\".",
    });
    expect(getEmptyGalleryState("feedback", "")).toEqual({
      title: "Kategori masih kosong",
      description: "Belum ada item gallery untuk kategori feedback.",
    });
  });
});
