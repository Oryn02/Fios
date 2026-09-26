/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_ADMIN_UID?: string;
  readonly VITE_GITHUB_TOKEN?: string;
  /** Render API origin, e.g. https://fios-api.onrender.com (no trailing slash). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
