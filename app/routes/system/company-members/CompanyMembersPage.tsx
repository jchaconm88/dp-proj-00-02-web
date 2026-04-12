import { useRef, useState, useMemo } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  deleteCompanyUser,
  getCompanyUsersByCompanyId,
  updateCompanyUser,
  type CompanyUserRecord,
} from "~/features/system/company-users";
import { getCompanyById } from "~/features/system/companies";
import { getProfiles } from "~/features/system/users";
import { getAllRoles } from "~/features/system/roles";
import type { Route } from "./+types/CompanyMembersPage";
import { DpContentHeader, DpContentInfo } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import CompanyMemberDialog from "./CompanyMemberDialog";
import type { StatusOption } from "~/constants/status-options";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Miembros por empresa" },
    { name: "description", content: "Asignación de usuarios a una empresa" },
  ];
}

type MemberRow = CompanyUserRecord & { emailLabel: string; rolesLabel: string };

const MEMBER_STATUS_MAP: Record<string, StatusOption> = {
  active: { label: "Activo", severity: "success" },
  inactive: { label: "Inactivo", severity: "secondary" },
};

function getErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code?: unknown }).code ?? "").trim();
  }
  return "";
}

function describeCompanyMembersError(err: unknown, context: string): string {
  const code = getErrorCode(err);
  switch (code) {
    case "permission-denied":
      return `${context}: no tienes permisos suficientes en la empresa activa para completar esta operación.`;
    case "unauthenticated":
      return `${context}: tu sesión expiró. Inicia sesión nuevamente.`;
    case "not-found":
      return `${context}: el registro ya no existe.`;
    case "unavailable":
      return `${context}: el servicio no está disponible temporalmente.`;
    default:
      if (err instanceof Error && err.message.trim()) return `${context}: ${err.message}`;
      return `${context}: ocurrió un error inesperado.`;
  }
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const companyId = String(params?.id ?? "").trim() || null;
  if (!companyId) {
    return {
      companyId: null as string | null,
      companyName: "",
      rows: [] as MemberRow[],
    };
  }
  const [company, members] = await Promise.all([
    getCompanyById(companyId),
    getCompanyUsersByCompanyId(companyId),
  ]);
  let normalizedMembers = members;

  const missingDenorm = members.filter((m) => {
    const hasUserId = Boolean(m.userId?.trim());
    const hasUserValue = Boolean(m.user?.trim() || m.userEmail?.trim() || m.userDisplayName?.trim());
    const hasUserIdentity = hasUserId && hasUserValue;
    const hasRoleNames = (m.roleIds?.length ?? 0) === 0 || (m.roleNames?.length ?? 0) > 0;
    return !hasUserIdentity || !hasRoleNames;
  });

  if (missingDenorm.length > 0) {
    const [{ items: profiles }, roles] = await Promise.all([getProfiles(), getAllRoles(companyId)]);
    const profileById = new Map(profiles.map((p) => [p.id, p]));
    const profileByEmail = new Map(profiles.map((p) => [p.email.trim().toLowerCase(), p]));
    const roleById = new Map(roles.map((r) => [r.id, r]));

    const updates: Promise<void>[] = [];
    normalizedMembers = members.map((m) => {
      const currentEmail = m.userEmail?.trim().toLowerCase() || "";
      const prof =
        profileById.get(m.usersDocId?.trim() || "") ||
        profileByEmail.get(currentEmail) ||
        profileById.get(m.userId);

      const computedRoleNames = m.roleIds
        .map((roleId) => roleById.get(roleId)?.name || roleId)
        .map((name) => String(name).trim())
        .filter(Boolean);

      const patch: Partial<Omit<CompanyUserRecord, "id">> = {};
      if (!m.userId?.trim()) {
        const inferredUserId = m.id.includes("_") ? m.id.split("_").slice(1).join("_").trim() : "";
        if (inferredUserId) patch.userId = inferredUserId;
      }
      if (!m.usersDocId?.trim() && prof?.id) patch.usersDocId = prof.id;
      if (!m.userEmail?.trim() && prof?.email) patch.userEmail = prof.email.trim().toLowerCase();
      if (!m.userDisplayName?.trim() && prof?.displayName) patch.userDisplayName = prof.displayName.trim();
      if (!m.user?.trim()) {
        patch.user =
          prof?.displayName?.trim() ||
          prof?.email?.trim().toLowerCase() ||
          m.userDisplayName?.trim() ||
          m.userEmail?.trim() ||
          m.usersDocId?.trim() ||
          m.userId ||
          undefined;
      }
      if ((m.roleIds?.length ?? 0) > 0 && (m.roleNames?.length ?? 0) === 0) {
        patch.roleNames = computedRoleNames;
      }

      if (Object.keys(patch).length > 0) {
        updates.push(updateCompanyUser(m.id, patch));
      }

      return {
        ...m,
        userId: patch.userId ?? m.userId,
        usersDocId: patch.usersDocId ?? m.usersDocId,
        userEmail: patch.userEmail ?? m.userEmail,
        userDisplayName: patch.userDisplayName ?? m.userDisplayName,
        user: patch.user ?? m.user,
        roleNames: patch.roleNames ?? m.roleNames,
      };
    });

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  }

  const rows: MemberRow[] = normalizedMembers.map((m) => {
    const denormalizedUser = m.user?.trim() || "";
    const displayName = m.userDisplayName?.trim() || "";
    const email = m.userEmail?.trim() || "";
    const emailLabel = denormalizedUser || displayName || email || "Sin usuario denormalizado";
    const names =
      m.roleNames?.filter((x) => String(x).trim().length > 0) ??
      m.roleIds.filter((x) => String(x).trim().length > 0);
    return {
      ...m,
      emailLabel,
      rolesLabel: names.length ? names.join(", ") : "—",
    };
  });

  return { companyId, companyName: company?.name ?? "", rows };
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Usuario", column: "emailLabel", order: 1, display: true, filter: true },
  { header: "Roles", column: "rolesLabel", order: 2, display: true, filter: true },
  {
    header: "Activo",
    column: "status",
    order: 3,
    display: true,
    filter: true,
    type: "status",
    typeOptions: MEMBER_STATUS_MAP,
  },
];

