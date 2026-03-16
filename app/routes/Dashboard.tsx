import { useMemo, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, redirect } from "react-router";
import { useAuth } from "~/lib/auth-context";
import { useTheme } from "~/lib/theme-context";
import type { Route } from "./+types/Dashboard";
import menuData from "~/data/menu.json";
import { getAllRoles, type RoleRecord } from "~/features/system/roles";
import { isGranted } from "~/lib/accessService";
import { Dropdown } from "primereact/dropdown";
import { getAuthUser } from "~/lib/get-auth-user";

export type MenuItemJson = {
  title: string;
  enabled?: boolean;
  icon?: string;
  link?: string;
  home?: boolean;
  group?: boolean;
  permission?: string[];
  children?: { title: string; link?: string; permission?: string[] }[];
};

/** Convierte menú plano en secciones (como dp-proj-00-01). Ítems con group:true inician sección. */
function menuToSections(menu: MenuItemJson[]): { title?: string; items: MenuItemJson[] }[] {
  const sections: { title?: string; items: MenuItemJson[] }[] = [];
  let current: { title?: string; items: MenuItemJson[] } = { items: [] };
  for (const item of menu) {
    if (item.group === true) {
      if (current.items.length > 0) sections.push(current);
      current = { title: item.title, items: [] };
    } else if (item.enabled !== false) {
      current.items.push(item);
    }
  }
  if (current.items.length > 0) sections.push(current);
  return sections;
}

/** Clase PrimeIcons (como dp-proj-00-01). */
function primeIconClass(name?: string, className = "h-5 w-5 shrink-0"): string {
  const base = name && /^[a-z0-9-]+$/i.test(name) ? name : "folder";
  return `pi pi-${base} ${className}`.trim();
}

const HEADER_HEIGHT = 75;

/** Permisos efectivos del usuario (unión de permission de sus roles). Si algún rol tiene "*", tiene acceso a todo. */
function getEffectivePermissions(roleIds: string[], roles: RoleRecord[]): string[] {
  const roleMap = new Map(roles.map((r) => [r.id, r]));
  const byName = new Map(roles.map((r) => [r.name.toLowerCase(), r]));
  let hasWildcard = false;
  const set = new Set<string>();
  for (const rid of roleIds) {
    const role = roleMap.get(rid) ?? byName.get(rid.toLowerCase());
    const perms = role?.permission ?? [];
    if (perms.includes("*")) hasWildcard = true;
    perms.forEach((p) => set.add(p));
  }
  return hasWildcard ? ["*"] : Array.from(set);
}

function canShowItem(permission: string[] | undefined, effectivePermissions: string[]): boolean {
  if (effectivePermissions.includes("*")) return true;
  if (!permission?.length) return true;
  if (effectivePermissions.length === 0) return true;
  if (permission.length >= 2) {
    return isGranted(effectivePermissions, permission[0], permission[1]);
  }
  return effectivePermissions.some((p) => permission.includes(p));
}

function filterMenu(items: MenuItemJson[], effectivePermissions: string[]): MenuItemJson[] {
  return items
    .filter((item) => item.enabled !== false && canShowItem(item.permission, effectivePermissions))
    .map((item) => {
      if (item.children?.length) {
        return {
          ...item,
          children: item.children.filter(
            (c) => canShowItem(c.permission, effectivePermissions)
          ),
        };
      }
      return item;
    })
    .filter((item) => !item.children?.length || (item.children?.length ?? 0) > 0);
}

export function meta({ }: Route.MetaArgs) {
  return [{ title: "Panel" }, { name: "description", content: "Panel de administración" }];
}

/**
 * clientLoader: verifica autenticación ANTES de renderizar el dashboard.
 * Si no hay sesión activa, redirige a /login sin mostrar el componente ni ningún spinner.
 * También pre-carga los roles para el cálculo de permisos del menú.
 */
