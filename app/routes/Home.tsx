import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "~/lib/auth-context";
import type { Route } from "./+types/Home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Inicio - Sistema" },
    { name: "description", content: "Página de inicio" },
  ];
}

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/home", { replace: true });
  }, [user, loading, navigate]);

  if (loading || user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-blue-600" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full text-center space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bienvenido
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sistema de gestión. Inicia sesión para acceder al panel.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 font-medium hover:opacity-90 transition"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/registro"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </main>
  );
}
