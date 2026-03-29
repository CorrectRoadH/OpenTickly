import { useMemo } from "react";

import { createPreferencesFormValues, type PreferencesFormValues } from "../forms/profile-form.ts";
import { usePreferencesQuery } from "./web-shell.ts";

export function useUserPreferences(): PreferencesFormValues {
  const query = usePreferencesQuery();
  return useMemo(() => createPreferencesFormValues(query.data ?? {}), [query.data]);
}
