"use client";

/**
 * Aegis Bridge — Firebase Auth Context
 * Zero-barrier: auto signs in anonymously on first visit.
 * Users can optionally link a Google account (with drive.readonly scope)
 * to save triage history and enable Drive file retrieval.
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
  signInAnonymously,
  signInWithPopup,
  linkWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, isConfigured } from "./client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  isAnonymous: boolean;
  driveToken: string | null;
  linkWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  /** @deprecated kept for Header back-compat; calls linkWithGoogle */
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  authError: null,
  isAnonymous: true,
  driveToken: null,
  linkWithGoogle: async () => {},
  signOutUser: async () => {},
  signInWithGoogle: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        // No session — auto create anonymous one (zero-barrier)
        try {
          await signInAnonymously(auth!);
          // onAuthStateChanged will fire again with the new anon user
        } catch (err) {
          console.error("[Firebase Auth] Anonymous sign-in failed", err);
          setLoading(false);
        }
      }
    });

    return unsub;
  }, []);

  /** Upgrade anonymous session → Google account (+ drive.readonly scope) */
  const linkWithGoogle = async () => {
    if (!isConfigured || !auth || !user) {
      setAuthError("Authentication not configured.");
      return;
    }
    try {
      setAuthError(null);
      if (user.isAnonymous) {
        // Upgrade anonymous → linked Google account (preserves UID / data)
        const result = await linkWithPopup(user, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) setDriveToken(credential.accessToken);
      } else {
        // Already a Google user — re-auth to get fresh Drive token
        const result = await signInWithPopup(auth!, googleProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) setDriveToken(credential.accessToken);
      }
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      // Already linked to a different credential — sign in normally instead
      if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
        try {
          const result = await signInWithPopup(auth!, googleProvider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) setDriveToken(credential.accessToken);
          return;
        } catch { /* fall through */ }
      }
      const msg = (err as { message?: string }).message ?? "Sign-in failed.";
      setAuthError(msg);
      console.error("[Firebase Auth]", code, msg);
    }
  };

  const signOutUser = async () => {
    if (!isConfigured || !auth) return;
    setDriveToken(null);
    await signOut(auth);
    // After sign-out, onAuthStateChanged triggers → creates new anon session
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authError,
      isAnonymous: user?.isAnonymous ?? true,
      driveToken,
      linkWithGoogle,
      signOutUser,
      signInWithGoogle: linkWithGoogle, // back-compat alias
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
