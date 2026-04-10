import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { generateSequenceCode } from "~/features/system/sequences";
import { getChargeTypesForTripCharges } from "~/features/transport/charge-types";
import type { ChargeTypeRecord, ChargeTypeSource } from "~/features/transport/charge-types";
import {
  getTripChargeById,
  addTripCharge,
  updateTripCharge,
  getTripChargeFreightPricing,
  type TripChargeType,
  type TripChargeSource,
  type TripChargeStatus,
  type TripChargeEntityType,
} from "~/features/transport/trip-charges";
import { getTransportServices } from "~/features/transport/transport-services";
import { getEmployees, type EmployeeRecord } from "~/features/human-resource/employees";
import { getResources, type ResourceRecord } from "~/features/human-resource/resources";
import type { AssignmentEntityType } from "~/features/transport/trip-assignments";
import {
  TRIP_CHARGE_SOURCE,
  TRIP_CHARGE_STATUS,
  TRIP_ASSIGNMENT_ENTITY_TYPE,
  CURRENCY,
  statusToSelectOptions,
} from "~/constants/status-options";

export interface TripChargeDialogProps {
  visible: boolean;
  tripId: string;
  /** Cliente del viaje (necesario para precio flete desde contrato). */
  clientId: string;
  chargeId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const ALL_CHARGE_SOURCE = TRIP_CHARGE_SOURCE;
const STATUS_OPTIONS = statusToSelectOptions(TRIP_CHARGE_STATUS);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);
const SUPPORT_ENTITY_TYPE_OPTIONS = statusToSelectOptions(TRIP_ASSIGNMENT_ENTITY_TYPE);

