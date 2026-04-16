import { useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getSettlements,
  deleteSettlement,
  deleteSettlements,
  updateSettlementsStatus,
  buildSettlementPeriodLabel,
  type Settlement,
  type SettlementDocStatus,
} from "~/features/transport/settlements";
import type { Route } from "./+types/SettlementsPage";
import { DpContent, DpContentHeader, DpContentHeaderAction, DpContentSet } from "~/components/DpContent";
import { Button } from "primereact/button";
import { DpInput } from "~/components/DpInput";
import { createInvoiceFromSettlement } from "~/features/billing/invoice";
import {
  getActiveSequencesByDocumentType,
  type DocumentSequenceRecord,
} from "~/features/master/document-sequences";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import DpTColumn from "~/components/DpTable/DpTColumn";
import {
  SETTLEMENT_TYPE,
  SETTLEMENT_CATEGORY,
  SETTLEMENT_STATUS,
  SETTLEMENT_PAYMENT_STATUS,
  INVOICE_TYPE,
  PAYMENT_CONDITION,
  statusDefaultKey,
  statusToSelectOptions,
} from "~/constants/status-options";
import { formatAmountWithSymbol } from "~/constants/currency-format";
import { moduleTableDef } from "~/data/system-modules";
import SettlementDialog from "./SettlementDialog";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Liquidaciones" },
    { name: "description", content: "Liquidaciones de transporte" },
  ];
}

type SettlementRow = Settlement & {
  entityDisplay: string;
  grossFormatted: string;
  periodLabel: string;
};

const TABLE_DEF = moduleTableDef("settlement", {
  type: SETTLEMENT_TYPE,
  category: SETTLEMENT_CATEGORY,
  status: SETTLEMENT_STATUS,
  paymentStatus: SETTLEMENT_PAYMENT_STATUS,
});

const SETTLEMENT_STATUS_OPTIONS = statusToSelectOptions(SETTLEMENT_STATUS);
const PAY_TERM_OPTIONS = statusToSelectOptions(PAYMENT_CONDITION);

export async function clientLoader() {
  const items = await getSettlements();
  return { items };
}

