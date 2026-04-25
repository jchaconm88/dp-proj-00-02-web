import { useState, useEffect, useMemo } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import { getInvoiceById, addInvoice, updateInvoice } from "~/features/billing/invoice";
import { getActiveSequencesByDocumentType, generateDocumentNo } from "~/features/master/document-sequences";
import type { DocumentSequenceRecord } from "~/features/master/document-sequences";
import { getClients, getClient, getClientLocations } from "~/features/master/clients";
import { getCompanyById } from "~/features/system/companies";
import { getActiveCompanyLocations, getCompanyLocation } from "~/features/system/company-locations";
import { getActiveCompanyId, requireActiveCompanyId } from "~/lib/tenant";
import {
  clientRecordToInvoiceClient,
  clientLocationToHomeAddress,
  companyRecordToInvoiceCompany,
  companyLocationRecordToInvoiceLocation,
  matchCompanyLocationId,
} from "~/features/billing/invoice";
import {
  INVOICE_STATUS,
  INVOICE_TYPE,
  PAYMENT_CONDITION,
  CURRENCY,
  OPERATION_TYPE_CODE,
  statusDefaultKey,
  statusToSelectOptions,
} from "~/constants/status-options";
import type { InvoiceStatus, InvoiceType } from "~/features/billing/invoice";

export interface InvoiceDialogProps {
  visible: boolean;
  invoiceId: string | null;
  onSuccess?: (createdId?: string) => void;
  onHide: () => void;
}

const TYPE_OPTIONS = statusToSelectOptions(INVOICE_TYPE);
const STATUS_OPTIONS = statusToSelectOptions(INVOICE_STATUS);
const PAY_TERM_OPTIONS = statusToSelectOptions(PAYMENT_CONDITION);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);
const OPERATION_TYPE_OPTIONS = statusToSelectOptions(OPERATION_TYPE_CODE);

