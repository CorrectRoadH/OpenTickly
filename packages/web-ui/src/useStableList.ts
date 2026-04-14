import { useRef } from "react";

/**
 * Reference-stability helper for lists whose items come from fresh
 * derivations (`.filter().map()`) on every render.
 *
 * Given a key function and an item-equality check, `useStableList` reuses
 * prior item references for items whose visible fields match the previous
 * render, and reuses the containing array reference when every item is
 * reused. That lets downstream `memo`/`shallowListEqual` boundaries
 * short-circuit, so unrelated parent re-renders — or a cache update that
 * only touched one item — no longer cascade into every list row.
 *
 * The per-feature equality check is caller-owned: feed in a comparator
 * that lists only the fields that affect rendering (e.g. id/name/color,
 * not `updated_at`/`at`).
 */
export function useStableList<T>(
  next: T[],
  getKey: (item: T) => number | string,
  isEqual: (a: T, b: T) => boolean,
): T[] {
  const previousRef = useRef<T[]>([]);
  const previous = previousRef.current;

  if (
    previous.length === next.length &&
    previous.every((item, index) => {
      const candidate = next[index];
      return candidate !== undefined && isEqual(item, candidate);
    })
  ) {
    return previous;
  }

  const previousByKey = new Map(previous.map((item) => [getKey(item), item]));
  const stabilized = next.map((item) => {
    const prior = previousByKey.get(getKey(item));
    return prior && isEqual(prior, item) ? prior : item;
  });

  previousRef.current = stabilized;
  return stabilized;
}