export default function SettlementsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<SettlementRow>>(null);

  const rows = useMemo<SettlementRow[]>(
    () =>
      loaderData.items.map((s) => ({
        ...s,
        entityDisplay: `${s.entity.name}`.trim(),
        periodLabel:
          (s.period.start?.trim() || s.period.end?.trim())
            ? buildSettlementPeriodLabel(s.period.start, s.period.end)
            : s.period.label || "",
        grossFormatted: formatAmountWithSymbol(s.totals.grossAmount, s.totals.currency),
      })),
    [loaderData.items]
  );

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/transport/settlements/add");
  const editMatch = useMatch("/transport/settlements/edit/:id");
  const editId = editMatch?.params.id ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<SettlementDocStatus>("draft");
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [statusChangeSaving, setStatusChangeSaving] = useState(false);

  // Serie para generar factura
  const [invoiceSeriesOpen, setInvoiceSeriesOpen] = useState(false);
  const [availableSequences, setAvailableSequences] = useState<DocumentSequenceRecord[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [selectedPayTerm, setSelectedPayTerm] = useState("transfer");
  const [pendingInvoiceSettlementId, setPendingInvoiceSettlementId] = useState<string | null>(null);

  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const handleGenerateInvoice = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (selected.length !== 1) return;
    const settlement = selected[0]!;
    if (settlement.status !== "closed") return;

    // Cargar series activas para el tipo de comprobante por defecto (invoice)
    setError(null);
    try {
      const defaultType = statusDefaultKey(INVOICE_TYPE);
      const seqs = await getActiveSequencesByDocumentType(defaultType);
      setAvailableSequences(seqs);
      setSelectedSequenceId(seqs[0]?.id ?? "");
      setSelectedPayTerm("transfer");
      setPendingInvoiceSettlementId(settlement.id);
      setInvoiceSeriesOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar series.");
    }
  };

  const handleConfirmGenerateInvoice = async () => {
    if (!pendingInvoiceSettlementId) return;
    setGeneratingInvoice(true);
    setError(null);
    try {
      const invoiceId = await createInvoiceFromSettlement(
        pendingInvoiceSettlementId,
        selectedSequenceId || undefined,
        selectedPayTerm
      );
      setInvoiceSeriesOpen(false);
      setPendingInvoiceSettlementId(null);
      navigate(`/billing/invoices/${encodeURIComponent(invoiceId)}/items`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar la factura.");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const canGenerateInvoice = useMemo(() => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    return selected.length === 1 && selected[0]?.status === "closed";
  }, [selectedCount]);

  const openAdd = () => navigate("/transport/settlements/add");
  const openEdit = (row: SettlementRow) =>
    navigate(`/transport/settlements/edit/${encodeURIComponent(row.id)}`);

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    setPendingDeleteIds(selected.map((r) => r.id));
  };

  const openBulkStatusChange = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    setBulkStatus(selected[0]!.status);
    setBulkIds(selected.map((r) => r.id));
    setStatusChangeOpen(true);
  };

  const closeBulkStatusChange = () => {
    if (!statusChangeSaving) setStatusChangeOpen(false);
  };

  const handleBulkStatusConfirm = async () => {
    if (!bulkIds.length) return;
    setStatusChangeSaving(true);
    setError(null);
    try {
      await updateSettlementsStatus(bulkIds, bulkStatus);
      tableRef.current?.clearSelectedRows();
      setSelectedCount(0);
      setBulkIds([]);
      setStatusChangeOpen(false);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el estado.");
    } finally {
      setStatusChangeSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      if (ids.length === 1) {
        await deleteSettlement(ids[0]!);
      } else {
        await deleteSettlements(ids);
      }
      tableRef.current?.clearSelectedRows();
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (!saving) setPendingDeleteIds(null);
  };

  const handleSuccess = () => {
    navigate("/transport/settlements");
    revalidator.revalidate();
  };
  const handleHide = () => navigate("/transport/settlements");

  return (
    <DpContent
      title="LIQUIDACIONES"
      breadcrumbItems={["TRANSPORTE", "LIQUIDACIONES"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por código, entidad..."
      >
        <DpContentHeaderAction>
          <Button
            type="button"
            size="small"
            icon="pi pi-flag"
            label="Cambiar estado"
            onClick={openBulkStatusChange}
            disabled={selectedCount === 0 || saving || statusChangeSaving}
            aria-label="Cambiar estado de las liquidaciones seleccionadas"
          />
          <Button
            type="button"
            size="small"
            icon="pi pi-file-plus"
            label="Generar factura"
            onClick={handleGenerateInvoice}
            disabled={!canGenerateInvoice || generatingInvoice || saving}
            aria-label="Generar factura desde liquidación seleccionada"
          />
        </DpContentHeaderAction>
      </DpContentHeader>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<SettlementRow>
        ref={tableRef}
        data={rows}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(r) => setSelectedCount(r.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay liquidaciones."
        emptyFilterMessage="No se encontraron liquidaciones."
      >
        <DpTColumn<SettlementRow> name="itemsLink">
          {(row) => (
            <button
              type="button"
              onClick={() =>
                navigate(`/transport/settlements/${encodeURIComponent(row.id)}/items`)
              }
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Ítems de liquidación"
              title="Ítems"
            >
              <i className="pi pi-list" />
            </button>
          )}
        </DpTColumn>
      </DpTable>

      {dialogVisible && (
        <SettlementDialog
          visible={dialogVisible}
          settlementId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpContentSet
        title="Seleccionar serie para la factura"
        variant="dialog"
        visible={invoiceSeriesOpen}
        onHide={() => { if (!generatingInvoice) { setInvoiceSeriesOpen(false); setPendingInvoiceSettlementId(null); } }}
        onCancel={() => { if (!generatingInvoice) { setInvoiceSeriesOpen(false); setPendingInvoiceSettlementId(null); } }}
        onSave={handleConfirmGenerateInvoice}
        saving={generatingInvoice}
        saveLabel="Generar factura"
        saveDisabled={!selectedSequenceId}
      >
        {availableSequences.length === 0 ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            No hay series activas para facturas. Configure una serie en Maestros → Secuencias de Documentos.
          </div>
        ) : (
          <DpInput
            type="select"
            label="Serie"
            value={selectedSequenceId}
            onChange={(v) => setSelectedSequenceId(String(v))}
            options={availableSequences.map((s) => ({ label: s.sequence, value: s.id }))}
          />
        )}
        <DpInput
          type="select"
          label="Condición de pago"
          value={selectedPayTerm}
          onChange={(v) => setSelectedPayTerm(String(v))}
          options={PAY_TERM_OPTIONS}
        />
      </DpContentSet>

      <DpContentSet
        title="Cambiar estado de liquidaciones"
        variant="dialog"
        visible={statusChangeOpen}
        onHide={closeBulkStatusChange}
        onCancel={closeBulkStatusChange}
        onSave={handleBulkStatusConfirm}
        saving={statusChangeSaving}
        saveLabel="Aplicar"
      >
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Se actualizará el estado de <strong>{bulkIds.length}</strong> liquidación(es) seleccionada(s).
        </p>
        <DpInput
          type="select"
          label="Nuevo estado"
          value={bulkStatus}
          onChange={(v) => setBulkStatus(String(v) as SettlementDocStatus)}
          options={SETTLEMENT_STATUS_OPTIONS}
        />
      </DpContentSet>

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar liquidaciones"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} liquidación(es) y sus ítems? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />
    </DpContent>
  );
}
