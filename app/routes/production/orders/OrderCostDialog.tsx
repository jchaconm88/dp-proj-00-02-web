import { useEffect, useState } from "react";
import { useNavigation } from "react-router";
import { DpInput, DpContentSet } from "~/components/ui";
import { addOrderCost, updateOrderCost, getOrderCostById } from "~/features/production";
import { statusToSelectOptions } from "~/constants/status-options";

const COST_TYPE_OPTIONS = statusToSelectOptions({
  direct_labor: { label: "Mano de obra directa", severity: "info" },
  indirect: { label: "Costo indirecto", severity: "warning" },
});

const ALLOCATION_METHOD_OPTIONS = statusToSelectOptions({
  percentage: { label: "Porcentaje", severity: "info" },
  fixed: { label: "Monto fijo", severity: "success" },
  proration: { label: "Prorrateo", severity: "warning" },
});

export interface OrderCostDialogProps {
  visible: boolean;
  orderId: string;
  costId: string | null;
  onSuccess: () => void;
  onHide: () => void;
}

export default function OrderCostDialog({ visible, orderId, costId, onSuccess, onHide }: OrderCostDialogProps) {
  const isEdit = !!costId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [costType, setCostType] = useState("direct_labor");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [allocationMethod, setAllocationMethod] = useState("");
  const [percentage, setPercentage] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [totalAmountForProration, setTotalAmountForProration] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = !!costType && !!concept && !!amount && Number(amount) >= 0;

  const loadCost = async () => {
    if (!costId) return;
    setLoading(true);
    try {
      const c = await getOrderCostById(orderId, costId);
      if (c) {
        setCostType(c.type);
        setConcept(c.concept);
        setAmount(String(c.amount));
        setHours(c.hours !== null ? String(c.hours) : "");
        setHourlyRate(c.hourlyRate !== null ? String(c.hourlyRate) : "");
        setAllocationMethod(c.allocationMethod ?? "");
        setPercentage(c.percentage !== null ? String(c.percentage) : "");
        setFixedAmount(c.fixedAmount !== null ? String(c.fixedAmount) : "");
        setTotalAmountForProration(c.totalAmountForProration !== null ? String(c.totalAmountForProration) : "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar costo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!costId) {
      setCostType("direct_labor");
      setConcept("");
      setAmount("");
      setHours("");
      setHourlyRate("");
      setAllocationMethod("");
      setPercentage("");
      setFixedAmount("");
      setTotalAmountForProration("");
      setLoading(false);
      return;
    }
    void loadCost();
  }, [visible, costId, orderId]);

  const handleHide = () => {
    if (!saving && !isNavigating) onHide();
  };

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      if (isEdit && costId) {
        await updateOrderCost(orderId, costId, {
          concept,
          amount: Number(amount),
          hours: hours ? Number(hours) : undefined,
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
          allocationMethod: allocationMethod ? (allocationMethod as any) : undefined,
          percentage: percentage ? Number(percentage) : undefined,
          fixedAmount: fixedAmount ? Number(fixedAmount) : undefined,
          totalAmountForProration: totalAmountForProration ? Number(totalAmountForProration) : undefined,
        });
      } else {
        await addOrderCost(orderId, {
          type: costType as "direct_labor" | "indirect",
          concept,
          amount: Number(amount),
          hours: hours ? Number(hours) : undefined,
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
          allocationMethod: allocationMethod ? (allocationMethod as any) : undefined,
          percentage: percentage ? Number(percentage) : undefined,
          fixedAmount: fixedAmount ? Number(fixedAmount) : undefined,
          totalAmountForProration: totalAmountForProration ? Number(totalAmountForProration) : undefined,
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
      title={isEdit ? "Editar Costo" : "Nuevo Costo"}
      recordId={isEdit ? costId : null}
      cancelLabel="Cancelar"
      onCancel={handleHide}
      saveLabel={isEdit ? "Guardar" : "Crear"}
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={handleHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <DpInput type="select" label="Tipo de costo *" name="costType" value={costType} onChange={(v) => setCostType(String(v))} options={COST_TYPE_OPTIONS} />
      <DpInput type="input" label="Concepto *" name="concept" value={concept} onChange={(v) => setConcept(String(v))} />
      <DpInput type="input" label="Monto *" name="amount" value={amount} onChange={(v) => setAmount(String(v))} />
      {costType === "direct_labor" && (
        <>
          <DpInput type="input" label="Horas" name="hours" value={hours} onChange={(v) => setHours(String(v))} />
          <DpInput type="input" label="Tarifa por hora" name="hourlyRate" value={hourlyRate} onChange={(v) => setHourlyRate(String(v))} />
        </>
      )}
      {costType === "indirect" && (
        <>
          <DpInput type="select" label="Método de asignación" name="allocationMethod" value={allocationMethod} onChange={(v) => setAllocationMethod(String(v))} options={ALLOCATION_METHOD_OPTIONS} />
          {allocationMethod === "percentage" && <DpInput type="input" label="Porcentaje" name="percentage" value={percentage} onChange={(v) => setPercentage(String(v))} />}
          {allocationMethod === "fixed" && <DpInput type="input" label="Monto fijo" name="fixedAmount" value={fixedAmount} onChange={(v) => setFixedAmount(String(v))} />}
          {allocationMethod === "proration" && <DpInput type="input" label="Total para prorrateo" name="totalAmountForProration" value={totalAmountForProration} onChange={(v) => setTotalAmountForProration(String(v))} />}
        </>
      )}
    </DpContentSet>
  );
}
