import type { QueryClient } from "@tanstack/react-query";

const queues = new WeakMap<QueryClient, Map<string, Promise<unknown>>>();

/** Share ordering across hook instances, but never across entities or query clients. */
export function writeEntity<T>(
  client: QueryClient,
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  let queue = queues.get(client);
  if (!queue) {
    queue = new Map();
    queues.set(client, queue);
  }
  const previous = queue.get(key) ?? Promise.resolve();
  const result = previous.catch(() => {}).then(operation);
  queue.set(key, result);
  const release = () => {
    if (queue.get(key) === result) queue.delete(key);
  };
  void result.then(release, release);
  return result;
}
