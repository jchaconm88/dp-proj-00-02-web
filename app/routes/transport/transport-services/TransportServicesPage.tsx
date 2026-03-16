import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
    getTransportServices,
    deleteTransportServices,
    type TransportServiceRecord,
    type ServiceTypeCategory,
    type CalculationType,
} from "~/features/transport/transport-services";
import type { Route } from "./+types/TransportServicesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { SERVICE_TYPE_CATEGORY, CALCULATION_TYPE } from "~/constants/status-options";
import TransportServiceDialog from "./TransportServiceDialog";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Servicios de Transporte" },
        { name: "description", content: "Gestión de servicios de transporte" },
    ];
}

const TABLE_DEF: DpTableDefColumn[] = [
    { header: "Código", column: "code", order: 1, display: true, filter: true },
    { header: "Nombre", column: "name", order: 2, display: true, filter: true },
    { header: "Descripción", column: "description", order: 3, display: true, filter: true },
    { header: "Categoría", column: "category", order: 4, display: true, filter: true, type: "status", typeOptions: SERVICE_TYPE_CATEGORY },
    { header: "Tiempo (min)", column: "defaultServiceTimeMin", order: 5, display: true, filter: true },
    { header: "Cálculo", column: "calculationType", order: 6, display: true, filter: true, type: "status", typeOptions: CALCULATION_TYPE },
    { header: "Cita req.", column: "requiresAppointment", order: 7, display: true, filter: false, type: "bool" },
    { header: "Consolida", column: "allowConsolidation", order: 8, display: true, filter: false, type: "bool" },
    { header: "Activo", column: "active", order: 9, display: true, filter: true, type: "bool" },
];

export async function clientLoader() {
    const { items } = await getTransportServices();
    return { items };
}

export default function TransportServicesPage({ loaderData }: Route.ComponentProps) {
    const navigate = useNavigate();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const tableRef = useRef<DpTableRef<TransportServiceRecord>>(null);

    const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
    const isAdd = !!useMatch("/transport/transport-services/add");
    const editMatch = useMatch("/transport/transport-services/edit/:id");
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

    const openAdd = () => navigate("/transport/transport-services/add");
    const openEdit = (row: TransportServiceRecord) =>
        navigate(`/transport/transport-services/edit/${encodeURIComponent(row.id)}`);

    const handleDelete = async () => {
        const selected = tableRef.current?.getSelectedRows() ?? [];
        if (selected.length === 0) return;
        setSaving(true);
        setError(null);
        try {
            await deleteTransportServices(selected.map((r) => r.id));
            tableRef.current?.clearSelectedRows();
            revalidator.revalidate();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar.");
        } finally {
            setSaving(false);
        }
    };

    const handleSuccess = () => {
        navigate("/transport/transport-services");
        revalidator.revalidate();
    };

    const handleHide = () => navigate("/transport/transport-services");

    return (
        <DpContent title="SERVICIOS DE TRANSPORTE">
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

            <DpTable<TransportServiceRecord>
                ref={tableRef}
                data={loaderData.items}
                loading={isLoading || saving}
                tableDef={TABLE_DEF}
                linkColumn="code"
                onDetail={openEdit}
                onEdit={openEdit}
                onSelectionChange={(rows) => setSelectedCount(rows.length)}
                showFilterInHeader={false}
                emptyMessage='No hay servicios registrados.'
                emptyFilterMessage="No hay resultados para el filtro."
            />

            <TransportServiceDialog
                visible={dialogVisible}
                serviceId={editId}
                onSuccess={handleSuccess}
                onHide={handleHide}
            />
        </DpContent>
    );
}
