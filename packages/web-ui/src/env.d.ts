// Minimal ambient types for the env flag used by dev-only instrumentation
// (e.g. render-count badges). The consumer app (Vite) replaces this at
// build time; we only need TypeScript to know the shape here.

interface ImportMetaEnv {
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
