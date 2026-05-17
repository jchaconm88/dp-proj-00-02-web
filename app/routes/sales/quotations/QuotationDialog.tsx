import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/ui";
import { DpCodeInput } from "~/components/ui";
import { DpContentSet } from "~/components/ui";
import { DpConfirmDialog } from "~/components/ui";
import {
  getQuotationById,
  addQuotation,
  updateQuotation,
  type QuotationStatus,
} from "~/features/sales/quotations";
import { generateSequenceCode } from "~/features/system/sequences";
import { getClients } from "~/features/master/clients";
import { getActiveCompanyCurrencyOptions } from "~/features/system/companies";
import { QUOTATION_STATUS, statusToSelectOptions } from "~/constants/status-options";
import { useLocationContext } from "~/lib/location-context";
import ClientDialog from "../../master/clients/ClientDialog";

export interface QuotationDialogProps {
  visible: boolean;
  quotationId: string | null;
  onSuccess?: (createdQuotationId?: string) => void;
  onHide: () => void;
}

const STATUS_OPTIONS = statusToSelectOptions(QUOTATION_STATUS);

export default function QuotationDialog({
  visible,
  quotationId,
  onSuccess,
  onHide,
}: QuotationDialogProps) {
  const isEdit = !!quotationId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const { activeLocationId, locations } = useLocationContext();

  const [code, setCode] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<QuotationStatus>("draft");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientOptions, setClientOptions] = useState<Array<{ label: string; value: string; name: string }>>([]);
  const [currencyOptions, setCurrencyOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [showNoClientsConfirm, setShowNoClientsConfirm] = useState(false);
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  const [clientIdsBeforeCreate, setClientIdsBeforeCreate] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!quotationId) {
      // Reset form for new quotation
      setCode("");
      setClientId("");
      setClientName("");
      setIssueDate(new Date().toISOString().slice(0, 10));
      setValidUntil("");
      setCurrency("PEN");
      setNotes("");
      setStatus("draft");
      setLoading(false);
      return;
    }

    setLoading(true);
    getQuotationById(quotationId)
      .then((data) => {
        if (!data) {
          setError("Cotización no encontrada.");
          return;
        }
        setCode(data.code ?? "");
        setClientId(data.clientId ?? "");
        setClientName(data.clientName ?? "");
        setIssueDate(data.issueDate ?? "");
        setValidUntil(data.validUntil ?? "");
        setCurrency(data.currency ?? "PEN");
        setNotes(data.notes ?? "");
        setStatus(data.status ?? "draft");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, quotationId]);

  useEffect(() => {
    if (!visible || isEdit) return;
    let cancelled = false;
    const loadClients = async () => {
      try {
        const { items } = await getClients();
        if (cancelled) return;
        const mapped = items.map((c) => ({
          label: `${c.businessName || c.commercialName || c.documentNumber || c.id} (${c.id})`,
          value: c.id,
          name: c.businessName || c.commercialName || c.documentNumber || c.id,
        }));
        setClientOptions(mapped);
        if (mapped.length === 0) {
          setShowNoClientsConfirm(true);
        }
      } catch (err) {
        if (cancelled) return;
        setClientOptions([]);
        setError(err instanceof Error ? err.message : "No se pudo cargar clientes.");
      }
    };
    void loadClients();
    return () => {
      cancelled = true;
    };
  }, [visible, isEdit]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getActiveCompanyCurrencyOptions()
      .then(({ options, defaultCurrency }) => {
        if (cancelled) return;
        const mapped = options.map((opt) => ({ label: opt.label, value: opt.value }));
        setCurrencyOptions(mapped);
        setCurrency((prev) => (mapped.some((x) => x.value === prev) ? prev : defaultCurrency));
      })
      .catch((err) => {
        if (cancelled) return;
        setCurrencyOptions([]);
        setError(err instanceof Error ? err.message : "No se pudo cargar configuración de monedas.");
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const save = async () => {
    if (!clientId.trim()) {
      setError("El cliente es obligatorio.");
      return;
    }

    const locationName =
      locations.find((l) => l.id === activeLocationId)?.name ?? "";

    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      if (isEdit) {
        finalCode = code.trim();
      } else {
        try {
          finalCode = await generateSequenceCode(code, "quotation");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }
      }

      const payload = {
        code: finalCode,
        clientId: clientId.trim(),
        clientName:
          (isEdit ? clientName : clientOptions.find((x) => x.value === clientId)?.name || clientName).trim(),
        issueDate,
        validUntil: validUntil || undefined,
        currency: currency.trim() || "PEN",
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        notes: notes.trim() || undefined,
        status,
        locationId: activeLocationId ?? "",
        locationName,
      };

      if (quotationId) {
        await updateQuotation(quotationId, payload);
        onSuccess?.();
      } else {
        const createdQuotationId = await addQuotation(payload);
        onSuccess?.(createdQuotationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!clientId.trim() && !!currency.trim();

  return (
    <>
      <DpContentSet
        title={isEdit ? "Editar cotización" : "Agregar cotización"}
        recordId={isEdit ? quotationId : null}
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
          <DpCodeInput
            entity="quotation"
            value={code}
            onChange={setCode}
            disabled={isEdit}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isEdit ? (
              <>
                <DpInput
                  type="input"
                  label="ID Cliente"
                  name="clientId"
                  value={clientId}
                  onChange={setClientId}
                  placeholder="ID del cliente"
                />
                <DpInput
                  type="input"
                  label="Nombre del cliente *"
                  name="clientName"
                  value={clientName}
                  onChange={setClientName}
                  placeholder="Nombre o razón social del cliente"
                />
              </>
            ) : (
              <DpInput
                type="select"
                label="Cliente *"
                name="clientId"
                value={clientId}
                onChange={(v) => {
                  const selectedId = String(v);
                  setClientId(selectedId);
                  const selected = clientOptions.find((x) => x.value === selectedId);
                  setClientName(selected?.name ?? "");
                }}
                options={clientOptions.map((x) => ({ label: x.label, value: x.value }))}
                placeholder="Seleccionar cliente"
                filter
              />
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DpInput
              type="date"
              label="Fecha de emisión"
              name="issueDate"
              value={issueDate}
              onChange={setIssueDate}
            />
            <DpInput
              type="date"
              label="Válido hasta"
              name="validUntil"
              value={validUntil}
              onChange={setValidUntil}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DpInput
              type="select"
              label="Moneda"
              name="currency"
              value={currency}
              onChange={(v) => setCurrency(String(v))}
              options={currencyOptions}
              placeholder="Seleccionar moneda"
            />
            <DpInput
              type="select"
              label="Estado"
              name="status"
              value={status}
              onChange={(v) => setStatus(v as QuotationStatus)}
              options={STATUS_OPTIONS}
            />
          </div>
          <DpInput
            type="textarea"
            label="Notas"
            name="notes"
            value={notes}
            onChange={setNotes}
            placeholder="Observaciones adicionales..."
          />
        </div>
      </DpContentSet>

      <DpConfirmDialog
        visible={showNoClientsConfirm}
        onHide={() => setShowNoClientsConfirm(false)}
        title="No hay clientes creados"
        message="No existen clientes creados. ¿Desea crear un cliente nuevo ahora?"
        confirmLabel="Sí, crear cliente"
        cancelLabel="No"
        severity="primary"
        onConfirm={() => {
          setClientIdsBeforeCreate(clientOptions.map((x) => x.value));
          setShowNoClientsConfirm(false);
          setShowCreateClientDialog(true);
        }}
      />

      <ClientDialog
        visible={showCreateClientDialog}
        clientId={null}
        onHide={() => setShowCreateClientDialog(false)}
        onSuccess={() => {
          setShowCreateClientDialog(false);
          getClients()
            .then(({ items }) => {
              const mapped = items.map((c) => ({
                label: `${c.businessName || c.commercialName || c.documentNumber || c.id} (${c.id})`,
                value: c.id,
                name: c.businessName || c.commercialName || c.documentNumber || c.id,
              }));
              setClientOptions(mapped);
              const created = mapped.find((x) => !clientIdsBeforeCreate.includes(x.value)) ?? mapped[0];
              if (created) {
                setClientId(created.value);
                setClientName(created.name);
              }
            })
            .catch((err) => {
              setError(err instanceof Error ? err.message : "No se pudo refrescar clientes.");
            });
        }}
      />
    </>
  );
}
