import { useState, useEffect } from "react";
import { useNavigation, useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getContract,
  addContract,
  updateContract,
  type ContractStatus,
  type BillingCycle,
} from "~/features/transport/transport-contracts";
import { CONTRACT_STATUS, BILLING_CYCLE, statusToSelectOptions } from "~/constants/status-options";
import { getClients, type ClientRecord } from "~/features/master/clients";

export interface TransportContractDialogProps {
  visible: boolean;
  contractId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const CONTRACT_STATUS_OPTIONS = statusToSelectOptions(CONTRACT_STATUS);
const BILLING_OPTIONS = statusToSelectOptions(BILLING_CYCLE);

const CURRENCY_OPTIONS = [
  { label: "Soles (PEN)", value: "PEN" },
  { label: "Dólares (USD)", value: "USD" },
];

export default function TransportContractDialog({
  visible,
  contractId,
  onSuccess,
  onHide,
}: TransportContractDialogProps) {
  const isEdit = !!contractId;
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isNavigating = navigation.state !== "idle";

  const [clients, setClients] = useState<{ label: string; value: string; raw: ClientRecord }[]>([]);
  const [clientId, setClientId] = useState("");
  const [client, setClient] = useState("");
  const [contractCode, setContractCode] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [status, setStatus] = useState<ContractStatus>("draft");
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHide = () => {
    if (!saving && !isNavigating) onHide();
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);

    getClients()
      .then(({ items }) => {
        setClients(
          items.map((c) => ({
            label: (c.commercialName || c.businessName || c.code || c.id).trim(),
            value: c.id,
            raw: c,
          }))
        );
      })
      .catch(() => setClients([]));

    if (!contractId) {
      setClientId("");
      setClient("");
      setContractCode("");
      setDescription("");
      setCurrency("PEN");
      const today = new Date().toISOString().slice(0, 10);
      setValidFrom(today);
      setValidTo("");
      setBillingCycle("monthly");
      setPaymentTermsDays(30);
      setStatus("draft");
      setLoading(false);
      return;
    }

    setLoading(true);
    getContract(contractId)
      .then((data) => {
        if (!data) {
          setError("Contrato no encontrado.");
          return;
        }
        setClientId(data.clientId ?? "");
        setClient(data.client ?? "");
        setContractCode(data.contractCode ?? "");
        setDescription(data.description ?? "");
        setCurrency(data.currency ?? "PEN");
        setValidFrom(data.validFrom ?? "");
        setValidTo(data.validTo ?? "");
        setBillingCycle(data.billingCycle ?? "monthly");
        setPaymentTermsDays(data.paymentTermsDays ?? 30);
        setStatus(data.status ?? "draft");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, contractId]);

  const onClientChange = (value: string) => {
    const id = value ?? "";
    setClientId(id);
    const c = clients.find((x) => x.value === id);
    if (c) setClient(c.label);
    else setClient("");
  };

  const save = async () => {
    if (!clientId.trim() || !contractCode.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        clientId: clientId.trim(),
        client: client.trim(),
        contractCode: contractCode.trim(),
        description: description.trim(),
        currency: currency.trim() || "PEN",
        validFrom: validFrom.trim(),
        validTo: validTo.trim(),
        billingCycle,
        paymentTermsDays: paymentTermsDays || 30,
        status,
      };
      if (contractId) {
        await updateContract(contractId, payload);
      } else {
        await addContract(payload);
      }
      onSuccess?.();
      handleHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!clientId.trim() && !!contractCode.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar contrato" : "Agregar contrato"}
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

          <DpInput
            type="select"
            label="Cliente"
            name="clientId"
            value={clientId}
            onChange={(v) => onClientChange(String(v))}
            options={clients}
            placeholder="Seleccione un cliente"
            filter
          />
          <DpInput
            type="input"
            label="Código contrato"
            name="contractCode"
            value={contractCode}
            onChange={setContractCode}
            placeholder="CONT-2026-001"
          />
          <DpInput
            type="input"
            label="Descripción"
            name="description"
            value={description}
            onChange={setDescription}
            placeholder="Contrato distribución Lima Metropolitana"
          />
          <DpInput
            type="select"
            label="Moneda"
            name="currency"
            value={currency}
            onChange={(v) => setCurrency(String(v))}
            options={CURRENCY_OPTIONS}
          />
          <div className="grid grid-cols-2 gap-4">
            <DpInput
              type="date"
              label="Vigencia desde"
              name="validFrom"
              value={validFrom}
              onChange={setValidFrom}
            />
            <DpInput
              type="date"
              label="Vigencia hasta"
              name="validTo"
              value={validTo}
              onChange={setValidTo}
            />
          </div>
          <DpInput
            type="select"
            label="Ciclo de facturación"
            name="billingCycle"
            value={billingCycle}
            onChange={(v) => setBillingCycle(v as BillingCycle)}
            options={BILLING_OPTIONS}
          />
          <DpInput
            type="number"
            label="Días para pago"
            name="paymentTermsDays"
            value={String(paymentTermsDays)}
            onChange={(v) => setPaymentTermsDays(Number(v) || 30)}
          />
          <DpInput
            type="select"
            label="Estado"
            name="status"
            value={status}
            onChange={(v) => setStatus(v as ContractStatus)}
            options={CONTRACT_STATUS_OPTIONS}
          />
          
          {isEdit && contractId && (
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <Button
                label="Gestionar reglas de tarifa"
                icon="pi pi-list"
                severity="info"
                outlined
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/transport/transport-contracts/${encodeURIComponent(contractId)}/transport-rate-rules`);
                }}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </DpContentSet>
  );
}
