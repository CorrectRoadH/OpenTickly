/**
 * Filters a list of items by a search query using a custom match function.
 * Replaces 5+ duplicate inline `items.filter(...)` patterns.
 */
export function useFilteredList<T>(
  items: T[],
  query: string,
  matchFn: (item: T, lowerQuery: string) => boolean,
): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return items;
  return items.filter((item) => matchFn(item, trimmed));
}
