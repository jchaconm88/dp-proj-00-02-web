import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "~/lib/auth-context";
import type { Route } from "./+types/Registro";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Registro" }, { name: "description", content: "Crear cuenta" }];
}

export default function Registro() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, displayName);
      navigate("/home", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al registrarse";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Registrarse
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Crea una cuenta con email y contraseña
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm p-3">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
              placeholder="Tu nombre"
            />
          </div>
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
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
              minLength={6}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 underline">
            Iniciar sesión
          </Link>
        </p>
        <p className="mt-2 text-center">
          <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