export default function CompanyMembersPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<MemberRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/system/companies/:id/company-members/add");
  const editMatch = useMatch("/system/companies/:id/company-members/edit/:membershipId");
  const editId = editMatch?.params.membershipId
    ? decodeURIComponent(editMatch.params.membershipId)
    : null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const dialogVisible = isAdd || !!editId;

  const editingMembership = useMemo(() => {
    if (!editId) return null;
    return loaderData.rows.find((r) => r.id === editId) ?? null;
  }, [editId, loaderData.rows]);

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const basePath = loaderData.companyId
    ? `/system/companies/${encodeURIComponent(loaderData.companyId)}/company-members`
    : "/system/companies";

  const openAdd = () => navigate(`${basePath}/add`);
  const openEdit = (row: MemberRow) =>
    navigate(`${basePath}/edit/${encodeURIComponent(row.id)}`);

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setPendingDeleteIds(selected.map((r) => r.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(ids.map((id) => deleteCompanyUser(id)));
      tableRef.current?.clearSelectedRows();
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (err) {
      setError(describeCompanyMembersError(err, "No se pudieron eliminar los miembros seleccionados"));
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    navigate(basePath);
    revalidator.revalidate();
  };

  const handleHide = () => navigate(basePath);
  const handleBack = () => navigate("/system/companies");

  return (
    <DpContentInfo
      title={loaderData.companyName ? `Miembros: ${loaderData.companyName}` : "Miembros por empresa"}
      breadcrumbItems={["SISTEMA", "EMPRESAS", "MIEMBROS"]}
      backLabel="Volver a empresas"
      onBack={handleBack}
      onCreate={loaderData.companyId ? openAdd : undefined}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading || saving}
        filterPlaceholder="Filtrar por usuario y roles..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {!loaderData.companyId && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Selecciona una empresa desde la grilla de empresas para gestionar sus miembros.
        </div>
      )}

      <DpTable<MemberRow>
        ref={tableRef}
        data={loaderData.rows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        linkColumn="emailLabel"
        onDetail={openEdit}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage="No hay miembros en esta empresa."
        emptyFilterMessage="No hay resultados para el filtro."
      />

      <CompanyMemberDialog
        visible={dialogVisible}
        companyId={loaderData.companyId}
        membership={isAdd ? null : editingMembership}
        onSuccess={handleSuccess}
        onHide={handleHide}
      />

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={() => !saving && setPendingDeleteIds(null)}
        title="Eliminar miembros"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} miembro(s)? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />
    </DpContentInfo>
  );
}
