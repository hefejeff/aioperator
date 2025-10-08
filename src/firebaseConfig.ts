// --- IMPORTANT ---
// This configuration is now loaded from environment variables.
// Create a .env file in the root of your project and add your Firebase project's credentials there.
// Example .env file:
// FIREBASE_API_KEY="AIza..."
// FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
// ...and so on.
//
// The Vite build process will replace `import.meta.env.*` with these values.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
