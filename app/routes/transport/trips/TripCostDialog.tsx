import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { generateSequenceCode } from "~/features/system/sequences";
import { getEmployees, type EmployeeRecord } from "~/features/human-resource/employees";
import { getResources, type ResourceRecord } from "~/features/human-resource/resources";
import { getChargeTypesForTripCosts } from "~/features/transport/charge-types";
import type { ChargeTypeRecord, ChargeTypeSource } from "~/features/transport/charge-types";
import {
  getTripCostById,
  getTripCosts,
  addTripCost,
  updateTripCost,
  getPerTripCostByEntity,
  type TripCostEntity,
  type TripCostType,
  type TripCostSource,
  type TripCostStatus,
} from "~/features/transport/trip-costs";
import {
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

const SOURCE_OPTIONS = statusToSelectOptions(TRIP_COST_SOURCE);
const STATUS_OPTIONS = statusToSelectOptions(TRIP_COST_STATUS);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);

function formatAmountForDisplay(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

function isAssignmentPaymentType(t: TripCostType): boolean {
  return t === "employee_payment" || t === "resource_payment";
}

function sourceEntityPickMode(source: ChargeTypeSource): "choose" | "employee" | "resource" | "none" {
  if (source === "employee") return "employee";
  if (source === "resource") return "resource";
  if (source === "employee_resource") return "choose";
  return "none";
}

function formatEmployeeDisplay(e: EmployeeRecord): string {
  const name = `${e.lastName} ${e.firstName}`.trim();
  return name || e.code.trim() || e.id;
}

function formatResourceDisplay(r: ResourceRecord): string {
  const name = `${r.lastName} ${r.firstName}`.trim();
  return name || r.code.trim() || r.id;
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
  const [entity, setEntity] = useState<TripCostEntity>("");
  const [entityId, setEntityId] = useState("");

  const [chargeTypes, setChargeTypes] = useState<ChargeTypeRecord[]>([]);
  const [chargeTypeId, setChargeTypeId] = useState("");

  const [entityType, setEntityType] = useState<"employee" | "resource">("employee");
  const [entitySelectId, setEntitySelectId] = useState("");

  // compat: seguimos guardando `type` (employee_payment/resource_payment/otros) por ahora.
  const [type, setType] = useState<TripCostType>("employee_payment");
  const [source, setSource] = useState<TripCostSource>("manual");
  const [amount, setAmount] = useState("");
  const [amountPrecise, setAmountPrecise] = useState<number | null>(null);
  const [currency, setCurrency] = useState("PEN");
  const [status, setStatus] = useState<TripCostStatus>("open");
  const [settlementId, setSettlementId] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingComputedCost, setLoadingComputedCost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSourceChange = (v: TripCostSource) => {
    const next = v;
    setSource(next);
    if (next === "manual") {
      setAmount("0");
      setAmountPrecise(0);
    }
    // manual → salary_rule: el efecto de getPerTripCostByEntity recalcula monto
  };

  const selectedChargeType = useMemo(
    () => chargeTypes.find((c) => c.id === chargeTypeId),
    [chargeTypes, chargeTypeId]
  );

  const entityPickMode = selectedChargeType ? sourceEntityPickMode(selectedChargeType.source) : "none";

  const chargeTypeOptions = useMemo(() => {
    const opts = chargeTypes.map((ct) => {
      const c = (ct.code ?? "").trim();
      const n = (ct.name ?? "").trim();
      const label = c && n ? `${c} · ${n}` : n || c || ct.id;
      return { label, value: ct.id };
    });
    if (chargeTypeId && !chargeTypes.some((c) => c.id === chargeTypeId)) {
      return [
        { label: `Tipo de costo (referencia) · ${chargeTypeId}`, value: chargeTypeId },
        { label: "— Seleccionar tipo —", value: "" },
        ...opts,
      ];
    }
    return [{ label: "— Seleccionar tipo —", value: "" }, ...opts];
  }, [chargeTypes, chargeTypeId]);

  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [listsLoading, setListsLoading] = useState(false);

  const pendingEntityTypeRef = useRef<"employee" | "resource" | null>(null);

  const employeeOptions = useMemo(() => {
    const active = employees.filter((e) => e.status === "active");
    const opts = active.map((e) => ({
      label: `${formatEmployeeDisplay(e)}${e.code ? ` · ${e.code}` : ""}`,
      value: e.id,
    }));
    if (entitySelectId && entityType === "employee" && !active.some((e) => e.id === entitySelectId)) {
      return [{ label: displayName.trim() || entitySelectId, value: entitySelectId }, ...opts];
    }
    return [{ label: "— Seleccionar empleado —", value: "" }, ...opts];
  }, [employees, entitySelectId, entityType, displayName]);

  const resourceOptions = useMemo(() => {
    const active = resources.filter((r) => r.status === "active");
    const opts = active.map((r) => ({
      label: `${formatResourceDisplay(r)}${r.code ? ` · ${r.code}` : ""}`,
      value: r.id,
    }));
    if (entitySelectId && entityType === "resource" && !active.some((r) => r.id === entitySelectId)) {
      return [{ label: displayName.trim() || entitySelectId, value: entitySelectId }, ...opts];
    }
    return [{ label: "— Seleccionar recurso —", value: "" }, ...opts];
  }, [resources, entitySelectId, entityType, displayName]);

  const onEntityTypeChange = useCallback((v: "employee" | "resource") => {
    setEntityType(v);
    setEntitySelectId("");
    setDisplayName("");
  }, []);

  const onEmployeeSelect = (id: string) => {
    setEntitySelectId(id);
    if (!id.trim()) {
      setDisplayName("");
      return;
    }
    const e = employees.find((x) => x.id === id);
    setDisplayName(e ? formatEmployeeDisplay(e) : "");
  };

  const onResourceSelect = (id: string) => {
    setEntitySelectId(id);
    if (!id.trim()) {
      setDisplayName("");
      return;
    }
    const r = resources.find((x) => x.id === id);
    setDisplayName(r ? formatResourceDisplay(r) : "");
  };

  const onChargeTypeChange = (id: string) => {
    setChargeTypeId(id);
    setError(null);
    const ct = chargeTypes.find((c) => c.id === id);
    setEntitySelectId("");
    setDisplayName("");
    if (!ct) return;
    if (ct.source === "employee") {
      pendingEntityTypeRef.current = "employee";
      setEntityType("employee");
    } else if (ct.source === "resource") {
      pendingEntityTypeRef.current = "resource";
      setEntityType("resource");
    } else {
      pendingEntityTypeRef.current = null;
      setEntityType("employee");
    }
    // defaults para costos de empleado/recurso: salary_rule
    if (ct.source === "employee" || ct.source === "resource" || ct.source === "employee_resource") {
      setSource("salary_rule");
      setEntity(ct.source === "resource" ? "resource" : "employee");
      setType(ct.source === "resource" ? "resource_payment" : "employee_payment");
      setEntityId("");
      setAmount("");
      setAmountPrecise(null);
    } else {
      setSource("manual");
      setEntity("");
      setType("other_expense");
      setEntityId("");
      setAmount("");
      setAmountPrecise(null);
      setCurrency("PEN");
    }
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setError(null);
    if (!costId) {
      setCode("");
      setChargeTypeId("");
      setChargeTypes([]);
      setEmployees([]);
      setResources([]);
      setDisplayName("");
      setEntity("");
      setEntityId("");
      setEntityType("employee");
      setEntitySelectId("");
      setType("employee_payment");
      setSource("manual");
      setAmount("");
      setAmountPrecise(null);
      setCurrency("PEN");
      setStatus("open");
      setSettlementId("");
      setLoading(false);
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
        setChargeTypeId(String((data as any).chargeTypeId ?? "").trim());
        const loadedType = (data.type ?? "employee_payment") as TripCostType;
        setEntity(data.entity === "resource" ? "resource" : data.entity === "employee" ? "employee" : "");
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
        // Para compatibilidad: si venía como pago a asignación (entityId=tripAssignmentId), no podemos inferir empleado/recurso aquí.
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, costId]);

  useEffect(() => {
    if (!visible) return;
    setListsLoading(true);
    Promise.all([getEmployees(), getResources(), getChargeTypesForTripCosts()])
      .then(([emp, res, ct]) => {
        setEmployees(emp.items);
        setResources(res.items);
        setChargeTypes(ct);
      })
      .catch(() => {
        setEmployees([]);
        setResources([]);
        setChargeTypes([]);
      })
      .finally(() => setListsLoading(false));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (source !== "salary_rule") return;
    if (entityPickMode === "none") return;
    const effectiveEntityType =
      entityPickMode === "employee"
        ? "employee"
        : entityPickMode === "resource"
          ? "resource"
          : entityType;
    if (!entitySelectId.trim()) return;

    let cancelled = false;
    setLoadingComputedCost(true);
    setError(null);

    getPerTripCostByEntity(effectiveEntityType, entitySelectId.trim())
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
            : "No se pudo obtener el costo calculado para la entidad."
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingComputedCost(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, source, entityPickMode, entityType, entitySelectId]);

  const save = async () => {
    if (!chargeTypeId.trim() || !selectedChargeType) {
      setError("Seleccione un tipo de costo.");
      return;
    }
    const pickMode = sourceEntityPickMode(selectedChargeType.source);
    if (pickMode !== "none") {
      const effectiveEntityType =
        pickMode === "employee" ? "employee" : pickMode === "resource" ? "resource" : entityType;
      if (!entitySelectId.trim()) return;
      setEntity(effectiveEntityType === "resource" ? "resource" : "employee");
      setEntityId(entitySelectId.trim());
      setType(effectiveEntityType === "resource" ? "resource_payment" : "employee_payment");
    } else {
      setEntity("");
      setEntityId("");
    }

    const amountNum = amountPrecise ?? Number(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) return;
    setSaving(true);
    setError(null);
    try {
      const entityIdTrimmed = entityId.trim();
      if (entityIdTrimmed) {
        const { items } = await getTripCosts(tripId);
        const hasDuplicateEntity = items.some(
          (c) => c.entityId.trim() === entityIdTrimmed && c.id !== (costId ?? "")
        );
        if (hasDuplicateEntity) {
          setError("Ya existe un costo registrado para esta entidad.");
          setSaving(false);
          return;
        }
      }

      let finalCode: string;
      try {
        finalCode = await generateSequenceCode(code, "trip-cost");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }

      const resolvedDisplayName = displayName.trim();

      const payload = {
        code: finalCode,
        displayName: source === "salary_rule" ? resolvedDisplayName : "",
        tripId,
        entity,
        entityId: entityIdTrimmed,
        chargeTypeId: chargeTypeId.trim(),
        chargeType: selectedChargeType.name.trim() || selectedChargeType.code.trim() || selectedChargeType.id,
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
    !!chargeTypeId.trim() &&
    !!selectedChargeType &&
    (entityPickMode === "none" || !!entitySelectId.trim()) &&
    !Number.isNaN(Number(amount)) &&
    Number(amount) >= 0;

  return (
    <DpContentSet
      title={isEdit ? "Editar costo" : "Agregar costo"}
      recordId={isEdit ? costId : null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
      showLoading={loading || listsLoading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
          <DpCodeInput entity="trip-cost" label="Código" name="code" value={code} onChange={setCode} />
          <DpInput
            type="select"
            label="Tipo"
            name="chargeTypeId"
            value={chargeTypeId}
            onChange={(v) => onChargeTypeChange(String(v ?? ""))}
            options={chargeTypeOptions}
            placeholder={listsLoading ? "Cargando..." : "Seleccionar"}
            disabled={listsLoading}
            filter
          />

          {entityPickMode === "choose" ? (
            <DpInput
              type="select"
              label="Tipo entidad"
              name="entityType"
              value={entityType}
              onChange={(v) => onEntityTypeChange(v as "employee" | "resource")}
              options={[
                { label: "Empleado", value: "employee" },
                { label: "Recurso", value: "resource" },
              ]}
            />
          ) : null}

          {(entityPickMode === "employee" || (entityPickMode === "choose" && entityType === "employee")) ? (
            <DpInput
              type="select"
              label="Empleado"
              name="employeeId"
              value={entitySelectId}
              onChange={(v) => onEmployeeSelect(String(v ?? ""))}
              options={employeeOptions}
              placeholder={listsLoading ? "Cargando..." : "Seleccionar"}
              disabled={listsLoading || (source === "salary_rule" && loadingComputedCost)}
              filter
            />
          ) : null}

          {(entityPickMode === "resource" || (entityPickMode === "choose" && entityType === "resource")) ? (
            <DpInput
              type="select"
              label="Recurso"
              name="resourceId"
              value={entitySelectId}
              onChange={(v) => onResourceSelect(String(v ?? ""))}
              options={resourceOptions}
              placeholder={listsLoading ? "Cargando..." : "Seleccionar"}
              disabled={listsLoading || (source === "salary_rule" && loadingComputedCost)}
              filter
            />
          ) : null}

          {entityPickMode !== "none" ? (
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
            placeholder={loadingComputedCost ? "Calculando..." : "0"}
            disabled={
              loadingComputedCost || (entityPickMode !== "none" && source === "salary_rule")
            }
          />
          <DpInput
            type="select"
            label="Moneda"
            name="currency"
            value={currency}
            onChange={(v) => setCurrency(String(v ?? ""))}
            options={CURRENCY_OPTIONS}
            disabled={loadingComputedCost && entityPickMode !== "none" && source === "salary_rule"}
          />
          <DpInput type="select" label="Estado" name="status" value={status} onChange={(v) => setStatus(v as TripCostStatus)} options={STATUS_OPTIONS} />
      </div>
    </DpContentSet>
  );
}
