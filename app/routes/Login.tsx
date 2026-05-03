import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "~/lib/auth-context";
import type { Route } from "./+types/Login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Iniciar sesión" },
    { name: "description", content: "Inicia sesión en el sistema" },
  ];
}

export default function Login() {
  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      // eslint-disable-next-line no-console
      console.info("[login] user authenticated, navigating to /home", { uid: user.uid, email: user.email });
      navigate("/home", { replace: true });
    }
  }, [user, authLoading, navigate]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading || user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-600" />
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    // eslint-disable-next-line no-console
    console.info("[login] handleSubmit: attempting email/password sign-in", { email });
    try {
      await signIn(email, password);
      // eslint-disable-next-line no-console
      console.info("[login] signIn resolved, Firebase auth state changed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión";
      // eslint-disable-next-line no-console
      console.error("[login] signIn rejected", { error: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    // eslint-disable-next-line no-console
    console.info("[login] handleGoogle: attempting Google sign-in");
    try {
      await signInWithGoogle();
      // eslint-disable-next-line no-console
      console.info("[login] signInWithGoogle resolved");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesión con Google";
      // eslint-disable-next-line no-console
      console.error("[login] signInWithGoogle rejected", { error: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Iniciar sesión
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Introduce tu email y contraseña
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm p-3">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <div className="text-xs text-gray-500 dark:text-gray-400">o</div>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-700 text-gray-900 dark:text-white py-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-650 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white text-[10px] font-black text-gray-900">
            G
          </span>
          <span>{loading ? "Entrando..." : "Continuar con Google"}</span>
        </button>

        <p className="mt-2 text-center">
          <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
