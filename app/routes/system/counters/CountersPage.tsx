import { useRef, useState } from "react";
import { useNavigate, useMatch, Outlet, useNavigation, useRevalidator } from "react-router";
import { getCounters, deleteCounter, type CounterRecord } from "~/features/system/counters";
import type { Route } from "./+types/CountersPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import CounterDialog from "./CounterDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Contadores" },
    { name: "description", content: "Mantenimiento de contadores de secuencias" },
  ];
}

// clientLoader: carga datos antes de renderizar el componente.
export async function clientLoader({}: Route.ClientLoaderArgs) {
  const { items } = await getCounters();
  return { counters: items };
}

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Secuencia", column: "sequence", order: 1, display: true, filter: true },
  { header: "Periodo", column: "period", order: 2, display: true, filter: true },
  { header: "Último número", column: "lastNumber", order: 3, display: true, filter: true },
  { header: "Activo", column: "active", order: 4, display: true, filter: true, type: "bool" },
];

export default function Counters({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<CounterRecord>>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [filterValue, setFilterValue] = useState("");

  // Loading unificado: navegación entre rutas + revalidaciones
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  // Detección de diálogo activo por URL â€” useMatch es la API oficial de RR v7
  const addMatch = useMatch("/system/counters/add");
  const editMatch = useMatch("/system/counters/edit/:id");
  const isAdd = !!addMatch;
  const editId = editMatch?.params.id ? decodeURIComponent(editMatch.params.id) : null;
  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/system/counters/add");
  const openEdit = (c: CounterRecord) =>
    navigate("/system/counters/edit/" + encodeURIComponent(c.id));
  const handleHide = () => navigate("/system/counters");

  // Refresca datos re-ejecutando el clientLoader
  const handleSuccess = () => revalidator.revalidate();

  const handleDeleteSelected = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    if (!confirm(`Â¿Eliminar ${selected.length} contador(es)?`)) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(selected.map((c) => deleteCounter(c.id)));
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DpContent title="CONTADORES">
        <DpContentHeader
          filterValue={filterValue}
          onFilter={handleFilter}
          onLoad={() => revalidator.revalidate()}
          onCreate={openAdd}
          onDelete={handleDeleteSelected}
          deleteDisabled={selectedCount === 0 || saving}
          loading={isLoading}
          filterPlaceholder="Filtrar por secuencia, periodo..."
        />

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* data prop: modo controlado â€” se actualiza automáticamente con cada revalidación */}
        <DpTable<CounterRecord>
          ref={tableRef}
          data={loaderData.counters}
          loading={isLoading}
          tableDef={TABLE_DEF}
          linkColumn="sequence"
          onDetail={openEdit}
          onEdit={openEdit}
          onSelectionChange={(rows) => setSelectedCount(rows.length)}
          showFilterInHeader={false}
          filterPlaceholder="Filtrar..."
          emptyMessage='No hay contadores en la colección "counters".'
          emptyFilterMessage="No hay resultados para el filtro."
        />
      </DpContent>

      <CounterDialog
        visible={dialogVisible}
        counterId={editId}
        onSuccess={handleSuccess}
        onHide={handleHide}
      />

      <Outlet />
    </>
  );
}
