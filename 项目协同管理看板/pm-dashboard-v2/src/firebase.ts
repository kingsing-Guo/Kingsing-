import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Read from window if injected, or fallback to env for local dev
const firebaseConfig = window.__firebase_config
    ? JSON.parse(window.__firebase_config)
    : {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "fake-api-key",
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "fake-auth-domain.firebaseapp.com",
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fake-project-id",
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "fake-project-id.appspot.com",
    };

export const appId = window.__app_id || 'credit-board-cloud-v3';
export const initialToken = window.__initial_auth_token || '';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
