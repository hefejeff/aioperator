
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

// --- IMPORTANT ---
// This is a placeholder configuration. It is intentionally filled with
// valid-looking but non-functional values. This allows the Firebase App to initialize
// without crashing, which in turn enables the application's offline mode to function
// correctly. When the app tries to connect using these credentials, Firebase
// will return permission errors, which are caught and handled gracefully.
//
// To connect to your own Firebase project, replace these values with your
// actual project configuration from the Firebase console.
const firebaseConfig = {
  apiKey: "AIzaSyDBKJtIC68nfL9GENwtTpAm4wofjVpvxfU",
  authDomain: "ai-operator-pro.firebaseapp.com",
  databaseURL: "https://ai-operator-pro-default-rtdb.firebaseio.com",
  projectId: "ai-operator-pro",
  storageBucket: "ai-operator-pro.firebasestorage.app",
  messagingSenderId: "839610326211",
  appId: "1:839610326211:web:8f8f85633079292b75d676",
  measurementId: "G-6XFH7Y1JLP"
};

// Initialize Firebase
if (!firebase.apps.length) {
  // ALWAYS initialize the app. The rest of the application is designed to handle
  // connection errors gracefully and fall back to an offline mode. Skipping
  // initialization causes a hard crash.
  firebase.initializeApp(firebaseConfig);
}

// Export Firebase services
export const auth = firebase.auth();
export const db = firebase.database();
