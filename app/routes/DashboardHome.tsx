import { Link } from "react-router";
import { useAuth } from "~/lib/auth-context";
import type { Route } from "./+types/DashboardHome";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Inicio - Panel" }, { name: "description", content: "Panel de control" }];
}

export default function DashboardHome() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        home works!
      </h1>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</span>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {profile && (
            <li className="flex items-center gap-3 px-4 py-3">
              <input type="checkbox" className="rounded border-gray-300" />
              <span className="text-gray-900 dark:text-white">{profile.displayName}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {profile.email} ({profile.roleIds.join(", ")})
              </span>
            </li>
          )}
        </ul>
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <span>Items por página: 5</span>
          <span>1-1 de 1</span>
        </div>
      </div>
      <p className="text-gray-600 dark:text-gray-400">
        Navega por el menú lateral:{" "}
        <Link to="/system/users" className="text-blue-600 dark:text-blue-400 underline">
          Usuarios
        </Link>
        {" · "}
        <Link to="/system/roles" className="text-blue-600 dark:text-blue-400 underline">
          Roles
        </Link>
      </p>
    </div>
  );
}
