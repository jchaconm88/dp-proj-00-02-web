import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { generateSequenceCode } from "~/features/system/sequences";
import { getClients } from "~/features/master/clients";
import { getResources } from "~/features/human-resource/resources";
import {
  getSettlementById,
  createSettlement,
  updateSettlement,
  deleteSettlement,
  settlementToFormValues,
  syncSettlementItemsFromTrips,
  type Settlement,
  type SettlementFormValues,
} from "~/features/transport/settlements";
import {
  SETTLEMENT_TYPE,
  SETTLEMENT_CATEGORY,
  SETTLEMENT_STATUS,
  SETTLEMENT_PAYMENT_STATUS,
  CURRENCY,
  statusToSelectOptions,
} from "~/constants/status-options";
import type { ClientRecord } from "~/features/master/clients";
import type { ResourceRecord } from "~/features/human-resource/resources";

export interface SettlementDialogProps {
  visible: boolean;
  settlementId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const TYPE_OPTIONS = statusToSelectOptions(SETTLEMENT_TYPE);
const CATEGORY_OPTIONS = statusToSelectOptions(SETTLEMENT_CATEGORY);
const STATUS_OPTIONS = statusToSelectOptions(SETTLEMENT_STATUS);

/** Por pagar: Transportista, Proveedor, Recurso. Por cobrar: solo Cliente. */
const PAYABLE_CATEGORY_VALUES = new Set(["carrier", "provider", "resource"]);
const RECEIVABLE_CATEGORY_VALUES = new Set(["customer"]);

function categoryOptionsForType(t: SettlementFormValues["type"]) {
  return CATEGORY_OPTIONS.filter((o) =>
    t === "payable"
      ? PAYABLE_CATEGORY_VALUES.has(String(o.value))
      : RECEIVABLE_CATEGORY_VALUES.has(String(o.value))
  );
}

function defaultCategoryForType(t: SettlementFormValues["type"]): SettlementFormValues["category"] {
  return t === "payable" ? "carrier" : "customer";
}

function coerceCategoryForType(
  t: SettlementFormValues["type"],
  c: SettlementFormValues["category"]
): SettlementFormValues["category"] {
  const ok =
    t === "payable" ? PAYABLE_CATEGORY_VALUES.has(c) : RECEIVABLE_CATEGORY_VALUES.has(c);
  return ok ? c : defaultCategoryForType(t);
}
const PAYMENT_OPTIONS = statusToSelectOptions(SETTLEMENT_PAYMENT_STATUS);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);

function clientDisplayName(c: ClientRecord): string {
  const n = (c.commercialName || "").trim() || (c.businessName || "").trim();
  return n || (c.code || "").trim() || c.id;
}

function clientOptionLabel(c: ClientRecord): string {
  const code = (c.code || "").trim();
  const name = clientDisplayName(c);
  return code ? `${code} — ${name}` : name;
}

function resourceDisplayName(r: ResourceRecord): string {
  const full = `${(r.lastName || "").trim()} ${(r.firstName || "").trim()}`.trim();
  return full || (r.code || "").trim() || r.id;
}

function resourceOptionLabel(r: ResourceRecord): string {
  const code = (r.code || "").trim();
  const name = resourceDisplayName(r);
  return code ? `${code} — ${name}` : name;
}

function emptyForm(): SettlementFormValues {
  return {
    code: "",
    type: "payable",
    category: "carrier",
    entityType: "",
    entityId: "",
    entityName: "",
    periodStart: "",
    periodEnd: "",
    currency: "PEN",
    status: "draft",
    paymentStatus: "pending",
  };
}

