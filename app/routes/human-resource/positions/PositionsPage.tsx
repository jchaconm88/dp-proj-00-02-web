import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getPositions, deletePositions, type PositionRecord } from "~/features/human-resource/positions";
import type { Route } from "./+types/PositionsPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import PositionDialog from "./PositionDialog";

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Nombre", column: "name", order: 2, display: true, filter: true },
  { header: "Activo", column: "active", order: 3, display: true, filter: true, type: "bool" },
];

export async function clientLoader() {
  const { items } = await getPositions();
  return { items };
}

export default function PositionsPage({ loaderData }: Route.ComponentProps) {
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const tableRef = useRef<DpTableRef<PositionRecord>>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [filterValue, setFilterValue] = useState("");

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading" || saving;
  const isAdd = !!useMatch("/human-resource/positions/add");
  const editMatch = useMatch("/human-resource/positions/edit/:id");
  const isEdit = !!editMatch;
  const currentId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;

  const handleRefresh = () => revalidator.revalidate();

  const openAdd = () => navigate("/human-resource/positions/add");
  const openEdit = (row: PositionRecord) =>
    navigate(`/human-resource/positions/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await deletePositions(selected.map((r) => r.id));
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const handleSuccess = () => {
    navigate("/human-resource/positions");
    revalidator.revalidate();
  };

  return (
    <DpContent title="CARGOS">
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={handleRefresh}
        onCreate={openAdd}
        onDelete={handleDelete}
        deleteDisabled={selectedCount === 0 || isLoading}
        loading={isLoading}
        filterPlaceholder="Filtrar por código, nombre..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<PositionRecord>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading}
        tableDef={TABLE_DEF}
        linkColumn="code"
        onDetail={openEdit}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage='No hay cargos en la colección.'
        emptyFilterMessage="No hay resultados para el filtro."
      />

      <PositionDialog
        visible={isAdd || isEdit}
        positionId={currentId}
        onSuccess={handleSuccess}
      />
    </DpContent>
  );
}
