import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  function loginWithApple() {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return signInWithPopup(auth, provider);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    login,
    signup,
    resetPassword,
    loginWithGoogle,
    loginWithApple,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
