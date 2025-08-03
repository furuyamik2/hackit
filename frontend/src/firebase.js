// frontend/src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDs56D2KgxWrYVMlZdEm1J8g6SjE1zUwxE",
  authDomain: "facili-ya-san-1d62d.firebaseapp.com",
  projectId: "facili-ya-san-1d62d",
  storageBucket: "facili-ya-san-1d62d.firebasestorage.app",
  messagingSenderId: "523339743727",
  appId: "1:523339743727:web:50bbee4e583cefebfcb61a",
};

// Firebaseアプリケーションを初期化
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 認証サービスとFirestoreサービスをエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
