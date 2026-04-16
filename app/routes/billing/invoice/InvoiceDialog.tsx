import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import { getInvoiceById, addInvoice, updateInvoice } from "~/features/billing/invoice";
import { getActiveSequencesByDocumentType, generateDocumentNo } from "~/features/master/document-sequences";
import type { DocumentSequenceRecord } from "~/features/master/document-sequences";
import {
  INVOICE_STATUS,
  INVOICE_TYPE,
  PAYMENT_CONDITION,
  CURRENCY,
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

const emptyClient = {
  id: "",
  name: "",
  businessName: "",
  identityDocumentNo: "",
  phoneNumber: "",
  emailAddress: "",
  homeAddress: "",
};

const emptyCompany = {
  id: "",
  name: "",
  businessName: "",
  identityDocumentNo: "",
  emailAddress: "",
  logoUrl: "",
};

const emptyCompanyLocation = {
  name: "",
  description: "",
  ubigeo: "",
  city: "",
  country: "",
  district: "",
  address: "",
};

export default function InvoiceDialog({
  visible,
  invoiceId,
  onSuccess,
  onHide,
}: InvoiceDialogProps) {
  const isEdit = !!invoiceId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [documentNo, setDocumentNo] = useState("");  const [type, setType] = useState<InvoiceType>(statusDefaultKey(INVOICE_TYPE));
  const [status, setStatus] = useState<InvoiceStatus>(statusDefaultKey(INVOICE_STATUS));
  const [payTerm, setPayTerm] = useState("transfer");
  const [currency, setCurrency] = useState("PEN");
  const [issueDate, setIssueDate] = useState("");
  const [comment, setComment] = useState("");

  const [activeSequence, setActiveSequence] = useState<DocumentSequenceRecord | null>(null);
  const [availableSequences, setAvailableSequences] = useState<DocumentSequenceRecord[]>([]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!invoiceId) {
      setDocumentNo("");
      setType(statusDefaultKey(INVOICE_TYPE));
      setStatus(statusDefaultKey(INVOICE_STATUS));
      setPayTerm("transfer");
      setCurrency("PEN");
      setIssueDate("");
      setComment("");
      setLoading(false);
      // Load active sequences for the default type
      getActiveSequencesByDocumentType(statusDefaultKey(INVOICE_TYPE))
        .then((seqs) => {
          setAvailableSequences(seqs);
          setActiveSequence(seqs[0] ?? null);
        })
        .catch(() => { setAvailableSequences([]); setActiveSequence(null); });
      return;
    }

    setLoading(true);
    getInvoiceById(invoiceId)
      .then((data) => {
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
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, invoiceId]);

  const valid =
    issueDate.trim() !== "" &&
    currency !== "" &&
    type !== "" &&
    payTerm !== "" &&
    (isEdit || activeSequence !== null);

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
    setSaving(true);
    setError(null);
    try {
      if (invoiceId) {
        // Edición: preservar documentNo existente
        await updateInvoice(invoiceId, {
          documentNo,
          type,
          status,
          payTerm,
          currency,
          issueDate,
          comment,
        });
        onSuccess?.();
      } else {
        // Creación: generar documentNo desde la serie seleccionada
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
          client: emptyClient,
          company: emptyCompany,
          companyLocation: emptyCompanyLocation,
          totalPrice: 0,
          totalTax: 0,
          totalAmount: 0,
          zipUrl: "",
          cdrUrl: "",
          pdfUrl: "",
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
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        {/* Código y Nº Documento se generan automáticamente desde la serie al guardar */}
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
          label="Tipo"
          name="type"
          value={type}
          onChange={(v) => handleTypeChange(String(v))}
          options={TYPE_OPTIONS}
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
          options={CURRENCY_OPTIONS}
        />
        <DpInput
          type="date"
          label="Fecha de emisión"
          name="issueDate"
          value={issueDate}
          onChange={setIssueDate}
        />
        <DpInput
          type="input"
          label="Comentario"
          name="comment"
          value={comment}
          onChange={setComment}
        />
      </div>
    </DpContentSet>
  );
}
