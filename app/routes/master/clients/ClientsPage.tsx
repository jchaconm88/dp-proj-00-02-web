import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
    getClients,
    deleteClients,
    type ClientRecord,
} from "~/features/master/clients";
import type { Route } from "./+types/ClientsPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, DpTColumn, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { CLIENT_STATUS } from "~/constants/status-options";
import ClientDialog from "./ClientDialog";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Clientes" },
        { name: "description", content: "Gestión de clientes" },
    ];
}

type ClientRow = ClientRecord & { contactName: string };

const TABLE_DEF: DpTableDefColumn[] = [
    { header: "Código", column: "code", order: 1, display: true, filter: true },
    { header: "Razón social", column: "businessName", order: 2, display: true, filter: true },
    { header: "Nombre comercial", column: "commercialName", order: 3, display: true, filter: true },
    { header: "Tipo doc", column: "documentType", order: 4, display: true, filter: true },
    { header: "Nº documento", column: "documentNumber", order: 5, display: true, filter: true },
    { header: "Contacto", column: "contactName", order: 6, display: true, filter: true },
    { header: "Estado", column: "status", order: 7, display: true, filter: true, type: "status", typeOptions: CLIENT_STATUS },
    { header: "Ubicaciones", column: "locations", order: 8, display: true, filter: false },
];

export async function clientLoader() {
    const { items } = await getClients();
    const rows: ClientRow[] = items.map((c) => ({
        ...c,
        contactName: c.contact.contactName || "—",
    }));
    return { rows };
}

export default function ClientsPage({ loaderData }: Route.ComponentProps) {
    const navigate = useNavigate();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const tableRef = useRef<DpTableRef<ClientRow>>(null);

    const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
    const isAdd = !!useMatch("/master/clients/add");
    const editMatch = useMatch("/master/clients/edit/:id");
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

    const openAdd = () => navigate("/master/clients/add");
    const openEdit = (row: ClientRow) =>
        navigate(`/master/clients/edit/${encodeURIComponent(row.id)}`);

    const openLocations = (row: ClientRow) =>
        navigate(`/master/clients/${encodeURIComponent(row.id)}/locations`);

    const handleDelete = async () => {
        const selected = tableRef.current?.getSelectedRows() ?? [];
        if (selected.length === 0) return;
        setSaving(true);
        setError(null);
        try {
            await deleteClients(selected.map((r) => r.id));
            tableRef.current?.clearSelectedRows();
            revalidator.revalidate();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al eliminar.");
        } finally {
            setSaving(false);
        }
    };

    const handleSuccess = () => {
        navigate("/master/clients");
        revalidator.revalidate();
    };

    const handleHide = () => navigate("/master/clients");

    return (
        <DpContent title="CLIENTES">
            <DpContentHeader
                filterValue={filterValue}
                onFilter={handleFilter}
                onLoad={() => revalidator.revalidate()}
                onCreate={openAdd}
                onDelete={handleDelete}
                deleteDisabled={selectedCount === 0 || saving}
                loading={isLoading || saving}
                filterPlaceholder="Filtrar por código, razón social..."
            />

            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {error}
                </div>
            )}

            <DpTable<ClientRow>
                ref={tableRef}
                data={loaderData.rows}
                loading={isLoading || saving}
                tableDef={TABLE_DEF}
                linkColumn="commercialName"
                onDetail={openEdit}
                onEdit={openEdit}
                onSelectionChange={(rows) => setSelectedCount(rows.length)}
                showFilterInHeader={false}
                emptyMessage='No hay clientes en la colección "clients".'
                emptyFilterMessage="No hay resultados para el filtro."
            >
                <DpTColumn<ClientRow> name="locations">
                    {(row) => (
                        <button
                            type="button"
                            onClick={() => openLocations(row)}
                            className="p-button p-button-text p-button-rounded p-button-icon-only text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            aria-label="Ubicaciones del cliente"
                            title="Ubicaciones"
                        >
                            <i className="pi pi-map-marker" />
                        </button>
                    )}
                </DpTColumn>
            </DpTable>

            <ClientDialog
                visible={dialogVisible}
                clientId={editId}
                onSuccess={handleSuccess}
                onHide={handleHide}
            />
        </DpContent>
    );
}