export async function clientLoader({ }: Route.ClientLoaderArgs) {
  const user = await getAuthUser();
  if (!user) throw redirect("/login");
  const roles = await getAllRoles();
  return { roles };
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const roleIds = profile?.roleIds ?? ["user"];

  // Roles cargados desde clientLoader â€” sin useEffect ni estado manual
  const effectivePermissions = useMemo(
    () => getEffectivePermissions(roleIds, loaderData.roles),
    [roleIds, loaderData.roles]
  );
  const filteredMenu = useMemo(
    () => filterMenu(menuData as MenuItemJson[], effectivePermissions),
    [effectivePermissions]
  );
  const sections = useMemo(() => menuToSections(filteredMenu), [filteredMenu]);
  const pathname = useLocation().pathname;
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(["Sistema"]));

  const themes = [
    { name: "Claro", code: "light" },
    { name: "Oscuro", code: "dark" },
  ];

  const toggleExpanded = (title: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const activeMenuTitle = useMemo(() => {
    let best: string | null = null;
    let bestLen = 0;
    for (const section of sections) {
      for (const item of section.items) {
        if (!item.children?.length) continue;
        for (const child of item.children) {
          const link = (child.link ?? "").trim();
          if (!link || link === "#") continue;
          if (pathname === link || pathname.startsWith(link + "/")) {
            if (link.length > bestLen) {
              bestLen = link.length;
              best = item.title;
            }
          }
        }
      }
    }
    return best;
  }, [sections, pathname]);

  useEffect(() => {
    if (activeMenuTitle) setExpandedKeys(new Set([activeMenuTitle]));
  }, [activeMenuTitle]);

  // clientLoader ya garantizó que hay usuario autenticado antes de renderizar.
  // Este guard cubre el breve instante inicial en que AuthProvider aún no actualizó su estado React.
  // PaceLoader muestra el indicador visual durante el clientLoader â€” sin spinner propio aquí.
  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 dark:bg-navy-900">
      {/* Header (estilo dp-proj-00-01) */}
      <header
        className="z-50 flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-navy-600 dark:bg-navy-700"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex w-64 items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-navy-300 dark:hover:bg-navy-600"
            aria-label="Menú"
          >
            <i className="pi pi-bars h-5 w-5" aria-hidden />
          </button>
          <Link to="/home" className="text-lg font-semibold text-zinc-900 dark:text-navy-100">
            ngx-admin
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-navy-300 dark:hover:bg-navy-600" aria-label="Buscar">
            <i className="pi pi-search h-5 w-5" aria-hidden />
          </button>
          <button type="button" className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-navy-300 dark:hover:bg-navy-600" aria-label="Correo">
            <i className="pi pi-envelope h-5 w-5" aria-hidden />
          </button>
          <button type="button" className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-navy-300 dark:hover:bg-navy-600" aria-label="Notificaciones">
            <i className="pi pi-bell h-5 w-5" aria-hidden />
          </button>
          <div className="ml-2 flex items-center gap-3">
            <Dropdown
              value={theme}
              onChange={(e) => setTheme(e.value ?? "light")}
              options={themes}
              optionLabel="name"
              optionValue="code"
              placeholder="Tema"
              className="w-28"
            />
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-navy-600 dark:bg-navy-600">
              <i className="pi pi-user h-5 w-5 text-zinc-500 dark:text-navy-300" aria-hidden />
              <span className="text-sm font-medium text-zinc-800 dark:text-navy-200">
                {profile?.displayName || user.email || "Usuario"}
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/login", { replace: true });
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-navy-300 dark:hover:bg-navy-600 dark:hover:text-navy-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (estilo dp-proj-00-01) */}
        <aside
          className={`flex shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 transition-[width] duration-200 dark:border-navy-600 dark:bg-navy-800 ${sidebarOpen ? "w-64" : "w-16"
            }`}
        >
          <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden py-3">
            {sections.map((section, idx) => (
              <div key={idx} className={`pb-4 ${sidebarOpen ? "px-2" : "px-0"}`}>
                {sidebarOpen && section.title && (
                  <div className="mb-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-navy-300">
                    {section.title}
                  </div>
                )}
                <nav className="space-y-0.5">
                  {section.items.map((item, i) => {
                    const hasChildren = item.children && item.children.length > 0;
                    const isExpanded = hasChildren && expandedKeys.has(item.title);
                    const href = item.link ?? "#";
                    const isActive =
                      href !== "#" && pathname === href;

                    if (sidebarOpen) {
                      if (hasChildren) {
                        return (
                          <div key={i}>
                            <button
                              type="button"
                              onClick={() => toggleExpanded(item.title)}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-200/80 dark:text-navy-200 dark:hover:bg-navy-600"
                            >
                              <i className={primeIconClass(item.icon)} aria-hidden />
                              <span className="flex-1">{item.title}</span>
                              <i
                                className={`pi shrink-0 opacity-70 ${isExpanded ? "pi-chevron-down h-4 w-4" : "pi-chevron-right h-4 w-4"}`}
                                aria-hidden
                              />
                            </button>
                            {isExpanded && (
                              <div className="ml-4 border-l border-zinc-200 pl-2 dark:border-navy-500">
                                {item.children!.map((child, j) => {
                                  const childHref = child.link ?? "#";
                                  return (
                                    <NavLink
                                      key={j}
                                      to={childHref}
                                      end={false}
                                      className={({ isActive }) =>
                                        `mb-0.5 flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors no-underline ${isActive
                                          ? "bg-blue-100 font-medium text-blue-800 dark:bg-navy-500 dark:text-navy-100"
                                          : "text-zinc-600 hover:bg-zinc-200/80 dark:text-navy-300 dark:hover:bg-navy-600"
                                        }`
                                      }
                                    >
                                      {child.title}
                                    </NavLink>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <Link
                          key={i}
                          to={href}
                          title={item.title}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors no-underline ${isActive
                            ? "bg-zinc-200 text-zinc-900 dark:bg-navy-500 dark:text-navy-100"
                            : "text-zinc-700 hover:bg-zinc-200/80 dark:text-navy-200 dark:hover:bg-navy-600"
                            }`}
                        >
                          {item.icon && <i className={primeIconClass(item.icon)} aria-hidden />}
                          <span className="flex-1">{item.title}</span>
                        </Link>
                      );
                    }

                    if (hasChildren) {
                      const firstChildLink = item.children!.find((c) => c.link && c.link !== "#");
                      return (
                        <div key={i} className="flex justify-center">
                          {firstChildLink ? (
                            <NavLink
                              to={firstChildLink.link!}
                              title={item.title}
                              className={({ isActive }) =>
                                `flex flex-col items-center justify-center rounded-lg p-2.5 text-zinc-700 transition-colors hover:bg-zinc-200/80 dark:text-navy-200 dark:hover:bg-navy-600 ${isActive ? "bg-zinc-200 dark:bg-navy-500" : ""
                                }`
                              }
                            >
                              <i className={primeIconClass(item.icon)} aria-hidden />
                            </NavLink>
                          ) : (
                            <span
                              title={item.title}
                              className="flex flex-col items-center justify-center rounded-lg p-2.5 text-zinc-500 dark:text-navy-300"
                            >
                              <i className={primeIconClass(item.icon)} aria-hidden />
                            </span>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="flex justify-center">
                        <Link
                          to={href}
                          title={item.title}
                          className={`flex flex-col items-center justify-center rounded-lg p-2.5 text-zinc-700 transition-colors hover:bg-zinc-200/80 dark:text-navy-200 dark:hover:bg-navy-600 no-underline ${isActive ? "bg-zinc-200 dark:bg-navy-500" : ""
                            }`}
                        >
                          <i className={primeIconClass(item.icon)} aria-hidden />
                        </Link>
                      </div>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}
function IconFolder({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}
function IconMenu({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}
