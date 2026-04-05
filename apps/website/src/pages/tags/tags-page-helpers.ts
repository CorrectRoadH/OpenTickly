export type TagListItem = {
  deleted_at?: string | null;
  id: number;
  name: string;
  workspace_id?: number | null;
};

export function normalizeTags(data: unknown): TagListItem[] {
  if (Array.isArray(data)) {
    return data as TagListItem[];
  }

  if (hasTagArray(data, "tags")) {
    return data.tags;
  }

  if (hasTagArray(data, "data")) {
    return data.data;
  }

  return [];
}

function hasTagArray(
  value: unknown,
  key: "data" | "tags",
): value is Record<typeof key, TagListItem[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}
