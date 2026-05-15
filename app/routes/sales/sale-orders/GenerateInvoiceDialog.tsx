import { useState, useEffect, useMemo } from "react";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import { getActiveSequencesByDocumentType } from "~/features/master/document-sequences";
import type { DocumentSequenceRecord } from "~/features/master/document-sequences";
import { getActiveCompanyLocations } from "~/features/system/company-locations";
import { getActiveCompanyCurrencyOptions } from "~/features/system/companies";
import { getActiveCompanyId } from "~/lib/tenant";
import {
  INVOICE_TYPE,
  PAYMENT_CONDITION,
  statusDefaultKey,
  statusToSelectOptions,
} from "~/constants/status-options";
import type { InvoiceType } from "~/features/billing/invoice";

export interface GenerateInvoiceDialogProps {
  visible: boolean;
  orderCurrency: string;
  onConfirm: (data: {
    type: string;
    sequenceId: string;
    companyLocationId: string;
    payTerm: string;
    currency: string;
    issueDate: string;
  }) => void;
  onHide: () => void;
  saving?: boolean;
}

const TYPE_OPTIONS = statusToSelectOptions(INVOICE_TYPE).filter(
  (o) => o.value === "invoice" || o.value === "credit_note"
);
const PAY_TERM_OPTIONS = statusToSelectOptions(PAYMENT_CONDITION);

export default function GenerateInvoiceDialog({
  visible,
  orderCurrency,
  onConfirm,
  onHide,
  saving = false,
}: GenerateInvoiceDialogProps) {
  const [type, setType] = useState<InvoiceType>(statusDefaultKey(INVOICE_TYPE));
  const [payTerm, setPayTerm] = useState("transfer");
  const [currency, setCurrency] = useState(orderCurrency || "PEN");
  const [issueDate, setIssueDate] = useState("");
  const [companyLocationId, setCompanyLocationId] = useState("");

  const [activeSequence, setActiveSequence] = useState<DocumentSequenceRecord | null>(null);
  const [availableSequences, setAvailableSequences] = useState<DocumentSequenceRecord[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ label: string; value: string }[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<{ label: string; value: string }[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId = useMemo(() => getActiveCompanyId() ?? "", []);

  // Load company locations
  useEffect(() => {
    if (!visible || !companyId) return;
    let cancelled = false;

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
        if (activeLocs.length) {
          setCompanyLocationId((prev) => prev || activeLocs[0]!.id);
        }
      })
      .catch(() => {
        if (!cancelled) setLocationOptions([]);
      });

    return () => { cancelled = true; };
  }, [visible, companyId]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getActiveCompanyCurrencyOptions()
      .then(({ options, defaultCurrency }) => {
        if (cancelled) return;
        const mapped = options.map((opt) => ({ label: opt.label, value: opt.value }));
        setCurrencyOptions(mapped);
        setCurrency((prev) => (mapped.some((x) => x.value === prev) ? prev : defaultCurrency));
      })
      .catch((err) => {
        if (cancelled) return;
        setCurrencyOptions([]);
        setError(err instanceof Error ? err.message : "No se pudo cargar la configuración de monedas.");
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Reset form on open
  useEffect(() => {
    if (!visible) return;
    setError(null);
    const now = new Date();
    const defaultIssueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setType(statusDefaultKey(INVOICE_TYPE));
    setPayTerm("transfer");
    setCurrency(orderCurrency || "PEN");
    setIssueDate(defaultIssueDate);
    setCompanyLocationId("");

    // Load sequences for default type
    setLoading(true);
    getActiveSequencesByDocumentType(statusDefaultKey(INVOICE_TYPE))
      .then((seqs) => {
        setAvailableSequences(seqs);
        setActiveSequence(seqs[0] ?? null);
      })
      .catch(() => {
        setAvailableSequences([]);
        setActiveSequence(null);
      })
      .finally(() => setLoading(false));
  }, [visible, orderCurrency]);

  const handleTypeChange = (newType: string) => {
    setType(newType as InvoiceType);
    setLoading(true);
    getActiveSequencesByDocumentType(newType)
      .then((seqs) => {
        setAvailableSequences(seqs);
        setActiveSequence(seqs[0] ?? null);
      })
      .catch(() => {
        setAvailableSequences([]);
        setActiveSequence(null);
        setError("Error al cargar secuencias.");
      })
      .finally(() => setLoading(false));
  };

  const valid =
    type !== "" &&
    activeSequence !== null &&
    companyLocationId.trim() !== "" &&
    payTerm !== "" &&
    currency !== "" &&
    issueDate.trim() !== "";

  const handleSave = () => {
    if (!valid || !activeSequence) return;
    onConfirm({
      type,
      sequenceId: activeSequence.id,
      companyLocationId,
      payTerm,
      currency,
      issueDate,
    });
  };

  return (
    <DpContentSet
      title="Generar Comprobante"
      recordId={null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Generar"
      onSave={handleSave}
      saving={saving}
      saveDisabled={!valid || saving || loading}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpInput
          type="select"
          label="Tipo de comprobante"
          name="type"
          value={type}
          onChange={(v) => handleTypeChange(String(v))}
          options={TYPE_OPTIONS}
        />
        {availableSequences.length > 0 && (
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
        {availableSequences.length === 0 && !loading && (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            No hay series activas para este tipo de comprobante. Configure una serie antes de generar.
          </div>
        )}
        <DpInput
          type="select"
          label="Sede emisora"
          name="companyLocationId"
          value={companyLocationId}
          onChange={(v) => setCompanyLocationId(String(v))}
          options={[{ label: "— Seleccione sede —", value: "" }, ...locationOptions]}
          placeholder="Sede"
          filter
        />
        <DpInput
          type="select"
          label="Condición de pago"
          name="payTerm"
          value={payTerm}
          onChange={(v) => setPayTerm(String(v))}
          options={PAY_TERM_OPTIONS}
        />
        <DpInput
          type="select"
          label="Moneda"
          name="currency"
          value={currency}
          onChange={(v) => setCurrency(String(v))}
          options={currencyOptions}
        />
        <DpInput
          type="datetime"
          label="Fecha de emisión"
          name="issueDate"
          value={issueDate}
          onChange={setIssueDate}
        />
      </div>
    </DpContentSet>
  );
}
