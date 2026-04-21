import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getCompanyById } from "~/features/system/companies";
import {
  getCompanyLocations,
  deleteCompanyLocations,
  type CompanyLocationRecord,
} from "~/features/system/company-locations";
import type { Route } from "./+types/CompanyLocationsPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { moduleTableDef } from "~/data/system-modules";
import CompanyLocationDialog from "./CompanyLocationDialog";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Sedes de empresa" }];
}

const TABLE_DEF = moduleTableDef("company-location");

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const id = params?.id ?? "";
  if (!id) throw new Error("ID de empresa requerido");
  const company = await getCompanyById(id);
  const { items } = await getCompanyLocations(id);
  return { company, rows: items, companyId: id };
}

export default function CompanyLocationsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const { companyId } = loaderData;

  const tableRef = useRef<DpTableRef<CompanyLocationRecord>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/system/companies/:id/company-locations/add");
  const editMatch = useMatch("/system/companies/:id/company-locations/edit/:locationId");
  const editLocationId = editMatch?.params.locationId ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);

  const dialogVisible = isAdd || !!editLocationId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const base = `/system/companies/${encodeURIComponent(companyId)}/company-locations`;

  const openAdd = () => navigate(`${base}/add`);
  const openEdit = (row: CompanyLocationRecord) => navigate(`${base}/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await deleteCompanyLocations(
        companyId,
        selected.map((r) => r.id)
      );
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    navigate(base);
    revalidator.revalidate();
  };

  const handleHide = () => navigate(base);

  return (
    <DpContentInfo
      title={loaderData.company ? `Sedes: ${loaderData.company.name}` : "Sedes"}
      breadcrumbItems={["SISTEMA", "EMPRESAS", "SEDES"]}
      backLabel="Volver a empresas"
      onBack={() => navigate("/system/companies")}
    >
      <DpContentHeader
        onCreate={openAdd}
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onDelete={handleDelete}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading || saving}
        filterPlaceholder="Filtrar..."
      />

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<CompanyLocationRecord>
        ref={tableRef}
        data={loaderData.rows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage="No hay sedes registradas."
        emptyFilterMessage="Sin resultados."
      />

      {dialogVisible && (
        <CompanyLocationDialog
          visible={dialogVisible}
          companyId={companyId}
          locationId={editLocationId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContentInfo>
  );
}
