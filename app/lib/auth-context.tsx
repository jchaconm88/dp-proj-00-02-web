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
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { createDocumentWithId } from "./firestore.service";

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  roleIds: string[];
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILES_COLLECTION = "users";
const ROLES_COLLECTION = "roles";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const ref = doc(db, PROFILES_COLLECTION, uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const d = snap.data();
      setProfile({
        uid: snap.id,
        email: d.email ?? "",
        displayName: d.displayName ?? "",
        roleIds: d.roleIds ?? [],
      });
    } else {
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
        setUser(u);
        try {
          if (u) {
            await loadProfile(u.uid);
          } else {
            setProfile(null);
          }
        } catch (_) {
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

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { user: u } = await createUserWithEmailAndPassword(auth, email, password);
      await createDocumentWithId(
        PROFILES_COLLECTION,
        u.uid,
        { email, displayName, roleIds: ["user"] }
      );
      await loadProfile(u.uid);
    },
    [loadProfile]
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, signIn, signOut, register }),
    [user, profile, loading, signIn, signOut, register]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { PROFILES_COLLECTION, ROLES_COLLECTION };
