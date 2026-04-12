import { useMemo, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, redirect } from "react-router";
import { useAuth } from "~/lib/auth-context";
import { useCompany } from "~/lib/company-context";
import { useTheme } from "~/lib/theme-context";
import type { Route } from "./+types/Dashboard";
import menuData from "~/data/menu.json";
import { COMPANY_ADMIN_ROLE_MARKER } from "~/features/system/company-users";
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

const HEADER_HEIGHT = 48;

function collectRolePermissionCodes(role: RoleRecord): string[] {
  const out = new Set<string>();

  // Legacy array: ["module", "module:view", "*", ...]
  for (const p of role.permission ?? []) {
    const code = String(p ?? "").trim();
    if (code) out.add(code);
  }

  // Nuevo mapeo: permissions = { module: ["view","edit","*"], "*": ["*"] }
  const mapped = role.permissions ?? {};
  for (const [moduleKey, actions] of Object.entries(mapped)) {
    const moduleName = String(moduleKey ?? "").trim();
    if (!moduleName || !Array.isArray(actions)) continue;
    for (const actionRaw of actions) {
      const action = String(actionRaw ?? "").trim();
      if (!action) continue;
      if (moduleName === "*" && action === "*") {
        out.add("*");
        continue;
      }
      if (action === "*") {
        out.add(`*:${moduleName}`);
        continue;
      }
      out.add(`${moduleName}:${action}`);
    }
  }

  return Array.from(out);
}

/**
 * Permisos efectivos para el menú: unión de `permission` en documentos `roles` de la empresa.
 * Fuente de roleIds: solo `company-users` de la empresa activa.
 * No depende del nombre del rol; usa códigos definidos en la colección `roles`.
 */
function getEffectivePermissions(
  membershipRoleIds: string[],
  membershipRoleNames: string[],
  roles: RoleRecord[]
): string[] {
  const roleMap = new Map(roles.map((r) => [r.id, r]));
  const byName = new Map(roles.map((r) => [r.name.toLowerCase(), r]));
  let hasWildcard = false;
  const set = new Set<string>();
  for (const rid of membershipRoleIds) {
    if (rid === COMPANY_ADMIN_ROLE_MARKER) continue;
    const role = roleMap.get(rid) ?? byName.get(rid.toLowerCase());
    const perms = role ? collectRolePermissionCodes(role) : [];
    if (perms.includes("*")) hasWildcard = true;
    perms.forEach((p) => set.add(p));
  }
  for (const roleName of membershipRoleNames) {
    const role = byName.get(String(roleName).toLowerCase());
    const perms = role ? collectRolePermissionCodes(role) : [];
    if (perms.includes("*")) hasWildcard = true;
    perms.forEach((p) => set.add(p));
  }
  if (hasWildcard) return ["*"];
  return Array.from(set);
}

function canShowItem(permission: string[] | undefined, effectivePermissions: string[]): boolean {
  if (effectivePermissions.includes("*")) return true;
  if (!permission?.length) return true;
  if (effectivePermissions.length === 0) return false;
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
  return {};
}

