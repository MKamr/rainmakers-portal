// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBO6_83KDTsLYLesrcCRklHMdqBz3Qc1Xs",
  authDomain: "rainmakers-portal.firebaseapp.com",
  projectId: "rainmakers-portal",
  storageBucket: "rainmakers-portal.firebasestorage.app",
  messagingSenderId: "672672716720",
  appId: "1:672672716720:web:3bf2a0e6fb801632a2a875",
  measurementId: "G-D1KMRGHL59"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

export default app;
