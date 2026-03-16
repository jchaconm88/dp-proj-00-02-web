import { useState, useEffect, useMemo } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getRateRule,
  addRateRule,
  updateRateRule,
  type RateRuleConditions,
  type RateRuleCalculation,
  type RateRuleType,
  type CalculationType,
} from "~/features/transport/transport-contracts";
import { getTransportServices, type TransportServiceRecord } from "~/features/transport/transport-services";
import { CALCULATION_TYPE, statusToSelectOptions } from "~/constants/status-options";

const RULE_TYPE_OPTIONS: { label: string; value: RateRuleType }[] = [
  { label: "Base", value: "base" },
  { label: "Cargo extra", value: "extra_charge" },
  { label: "Penalidad", value: "penalty" },
  { label: "Descuento", value: "discount" },
];

const CALCULATION_TYPE_OPTIONS = statusToSelectOptions(CALCULATION_TYPE);

export interface RateRuleDialogProps {
  visible: boolean;
  contractId: string;
  ruleId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const emptyConditions: RateRuleConditions = {
  originZone: null,
  destinationZone: null,
  minWeight: null,
  maxWeight: null,
  minDistanceKm: null,
  maxDistanceKm: null,
  priorityLevel: null,
  dayOfWeek: null,
};

const emptyCalculation: RateRuleCalculation = {
  basePrice: null,
  pricePerKm: null,
  pricePerTon: null,
  pricePerM3: null,
  percentage: null,
};

export default function RateRuleDialog({
  visible,
  contractId,
  ruleId,
  onSuccess,
  onHide,
}: RateRuleDialogProps) {
  const isEdit = !!ruleId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [priority, setPriority] = useState<number>(1);
  const [ruleType, setRuleType] = useState<RateRuleType>("base");
  const [calculationType, setCalculationType] = useState<CalculationType>("zone");
  const [transportServiceId, setTransportServiceId] = useState("");
  const [transportService, setTransportService] = useState("");
  const [services, setServices] = useState<TransportServiceRecord[]>([]);
  const [vehicleType, setVehicleType] = useState("");
  const [stackable, setStackable] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  // Conditions
  const [originZone, setOriginZone] = useState("");
  const [destinationZone, setDestinationZone] = useState("");
  const [minWeight, setMinWeight] = useState<number | "">("");
  const [maxWeight, setMaxWeight] = useState<number | "">("");
  const [minDistanceKm, setMinDistanceKm] = useState<number | "">("");
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | "">("");

  // Calculation Values
  const [basePrice, setBasePrice] = useState<number | "">("");
  const [pricePerKm, setPricePerKm] = useState<number | "">("");
  const [pricePerTon, setPricePerTon] = useState<number | "">("");
  const [pricePerM3, setPricePerM3] = useState<number | "">("");
  const [percentage, setPercentage] = useState<number | "">("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHide = () => {
    if (!saving && !isNavigating) onHide();
  };

  useEffect(() => {
    if (!visible) return;
    getTransportServices().then((res) => setServices(res.items)).catch(() => setServices([]));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!ruleId) {
      setCode("");
      setName("");
      setActive(true);
      setPriority(1);
      setRuleType("base");
      setCalculationType("zone");
      setTransportServiceId("");
      setTransportService("");
      setVehicleType("");
      setStackable(false);
      const today = new Date().toISOString().slice(0, 10);
      setValidFrom(today);
      setValidTo("");
      
      setOriginZone("");
      setDestinationZone("");
      setMinWeight("");
      setMaxWeight("");
      setMinDistanceKm("");
      setMaxDistanceKm("");

      setBasePrice("");
      setPricePerKm("");
      setPricePerTon("");
      setPricePerM3("");
      setPercentage("");

      setLoading(false);
      return;
    }

    setLoading(true);
    getRateRule(contractId, ruleId)
      .then((data) => {
        if (!data) {
          setError("Regla no encontrada.");
          return;
        }
        setCode(data.code ?? "");
        setName(data.name ?? "");
        setActive(data.active ?? true);
        setPriority(data.priority ?? 1);
        setRuleType(data.ruleType ?? "base");
        setCalculationType(data.calculationType ?? "zone");
        setTransportServiceId(data.transportServiceId ?? "");
        setTransportService(data.transportService ?? "");
        setVehicleType(data.vehicleType ?? "");
        setStackable(data.stackable ?? false);
        setValidFrom(data.validFrom ?? "");
        setValidTo(data.validTo ?? "");

        const c = data.conditions ?? emptyConditions;
        setOriginZone(c.originZone ?? "");
        setDestinationZone(c.destinationZone ?? "");
        setMinWeight(c.minWeight ?? "");
        setMaxWeight(c.maxWeight ?? "");
        setMinDistanceKm(c.minDistanceKm ?? "");
        setMaxDistanceKm(c.maxDistanceKm ?? "");

        const calc = data.calculation ?? emptyCalculation;
        setBasePrice(calc.basePrice ?? "");
        setPricePerKm(calc.pricePerKm ?? "");
        setPricePerTon(calc.pricePerTon ?? "");
        setPricePerM3(calc.pricePerM3 ?? "");
        setPercentage(calc.percentage ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, contractId, ruleId]);

  const filteredServices = useMemo(
    () => services.filter((s) => s.calculationType === calculationType),
    [services, calculationType]
  );
  
  const serviceOptions = useMemo(
    () => filteredServices.map((s) => ({ label: s.name || s.code || s.id, value: s.id })),
    [filteredServices]
  );

  const onTransportServiceChange = (value: string | number) => {
    const id = String(value ?? "");
    setTransportServiceId(id);
    const svc = services.find((s) => s.id === id);
    setTransportService(svc ? (svc.name || svc.code || "").trim() : "");
  };

  const save = async () => {
    if (!name.trim()) return;
    if (!isEdit && !code.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const conditions: RateRuleConditions = {
        originZone: originZone.trim() || null,
        destinationZone: destinationZone.trim() || null,
        minWeight: minWeight !== "" ? Number(minWeight) : null,
        maxWeight: maxWeight !== "" ? Number(maxWeight) : null,
        minDistanceKm: minDistanceKm !== "" ? Number(minDistanceKm) : null,
        maxDistanceKm: maxDistanceKm !== "" ? Number(maxDistanceKm) : null,
        priorityLevel: null,
        dayOfWeek: null,
      };

      const calculation: RateRuleCalculation = {
        basePrice: basePrice !== "" ? Number(basePrice) : null,
        pricePerKm: pricePerKm !== "" ? Number(pricePerKm) : null,
        pricePerTon: pricePerTon !== "" ? Number(pricePerTon) : null,
        pricePerM3: pricePerM3 !== "" ? Number(pricePerM3) : null,
        percentage: percentage !== "" ? Number(percentage) : null,
      };

      const payload = {
        code: code.trim(),
        name: name.trim(),
        active,
        priority: Number(priority) || 0,
        ruleType,
        calculationType,
        transportServiceId: transportServiceId.trim(),
        transportService: transportService.trim(),
        vehicleType: vehicleType.trim(),
        conditions,
        calculation,
        stackable,
        validFrom: validFrom.trim(),
        validTo: validTo.trim(),
      };

      if (ruleId) {
        await updateRateRule(contractId, ruleId, payload);
      } else {
        await addRateRule(contractId, payload);
      }

      onSuccess?.();
      handleHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = name.trim() && (isEdit || code.trim());

  return (
    <DpContentSet
      title={isEdit ? "Editar regla de tarifa" : "Agregar regla de tarifa"}
      cancelLabel="Cancelar"
      onCancel={handleHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={handleHide}
    >
      {loading ? (
        <div className="py-8 text-center text-zinc-500">Cargando...</div>
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <DpInput type="input" label="Código" name="code" value={code} onChange={setCode} placeholder="LIMA_5TN" disabled={isEdit} />
          <DpInput type="input" label="Nombre" name="name" value={name} onChange={setName} placeholder="Zona Lima - 5TN" />
          <DpInput type="check" label="Activo" name="active" value={active} onChange={setActive} />
          
          <div className="grid grid-cols-2 gap-4">
            <DpInput type="number" label="Prioridad" name="priority" value={String(priority)} onChange={(v) => setPriority(Number(v) || 1)} />
            <DpInput
              type="select"
              label="Tipo de regla"
              name="ruleType"
              value={ruleType}
              onChange={(v) => setRuleType(v as RateRuleType)}
              options={RULE_TYPE_OPTIONS}
            />
          </div>

          <DpInput
            type="select"
            label="Tipo de cálculo"
            name="calculationType"
            value={calculationType}
            onChange={(v) => {
              setCalculationType(v as CalculationType);
              setTransportServiceId("");
              setTransportService("");
            }}
            options={CALCULATION_TYPE_OPTIONS}
          />

          {calculationType && (
            <DpInput
              type="select"
              label="Servicio de transporte"
              name="transportServiceId"
              value={transportServiceId}
              onChange={onTransportServiceChange}
              options={serviceOptions}
              placeholder={filteredServices.length === 0 ? "No hay servicios con este tipo de cálculo" : "Seleccionar servicio"}
            />
          )}

          <DpInput type="input" label="Tipo de vehículo" name="vehicleType" value={vehicleType} onChange={setVehicleType} placeholder="5TN" />
          
          <div className="rounded border border-zinc-200 p-3 dark:border-navy-600">
            <div className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Condiciones</div>
            <div className="grid grid-cols-2 gap-2">
              <DpInput type="input" label="Zona origen" name="originZone" value={originZone} onChange={setOriginZone} placeholder="Origen" />
              <DpInput type="input" label="Zona destino" name="destinationZone" value={destinationZone} onChange={setDestinationZone} placeholder="Destino" />
              <DpInput type="number" label="Peso min (kg)" name="minWeight" value={String(minWeight)} onChange={(v) => setMinWeight(v === "" ? "" : Number(v))} />
              <DpInput type="number" label="Peso max (kg)" name="maxWeight" value={String(maxWeight)} onChange={(v) => setMaxWeight(v === "" ? "" : Number(v))} />
              <DpInput type="number" label="Km min" name="minDistanceKm" value={String(minDistanceKm)} onChange={(v) => setMinDistanceKm(v === "" ? "" : Number(v))} />
              <DpInput type="number" label="Km max" name="maxDistanceKm" value={String(maxDistanceKm)} onChange={(v) => setMaxDistanceKm(v === "" ? "" : Number(v))} />
            </div>
          </div>

          <div className="rounded border border-zinc-200 p-3 dark:border-navy-600">
            <div className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Cálculo</div>
            <div className="grid grid-cols-2 gap-2">
              <DpInput type="number" label="Precio base" name="basePrice" value={String(basePrice)} onChange={(v) => setBasePrice(v === "" ? "" : Number(v))} />
              <DpInput type="number" label="Precio por km" name="pricePerKm" value={String(pricePerKm)} onChange={(v) => setPricePerKm(v === "" ? "" : Number(v))} />
              <DpInput type="number" label="Precio por ton" name="pricePerTon" value={String(pricePerTon)} onChange={(v) => setPricePerTon(v === "" ? "" : Number(v))} />
              <DpInput type="number" label="Precio por m³" name="pricePerM3" value={String(pricePerM3)} onChange={(v) => setPricePerM3(v === "" ? "" : Number(v))} />
              <DpInput type="number" label="Porcentaje" name="percentage" value={String(percentage)} onChange={(v) => setPercentage(v === "" ? "" : Number(v))} />
            </div>
          </div>

          <DpInput type="check" label="Apilable" name="stackable" value={stackable} onChange={setStackable} />

          <div className="grid grid-cols-2 gap-4">
            <DpInput type="date" label="Vigencia desde" name="validFrom" value={validFrom} onChange={setValidFrom} />
            <DpInput type="date" label="Vigencia hasta" name="validTo" value={validTo} onChange={setValidTo} />
          </div>
        </div>
      )}
    </DpContentSet>
  );
}
