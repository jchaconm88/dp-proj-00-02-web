import { useRef, useState, useMemo } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  COMPANY_ADMIN_ROLE_MARKER,
  deleteCompanyUser,
  getCompanyUsersByCompanyId,
  type CompanyUserRecord,
} from "~/features/system/company-users";
import { getProfiles } from "~/features/system/users";
import { getAllRoles, type RoleRecord } from "~/features/system/roles";
import { getActiveCompanyId } from "~/lib/tenant";
import type { Route } from "./+types/CompanyMembersPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import CompanyMemberDialog from "./CompanyMemberDialog";

type ProfileLite = { email: string; displayName: string };

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Miembros por empresa" },
    { name: "description", content: "Asignación de usuarios a la empresa activa" },
  ];
}

type MemberRow = CompanyUserRecord & { emailLabel: string; rolesLabel: string };

export async function clientLoader() {
  const companyId = getActiveCompanyId();
  if (!companyId) {
    return { companyId: null as string | null, rows: [] as MemberRow[], roles: [] as RoleRecord[] };
  }
  const [members, { items: profiles }, roles] = await Promise.all([
    getCompanyUsersByCompanyId(companyId),
    getProfiles(),
    getAllRoles(companyId),
  ]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const roleById = new Map(roles.map((r) => [r.id, r]));

  const rows: MemberRow[] = members.map((m) => {
    const prof = profileById.get(m.uid);
    const emailLabel = prof?.email || prof?.displayName || m.uid;
    const realIds = m.roleIds.filter((id) => id !== COMPANY_ADMIN_ROLE_MARKER);
    const names = realIds.map((id) => roleById.get(id)?.name || id);
    if (m.roleIds.includes(COMPANY_ADMIN_ROLE_MARKER)) {
      names.push("Admin empresa");
    }
    return {
      ...m,
      emailLabel,
      rolesLabel: names.length ? names.join(", ") : "—",
    };
  });

  return { companyId, rows, roles };
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Usuario / UID", column: "emailLabel", order: 1, display: true, filter: true },
  { header: "UID", column: "uid", order: 2, display: true, filter: true },
  { header: "Roles", column: "rolesLabel", order: 3, display: true, filter: true },
  { header: "Estado", column: "status", order: 4, display: true, filter: true },
];

export default function CompanyMembersPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<MemberRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/system/company-members/add");
  const editMatch = useMatch("/system/company-members/edit/:id");
  const editId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;

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

  const openAdd = () => navigate("/system/company-members/add");
  const openEdit = (row: MemberRow) =>
    navigate(`/system/company-members/edit/${encodeURIComponent(row.id)}`);

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
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    navigate("/system/company-members");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/system/company-members");

  return (
    <DpContent title="MIEMBROS DE LA EMPRESA">
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onCreate={loaderData.companyId ? openAdd : undefined}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading || saving}
        filterPlaceholder="Filtrar por usuario, UID, roles..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {!loaderData.companyId && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Selecciona una empresa en el encabezado para gestionar sus miembros.
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
        roleOptions={loaderData.roles}
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
    </DpContent>
  );
}
