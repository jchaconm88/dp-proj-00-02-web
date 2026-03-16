import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
    getDrivers,
    deleteDrivers,
    type DriverRecord,
    type DriverStatus,
    type DriverRelationshipType,
} from "~/features/transport/drivers";
import type { Route } from "./+types/DriversPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DRIVER_STATUS, DRIVER_RELATIONSHIP } from "~/constants/status-options";
import DriverDialog from "./DriverDialog";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Conductores" },
        { name: "description", content: "Gestión de conductores" },
    ];
}

const TABLE_DEF: DpTableDefColumn[] = [
    { header: "Nombre", column: "firstName", order: 2, display: true, filter: true },
    { header: "Apellido", column: "lastName", order: 3, display: true, filter: true },
    { header: "Nº Doc", column: "documentNo", order: 4, display: true, filter: true },
    { header: "Tipo doc", column: "documentId", order: 5, display: true, filter: true },
    { header: "Teléfono", column: "phoneNo", order: 6, display: true, filter: true },
    { header: "Licencia", column: "licenseNo", order: 7, display: true, filter: true },
    { header: "Categoría", column: "licenseCategory", order: 8, display: true, filter: true },
    { header: "Venc. licencia", column: "licenseExpiration", order: 9, display: true, filter: true, type: "date" },
    { header: "Vínculo", column: "relationshipType", order: 10, display: true, filter: true, type: "status", typeOptions: DRIVER_RELATIONSHIP },
    { header: "Estado", column: "status", order: 11, display: true, filter: true, type: "status", typeOptions: DRIVER_STATUS },
    { header: "Viaje actual", column: "currentTripId", order: 12, display: true, filter: true },
];

export async function clientLoader() {
    const { items } = await getDrivers();
    return { items };
}

export default function DriversPage({ loaderData }: Route.ComponentProps) {
    const navigate = useNavigate();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const tableRef = useRef<DpTableRef<DriverRecord>>(null);

    const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
    const isAdd = !!useMatch("/transport/drivers/add");
    const editMatch = useMatch("/transport/drivers/edit/:id");
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

    const openAdd = () => navigate("/transport/drivers/add");
    const openEdit = (row: DriverRecord) =>
        navigate(`/transport/drivers/edit/${encodeURIComponent(row.id)}`);

    const handleDelete = async () => {
        const selected = tableRef.current?.getSelectedRows() ?? [];
        if (selected.length === 0) return;
        setSaving(true);
        setError(null);
        try {
            await deleteDrivers(selected.map((r) => r.id));
            tableRef.current?.clearSelectedRows();
            revalidator.revalidate();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar.");
        } finally {
            setSaving(false);
        }
    };

    const handleSuccess = () => {
        navigate("/transport/drivers");
        revalidator.revalidate();
    };

    const handleHide = () => navigate("/transport/drivers");

    return (
        <DpContent title="CONDUCTORES">
            <DpContentHeader
                filterValue={filterValue}
                onFilter={handleFilter}
                onLoad={() => revalidator.revalidate()}
                onCreate={openAdd}
                onDelete={handleDelete}
                deleteDisabled={selectedCount === 0 || saving}
                loading={isLoading || saving}
                filterPlaceholder="Filtrar por nombre, apellido, licencia..."
            />

            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {error}
                </div>
            )}

            <DpTable<DriverRecord>
                ref={tableRef}
                data={loaderData.items}
                loading={isLoading || saving}
                tableDef={TABLE_DEF}
                linkColumn="firstName"
                onDetail={openEdit}
                onEdit={openEdit}
                onSelectionChange={(rows) => setSelectedCount(rows.length)}
                showFilterInHeader={false}
                emptyMessage='No hay conductores registrados.'
                emptyFilterMessage="No hay resultados para el filtro."
            />

            <DriverDialog
                visible={dialogVisible}
                driverId={editId}
                onSuccess={handleSuccess}
                onHide={handleHide}
            />
        </DpContent>
    );
}