function sourceEntityPickMode(source: ChargeTypeSource): "none" | "service" | "choose" | "employee" | "resource" {
  if (source === "service") return "service";
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

export default function TripChargeDialog({
  visible,
  tripId,
  clientId,
  chargeId,
  onSuccess,
  onHide,
}: TripChargeDialogProps) {
  const isEdit = !!chargeId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [chargeTypeId, setChargeTypeId] = useState("");
  const [chargeTypes, setChargeTypes] = useState<ChargeTypeRecord[]>([]);
  const [type, setType] = useState<TripChargeType>("freight");
  const [source, setSource] = useState<TripChargeSource>("manual");
  const [transportServiceId, setTransportServiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [status, setStatus] = useState<TripChargeStatus>("open");

  /** Apoyo adicional: mismo criterio que asignación de viaje. */
  const [supportEntityType, setSupportEntityType] = useState<AssignmentEntityType>("employee");
  const [supportEntitySelectId, setSupportEntitySelectId] = useState("");
  const [supportEntityLabel, setSupportEntityLabel] = useState("");

  const [serviceOptions, setServiceOptions] = useState<{ label: string; value: string }[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  /** Flete con origen Contrato: monto desde tarifa. */
  const [freightPricingLocked, setFreightPricingLocked] = useState(false);
  /** Apoyo adicional con origen Regla salarial: mismo cálculo que tripCost. */
  const [supportPricingLocked, setSupportPricingLocked] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedChargeType = useMemo(
    () => chargeTypes.find((c) => c.id === chargeTypeId),
    [chargeTypes, chargeTypeId]
  );
  const entityPickMode = selectedChargeType ? sourceEntityPickMode(selectedChargeType.source) : "none";

  const isFreight = entityPickMode === "service";
  const isAdditionalSupport =
    entityPickMode === "choose" || entityPickMode === "employee" || entityPickMode === "resource";
  const clientIdTrim = clientId.trim();

  const chargeTypeOptions = useMemo(() => {
    const opts = chargeTypes.map((ct) => {
      const c = (ct.code ?? "").trim();
      const n = (ct.name ?? "").trim();
      return { label: c && n ? `${c} · ${n}` : n || c || ct.id, value: ct.id };
    });
    if (chargeTypeId && !chargeTypes.some((c) => c.id === chargeTypeId)) {
      return [
        { label: `Tipo de cargo (referencia) · ${chargeTypeId}`, value: chargeTypeId },
        { label: "— Seleccionar tipo —", value: "" },
        ...opts,
      ];
    }
    return [{ label: "— Seleccionar tipo —", value: "" }, ...opts];
  }, [chargeTypes, chargeTypeId]);

  const sourceOptions = useMemo(() => {
    if (entityPickMode === "service") {
      return statusToSelectOptions({
        contract: ALL_CHARGE_SOURCE.contract,
        manual: ALL_CHARGE_SOURCE.manual,
      });
    }
    if (
      entityPickMode === "choose" ||
      entityPickMode === "employee" ||
      entityPickMode === "resource"
    ) {
      return statusToSelectOptions({
        salary_rule: ALL_CHARGE_SOURCE.salary_rule,
        manual: ALL_CHARGE_SOURCE.manual,
      });
    }
    return statusToSelectOptions({ manual: ALL_CHARGE_SOURCE.manual });
  }, [entityPickMode]);

  const applyContractFreightPricing = useCallback(
    async (svcId: string) => {
      if (!clientIdTrim || !svcId.trim()) {
        setFreightPricingLocked(false);
        return;
      }
      setPricingLoading(true);
      setError(null);
      try {
        const res = await getTripChargeFreightPricing({
          mode: "freight",
          clientId: clientIdTrim,
          transportServiceId: svcId.trim(),
        });
        setAmount(String(res.amount));
        setCurrency((res.currency || "PEN").trim() || "PEN");
        if (res.serviceName.trim()) setName(res.serviceName.trim());
        setFreightPricingLocked(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo calcular el precio.");
        setFreightPricingLocked(false);
      } finally {
        setPricingLoading(false);
      }
    },
    [clientIdTrim]
  );

  const applySupportSalaryRulePricing = useCallback(
    async (entityType: AssignmentEntityType, eid: string) => {
      const id = eid.trim();
      if (!id) {
        setSupportPricingLocked(false);
        return;
      }
      setPricingLoading(true);
      setError(null);
      try {
        const res = await getTripChargeFreightPricing({
          mode: "additional_support",
          entityType: entityType === "resource" ? "resource" : "employee",
          entityId: id,
        });
        setAmount(String(res.amount));
        setCurrency((res.currency || "PEN").trim() || "PEN");
        if (res.serviceName.trim()) setName(res.serviceName.trim());
        setSupportPricingLocked(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo calcular el monto por regla salarial.");
        setSupportPricingLocked(false);
      } finally {
        setPricingLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!visible) return;
    setListsLoading(true);
    Promise.all([getTransportServices(), getEmployees(), getResources(), getChargeTypesForTripCharges()])
      .then(([{ items: svc }, { items: emp }, { items: res }, chargeTypeList]) => {
        const opts = svc
          .filter((s) => s.active !== false)
          .map((s) => ({
            label: (s.name || s.code || s.id).trim(),
            value: s.id,
          }));
        setServiceOptions(opts);
        setEmployees(emp);
        setResources(res);
        setChargeTypes(chargeTypeList);
      })
      .catch(() => {
        setServiceOptions([]);
        setEmployees([]);
        setResources([]);
        setChargeTypes([]);
      })
      .finally(() => setListsLoading(false));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!chargeId) {
      setCode("");
      setName("");
      setChargeTypeId("");
      setType("freight");
      setSource("manual");
      setTransportServiceId("");
      setAmount("");
      setCurrency("PEN");
      setStatus("open");
      setSupportEntityType("employee");
      setSupportEntitySelectId("");
      setSupportEntityLabel("");
      setFreightPricingLocked(false);
      setSupportPricingLocked(false);
      setPricingLoading(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    getTripChargeById(chargeId)
      .then((data) => {
        if (!data) {
          setError("Cargo no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setName(data.name ?? "");
        setChargeTypeId(data.chargeTypeId ?? "");
        setType(data.type ?? "freight");
        let loadedSource = (data.source ?? "manual") as TripChargeSource;
        if (data.type === "additional_support" && loadedSource === "contract") {
          loadedSource = "manual";
        }
        if (data.type !== "additional_support" && loadedSource === "salary_rule") {
          loadedSource = "manual";
        }
        setSource(loadedSource);
        setTransportServiceId(
          data.type === "freight" &&
            (data.entityType === "transportService" || (!data.entityType && !!(data.entityId ?? "").trim()))
            ? (data.entityId ?? "")
            : ""
        );
        setAmount(String(data.amount ?? ""));
        setCurrency(data.currency ?? "PEN");
        setStatus(data.status ?? "open");
        if (data.type === "additional_support") {
          setSupportEntityType(data.entityType === "resource" ? "resource" : "employee");
          setSupportEntitySelectId(data.entityId ?? "");
          setSupportEntityLabel((data.name ?? "").trim());
        } else {
          setSupportEntityType("employee");
          setSupportEntitySelectId("");
          setSupportEntityLabel("");
        }
        const freightLocked =
          data.source === "contract" &&
          data.type === "freight" &&
          data.entityType === "transportService" &&
          !!(data.entityId ?? "").trim();
        setFreightPricingLocked(freightLocked);
        const supportLocked =
          data.type === "additional_support" &&
          data.source === "salary_rule" &&
          (data.entityType === "employee" || data.entityType === "resource") &&
          !!(data.entityId ?? "").trim();
        setSupportPricingLocked(supportLocked);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, chargeId]);

  const employeeOptions = useMemo(() => {
    const active = employees.filter((e) => e.status === "active");
    const opts = active.map((e) => ({
      label: `${formatEmployeeDisplay(e)}${e.code ? ` · ${e.code}` : ""}`,
      value: e.id,
    }));
    if (
      supportEntitySelectId &&
      supportEntityType === "employee" &&
      !active.some((e) => e.id === supportEntitySelectId)
    ) {
      return [
        { label: supportEntityLabel.trim() || supportEntitySelectId, value: supportEntitySelectId },
        ...opts,
      ];
    }
    return [{ label: "— Seleccionar empleado —", value: "" }, ...opts];
  }, [employees, supportEntitySelectId, supportEntityType, supportEntityLabel]);

  const resourceOptions = useMemo(() => {
    const active = resources.filter((r) => r.status === "active");
    const opts = active.map((r) => ({
      label: `${formatResourceDisplay(r)}${r.code ? ` · ${r.code}` : ""}`,
      value: r.id,
    }));
    if (
      supportEntitySelectId &&
      supportEntityType === "resource" &&
      !active.some((r) => r.id === supportEntitySelectId)
    ) {
      return [
        { label: supportEntityLabel.trim() || supportEntitySelectId, value: supportEntitySelectId },
        ...opts,
      ];
    }
    return [{ label: "— Seleccionar recurso —", value: "" }, ...opts];
  }, [resources, supportEntitySelectId, supportEntityType, supportEntityLabel]);

  const handleSourceChange = (v: TripChargeSource) => {
    setSource(v);
    if (v === "manual") {
      setAmount("0");
      setFreightPricingLocked(false);
      setSupportPricingLocked(false);
      return;
    }
    if (v === "contract" && type === "freight" && transportServiceId.trim() && clientIdTrim) {
      void applyContractFreightPricing(transportServiceId);
    }
    if (v === "salary_rule" && isAdditionalSupport && supportEntitySelectId.trim()) {
      void applySupportSalaryRulePricing(supportEntityType, supportEntitySelectId);
    }
  };

  const onChargeTypeChange = (id: string) => {
    setChargeTypeId(id);
    const ct = chargeTypes.find((c) => c.id === id);
    setError(null);
    setAmount("");
    setFreightPricingLocked(false);
    setSupportPricingLocked(false);
    setTransportServiceId("");
    setSupportEntitySelectId("");
    setSupportEntityLabel("");
    setSupportEntityType("employee");
    if (!ct) {
      setType("freight");
      setSource("manual");
      return;
    }
    if (ct.source === "service") {
      setType("freight");
      setSource("manual");
      return;
    }
    if (ct.source === "employee") {
      setType("additional_support");
      setSupportEntityType("employee");
      setSource("manual");
      return;
    }
    if (ct.source === "resource") {
      setType("additional_support");
      setSupportEntityType("resource");
      setSource("manual");
      return;
    }
    setType("additional_support");
    setSource("manual");
  };

  const handleTransportServiceChange = (v: string | number) => {
    const id = String(v ?? "").trim();
    setTransportServiceId(id);
    const opt = serviceOptions.find((o) => o.value === id);

    if (!id) {
      setSource("manual");
      setAmount("0");
      setFreightPricingLocked(false);
      setName("");
      setError(null);
      return;
    }

    setSource("contract");
    if (opt?.label) setName(opt.label);
    setError(null);
    if (clientIdTrim) {
      void applyContractFreightPricing(id);
    } else {
      setFreightPricingLocked(false);
      setError("El viaje no tiene cliente asignado; no se puede calcular el precio por contrato.");
    }
  };

  const onSupportEntityTypeChange = (v: AssignmentEntityType) => {
    setSupportEntityType(v);
    setSupportEntitySelectId("");
    setSupportEntityLabel("");
    setSource("manual");
    setSupportPricingLocked(false);
    setAmount("0");
  };

  useEffect(() => {
    if (entityPickMode === "employee" && supportEntityType !== "employee") {
      setSupportEntityType("employee");
    }
    if (entityPickMode === "resource" && supportEntityType !== "resource") {
      setSupportEntityType("resource");
    }
  }, [entityPickMode, supportEntityType]);

  const onSupportEmployeeSelect = (id: string) => {
    setSupportEntitySelectId(id);
    if (!id.trim()) {
      setSupportEntityLabel("");
      setSource("manual");
      setSupportPricingLocked(false);
      setAmount("0");
      return;
    }
    const e = employees.find((x) => x.id === id);
    const label = e ? formatEmployeeDisplay(e) : "";
    setSupportEntityLabel(label);
    if (e && !name.trim()) setName(label);
    setSource("salary_rule");
    void applySupportSalaryRulePricing("employee", id);
  };

  const onSupportResourceSelect = (id: string) => {
    setSupportEntitySelectId(id);
    if (!id.trim()) {
      setSupportEntityLabel("");
      setSource("manual");
      setSupportPricingLocked(false);
      setAmount("0");
      return;
    }
    const r = resources.find((x) => x.id === id);
    const label = r ? formatResourceDisplay(r) : "";
    setSupportEntityLabel(label);
    if (r && !name.trim()) setName(label);
    setSource("salary_rule");
    void applySupportSalaryRulePricing("resource", id);
  };

  const resolveEntityPayload = (): { entityType: TripChargeEntityType; entityId: string } => {
    if (type === "freight") {
      const sid = transportServiceId.trim();
      if (sid) return { entityType: "transportService", entityId: sid };
      return { entityType: "", entityId: "" };
    }
    if (type === "additional_support") {
      const effectiveType: AssignmentEntityType =
        entityPickMode === "employee"
          ? "employee"
          : entityPickMode === "resource"
            ? "resource"
            : supportEntityType;
      return {
        entityType: effectiveType === "resource" ? "resource" : "employee",
        entityId: supportEntitySelectId.trim(),
      };
    }
    return { entityType: "", entityId: "" };
  };

  const save = async () => {
    if (!chargeTypeId.trim() || !selectedChargeType) {
      setError("Seleccione un tipo de cargo.");
      return;
    }
    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) return;
    if (source === "contract" && isFreight) {
      if (!clientIdTrim) {
        setError("El viaje no tiene cliente; no se puede usar origen Contrato en flete.");
        return;
      }
      if (!transportServiceId.trim()) {
        setError("Seleccione un servicio de transporte para el flete con origen Contrato.");
        return;
      }
    }
    if (source === "salary_rule" && isAdditionalSupport) {
      if (!supportEntitySelectId.trim()) {
        setError("Seleccione empleado o recurso para calcular por regla salarial.");
        return;
      }
    }
    if (isAdditionalSupport && !supportEntitySelectId.trim()) {
      setError("Seleccione empleado o recurso para apoyo adicional.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      try {
        finalCode = await generateSequenceCode(code, "trip-charge");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }
      const typeLabel =
        selectedChargeType.name.trim() || selectedChargeType.code.trim() || selectedChargeType.id;
      const resolvedName = name.trim() || typeLabel;
      const { entityType, entityId } = resolveEntityPayload();

      const payload = {
        code: finalCode,
        tripId,
        name: resolvedName,
        chargeTypeId: chargeTypeId.trim(),
        chargeType: typeLabel,
        type,
        source,
        entityType,
        entityId,
        amount: amountNum,
        currency: currency.trim() || "PEN",
        status,
      };
      if (chargeId) {
        await updateTripCharge(chargeId, payload);
      } else {
        await addTripCharge(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const amountCurrencyLocked =
    (freightPricingLocked && source === "contract" && isFreight && !!transportServiceId.trim()) ||
    (supportPricingLocked && source === "salary_rule" && isAdditionalSupport && !!supportEntitySelectId.trim());

  const valid =
    !!chargeTypeId.trim() &&
    !!selectedChargeType &&
    !Number.isNaN(Number(amount)) &&
    Number(amount) >= 0 &&
    !(source === "contract" && isFreight && (!clientIdTrim || !transportServiceId.trim())) &&
    !(source === "salary_rule" && isAdditionalSupport && !supportEntitySelectId.trim()) &&
    !(isAdditionalSupport && !supportEntitySelectId.trim());

  return (
    <DpContentSet
      title={isEdit ? "Editar cargo" : "Agregar cargo"}
      recordId={isEdit ? chargeId : null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating || pricingLoading}
      saveDisabled={!valid || isNavigating || pricingLoading}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpCodeInput entity="trip-charge" label="Código" name="code" value={code} onChange={setCode} />
        <DpInput
          type="select"
          label="Tipo"
          name="chargeTypeId"
          value={chargeTypeId}
          onChange={(v) => onChargeTypeChange(String(v ?? ""))}
          options={chargeTypeOptions}
          placeholder={listsLoading ? "Cargando tipos..." : "Seleccionar tipo"}
          disabled={listsLoading}
          filter
        />

        {entityPickMode === "service" && (
          <DpInput
            type="select"
            label="Servicio de transporte"
            name="transportServiceId"
            value={transportServiceId}
            onChange={handleTransportServiceChange}
            options={serviceOptions}
            placeholder={listsLoading ? "Cargando servicios…" : "Seleccionar servicio"}
            disabled={listsLoading}
            filter
          />
        )}

        {(entityPickMode === "choose" || entityPickMode === "employee" || entityPickMode === "resource") && (
          <>
            {entityPickMode === "choose" && (
              <DpInput
                type="select"
                label="Tipo entidad"
                name="supportEntityType"
                value={supportEntityType}
                onChange={(v) => onSupportEntityTypeChange(v as AssignmentEntityType)}
                options={SUPPORT_ENTITY_TYPE_OPTIONS}
              />
            )}
            {(entityPickMode === "employee" || (entityPickMode === "choose" && supportEntityType === "employee")) && (
              <DpInput
                type="select"
                label="Empleado"
                name="supportEmployeeId"
                value={supportEntitySelectId}
                onChange={(v) => onSupportEmployeeSelect(String(v))}
                options={employeeOptions}
                placeholder={listsLoading ? "Cargando empleados…" : "Seleccionar empleado"}
                disabled={listsLoading}
                filter
              />
            )}
            {(entityPickMode === "resource" || (entityPickMode === "choose" && supportEntityType === "resource")) && (
              <DpInput
                type="select"
                label="Recurso"
                name="supportResourceId"
                value={supportEntitySelectId}
                onChange={(v) => onSupportResourceSelect(String(v))}
                options={resourceOptions}
                placeholder={listsLoading ? "Cargando recursos…" : "Seleccionar recurso"}
                disabled={listsLoading}
                filter
              />
            )}
          </>
        )}

        <DpInput
          type="select"
          label="Origen"
          name="source"
          value={source}
          onChange={(v) => handleSourceChange(v as TripChargeSource)}
          options={sourceOptions}
        />

        {source === "contract" && isFreight && !clientIdTrim && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            El viaje no tiene cliente asignado; el precio por contrato no está disponible.
          </p>
        )}

        {pricingLoading && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isAdditionalSupport ? "Calculando monto por regla salarial…" : "Calculando precio desde contrato…"}
          </p>
        )}

        <DpInput
          type="number"
          label="Monto"
          name="amount"
          value={amount}
          onChange={setAmount}
          placeholder="0"
          disabled={amountCurrencyLocked}
        />
        <DpInput
          type="select"
          label="Moneda"
          name="currency"
          value={currency}
          onChange={(v) => setCurrency(String(v ?? ""))}
          options={CURRENCY_OPTIONS}
          disabled={amountCurrencyLocked}
        />
        <DpInput
          type="select"
          label="Estado"
          name="status"
          value={status}
          onChange={(v) => setStatus(v as TripChargeStatus)}
          options={STATUS_OPTIONS}
        />
      </div>
    </DpContentSet>
  );
}
