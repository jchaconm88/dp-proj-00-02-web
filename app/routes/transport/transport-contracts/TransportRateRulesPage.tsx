import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getContract,
  getRateRules,
  deleteRateRules,
  type ContractRecord,
  type RateRuleRecord,
} from "~/features/transport/transport-contracts";
import type { Route } from "./+types/TransportRateRulesPage";
import { DpContentInfo, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { CALCULATION_TYPE, RATE_RULE_TYPE } from "~/constants/status-options";
import RateRuleDialog from "./TransportRateRuleDialog";

export function meta({ data }: Route.MetaArgs) {
  const contractCode = data?.contract?.contractCode || "Contrato";
  return [
    { title: `Reglas de Tarifa: ${contractCode}` },
    { name: "description", content: `Reglas de tarifa para el contrato ${contractCode}` },
  ];
}

type RateRuleRow = RateRuleRecord & { validityStr?: string };

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Código", column: "code", order: 1, display: true, filter: true },
  { header: "Nombre", column: "name", order: 2, display: true, filter: true },
  { header: "Tipo regla", column: "ruleType", order: 3, display: true, filter: true, type: "status", typeOptions: RATE_RULE_TYPE },
  { header: "Prioridad", column: "priority", order: 4, display: true, filter: true },
  { header: "Cálculo", column: "calculationType", order: 5, display: true, filter: true, type: "status", typeOptions: CALCULATION_TYPE },
  { header: "Servicio", column: "transportService", order: 6, display: true, filter: true },
  { header: "Vehículo", column: "vehicleType", order: 7, display: true, filter: true },
  { header: "Vigencia", column: "validityStr", order: 8, display: true, filter: true },
  { header: "Apilable", column: "stackable", order: 9, display: true, filter: false, type: "bool" },
  { header: "Activo", column: "active", order: 10, display: true, filter: true, type: "bool" },
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const contractId = params.id as string;
  const contract = await getContract(contractId);
  if (!contract) {
    throw new Error("Contrato no encontrado");
  }

  const { items } = await getRateRules(contractId);
  const rows = items.map((r) => ({
    ...r,
    validityStr: r.validFrom && r.validTo ? `${r.validFrom} a ${r.validTo}` : "Indefinida",
  }));

  return { contract, rows, contractId };
}

export default function RateRulesPage({ loaderData }: Route.ComponentProps) {
  const { contract, rows, contractId } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<RateRuleRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/transport-contracts/:id/transport-rate-rules/add");
  const editMatch = useMatch("/transport/transport-contracts/:id/transport-rate-rules/edit/:ruleId");
  const editRuleId = editMatch?.params.ruleId ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);

  const dialogVisible = isAdd || !!editRuleId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate(`/transport/transport-contracts/${encodeURIComponent(contractId)}/transport-rate-rules/add`);
  const openEdit = (row: RateRuleRow) =>
    navigate(`/transport/transport-contracts/${encodeURIComponent(contractId)}/transport-rate-rules/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await deleteRateRules(
        contractId,
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
    navigate(`/transport/transport-contracts/${encodeURIComponent(contractId)}/transport-rate-rules`);
    revalidator.revalidate();
  };

  const handleHide = () => navigate(`/transport/transport-contracts/${encodeURIComponent(contractId)}/transport-rate-rules`);
  const backToContracts = () => navigate("/transport/transport-contracts");

  const titleLabel = `Tarifario (Reglas): ${contract.contractCode}`;

  return (
    <DpContentInfo
      title={titleLabel}
      backLabel="Volver a contratos"
      onBack={backToContracts}
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

      <DpTable<RateRuleRow>
        ref={tableRef}
        data={rows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        linkColumn="code"
        onDetail={openEdit}
        onEdit={openEdit}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        showFilterInHeader={false}
        emptyMessage='No hay reglas de tarifa en este contrato.'
        emptyFilterMessage="No hay resultados para el filtro."
      />

      <RateRuleDialog
        visible={dialogVisible}
        contractId={contractId}
        ruleId={editRuleId}
        onSuccess={handleSuccess}
        onHide={handleHide}
      />
    </DpContentInfo>
  );
}
