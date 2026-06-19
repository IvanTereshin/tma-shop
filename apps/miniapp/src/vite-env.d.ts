/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the tma-shop API. Defaults to same-origin `/api` via proxy. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
