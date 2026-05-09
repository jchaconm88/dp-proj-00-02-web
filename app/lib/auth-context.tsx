import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";
import { webFetch } from "~/lib/backend-client";

export type UserProfile = {
  /** UID de Firebase Auth (sesión actual). */
  authUid: string;
  /** ID del documento en `users` (siempre igual a authUid). */
  usersDocId: string;
  email: string;
  displayName: string;
  /** @deprecated Los roles efectivos viven en company-users.roleIds; no usar para autorización. */
  roleIds: string[];
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILES_COLLECTION = "users";
const ROLES_COLLECTION = "roles";
const COMPANIES_COLLECTION = "companies";
/** Colección Firestore de membresías empresa–usuario (`company-users`). */
const COMPANY_USERS_COLLECTION = "company-users";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User) => {
    const authUid = u.uid;
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info("[auth] loadProfile start", { uid: authUid, email: u.email ?? "" });
    }

    try {
      const d = await webFetch<UserProfile>("/me");
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info("[auth] profile loaded (backend)", { usersDocId: d.usersDocId });
      }
      setProfile(d);
    } catch (e) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[auth] profile not available (backend)", { uid: authUid, error: e instanceof Error ? e.message : e });
      }
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 2500);

    try {
      const unsub = onAuthStateChanged(auth, async (u) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.info("[auth] onAuthStateChanged fired", { uid: u?.uid ?? null, email: u?.email ?? null });
        setUser(u);
        try {
          if (u) {
            await loadProfile(u);
          } else {
            setProfile(null);
          }
        } catch (_) {
          // eslint-disable-next-line no-console
          console.error("[auth] onAuthStateChanged handler failed (loadProfile)", _);
          setProfile(null);
        }
        setLoading(false);
      });
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
        unsub();
      };
    } catch (_) {
      if (!cancelled) setLoading(false);
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
      };
    }
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      const { user: u } = await signInWithPopup(auth, provider);
      await loadProfile(u);
    } catch (err) {
      // Si el usuario no está preautorizado, evitamos que quede una sesión activa.
      // Además intentamos eliminar el usuario recién creado (best-effort).
      try {
        const current = auth.currentUser;
        if (current) {
          await firebaseSignOut(auth);
          await current.delete();
        }
      } catch {
        // ignore
      }
      throw err;
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, signIn, signInWithGoogle, signOut }),
    [user, profile, loading, signIn, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { PROFILES_COLLECTION, ROLES_COLLECTION };
export { COMPANIES_COLLECTION, COMPANY_USERS_COLLECTION };
