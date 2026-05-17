import { useEffect, useState } from "react";
import { useNavigation } from "react-router";
import { DpInput, DpContentSet } from "~/components/ui";
import { updateOrderResult, getOrderResultById } from "~/features/production";

export interface OrderResultDialogProps {
  visible: boolean;
  orderId: string;
  resultId: string | null;
  onSuccess: () => void;
  onHide: () => void;
}

export default function OrderResultDialog({ visible, orderId, resultId, onSuccess, onHide }: OrderResultDialogProps) {
  const isEdit = !!resultId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [actualQuantity, setActualQuantity] = useState("");
  const [monetaryValue, setMonetaryValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const valid = !!actualQuantity && Number(actualQuantity) >= 0;

  const loadResult = async () => {
    if (!resultId) return;
    setLoading(true);
    try {
      const res = await getOrderResultById(orderId, resultId);
      if (res) {
        setActualQuantity(String(res.actualQuantity));
        setMonetaryValue(res.monetaryValue ? String(res.monetaryValue) : "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar resultado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);
    if (!resultId) {
      setActualQuantity("");
      setMonetaryValue("");
      setLoading(false);
      return;
    }
    void loadResult();
  }, [visible, resultId, orderId]);

  const handleHide = () => {
    if (!saving && !isNavigating) onHide();
  };

  const save = async () => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit && resultId) {
        await updateOrderResult(orderId, resultId, {
          actualQuantity: Number(actualQuantity),
          monetaryValue: monetaryValue ? Number(monetaryValue) : undefined,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title="Registrar cantidad real"
      recordId={isEdit ? resultId : null}
      cancelLabel="Cancelar"
      onCancel={handleHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={handleHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <DpInput type="input" label="Cantidad real *" name="actualQuantity" value={actualQuantity} onChange={(v) => setActualQuantity(String(v))} />
      <DpInput type="input" label="Valor monetario" name="monetaryValue" value={monetaryValue} onChange={(v) => setMonetaryValue(String(v))} />
    </DpContentSet>
  );
}
