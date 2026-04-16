import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpContentSet } from "~/components/DpContent";
import { DpInput } from "~/components/DpInput";
import {
  INVOICE_TYPE,
  statusToSelectOptions,
  statusDefaultKey,
} from "~/constants/status-options";
import {
  getDocumentSequenceById,
  addDocumentSequence,
  updateDocumentSequence,
} from "~/features/master/document-sequences";

export interface DocumentSequenceDialogProps {
  visible: boolean;
  sequenceId: string | null;
  onSuccess: () => void;
  onHide: () => void;
}

const INVOICE_TYPE_OPTIONS = statusToSelectOptions(INVOICE_TYPE);
const DOCUMENT_TYPE_DEFAULT = statusDefaultKey(INVOICE_TYPE);

export default function DocumentSequenceDialog({
  visible,
  sequenceId,
  onSuccess,
  onHide,
}: DocumentSequenceDialogProps) {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [sequence, setSequence] = useState("");
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPE_DEFAULT);
  const [currentNumber, setCurrentNumber] = useState("1");
  const [maxNumber, setMaxNumber] = useState("99999999");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!sequenceId) {
      setSequence("");
      setDocumentType(DOCUMENT_TYPE_DEFAULT);
      setCurrentNumber("1");
      setMaxNumber("99999999");
      setActive(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    getDocumentSequenceById(sequenceId)
      .then((data) => {
        if (!data) {
          setError("Secuencia no encontrada.");
          return;
        }
        setSequence(data.sequence);
        setDocumentType(data.documentType);
        setCurrentNumber(String(data.currentNumber));
        setMaxNumber(String(data.maxNumber));
        setActive(data.active);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, sequenceId]);

  const currentNumberInt = Number(currentNumber);
  const maxNumberInt = Number(maxNumber);
  const valid =
    sequence.trim() !== "" &&
    currentNumberInt >= 1 &&
    maxNumberInt > currentNumberInt;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        sequence: sequence.trim(),
        documentType,
        currentNumber: currentNumberInt,
        maxNumber: maxNumberInt,
        active,
      };
      if (!sequenceId) {
        await addDocumentSequence(payload);
      } else {
        await updateDocumentSequence(sequenceId, payload);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={sequenceId ? "Editar Secuencia" : "Nueva Secuencia"}
      visible={visible}
      onHide={onHide}
      onCancel={onHide}
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || saving}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpInput
          type="input"
          label="Serie"
          name="sequence"
          value={sequence}
          onChange={setSequence}
          placeholder="F001"
        />
        <DpInput
          type="select"
          label="Tipo de Comprobante"
          name="documentType"
          value={documentType}
          onChange={(v) => setDocumentType(String(v))}
          options={INVOICE_TYPE_OPTIONS}
        />
        <DpInput
          type="number"
          label="Número Actual"
          name="currentNumber"
          value={currentNumber}
          onChange={setCurrentNumber}
        />
        <DpInput
          type="number"
          label="Número Máximo"
          name="maxNumber"
          value={maxNumber}
          onChange={setMaxNumber}
        />
        <DpInput
          type="check"
          label="Activo"
          name="active"
          value={active}
          onChange={setActive}
        />
      </div>
    </DpContentSet>
  );
}
