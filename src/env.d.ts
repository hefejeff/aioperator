/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_DATABASE_URL: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_WP_BASE_URL?: string;
  readonly VITE_WP_USERNAME?: string;
  readonly VITE_WP_APP_PASSWORD?: string;
  readonly VITE_WP_DEFAULT_AUTHOR_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}