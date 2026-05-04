export type GalleryCategory = "foundation" | "forms" | "feedback" | "navigation" | "data-display";
export type GalleryStatus = "ready" | "draft";

export type GalleryItem = {
  id: string;
  title: string;
  category: GalleryCategory;
  description: string;
  route: string;
  status: GalleryStatus;
};

export type GalleryMetadataValidation = {
  valid: boolean;
  missing: string[];
};

export type GalleryEmptyState = {
  title: string;
  description: string;
};

export function groupGalleryItemsByCategory<T extends GalleryItem>(items: T[]): Partial<Record<GalleryCategory, T[]>> {
  return items.reduce<Partial<Record<GalleryCategory, T[]>>>((groups, item) => {
    groups[item.category] = [...(groups[item.category] ?? []), item];
    return groups;
  }, {});
}

export function filterGalleryItems<T extends GalleryItem>(items: T[], query: string): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return items;

  return items.filter((item) =>
    [item.title, item.category, item.description, item.status].join(" ").toLowerCase().includes(normalizedQuery),
  );
}

export function validateGalleryMetadata(items: GalleryItem[]): GalleryMetadataValidation {
  const missing = items.flatMap((item) => {
    const fields: string[] = [];
    if (!item.title.trim()) fields.push(`${item.id} title`);
    if (!item.description.trim()) fields.push(`${item.title || item.id} description`);
    if (!item.route.trim()) fields.push(`${item.title || item.id} route`);
    return fields;
  });

  return { valid: missing.length === 0, missing };
}

export function getEmptyGalleryState(category: GalleryCategory, query: string): GalleryEmptyState {
  const normalizedQuery = query.trim();
  if (normalizedQuery) {
    return {
      title: "Tidak ada komponen cocok",
      description: `Kategori ${category} belum memiliki item yang cocok dengan pencarian "${normalizedQuery}".`,
    };
  }

  return {
    title: "Kategori masih kosong",
    description: `Belum ada item gallery untuk kategori ${category}.`,
  };
}