export default function InvoiceDialog({
  visible,
  invoiceId,
  onSuccess,
  onHide,
}: InvoiceDialogProps) {
  const isEdit = !!invoiceId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [documentNo, setDocumentNo] = useState("");
  const [type, setType] = useState<InvoiceType>(statusDefaultKey(INVOICE_TYPE));
  const [status, setStatus] = useState<InvoiceStatus>(statusDefaultKey(INVOICE_STATUS));
  const [payTerm, setPayTerm] = useState("transfer");
  const [currency, setCurrency] = useState("PEN");
  const [issueDate, setIssueDate] = useState("");
  const [comment, setComment] = useState("");
  const [operationTypeCode, setOperationTypeCode] = useState(statusDefaultKey(OPERATION_TYPE_CODE));
  const [dueDate, setDueDate] = useState("");
  const [settlementId, setSettlementId] = useState("");
  const [settlement, setSettlement] = useState("");

  const [clientId, setClientId] = useState("");
  const [companyLocationId, setCompanyLocationId] = useState("");

  const [clientOptions, setClientOptions] = useState<{ label: string; value: string }[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ label: string; value: string }[]>([]);

  const [activeSequence, setActiveSequence] = useState<DocumentSequenceRecord | null>(null);
  const [availableSequences, setAvailableSequences] = useState<DocumentSequenceRecord[]>([]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueBlockReason, setIssueBlockReason] = useState("");

  const companyId = useMemo(() => getActiveCompanyId() ?? "", []);

  useEffect(() => {
    if (!visible || !companyId) return;
    let cancelled = false;
    getClients()
      .then(({ items }) => {
        if (cancelled) return;
        setClientOptions(
          items.map((c) => ({
            label: `${c.businessName || c.code}${c.code ? ` · ${c.code}` : ""}`,
            value: c.id,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setClientOptions([]);
      });

    getActiveCompanyLocations()
      .then(({ items }) => {
        if (cancelled) return;
        const activeLocs = items.filter((l) => l.active);
        setLocationOptions(
          activeLocs.map((l) => ({
            label: `${l.name}${l.address ? ` — ${l.address}` : ""}`,
            value: l.id,
          }))
        );
        if (!isEdit && activeLocs.length) {
          setCompanyLocationId((prev) => prev || activeLocs[0]!.id);
        }
      })
      .catch(() => {
        if (!cancelled) setLocationOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, companyId, isEdit]);

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!invoiceId) {
      const now = new Date();
      const defaultIssueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(
        now.getHours()
      ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setDocumentNo("");
      setType(statusDefaultKey(INVOICE_TYPE));
      setStatus(statusDefaultKey(INVOICE_STATUS));
      setPayTerm("transfer");
      setCurrency("PEN");
      setIssueDate(defaultIssueDate);
      setComment("");
      setOperationTypeCode(statusDefaultKey(OPERATION_TYPE_CODE));
      setDueDate("");
      setSettlementId("");
      setSettlement("");
      setClientId("");
      setCompanyLocationId("");
      setIssueBlockReason("");
      setLoading(false);
      getActiveSequencesByDocumentType(statusDefaultKey(INVOICE_TYPE))
        .then((seqs) => {
          setAvailableSequences(seqs);
          setActiveSequence(seqs[0] ?? null);
        })
        .catch(() => {
          setAvailableSequences([]);
          setActiveSequence(null);
        });
      return;
    }

    setLoading(true);
    getInvoiceById(invoiceId)
      .then(async (data) => {
        if (!data) {
          setError("Factura no encontrada.");
          return;
        }
        setDocumentNo(data.documentNo ?? "");
        setType(data.type ?? statusDefaultKey(INVOICE_TYPE));
        setStatus(data.status ?? statusDefaultKey(INVOICE_STATUS));
        setPayTerm(data.payTerm ?? "transfer");
        setCurrency(data.currency ?? "PEN");
        setIssueDate(data.issueDate ?? "");
        setComment(data.comment ?? "");
        setOperationTypeCode(data.operationTypeCode ?? statusDefaultKey(OPERATION_TYPE_CODE));
        setDueDate(data.dueDate ?? "");
        setSettlementId(data.settlementId ?? "");
        setSettlement(data.settlement ?? "");
        setClientId(data.client.id ?? "");
        setIssueBlockReason(data.issueBlockReason?.trim() ?? "");

        const { items: locs } = await getActiveCompanyLocations();
        const matched = matchCompanyLocationId(data.companyLocation, locs);
        setCompanyLocationId(matched);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, invoiceId]);

  const valid =
    issueDate.trim() !== "" &&
    currency !== "" &&
    type !== "" &&
    payTerm !== "" &&
    clientId.trim() !== "" &&
    companyLocationId.trim() !== "" &&
    (isEdit || activeSequence !== null);

  const lockedByStatus = isEdit && status !== "draft";

  const handleTypeChange = (newType: string) => {
    setType(newType as InvoiceType);
    if (!invoiceId) {
      getActiveSequencesByDocumentType(newType)
        .then((seqs) => {
          setAvailableSequences(seqs);
          setActiveSequence(seqs[0] ?? null);
        })
        .catch((err) => {
          setAvailableSequences([]);
          setActiveSequence(null);
          setError(err instanceof Error ? err.message : "Error al cargar secuencias.");
        });
    }
  };

  const save = async () => {
    if (!valid) return;
    if (lockedByStatus) {
      setError("Solo se puede editar una factura en estado Borrador.");
      return;
    }
    let cid: string;
    try {
      cid = requireActiveCompanyId();
    } catch {
      setError("No hay empresa activa.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const [client, loc, company] = await Promise.all([
        getClient(clientId),
        getCompanyLocation(cid, companyLocationId),
        getCompanyById(cid),
      ]);
      if (!client) {
        setError("Cliente no encontrado.");
        setSaving(false);
        return;
      }
      if (!loc) {
        setError("Sede de empresa no encontrada.");
        setSaving(false);
        return;
      }
      if (!company) {
        setError("Empresa no encontrada.");
        setSaving(false);
        return;
      }

      const { items: clLocs } = await getClientLocations(clientId);
      const firstLoc = clLocs.find((l) => l.active) ?? clLocs[0];
      const homeExtra = firstLoc ? clientLocationToHomeAddress(firstLoc) : undefined;
      const invoiceClient = clientRecordToInvoiceClient(client, homeExtra);

      const invoiceCompany = companyRecordToInvoiceCompany(company);
      const invoiceLocation = companyLocationRecordToInvoiceLocation(loc);

      if (invoiceId) {
        await updateInvoice(invoiceId, {
          documentNo,
          type,
          status,
          payTerm,
          currency,
          issueDate,
          comment,
          operationTypeCode,
          dueDate: dueDate || undefined,
          settlementId,
          settlement,
          client: invoiceClient,
          company: invoiceCompany,
          companyLocation: invoiceLocation,
        });
        onSuccess?.();
      } else {
        const result = await generateDocumentNo(activeSequence!.id);
        const newId = await addInvoice({
          documentNo: result.documentNo,
          type,
          status,
          payTerm,
          currency,
          issueDate,
          comment,
          settlementId: "",
          settlement: "",
          client: invoiceClient,
          company: invoiceCompany,
          companyLocation: invoiceLocation,
          totalPrice: 0,
          totalTax: 0,
          totalAmount: 0,
          zipUrl: "",
          cdrUrl: "",
          pdfUrl: "",
          operationTypeCode,
          dueDate: dueDate || undefined,
        });
        onSuccess?.(newId);
      }
      if (!onSuccess) {
        onHide();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={isEdit ? "Editar factura" : "Agregar factura"}
      recordId={isEdit ? invoiceId : null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating || lockedByStatus}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
      dialogBodyHeader={
        lockedByStatus || issueBlockReason ? (
          <div className="flex flex-col gap-3 pb-3">
            {lockedByStatus && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Esta factura no está en <strong>Borrador</strong> y no se puede editar.
              </div>
            )}
            {issueBlockReason && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <strong>Bloqueo de emisión:</strong> {issueBlockReason}
              </div>
            )}
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        {isEdit && (
          <DpInput
            type="input"
            label="Nº Documento"
            name="documentNo"
            value={documentNo}
            onChange={setDocumentNo}
            disabled
          />
        )}
        <DpInput
          type="select"
          label="Cliente"
          name="clientId"
          value={clientId}
          onChange={(v) => setClientId(String(v))}
          options={[{ label: "— Seleccione cliente —", value: "" }, ...clientOptions]}
          placeholder="Cliente"
          filter
          disabled={lockedByStatus}
        />
        <DpInput
          type="select"
          label="Sede emisora"
          name="companyLocationId"
          value={companyLocationId}
          onChange={(v) => setCompanyLocationId(String(v))}
          options={[{ label: "— Seleccione sede —", value: "" }, ...locationOptions]}
          placeholder="Sede"
          filter
          disabled={lockedByStatus}
        />
        {!isEdit && locationOptions.length === 0 && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            No hay sedes de empresa. Cree al menos una en Sistema → Empresas → Sedes.
          </div>
        )}
        <DpInput
          type="select"
          label="Tipo"
          name="type"
          value={type}
          onChange={(v) => handleTypeChange(String(v))}
          options={TYPE_OPTIONS}
          disabled={lockedByStatus}
        />
        {!isEdit && availableSequences.length > 0 && (
          <DpInput
            type="select"
            label="Serie"
            name="sequenceId"
            value={activeSequence?.id ?? ""}
            onChange={(v) => {
              const seq = availableSequences.find((s) => s.id === String(v)) ?? null;
              setActiveSequence(seq);
            }}
            options={availableSequences.map((s) => ({ label: s.sequence, value: s.id }))}
          />
        )}
        {!isEdit && availableSequences.length === 0 && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            No hay series activas para este tipo de comprobante. Configure una serie antes de crear la factura.
          </div>
        )}
        <DpInput
          type="select"
          label="Estado"
          name="status"
          value={status}
          onChange={(v) => setStatus(v as InvoiceStatus)}
          options={STATUS_OPTIONS}
          disabled={lockedByStatus}
        />
        <DpInput
          type="select"
          label="Condición de pago"
          name="payTerm"
          value={payTerm}
          onChange={(v) => setPayTerm(String(v))}
          options={PAY_TERM_OPTIONS}
          disabled={lockedByStatus}
        />
        <DpInput
          type="select"
          label="Moneda"
          name="currency"
          value={currency}
          onChange={(v) => setCurrency(String(v))}
          options={CURRENCY_OPTIONS}
          disabled={lockedByStatus}
        />
        <DpInput
          type="datetime"
          label="Fecha de emisión"
          name="issueDate"
          value={issueDate}
          onChange={setIssueDate}
          disabled={lockedByStatus}
        />
        <DpInput
          type="input"
          label="Comentario"
          name="comment"
          value={comment}
          onChange={setComment}
          disabled={lockedByStatus}
        />
        <DpInput
          type="select"
          label="Tipo de operación"
          name="operationTypeCode"
          value={operationTypeCode}
          onChange={(v) => setOperationTypeCode(String(v))}
          options={OPERATION_TYPE_OPTIONS}
          disabled={lockedByStatus}
        />
        <DpInput
          type="date"
          label="Fecha de vencimiento"
          name="dueDate"
          value={dueDate}
          onChange={setDueDate}
          disabled={lockedByStatus}
        />
        {isEdit && (settlementId || settlement) && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <DpInput type="input" label="Liquidación (código)" name="settlement" value={settlement} onChange={setSettlement} disabled />
            <DpInput type="input" label="Liquidación (ID)" name="settlementId" value={settlementId} onChange={setSettlementId} disabled />
          </div>
        )}
      </div>
    </DpContentSet>
  );
}
