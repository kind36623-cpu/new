// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBr-ow1xRRUFreMRQtPQT45YqsUIcKhHus",
  authDomain: "kenshiki-e35b2.firebaseapp.com",
  projectId: "kenshiki-e35b2",
  storageBucket: "kenshiki-e35b2.firebasestorage.app",
  messagingSenderId: "1022001484081",
  appId: "1:1022001484081:web:4fb1baea7f195cdc6b2010"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export { app };
