import { useRef, useState } from "react";
import { useNavigation, useNavigate, useRevalidator, useMatch, useParams } from "react-router";
import {
    getClient,
    getClientLocations,
    deleteClientLocations,
    type ClientLocationRecord,
} from "~/features/master/clients";
import type { Route } from "./+types/LocationsPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import LocationDialog from "./LocationDialog";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Ubicaciones del Cliente" },
        { name: "description", content: "Gestión de ubicaciones de cliente" },
    ];
}

type LocationRow = ClientLocationRecord & { deliveryWindowStr?: string };

const TABLE_DEF: DpTableDefColumn[] = [
    { header: "Nombre", column: "name", order: 1, display: true, filter: true },
    { header: "Tipo", column: "type", order: 2, display: true, filter: true },
    { header: "Dirección", column: "address", order: 3, display: true, filter: true },
    { header: "Distrito", column: "district", order: 4, display: true, filter: true },
    { header: "Ciudad", column: "city", order: 5, display: true, filter: true },
    { header: "País", column: "country", order: 6, display: true, filter: true },
    { header: "Ventana entrega", column: "deliveryWindowStr", order: 7, display: true, filter: true },
    { header: "Tiempo serv. (min)", column: "serviceTimeMin", order: 8, display: true, filter: true },
    { header: "Activo", column: "active", order: 9, display: true, filter: true },
];

export async function clientLoader({ params }: Route.LoaderArgs) {
    const { id } = params;
    if (!id) throw new Error("ID de cliente requerido");

    const [client, { items }] = await Promise.all([
        getClient(id),
        getClientLocations(id),
    ]);

    const rows: LocationRow[] = items.map((loc) => ({
        ...loc,
        deliveryWindowStr: `${loc.deliveryWindow.start} - ${loc.deliveryWindow.end}`,
    }));

    return { client, rows, clientId: id };
}

export default function LocationsPage({ loaderData }: Route.ComponentProps) {
    const navigate = useNavigate();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const { clientId } = loaderData;

    const tableRef = useRef<DpTableRef<LocationRow>>(null);

    const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
    const isAdd = !!useMatch("/master/clients/:id/locations/add");
    const editMatch = useMatch("/master/clients/:id/locations/edit/:locationId");
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

    const openAdd = () => navigate(`/master/clients/${encodeURIComponent(clientId)}/locations/add`);
    const openEdit = (row: LocationRow) =>
        navigate(`/master/clients/${encodeURIComponent(clientId)}/locations/edit/${encodeURIComponent(row.id)}`);

    const handleDelete = async () => {
        const selected = tableRef.current?.getSelectedRows() ?? [];
        if (selected.length === 0) return;
        setSaving(true);
        setError(null);
        try {
            await deleteClientLocations(clientId, selected.map((r) => r.id));
            tableRef.current?.clearSelectedRows();
            revalidator.revalidate();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar.");
        } finally {
            setSaving(false);
        }
    };

    const handleSuccess = () => {
        navigate(`/master/clients/${encodeURIComponent(clientId)}/locations`);
        revalidator.revalidate();
    };

    const handleHide = () => navigate(`/master/clients/${encodeURIComponent(clientId)}/locations`);

    return (
        <DpContentInfo
            title={loaderData.client ? `Ubicaciones: ${loaderData.client.commercialName || loaderData.client.code}` : "Ubicaciones"}
            backLabel="Volver a clientes"
            onBack={() => navigate("/master/clients")}
        >
            <DpContentHeader
                filterValue={filterValue}
                onFilter={handleFilter}
                onLoad={() => revalidator.revalidate()}
                onCreate={openAdd}
                onDelete={handleDelete}
                deleteDisabled={selectedCount === 0 || saving}
                loading={isLoading || saving}
                filterPlaceholder="Filtrar ubicaciones..."
            />

            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {error}
                </div>
            )}

            <DpTable<LocationRow>
                ref={tableRef}
                data={loaderData.rows}
                loading={isLoading || saving}
                tableDef={TABLE_DEF}
                linkColumn="name"
                onDetail={openEdit}
                onEdit={openEdit}
                onSelectionChange={(rows) => setSelectedCount(rows.length)}
                showFilterInHeader={false}
                emptyMessage="No hay ubicaciones para este cliente."
                emptyFilterMessage="No hay resultados para el filtro."
            />

            <LocationDialog
                visible={dialogVisible}
                clientId={clientId}
                locationId={editLocationId}
                onSuccess={handleSuccess}
                onHide={handleHide}
            />
        </DpContentInfo>
    );
}
