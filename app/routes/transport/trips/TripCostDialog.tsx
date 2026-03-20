import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { generateSequenceCode } from "~/features/system/sequences";
import { getTripAssignments, getTripAssignmentById } from "~/features/transport/trip-assignments";
import {
  getTripCostById,
  getTripCosts,
  addTripCost,
  updateTripCost,
  getTripCostByAssignment,
  type TripCostEntity,
  type TripCostType,
  type TripCostSource,
  type TripCostStatus,
} from "~/features/transport/trip-costs";
import {
  TRIP_COST_TYPE,
  TRIP_COST_SOURCE,
  TRIP_COST_STATUS,
  CURRENCY,
  statusToSelectOptions,
} from "~/constants/status-options";

export interface TripCostDialogProps {
  visible: boolean;
  tripId: string;
  costId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const TYPE_OPTIONS = statusToSelectOptions(TRIP_COST_TYPE);
const SOURCE_OPTIONS = statusToSelectOptions(TRIP_COST_SOURCE);
const STATUS_OPTIONS = statusToSelectOptions(TRIP_COST_STATUS);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);

function formatAmountForDisplay(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

function isAssignmentPaymentType(t: TripCostType): boolean {
  return t === "employee_payment" || t === "resource_payment";
}

export default function TripCostDialog({
  visible,
  tripId,
  costId,
  onSuccess,
  onHide,
}: TripCostDialogProps) {
  const isEdit = !!costId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [entity, setEntity] = useState<TripCostEntity>("assignment");
  const [entityId, setEntityId] = useState("");
  const [type, setType] = useState<TripCostType>("employee_payment");
  const [source, setSource] = useState<TripCostSource>("manual");
  const [amount, setAmount] = useState("");
  const [amountPrecise, setAmountPrecise] = useState<number | null>(null);
  const [currency, setCurrency] = useState("PEN");
  const [status, setStatus] = useState<TripCostStatus>("open");
  const [settlementId, setSettlementId] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAssignmentCost, setLoadingAssignmentCost] = useState(false);
  const [initialAssignmentsPending, setInitialAssignmentsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assignmentId, setAssignmentId] = useState("");
  const [assignmentOptions, setAssignmentOptions] = useState<{ label: string; value: string }[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const isEmployeePayment = type === "employee_payment";
  const isResourcePayment = type === "resource_payment";
  const needsAssignmentSelect = isAssignmentPaymentType(type);
  const assignmentEntityType = isEmployeePayment ? "employee" : isResourcePayment ? "resource" : null;

  const handleTypeChange = (v: TripCostType) => {
    const wasAssign = isAssignmentPaymentType(type);
    const nowAssign = isAssignmentPaymentType(v);
    const switchedEmployeeResource =
      wasAssign &&
      nowAssign &&
      ((type === "employee_payment" && v === "resource_payment") ||
        (type === "resource_payment" && v === "employee_payment"));

    setType(v);
    if (nowAssign) {
      setEntity("assignment");
      setSource("salary_rule");
      if (!wasAssign || switchedEmployeeResource) {
        setAssignmentId("");
        setEntityId("");
      }
      setDisplayName("");
      setAmount("");
      setAmountPrecise(null);
    } else {
      setEntity("company");
      setSource("manual");
      setAssignmentId("");
      setDisplayName("");
      setAmount("");
      setAmountPrecise(null);
      setCurrency("PEN");
      if (wasAssign || !entityId.trim()) {
        setEntityId(crypto.randomUUID());
      }
    }
  };

  const handleSourceChange = (v: TripCostSource) => {
    const next = v;
    setSource(next);
    if (needsAssignmentSelect && next === "manual") {
      setAmount("0");
      setAmountPrecise(0);
    }
    // manual → salary_rule: el efecto de getTripCostByAssignment recalcula monto
  };

  useEffect(() => {
    if (!visible) return;
    setInitialAssignmentsPending(true);
    setError(null);
    if (!costId) {
      setCode("");
      setDisplayName("");
      setEntity("assignment");
      setEntityId("");
      setType("employee_payment");
      setSource("salary_rule");
      setAmount("");
      setAmountPrecise(null);
      setCurrency("PEN");
      setStatus("open");
      setSettlementId("");
      setLoading(false);
      setAssignmentId("");
      setAssignmentOptions([]);
      setAssignmentsLoading(false);
      return;
    }
    setLoading(true);
    getTripCostById(costId)
      .then((data) => {
        if (!data) {
          setError("Costo no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        const fromDoc = String(data.displayName ?? "").trim();
        setDisplayName(fromDoc);
        const loadedType = (data.type ?? "employee_payment") as TripCostType;
        setEntity(isAssignmentPaymentType(loadedType) ? "assignment" : "company");
        setEntityId(data.entityId ?? "");
        setType(loadedType);
        setSource(
          isAssignmentPaymentType(loadedType) ? (data.source === "manual" ? "manual" : "salary_rule") : "manual"
        );
        const loadedAmount = Number(data.amount);
        if (Number.isFinite(loadedAmount)) {
          setAmountPrecise(loadedAmount);
          setAmount(formatAmountForDisplay(loadedAmount));
        } else {
          setAmountPrecise(null);
          setAmount("");
        }
        setCurrency(data.currency ?? "PEN");
        setStatus(data.status ?? "open");
        setSettlementId(data.settlementId ?? "");
        if (isAssignmentPaymentType(loadedType)) {
          setAssignmentId(String(data.entityId ?? ""));
        } else {
          setAssignmentId("");
        }

        // displayName: efecto según assignmentId (pagos a asignación) o vacío (empresa).
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, costId]);

  // displayName interno desde la asignación elegida (no visible en UI).
  useEffect(() => {
    if (!visible) return;
    if (!needsAssignmentSelect) {
      setDisplayName("");
      return;
    }
    if (!assignmentId.trim()) {
      setDisplayName("");
      return;
    }
    let cancelled = false;
    getTripAssignmentById(assignmentId.trim())
      .then((a) => {
        if (cancelled) return;
        setDisplayName(String(a?.displayName ?? "").trim());
      })
      .catch(() => {
        if (!cancelled) setDisplayName("");
      });
    return () => {
      cancelled = true;
    };
  }, [visible, needsAssignmentSelect, assignmentId]);

  useEffect(() => {
    if (!visible) return;
    if (!needsAssignmentSelect || !assignmentEntityType) {
      if (initialAssignmentsPending) setInitialAssignmentsPending(false);
      return;
    }
    if (!tripId.trim()) {
      setAssignmentOptions([]);
      if (initialAssignmentsPending) setInitialAssignmentsPending(false);
      return;
    }

    setAssignmentsLoading(true);
    getTripAssignments(tripId.trim())
      .then(({ items }) => {
        const filtered = items.filter((a) => a.entityType === assignmentEntityType);
        setAssignmentOptions([
          { label: "— Seleccionar asignación —", value: "" },
          ...filtered.map((a) => ({
            label: `${(a.displayName || "").trim() || a.entityId || a.id} (${(a.code || a.id).trim()})`,
            value: a.id,
          })),
        ]);
      })
      .catch(() => setAssignmentOptions([{ label: "— Seleccionar asignación —", value: "" }]))
      .finally(() => {
        setAssignmentsLoading(false);
        if (initialAssignmentsPending) setInitialAssignmentsPending(false);
      });
  }, [visible, tripId, needsAssignmentSelect, assignmentEntityType, initialAssignmentsPending]);

  useEffect(() => {
    if (!visible) return;

    if (needsAssignmentSelect) {
      // Para pagos a empleado/recurso, la entidad siempre es asignación y el ID es el tripAssignmentId.
      setEntity("assignment");
      setEntityId(assignmentId);
      return;
    }

    // Para otros tipos, se usan los campos libres.
    setAssignmentId("");
  }, [visible, needsAssignmentSelect, assignmentId]);

  useEffect(() => {
    if (!visible) return;
    if (!needsAssignmentSelect) return;
    if (!assignmentId.trim()) return;
    if (source !== "salary_rule") return;

    let cancelled = false;
    setLoadingAssignmentCost(true);
    setError(null);

    getTripCostByAssignment(assignmentId)
      .then((result) => {
        if (cancelled) return;
        setAmountPrecise(result.amount);
        setAmount(formatAmountForDisplay(result.amount));
        setCurrency(result.currency || "PEN");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo obtener el costo calculado para la asignación."
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingAssignmentCost(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, needsAssignmentSelect, assignmentId, source]);

  const save = async () => {
    if (!entityId.trim()) return;
    const amountNum = amountPrecise ?? Number(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) return;
    setSaving(true);
    setError(null);
    try {
      const entityIdTrimmed = entityId.trim();
      const { items } = await getTripCosts(tripId);
      const hasDuplicateEntity = items.some(
        (c) => c.entityId.trim() === entityIdTrimmed && c.id !== (costId ?? "")
      );
      if (hasDuplicateEntity) {
        setError("Ya existe un costo registrado para esta entidad.");
        setSaving(false);
        return;
      }

      let finalCode: string;
      try {
        finalCode = await generateSequenceCode(code, "trip-cost");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }

      let resolvedDisplayName = "";
      if (source === "salary_rule" && entity === "assignment" && entityIdTrimmed) {
        try {
          const a = await getTripAssignmentById(entityIdTrimmed);
          resolvedDisplayName = String(a?.displayName ?? "").trim();
        } catch {
          resolvedDisplayName = displayName.trim();
        }
      }
      if (source === "salary_rule" && !resolvedDisplayName) {
        resolvedDisplayName = displayName.trim();
      }

      const payload = {
        code: finalCode,
        displayName: source === "salary_rule" ? resolvedDisplayName : "",
        tripId,
        entity,
        entityId: entityIdTrimmed,
        type,
        source,
        amount: amountNum,
        currency: currency.trim() || "PEN",
        status,
        settlementId: settlementId.trim() || null,
      };
      if (costId) {
        await updateTripCost(costId, payload);
      } else {
        await addTripCost(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid =
    !!entityId.trim() &&
    (!needsAssignmentSelect || !!assignmentId.trim()) &&
    !Number.isNaN(Number(amount)) &&
    Number(amount) >= 0;

  return (
    <DpContentSet
      title={isEdit ? "Editar costo" : "Agregar costo"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
      showLoading={loading || (initialAssignmentsPending && assignmentsLoading)}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
          <DpCodeInput entity="trip-cost" label="Código" name="code" value={code} onChange={setCode} />
          <DpInput type="select" label="Tipo" name="type" value={type} onChange={(v) => handleTypeChange(v as TripCostType)} options={TYPE_OPTIONS} />

          {needsAssignmentSelect ? (
            <DpInput
              type="select"
              label={isEmployeePayment ? "Asignación (Empleado)" : "Asignación (Recurso)"}
              name="tripAssignmentId"
              value={assignmentId}
              onChange={(v) => setAssignmentId(String(v ?? ""))}
              options={assignmentOptions}
              placeholder={assignmentsLoading ? "Cargando..." : "Seleccionar"}
              disabled={assignmentsLoading || (source === "salary_rule" && loadingAssignmentCost)}
              filter
            />
          ) : null}

          {needsAssignmentSelect ? (
            <DpInput
              type="select"
              label="Origen"
              name="source"
              value={source}
              onChange={(v) => handleSourceChange(v as TripCostSource)}
              options={SOURCE_OPTIONS}
            />
          ) : null}

          <DpInput
            type="number"
            label="Monto"
            name="amount"
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setAmountPrecise(null);
            }}
            placeholder={loadingAssignmentCost ? "Calculando..." : "0"}
            disabled={
              loadingAssignmentCost || (needsAssignmentSelect && source === "salary_rule")
            }
          />
          <DpInput
            type="select"
            label="Moneda"
            name="currency"
            value={currency}
            onChange={(v) => setCurrency(String(v ?? ""))}
            options={CURRENCY_OPTIONS}
            disabled={loadingAssignmentCost && needsAssignmentSelect && source === "salary_rule"}
          />
          <DpInput type="select" label="Estado" name="status" value={status} onChange={(v) => setStatus(v as TripCostStatus)} options={STATUS_OPTIONS} />
      </div>
    </DpContentSet>
  );
}
