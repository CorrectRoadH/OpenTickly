import { useEffect, useRef } from "react";
import { type FieldValues, type UseFormReturn, useWatch } from "react-hook-form";

type Options<T> = {
  initialValues: T;
  save: (values: T) => Promise<unknown> | void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

/** Serialize saves while keeping newer input separate from acknowledged snapshots. */
export function useAutosaveForm<T extends FieldValues>(
  form: UseFormReturn<T>,
  options: Options<T>,
) {
  const values = useWatch({ control: form.control });
  const serialized = JSON.stringify(values);
  const initial = JSON.stringify(options.initialValues);
  const saved = useRef(initial);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const callbacks = useRef(options);
  const dirty = form.formState.isDirty;

  useEffect(() => {
    callbacks.current = options;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    // A cache refresh must not overwrite a local draft or an in-flight save.
    if (!inFlight.current && !form.formState.isDirty) {
      form.reset(options.initialValues);
      saved.current = initial;
    }
  }, [initial, form]);

  async function saveLatest(): Promise<void> {
    if (!mounted.current || inFlight.current) return;
    const snapshot = structuredClone(form.getValues());
    const submitted = JSON.stringify(snapshot);
    if (submitted === saved.current) return;
    const handlers = callbacks.current;
    inFlight.current = true;
    try {
      await handlers.save(snapshot);
      saved.current = submitted;
      if (mounted.current) {
        if (JSON.stringify(form.getValues()) === submitted) form.reset(snapshot);
        handlers.onSuccess?.();
      }
    } catch (error) {
      if (mounted.current) handlers.onError?.(error);
    } finally {
      inFlight.current = false;
      // A later edit survives both success and failure of the older write.
      // Do not retry an unchanged failed snapshot in a tight loop.
      if (mounted.current && JSON.stringify(form.getValues()) !== submitted) {
        void saveLatest();
      }
    }
  }

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      void saveLatest();
    }, 900);
    return () => clearTimeout(timer);
  }, [serialized, dirty]);
}
