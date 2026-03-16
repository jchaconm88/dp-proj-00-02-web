import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { Checkbox } from "primereact/checkbox";
import {
  getRoleById,
  updateRole,
  type RoleRecord,
  type RolePermissions,
} from "~/features/system/roles";
import type { Route } from "./+types/RolesDetail";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import RoleDialog from "./RoleDialog";
import RolePermissionDialog from "./RolePermissionDialog";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Rol: ${params.id}` },
    { name: "description", content: `Detalle del rol ${params.id}` },
  ];
}

const FULL_ACCESS_MODULE = "*";
const FULL_ACCESS_CODE = "*";

interface PermissionRow {
  id: string;
  moduleId: string;
  permissions: string[];
}

const PERMISSIONS_TABLE_DEF: DpTableDefColumn[] = [
  { header: "Módulo", column: "moduleId", order: 1, display: true, filter: true },
  { header: "Permisos", column: "permissions", order: 2, display: true, filter: true },
];

// clientLoader: carga el rol por ID antes de renderizar el componente.
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!params.id) return { role: null };
  const role = await getRoleById(params.id);
  return { role: role ?? null };
}

export default function RoleDetail({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const permissionTableRef = useRef<DpTableRef<PermissionRow>>(null);

  const { role } = loaderData;
  const roleId = role?.id ?? null;
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [permissionFilter, setPermissionFilter] = useState("");
  const [selectedPermissionCount, setSelectedPermissionCount] = useState(0);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [permissionEditModuleId, setPermissionEditModuleId] = useState<string | null>(null);
  const [editRoleOpen, setEditRoleOpen] = useState(false);

  // Filas de permisos derivadas del loaderData â€” se recalculan en cada revalidación
  const permissionRows: PermissionRow[] = Object.entries(role?.permissions ?? {}).map(
    ([moduleId, codes]) => ({
      id: moduleId,
      moduleId,
      permissions: Array.isArray(codes) ? codes : [],
    })
  );

  const backToRoles = () => navigate("/system/roles");

  const deletePermissions = async () => {
    if (!role || !roleId) return;
    const selected = permissionTableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    const toRemove = new Set(selected.map((r) => r.moduleId));
    const newPermissions: RolePermissions = {};
    for (const [moduleId, codes] of Object.entries(role.permissions ?? {})) {
      if (!toRemove.has(moduleId)) newPermissions[moduleId] = codes;
    }
    setSaving(true);
    setError(null);
    try {
      await updateRole(roleId, { permissions: newPermissions });
      permissionTableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionFilter = (value: string) => {
    setPermissionFilter(value);
    permissionTableRef.current?.filter(value);
  };

  const hasFullAccess =
    role != null &&
    Array.isArray(role.permissions?.[FULL_ACCESS_MODULE]) &&
    role.permissions[FULL_ACCESS_MODULE].includes(FULL_ACCESS_CODE);

  const onFullAccessChange = async (checked: boolean) => {
    if (!role || !roleId) return;
    setSaving(true);
    setError(null);
    const newPermissions: RolePermissions = { ...(role.permissions ?? {}) };
    if (checked) {
      newPermissions[FULL_ACCESS_MODULE] = [FULL_ACCESS_CODE];
    } else {
      delete newPermissions[FULL_ACCESS_MODULE];
    }
    try {
      await updateRole(roleId, { permissions: newPermissions });
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar acceso total.");
    } finally {
      setSaving(false);
    }
  };

  if (!roleId) {
    return (
      <DpContentInfo title="ROL" backLabel="Volver a roles" onBack={backToRoles}>
        <p className="text-zinc-500">ID de rol no válido.</p>
      </DpContentInfo>
    );
  }

  if (!role) {
    return (
      <DpContentInfo title="ROL" backLabel="Volver a roles" onBack={backToRoles}>
        <p className="text-zinc-500">Rol no encontrado.</p>
      </DpContentInfo>
    );
  }

  return (
    <DpContentInfo
      title={role.name || roleId}
      backLabel="Volver a roles"
      onBack={backToRoles}
      editLabel="Editar rol"
      onEdit={() => setEditRoleOpen(true)}
    >
      <div className="space-y-8">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Acceso total */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 p-3 dark:border-navy-600">
          <Checkbox
            inputId="full-access"
            checked={hasFullAccess}
            onChange={(e) => onFullAccessChange(e.checked === true)}
            disabled={saving || isLoading}
          />
          <label
            htmlFor="full-access"
            className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Acceso total al sistema (*.*) â€” este rol puede hacer cualquier operación
          </label>
        </div>

        {/* Permisos por módulo */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Permisos por módulo
          </h2>
          <DpContentHeader
            filterValue={permissionFilter}
            onFilter={handlePermissionFilter}
            onLoad={() => revalidator.revalidate()}
            onCreate={() => { setPermissionEditModuleId(null); setPermissionDialogOpen(true); }}
            onDelete={deletePermissions}
            deleteDisabled={selectedPermissionCount === 0 || saving}
            loading={isLoading}
            filterPlaceholder="Filtrar módulos..."
          />
          {/* data prop: modo controlado â€” se actualiza con cada revalidación */}
          <DpTable<PermissionRow>
            ref={permissionTableRef}
            data={permissionRows}
            loading={isLoading}
            tableDef={PERMISSIONS_TABLE_DEF}
            linkColumn="moduleId"
            onDetail={(row) => { setPermissionEditModuleId(row.moduleId); setPermissionDialogOpen(true); }}
            onEdit={(row) => { setPermissionEditModuleId(row.moduleId); setPermissionDialogOpen(true); }}
            onSelectionChange={(rows) => setSelectedPermissionCount(rows.length)}
            showFilterInHeader={false}
            emptyMessage="No hay permisos. Agregar para definir."
            emptyFilterMessage="No hay resultados."
          />
        </section>

        <RolePermissionDialog
          visible={permissionDialogOpen}
          roleId={roleId}
          editModuleId={permissionEditModuleId}
          currentPermissions={role.permissions ?? {}}
          onSuccess={async () => { setPermissionDialogOpen(false); revalidator.revalidate(); }}
          onHide={() => setPermissionDialogOpen(false)}
        />

        <RoleDialog
          visible={editRoleOpen}
          roleId={roleId}
          onSuccess={() => { setEditRoleOpen(false); revalidator.revalidate(); }}
          onHide={() => setEditRoleOpen(false)}
        />
      </div>
    </DpContentInfo>
  );
}
