import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getContracts,
  deleteContracts,
  type ContractRecord,
  type ContractStatus,
  type BillingCycle,
} from "~/features/transport/transport-contracts";
import type { Route } from "./+types/TransportContractsPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, DpTColumn, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { CONTRACT_STATUS, BILLING_CYCLE, CURRENCY } from "~/constants/status-options";
import TransportContractDialog from "./TransportContractDialog";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Contratos de Transporte" },
    { name: "description", content: "Gestión de contratos de transporte" },
  ];
}

type ContractRow = ContractRecord & { validityStr?: string };

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "contractCode", order: 1, display: true, filter: true },
  { header: "Cliente", column: "client", order: 2, display: true, filter: true },
  { header: "Descripción", column: "description", order: 3, display: true, filter: true },
  { header: "Moneda", column: "currency", order: 4, display: true, filter: true, type: "status", typeOptions: CURRENCY },
  { header: "Vigencia", column: "validityStr", order: 5, display: true, filter: true },
  { header: "Facturación", column: "billingCycle", order: 6, display: true, filter: true, type: "status", typeOptions: BILLING_CYCLE },
  { header: "Estado", column: "status", order: 7, display: true, filter: true, type: "status", typeOptions: CONTRACT_STATUS },
  { header: "Tarifario", column: "rateRules", order: 8, display: true, filter: false },
];

export async function clientLoader() {
  const { items } = await getContracts();
  const rows = items.map((c) => ({
    ...c,
    validityStr: c.validFrom && c.validTo ? `${c.validFrom} a ${c.validTo}` : "Indefinida",
  }));
  return { rows };
}

export default function TransportContractsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<ContractRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/transport-contracts/add");
  const editMatch = useMatch("/transport/transport-contracts/edit/:id");
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

  const openAdd = () => navigate("/transport/transport-contracts/add");
  const openEdit = (row: ContractRow) =>
    navigate(`/transport/transport-contracts/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await deleteContracts(selected.map((r) => r.id));
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    navigate("/transport/transport-contracts");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/transport/transport-contracts");

  return (
    <DpContent title="CONTRATOS DE TRANSPORTE">
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={handleDelete}
        deleteDisabled={selectedCount === 0 || saving}
        loading={isLoading || saving}
        filterPlaceholder="Filtrar por código, cliente..."
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <DpTable<ContractRow>
        ref={tableRef}
        data={loaderData.rows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        linkColumn="contractCode"
        onDetail={openEdit}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage='No hay contratos registrados.'
        emptyFilterMessage="No hay resultados para el filtro."
      >
        <DpTColumn<ContractRow> name="rateRules">
          {(row) => (
            <button
              type="button"
              onClick={() => navigate(`/transport/transport-contracts/${encodeURIComponent(row.id)}/transport-rate-rules`)}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Ver reglas de tarifa"
              title="Ir a reglas de tarifa (tarifario)"
            >
              <i className="pi pi-list font-semibold text-zinc-600 hover:text-blue-500 dark:text-zinc-300" />
            </button>
          )}
        </DpTColumn>
      </DpTable>

      <TransportContractDialog
        visible={dialogVisible}
        contractId={editId}
        onSuccess={handleSuccess}
        onHide={handleHide}
      />
    </DpContent>
  );
}
