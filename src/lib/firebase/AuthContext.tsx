"use client";

/**
 * Aegis Bridge — Firebase Auth Context
 * Provides current user state throughout the app.
 * Gracefully no-ops when Firebase is not yet configured.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, isConfigured } from "./client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  authError: null,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    if (!isConfigured || !auth) {
      setAuthError("Authentication not configured.");
      return;
    }
    try {
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      // User closed popup — not an error worth showing
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      const msg = (err as { message?: string }).message ?? "Sign-in failed.";
      setAuthError(msg);
      console.error("[Firebase Auth]", code, msg);
    }
  };

  const signOutUser = async () => {
    if (!isConfigured || !auth) return;
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