export default function SettlementDialog({
  visible,
  settlementId,
  onSuccess,
  onHide,
}: SettlementDialogProps) {
  const isEdit = !!settlementId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [type, setType] = useState<SettlementFormValues["type"]>("payable");
  const [category, setCategory] = useState<SettlementFormValues["category"]>("carrier");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [entityName, setEntityName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [status, setStatus] = useState<SettlementFormValues["status"]>("draft");
  const [paymentStatus, setPaymentStatus] =
    useState<SettlementFormValues["paymentStatus"]>("pending");

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [listsLoading, setListsLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClientAndResourceLists = useCallback(async () => {
    setListsLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([getClients(), getResources()]);
      setClients(cRes.items);
      setResources(rRes.items);
    } catch {
      setClients([]);
      setResources([]);
    } finally {
      setListsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void loadClientAndResourceLists();
  }, [visible, loadClientAndResourceLists]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!settlementId) {
      const f = emptyForm();
      setCode(f.code);
      setType(f.type);
      setCategory(f.category);
      setEntityType(f.entityType);
      setEntityId(f.entityId);
      setEntityName(f.entityName);
      setPeriodStart(f.periodStart);
      setPeriodEnd(f.periodEnd);
      setCurrency(f.currency);
      setStatus(f.status);
      setPaymentStatus(f.paymentStatus);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSettlementById(settlementId)
      .then((doc) => {
        if (!doc) {
          setError("Liquidación no encontrada.");
          return;
        }
        const f = settlementToFormValues(doc);
        const coercedCat = coerceCategoryForType(f.type, f.category);
        const categoryInvalid = coercedCat !== f.category;
        setCode(f.code);
        setType(f.type);
        setCategory(coercedCat);
        if (categoryInvalid) {
          setEntityType("");
          setEntityId("");
          setEntityName("");
        } else {
          setEntityType(f.entityType);
          setEntityId(f.entityId);
          setEntityName(f.entityName);
        }
        setPeriodStart(f.periodStart);
        setPeriodEnd(f.periodEnd);
        setCurrency(f.currency);
        setStatus(f.status);
        setPaymentStatus(f.paymentStatus);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, settlementId]);

  const handleCategoryChange = (next: string | number) => {
    const nc = String(next) as SettlementFormValues["category"];
    if (nc !== category) {
      setEntityType("");
      setEntityId("");
      setEntityName("");
    }
    setCategory(nc);
  };

  const handleTypeChange = (next: string | number) => {
    const nextType = String(next) as SettlementFormValues["type"];
    setType(nextType);
    const allowedDefault = defaultCategoryForType(nextType);
    const currentOk =
      nextType === "payable"
        ? PAYABLE_CATEGORY_VALUES.has(category)
        : RECEIVABLE_CATEGORY_VALUES.has(category);
    if (!currentOk) {
      setEntityType("");
      setEntityId("");
      setEntityName("");
      setCategory(allowedDefault);
    }
  };

  const categorySelectOptions = useMemo(() => categoryOptionsForType(type), [type]);

  const handleEntityRefChange = (value: string | number) => {
    const id = String(value ?? "");
    if (category === "customer") {
      const c = clients.find((x) => x.id === id);
      if (!c) return;
      setEntityType("company");
      setEntityId(c.id);
      setEntityName(clientDisplayName(c));
      return;
    }
    if (category === "resource") {
      const r = resources.find((x) => x.id === id);
      if (!r) return;
      setEntityType("resource");
      setEntityId(r.id);
      setEntityName(resourceDisplayName(r));
    }
  };

  const buildFormValues = (): SettlementFormValues => ({
    code: code.trim(),
    type,
    category,
    entityType,
    entityId,
    entityName,
    periodStart,
    periodEnd,
    currency,
    status,
    paymentStatus,
  });

  const save = async () => {
    const pendingCarrierOrProvider = category === "carrier" || category === "provider";
    if (pendingCarrierOrProvider && !settlementId) {
      setError(
        "Transportista y Proveedor: la selección de entidad está pendiente. Elija Recurso o edite un documento ya existente."
      );
      return;
    }
    if (pendingCarrierOrProvider && settlementId && (!entityId.trim() || !entityName.trim())) {
      setError("Este documento no tiene entidad válida.");
      return;
    }
    if ((category === "customer" || category === "resource") && !entityId.trim()) {
      setError("Seleccione una entidad en el listado.");
      return;
    }
    if (!periodStart.trim() || !periodEnd.trim()) {
      setError("Indique inicio y fin del periodo.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      try {
        finalCode = await generateSequenceCode(code, "settlement");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }
      const values = { ...buildFormValues(), code: finalCode };
      let previous: Settlement | null = null;
      if (settlementId) {
        previous = await getSettlementById(settlementId);
      }
      let targetId: string;
      if (settlementId) {
        await updateSettlement(settlementId, values);
        targetId = settlementId;
      } else {
        targetId = await createSettlement(values);
      }
      const syncItems =
        values.category === "customer" || values.category === "resource";
      if (syncItems) {
        const syncResult = await syncSettlementItemsFromTrips(targetId);
        if (syncResult.itemCount === 0) {
          const msg =
            "No hay cargos ni costos que incluir en ítems para el periodo y entidad seleccionados. No se guardaron los cambios.";
          if (!settlementId) {
            await deleteSettlement(targetId);
          } else if (previous) {
            await updateSettlement(settlementId, settlementToFormValues(previous));
            await syncSettlementItemsFromTrips(settlementId);
          }
          setError(msg);
          return;
        }
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const clientOptions = clients.map((c) => ({
    label: clientOptionLabel(c),
    value: c.id,
  }));
  const resourceOptions = resources.map((r) => ({
    label: resourceOptionLabel(r),
    value: r.id,
  }));

  const showEntitySelect = category === "customer" || category === "resource";
  const entitySelectLabel =
    category === "customer" ? "Cliente" : category === "resource" ? "Recurso" : "Entidad";
  const entitySelectOptions = category === "customer" ? clientOptions : resourceOptions;
  const entitySelectValue = entityId;

  return (
    <DpContentSet
      title={isEdit ? "Editar liquidación" : "Nueva liquidación"}
      variant="dialog"
      visible={visible}
      onHide={onHide}
      onCancel={onHide}
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={loading}
      showLoading={loading}
      loadingMessage="Cargando liquidación..."
      showError={!!error}
      errorMessage={error ?? ""}
      dismissibleError
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DpCodeInput entity="settlement" value={code} onChange={setCode} />
        <DpInput
          type="select"
          label="Tipo"
          value={type}
          onChange={handleTypeChange}
          options={TYPE_OPTIONS}
        />
        <DpInput
          type="select"
          label="Categoría"
          value={category}
          onChange={handleCategoryChange}
          options={categorySelectOptions}
        />
        {showEntitySelect && (
          <div className="md:col-span-2">
            <DpInput
              type="select"
              label={entitySelectLabel}
              value={entitySelectValue}
              onChange={handleEntityRefChange}
              options={entitySelectOptions}
              placeholder={listsLoading ? "Cargando..." : "Seleccione..."}
              filter
              disabled={listsLoading}
            />
          </div>
        )}
        {(category === "carrier" || category === "provider") && (
          <p className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            Transportista y Proveedor: la selección de entidad desde catálogo estará disponible
            próximamente.
            {!settlementId && " No se pueden crear liquidaciones nuevas con esta categoría por ahora."}
          </p>
        )}
        <DpInput type="date" label="Periodo inicio" value={periodStart} onChange={setPeriodStart} />
        <DpInput type="date" label="Periodo fin" value={periodEnd} onChange={setPeriodEnd} />
        <DpInput
          type="select"
          label="Moneda"
          value={currency}
          onChange={(v) => setCurrency(String(v))}
          options={CURRENCY_OPTIONS}
        />
        <DpInput
          type="select"
          label="Estado documento"
          value={status}
          onChange={(v) => setStatus(String(v) as SettlementFormValues["status"])}
          options={STATUS_OPTIONS}
        />
        <DpInput
          type="select"
          label="Estado de pago"
          value={paymentStatus}
          onChange={(v) =>
            setPaymentStatus(String(v) as SettlementFormValues["paymentStatus"])
          }
          options={PAYMENT_OPTIONS}
        />
      </div>
    </DpContentSet>
  );
}
