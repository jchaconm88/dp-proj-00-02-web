import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import type { Route } from "./+types/ChargeTypesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import {
  getChargeTypes,
  deleteChargeTypes,
  type ChargeTypeRecord,
} from "~/features/transport/charge-types";
import {
  CHARGE_TYPE_KIND,
  CHARGE_TYPE_SOURCE,
  CHARGE_TYPE_CATEGORY,
} from "~/constants/status-options";
import ChargeTypeDialog from "./ChargeTypeDialog";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Tipos de Cobros" },
    { name: "description", content: "Gestión de tipos de cobros/costos" },
  ];
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Nombre", column: "name", order: 2, display: true, filter: true },
  { header: "Tipo", column: "type", order: 3, display: true, filter: true, type: "status", typeOptions: CHARGE_TYPE_KIND },
  { header: "Origen", column: "source", order: 4, display: true, filter: true, type: "label", typeOptions: CHARGE_TYPE_SOURCE },
  { header: "Categoría", column: "category", order: 5, display: true, filter: true, type: "label", typeOptions: CHARGE_TYPE_CATEGORY },
  { header: "Activo", column: "active", order: 6, display: true, filter: false, type: "bool" },
];

export async function clientLoader() {
  const { items } = await getChargeTypes();
  return { items };
}

export default function ChargeTypesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ChargeTypeRecord>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/charge-types/add");
  const editMatch = useMatch("/transport/charge-types/edit/:id");
  const editId = editMatch?.params.id ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);

  const dialogVisible = isAdd || !!editId;

  const handleHide = () => navigate("/transport/charge-types");

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/transport/charge-types/add");
  const openEdit = (row: ChargeTypeRecord) =>
    navigate(`/transport/charge-types/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await deleteChargeTypes(selected.map((r) => r.id));
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    navigate("/transport/charge-types");
    revalidator.revalidate();
  };

  return (
    <DpContent
      title="TIPOS DE COBROS"
      breadcrumbItems={["TRANSPORTE", "TIPOS DE COBROS"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
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

      <DpTable<ChargeTypeRecord>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        linkColumn="code"
        onDetail={openEdit}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage="No hay tipos registrados."
        emptyFilterMessage="No hay resultados para el filtro."
      />

      <ChargeTypeDialog
        visible={dialogVisible}
        chargeTypeId={editId}
        onSuccess={handleSuccess}
        onHide={handleHide}
      />
    </DpContent>
  );
}

