import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch, useParams } from "react-router";
import {
  getResource,
  getResourceCosts,
  deleteResourceCosts,
  type ResourceRecord,
  type ResourceCostRecord,
} from "~/features/human-resource/resources";
import type { Route } from "./+types/CostsPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { RESOURCE_COST_TYPE, CURRENCY } from "~/constants/status-options";
import ResourceCostDialog from "./ResourceCostDialog";

export function meta({ data }: Route.MetaArgs) {
  const resourceLabel = data?.resource?.code || "Recurso";
  return [
    { title: `Costos de ${resourceLabel}` },
    { name: "description", content: `Costos del recurso ${resourceLabel}` },
  ];
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Nombre", column: "name", order: 2, display: true, filter: true },
  { header: "Tipo", column: "type", order: 3, display: true, filter: true, type: "status", typeOptions: RESOURCE_COST_TYPE },
  { header: "Monto", column: "amount", order: 4, display: true, filter: true },
  { header: "Moneda", column: "currency", order: 5, display: true, filter: true, type: "status", typeOptions: CURRENCY },
  { header: "Vigente desde", column: "effectiveFrom", order: 6, display: true, filter: true, type: "date" },
  { header: "Activo", column: "active", order: 7, display: true, filter: true, type: "bool" },
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const resourceId = params.id as string;
  const resource = await getResource(resourceId);
  if (!resource) {
    throw new Error("Recurso no encontrado");
  }

  const { items } = await getResourceCosts(resourceId);
  return { resource, costs: items, resourceId };
}

export default function ResourceCostsPage({ loaderData }: Route.ComponentProps) {
  const { resource, costs, resourceId } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ResourceCostRecord>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/human-resource/resources/:id/costs/add");
  const editMatch = useMatch("/human-resource/resources/:id/costs/edit/:costId");
  const editCostId = editMatch?.params.costId ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);

  const dialogVisible = isAdd || !!editCostId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(`/human-resource/resources/${encodeURIComponent(resourceId)}/costs/add`);
  const openEdit = (row: ResourceCostRecord) =>
    navigate(`/human-resource/resources/${encodeURIComponent(resourceId)}/costs/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await deleteResourceCosts(
        resourceId,
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
    navigate(`/human-resource/resources/${encodeURIComponent(resourceId)}/costs`);
    revalidator.revalidate();
  };

  const handleHide = () => navigate(`/human-resource/resources/${encodeURIComponent(resourceId)}/costs`);
  const backToResources = () => navigate("/human-resource/resources");

  const resourceLabel = `Costos: ${resource.code} – ${resource.firstName} ${resource.lastName}`.trim();

  return (
    <DpContentInfo
      title={resourceLabel}
      backLabel="Volver a recursos"
      onBack={backToResources}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={handleDelete}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading || saving}
        filterPlaceholder="Filtrar por código, nombre..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<ResourceCostRecord>
        ref={tableRef}
        data={costs}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        linkColumn="code"
        onDetail={openEdit}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage='No hay costos para este recurso.'
        emptyFilterMessage="No hay resultados para el filtro."
      />

      <ResourceCostDialog
        visible={dialogVisible}
        resourceId={resourceId}
        costId={editCostId}
        onSuccess={handleSuccess}
        onHide={handleHide}
      />
    </DpContentInfo>
  );
}