export default function DashboardLayout({ }: Route.ComponentProps) {
  const { user, profile, signOut } = useAuth();
  const { activeCompanyId, companies, memberships, loading: companyLoading, setActiveCompanyId } =
    useCompany();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const activeMembership = useMemo(() => {
    if (!activeCompanyId) return [];
    return memberships.filter((x) => x.companyId === activeCompanyId && x.status === "active");
  }, [memberships, activeCompanyId]);
  const membershipRoleIds = useMemo(
    () => (activeMembership[0]?.roleIds ?? []).map((x) => String(x)),
    [activeMembership]
  );
  const membershipRoleNames = useMemo(
    () => (activeMembership[0]?.roleNames ?? []).map((x) => String(x)),
    [activeMembership]
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!activeCompanyId) {
        setRoles([]);
        return;
      }
      setRolesLoading(true);
      try {
        const next = await getAllRoles(activeCompanyId);
        if (!cancelled) setRoles(next);
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [activeCompanyId]);

  const effectivePermissions = useMemo(
    () => getEffectivePermissions(membershipRoleIds, membershipRoleNames, roles),
    [membershipRoleIds, membershipRoleNames, roles]
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

  const companyOptions = useMemo(
    () => companies.map((c) => ({ name: c.name, code: c.id })),
    [companies]
  );
  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) ?? null,
    [companies, activeCompanyId]
  );
  const activeCompanyLogoUrl =
    (theme === "dark"
      ? activeCompany?.logoDarkUrl || activeCompany?.logoLightUrl || activeCompany?.logoUrl
      : activeCompany?.logoLightUrl || activeCompany?.logoDarkUrl || activeCompany?.logoUrl) ?? "";
  const activeCompanyName = activeCompany?.name?.trim() || "Empresa";

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
  if (!user) return null;

  if (companyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-navy-900">
        <div className="flex flex-col items-center gap-3 text-zinc-600 dark:text-navy-300">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 dark:border-navy-600 dark:border-t-navy-300" />
          <p className="text-sm">Cargando empresas…</p>
        </div>
      </div>
    );
  }

  if (!activeCompanyId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-100 p-6 dark:bg-navy-900">
        <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-navy-600 dark:bg-navy-800">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-navy-100">
            Sin empresa asignada
          </h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-navy-300">
            Tu cuenta no tiene una membresía activa en ninguna empresa (<code className="rounded bg-zinc-100 px-1 dark:bg-navy-700">company-users</code>
            ). Si acabas de migrar, ejecuta la migración con{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-navy-700">seedMemberships: true</code> o pide a un administrador que te asocie a una empresa.
          </p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-navy-400">
            No hace falta “otra contraseña”: con cerrar sesión y volver a entrar no se soluciona si falta la membresía en Firestore.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={async () => {
                try {
                  if (user?.uid) {
                    window.localStorage.removeItem(`active-company:${user.uid}`);
                  }
                } catch {
                  /* ignore */
                }
                await signOut();
                navigate("/login", { replace: true });
              }}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-navy-200 dark:text-navy-900 dark:hover:bg-white"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={activeCompanyId} className="min-h-screen bg-[var(--dp-surface)] text-[var(--dp-on-surface)]">
      {/* Sidebar estilo Stitch, ocupando toda la pantalla */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/10 bg-[var(--dp-shell-surface)] backdrop-blur-2xl transition-[width] duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden py-4">
          {sidebarOpen && (
            <div className="px-4 pb-2">
              <Link to="/home" className="group min-w-0">
                <div className="rounded-xl border border-white/10 bg-[var(--dp-surface-high)]/55 p-1">
                  {activeCompanyLogoUrl ? (
                    <img
                      src={activeCompanyLogoUrl}
                      alt={`Logo de ${activeCompanyName}`}
                      className="h-20 w-full rounded-md object-contain"
                    />
                  ) : (
                    <div className="flex h-20 items-center justify-center gap-2 rounded-md border border-dashed border-white/20 bg-[var(--dp-surface-low)]/70 px-2">
                      <i className="pi pi-building text-sm text-[var(--dp-tertiary)]" aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--dp-menu-text)]">
                        Logo genérico
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            </div>
          )}
          {!sidebarOpen && (
            <div className="flex justify-center pb-3">
              <Link
                to="/home"
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[var(--dp-surface-high)]/60 text-[var(--dp-tertiary)]"
              >
                {activeCompanyLogoUrl ? (
                  <img
                    src={activeCompanyLogoUrl}
                    alt={`Logo de ${activeCompanyName}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <i className="pi pi-building" aria-hidden />
                )}
              </Link>
            </div>
          )}
          <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden py-2">
            {sections.map((section, idx) => (
              <div key={idx} className={`pb-4 ${sidebarOpen ? "px-2" : "px-0"}`}>
                {sidebarOpen && section.title && (
                  <div className="mb-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--dp-menu-text)]">
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
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--dp-menu-text)] transition-all hover:bg-white/5 hover:text-[var(--dp-menu-text-strong)]"
                            >
                              <i className={primeIconClass(item.icon)} aria-hidden />
                              <span className="flex-1">{item.title}</span>
                              <i
                                className={`pi shrink-0 opacity-70 ${isExpanded ? "pi-chevron-down h-4 w-4" : "pi-chevron-right h-4 w-4"}`}
                                aria-hidden
                              />
                            </button>
                            {isExpanded && (
                              <div className="ml-4 border-l border-white/10 pl-2">
                                {item.children!.map((child, j) => {
                                  const childHref = child.link ?? "#";
                                  return (
                                    <NavLink
                                      key={j}
                                      to={childHref}
                                      end={false}
                                      className={({ isActive }) =>
                                        `mb-0.5 flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors no-underline ${isActive
                                          ? "border-r-2 border-[var(--dp-tertiary)] bg-[color-mix(in_srgb,var(--dp-tertiary)_14%,transparent)] font-semibold text-[var(--dp-tertiary)]"
                                          : "text-[var(--dp-menu-text)] hover:bg-white/5 hover:text-[var(--dp-menu-text-strong)]"
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
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all no-underline ${isActive
                            ? "border-r-2 border-[var(--dp-tertiary)] bg-[color-mix(in_srgb,var(--dp-tertiary)_14%,transparent)] font-semibold text-[var(--dp-tertiary)]"
                            : "text-[var(--dp-menu-text)] hover:bg-white/5 hover:text-[var(--dp-menu-text-strong)]"
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
                                `flex flex-col items-center justify-center rounded-xl p-2.5 transition-colors ${isActive
                                  ? "bg-[color-mix(in_srgb,var(--dp-tertiary)_14%,transparent)] text-[var(--dp-tertiary)]"
                                  : "text-[var(--dp-menu-text)] hover:bg-white/5 hover:text-[var(--dp-menu-text-strong)]"
                                }`
                              }
                            >
                              <i className={primeIconClass(item.icon)} aria-hidden />
                            </NavLink>
                          ) : (
                            <span
                              title={item.title}
                              className="flex flex-col items-center justify-center rounded-xl p-2.5 text-[var(--dp-menu-text)]"
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
                          className={`flex flex-col items-center justify-center rounded-xl p-2.5 transition-colors no-underline ${isActive
                            ? "bg-[color-mix(in_srgb,var(--dp-tertiary)_14%,transparent)] text-[var(--dp-tertiary)]"
                            : "text-[var(--dp-menu-text)] hover:bg-white/5 hover:text-[var(--dp-menu-text-strong)]"
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
        </div>
      </aside>

      {/* Botón de menú flotante */}
      <button
        type="button"
        onClick={() => setSidebarOpen((o) => !o)}
        className="fixed top-8 z-[60] rounded-full border border-white/15 bg-[var(--dp-surface-high)]/90 p-1.5 text-[var(--dp-on-surface-soft)] shadow-lg shadow-black/20 transition hover:text-[var(--dp-tertiary)]"
        style={{ left: sidebarOpen ? "15.25rem" : "3.95rem" }}
        aria-label="Menú"
      >
        <i className={`pi ${sidebarOpen ? "pi-angle-left" : "pi-angle-right"} text-xs`} aria-hidden />
      </button>

      {/* Header compacto */}
      <header
        className="dp-glass-panel fixed top-0 z-40 flex items-center justify-between px-3 md:px-4"
        style={{
          height: HEADER_HEIGHT,
          left: sidebarOpen ? "16rem" : "5rem",
          width: sidebarOpen ? "calc(100% - 16rem)" : "calc(100% - 5rem)",
        }}
      >
        <div className="relative w-56 md:w-80">
          <i className="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--dp-on-surface-soft)]" />
          <input
            type="text"
            placeholder="Search systems..."
            className="w-full rounded-full border border-white/10 bg-[var(--dp-surface-low)]/70 py-1 pl-9 pr-4 text-sm text-[var(--dp-on-surface)] outline-none transition focus:border-[var(--dp-primary)]"
          />
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button
            type="button"
            className="rounded-full p-1.5 text-[var(--dp-on-surface-soft)] transition hover:bg-white/5 hover:text-[var(--dp-tertiary)]"
            aria-label="Ayuda"
          >
            <i className="pi pi-question-circle text-sm" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`rounded-full p-1.5 transition ${
              theme === "light"
                ? "bg-[color-mix(in_srgb,var(--dp-tertiary)_20%,transparent)] text-[var(--dp-tertiary)]"
                : "text-[var(--dp-on-surface-soft)] hover:bg-white/5"
            }`}
            aria-label="Tema claro"
          >
            <i className="pi pi-sun text-sm" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`rounded-full p-1.5 transition ${
              theme === "dark"
                ? "bg-[color-mix(in_srgb,var(--dp-tertiary)_20%,transparent)] text-[var(--dp-tertiary)]"
                : "text-[var(--dp-on-surface-soft)] hover:bg-white/5"
            }`}
            aria-label="Tema oscuro"
          >
            <i className="pi pi-moon text-sm" aria-hidden />
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <Dropdown
              value={activeCompanyId}
              onChange={(e) => {
                const next = String(e.value ?? "");
                if (!next || next === activeCompanyId) return;
                setActiveCompanyId(next);
                // Hard reload para garantizar recarga de loaders/datos/permisos por empresa.
                window.location.reload();
              }}
              options={companyOptions}
              optionLabel="name"
              optionValue="code"
              placeholder="Empresa"
              className="w-48"
              disabled={rolesLoading || companyOptions.length <= 1}
            />
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[var(--dp-surface-low)]/70 px-2.5 py-1">
              <i className="pi pi-user text-xs text-[var(--dp-on-surface-soft)]" aria-hidden />
              <span className="max-w-28 truncate text-xs font-semibold text-[var(--dp-on-surface)]">
                {profile?.displayName || user.email || "Usuario"}
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/login", { replace: true });
              }}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--dp-on-surface-soft)] transition hover:text-[var(--dp-tertiary)]"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main
        className="min-h-screen overflow-auto p-5 md:p-6"
        style={{
          marginLeft: sidebarOpen ? "16rem" : "5rem",
          paddingTop: `calc(${HEADER_HEIGHT}px + 12px)`,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
