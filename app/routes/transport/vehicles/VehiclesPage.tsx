import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getVehicles, deleteVehicle, deleteVehicles, type VehicleRecord } from "~/features/transport/vehicles";
import type { Route } from "./+types/VehiclesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { VEHICLE_STATUS, VEHICLE_TYPE } from "~/constants/status-options";
import VehicleDialog from "./VehicleDialog";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Vehículos" },
    { name: "description", content: "Gestión de vehículos de transporte" },
  ];
}

type VehicleRow = VehicleRecord;

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Placa",       column: "plate",      order: 1, display: true, filter: true },
  { header: "Tipo",        column: "type",       order: 2, display: true, filter: true, type: "status", typeOptions: VEHICLE_TYPE },
  { header: "Marca",       column: "brand",      order: 3, display: true, filter: true },
  { header: "Modelo",      column: "model",      order: 4, display: true, filter: true },
  { header: "Capacidad(Kg)", column: "capacityKg", order: 5, display: true, filter: true },
  { header: "Estado",      column: "status",     order: 6, display: true, filter: true, type: "status", typeOptions: VEHICLE_STATUS },
];

export async function clientLoader() {
  const { items } = await getVehicles();
  return { items };
}

export default function VehiclesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<VehicleRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/vehicles/add");
  const editMatch = useMatch("/transport/vehicles/edit/:id");
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

  const openAdd = () => navigate("/transport/vehicles/add");
  const openEdit = (row: VehicleRow) => navigate(`/transport/vehicles/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    if (!confirm(`¿Eliminar ${selected.length} vehículo(s)?`)) return;

    setSaving(true);
    setError(null);
    try {
      if (selected.length === 1) {
        await deleteVehicle(selected[0].id);
      } else {
        await deleteVehicles(selected.map((r) => r.id));
      }
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    navigate("/transport/vehicles");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/transport/vehicles");

  return (
    <DpContent title="VEHÍCULOS">
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={handleDelete}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por placa, marca..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<VehicleRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay vehículos."
        emptyFilterMessage="No se encontraron vehículos."
      />

      {dialogVisible && (
        <VehicleDialog
          visible={dialogVisible}
          vehicleId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContent>
  );
}
