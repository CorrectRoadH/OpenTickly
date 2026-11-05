import { useRef, useState } from "react";
import { toast } from "sonner";
import { WebApiError } from "../api/web-client.ts";

export function useBulkAction(
  onSelectionChange: (ids: Set<number>) => void,
  onStatus: (message: string) => void,
) {
  const [isPending, setIsPending] = useState(false);
  const running = useRef(false);
  async function run(
    ids: number[],
    action: (id: number) => Promise<unknown>,
    success: string,
    failure: string,
  ) {
    if (running.current) return;
    running.current = true;
    setIsPending(true);
    onStatus("");
    try {
      const results = await Promise.allSettled(
        ids.map((id) => Promise.resolve().then(() => action(id))),
      );
      const failedIds = ids.filter((_, index) => results[index]?.status === "rejected");
      if (failedIds.length) {
        if (failedIds.length < ids.length) onSelectionChange(new Set(failedIds));
        const error = results.find((result) => result.status === "rejected");
        toast.error(
          error?.status === "rejected" && error.reason instanceof WebApiError
            ? error.reason.userMessage
            : failure,
        );
      } else {
        onSelectionChange(new Set());
        onStatus(success);
      }
    } finally {
      running.current = false;
      setIsPending(false);
    }
  }
  return { isPending, run };
}
