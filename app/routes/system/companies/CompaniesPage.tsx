import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getCompanies, deleteCompany, type CompanyRecord } from "~/features/system/companies";
import type { Route } from "./+types/CompaniesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, DpTColumn, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import CompanyDialog from "./CompanyDialog";
import { moduleTableDef } from "~/data/system-modules";
import type { StatusOption } from "~/constants/status-options";
import { useTheme } from "~/lib/theme-context";

const COMPANY_STATUS_MAP: Record<string, StatusOption> = {
  active: { label: "Activo", severity: "success" },
  inactive: { label: "Inactivo", severity: "secondary" },
};

const TABLE_DEF = moduleTableDef("company", { status: COMPANY_STATUS_MAP });

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Empresas" },
    { name: "description", content: "Mantenimiento de empresas" },
  ];
}

export async function clientLoader() {
  const items = await getCompanies();
  return { rows: items };
}

export default function CompaniesPage({ loaderData }: Route.ComponentProps) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<CompanyRecord>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/system/companies/add");
  const editMatch = useMatch("/system/companies/edit/:id");
  const editId = editMatch?.params.id ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/system/companies/add");
  const openEdit = (row: CompanyRecord) =>
    navigate(`/system/companies/edit/${encodeURIComponent(row.id)}`);

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
      await Promise.all(ids.map((id) => deleteCompany(id)));
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
    navigate("/system/companies");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/system/companies");

  return (
    <DpContent
      title="EMPRESAS"
      breadcrumbItems={["SISTEMA", "EMPRESAS"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading || saving}
        filterPlaceholder="Filtrar por nombre, código..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<CompanyRecord>
        ref={tableRef}
        data={loaderData.rows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        linkColumn="name"
        onDetail={openEdit}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage="No hay empresas registradas."
        emptyFilterMessage="No hay resultados para el filtro."
      >
        <DpTColumn name="logoUrl">
          {(row: CompanyRecord) => {
            const logo =
              theme === "dark"
                ? row.logoDarkUrl || row.logoLightUrl || row.logoUrl
                : row.logoLightUrl || row.logoDarkUrl || row.logoUrl;
            return logo ? (
              <div className="w-full max-w-[180px] rounded-md border border-slate-200 bg-white/70 p-1 dark:border-slate-700 dark:bg-slate-900/30">
                <img
                  src={logo}
                  alt={`Logo de ${row.name}`}
                  className="h-14 w-full rounded object-contain"
                />
              </div>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">Sin logo</span>
            );
          }}
        </DpTColumn>
        <DpTColumn name="companyMembers">
          {(row: CompanyRecord) => (
            <button
              type="button"
              onClick={() => navigate(`/system/companies/${encodeURIComponent(row.id)}/company-members`)}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Miembros por empresa"
              title="Miembros por empresa"
            >
              <i className="pi pi-users" />
            </button>
          )}
        </DpTColumn>
      </DpTable>

      <CompanyDialog
        visible={dialogVisible}
        companyId={editId}
        onSuccess={handleSuccess}
        onHide={handleHide}
      />

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={() => !saving && setPendingDeleteIds(null)}
        title="Eliminar empresas"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} empresa(s)? Esta acción no se puede deshacer.`
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
