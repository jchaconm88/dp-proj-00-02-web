import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getResources, deleteResources, type ResourceRecord } from "~/features/human-resource/resources";
import type { Route } from "./+types/ResourcesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, DpTColumn, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { RESOURCE_ENGAGEMENT_TYPE, RESOURCE_STATUS } from "~/constants/status-options";
import ResourceDialog from "./ResourceDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recursos Externos" },
    { name: "description", content: "Gestión de recursos externos" },
  ];
}

type ResourceRow = ResourceRecord & { fullName: string };

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Nombre", column: "fullName", order: 2, display: true, filter: true },
  { header: "Tipo Doc",    column: "documentType",   order: 3, display: true, filter: true },
  { header: "Nº Doc",      column: "documentNo",     order: 4, display: true, filter: true },
  { header: "F. Ingreso", column: "hireDate", order: 5, display: true, filter: true, type: "date" },
  { header: "Vinculación", column: "engagementType", order: 6, display: true, filter: true, type: "status", typeOptions: RESOURCE_ENGAGEMENT_TYPE },
  { header: "Estado", column: "status", order: 7, display: true, filter: true, type: "status", typeOptions: RESOURCE_STATUS },
  { header: "Costos", column: "costs", order: 8, display: true, filter: false },
];

export async function clientLoader() {
  const { items } = await getResources();
  const rows: ResourceRow[] = items.map((r) => ({
    ...r,
    fullName: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—",
  }));
  return { rows };
}

export default function ResourcesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ResourceRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/human-resource/resources/add");
  const editMatch = useMatch("/human-resource/resources/edit/:id");
  const editId = editMatch?.params.id ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);

  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/human-resource/resources/add");
  const openEdit = (row: ResourceRow) =>
    navigate(`/human-resource/resources/edit/${encodeURIComponent(row.id)}`);
  const openCosts = (row: ResourceRow) =>
    navigate(`/human-resource/resources/${encodeURIComponent(row.id)}/costs`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await deleteResources(selected.map((r) => r.id));
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    navigate("/human-resource/resources");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/human-resource/resources");

  return (
    <DpContent title="RECURSOS EXTERNOS">
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={handleDelete}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading || saving}
        filterPlaceholder="Filtrar por código, nombre, documento..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<ResourceRow>
        ref={tableRef}
        data={loaderData.rows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        linkColumn="code"
        onDetail={openEdit}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage='No hay recursos externos en la colección.'
        emptyFilterMessage="No hay resultados para el filtro."
      >
        <DpTColumn<ResourceRow> name="costs">
          {(row) => (
            <button
              type="button"
              onClick={() => openCosts(row)}
              className="p-button p-button-text p-button-rounded p-button-icon-only text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Costos del recurso"
              title="Costos"
            >
              <i className="pi pi-dollar" />
            </button>
          )}
        </DpTColumn>
      </DpTable>

      <ResourceDialog
        visible={dialogVisible}
        resourceId={editId}
        onSuccess={handleSuccess}
        onHide={handleHide}
      />
    </DpContent>
  );
}
