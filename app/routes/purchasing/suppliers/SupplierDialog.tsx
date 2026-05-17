import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/ui";
import { DpCodeInput } from "~/components/ui";
import { DpContentSet } from "~/components/ui";
import {
  getSupplierById,
  addSupplier,
  updateSupplier,
  type SupplierStatus,
} from "~/features/purchasing/suppliers";
import { generateSequenceCode } from "~/features/system/sequences";
import { getDocumentTypes } from "~/features/master/document-types";
import { getActiveCompanyCurrencyOptions } from "~/features/system/companies";
import { SUPPLIER_STATUS, statusToSelectOptions } from "~/constants/status-options";

export interface SupplierDialogProps {
  visible: boolean;
  supplierId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const STATUS_OPTIONS = statusToSelectOptions(SUPPLIER_STATUS);

export default function SupplierDialog({
  visible,
  supplierId,
  onSuccess,
  onHide,
}: SupplierDialogProps) {
  const isEdit = !!supplierId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [commercialName, setCommercialName] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentCondition, setPaymentCondition] = useState("");
  const [currency, setCurrency] = useState("");
  const [status, setStatus] = useState<SupplierStatus>("active");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [docTypesOpts, setDocTypesOpts] = useState<{ label: string; value: string }[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);
    getDocumentTypes("identity")
      .then(({ items }) => {
        setDocTypesOpts(items.map((i) => ({ label: i.name, value: i.id })));
      })
      .catch(() => setDocTypesOpts([]));

    if (!supplierId) {
      setCode("");
      setBusinessName("");
      setCommercialName("");
      setDocumentTypeId("");
      setDocumentNumber("");
      setContactName("");
      setEmail("");
      setPhone("");
      setPaymentCondition("");
      setCurrency("");
      setStatus("active");
      setLoading(false);
      return;
    }
    setLoading(true);
    getSupplierById(supplierId)
      .then((data) => {
        if (!data) {
          setError("Proveedor no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setBusinessName(data.businessName ?? "");
        setCommercialName(data.commercialName ?? "");
        setDocumentTypeId(data.documentTypeId ?? "");
        setDocumentNumber(data.documentNumber ?? "");
        setContactName(data.contact?.contactName ?? "");
        setEmail(data.contact?.email ?? "");
        setPhone(data.contact?.phone ?? "");
        setPaymentCondition(data.paymentCondition ?? "");
        setCurrency(data.currency ?? "");
        setStatus(data.status ?? "active");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, supplierId]);

  useEffect(() => {
    if (!visible) return;
    getActiveCompanyCurrencyOptions()
      .then(({ options, defaultCurrency }) => {
        const mapped = options.map((opt) => ({ label: opt.label, value: opt.value }));
        setCurrencyOptions(mapped);
        setCurrency(mapped.some((x) => x.value === currency) ? currency : defaultCurrency);
      })
      .catch(() => setCurrencyOptions([]));
  }, [visible]);

  const businessNameInvalid = touched && !businessName.trim();

  const save = async () => {
    setTouched(true);
    if (!businessName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      if (isEdit) {
        finalCode = code.trim();
      } else {
        try {
          finalCode = await generateSequenceCode(code, "supplier");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }
      }
      const payload = {
        code: finalCode,
        businessName: businessName.trim(),
        ...(commercialName.trim() ? { commercialName: commercialName.trim() } : {}),
        ...(documentTypeId.trim() ? { documentTypeId: documentTypeId.trim() } : {}),
        ...(documentNumber.trim() ? { documentNumber: documentNumber.trim() } : {}),
        contact: {
          ...(contactName.trim() ? { contactName: contactName.trim() } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        },
        ...(paymentCondition.trim() ? { paymentCondition: paymentCondition.trim() } : {}),
        ...(currency.trim() ? { currency: currency.trim() } : {}),
        status,
      };
      if (supplierId) {
        await updateSupplier(supplierId, payload);
      } else {
        await addSupplier(payload);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!businessName.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar proveedor" : "Agregar proveedor"}
      recordId={isEdit ? supplierId : null}
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
          entity="supplier"
          value={code}
          onChange={setCode}
          disabled={isEdit}
        />
        <DpInput
          type="input"
          label="Razón social *"
          name="businessName"
          value={businessName}
          onChange={setBusinessName}
          placeholder="Razón social del proveedor"
        />
        {businessNameInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            La razón social es obligatoria.
          </p>
        )}
        <DpInput
          type="input"
          label="Nombre comercial"
          name="commercialName"
          value={commercialName}
          onChange={setCommercialName}
          placeholder="Nombre comercial"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DpInput
            type="select"
            label="Tipo documento"
            name="documentTypeId"
            value={documentTypeId}
            onChange={(v) => setDocumentTypeId(String(v))}
            options={docTypesOpts}
            placeholder="Seleccione..."
          />
          <DpInput
            type="input"
            label="Nº documento"
            name="documentNumber"
            value={documentNumber}
            onChange={setDocumentNumber}
            placeholder="20123456789"
          />
        </div>

        <h4 className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Contacto</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DpInput
            type="input"
            label="Nombre contacto"
            name="contactName"
            value={contactName}
            onChange={setContactName}
            placeholder="Juan Pérez"
          />
          <DpInput
            type="input"
            label="Email"
            name="email"
            value={email}
            onChange={setEmail}
            placeholder="contacto@empresa.com"
          />
          <DpInput
            type="input"
            label="Teléfono"
            name="phone"
            value={phone}
            onChange={setPhone}
            placeholder="+51 999 999 999"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DpInput
            type="input"
            label="Condición de pago"
            name="paymentCondition"
            value={paymentCondition}
            onChange={setPaymentCondition}
            placeholder="Contado, 30 días..."
          />
          <DpInput
            type="select"
            label="Moneda"
            name="currency"
            value={currency}
            onChange={(v) => setCurrency(String(v))}
            options={currencyOptions}
          />
        </div>

        <DpInput
          type="select"
          label="Estado"
          name="status"
          value={status}
          onChange={(v) => setStatus(v as SupplierStatus)}
          options={STATUS_OPTIONS}
        />
      </div>
    </DpContentSet>
  );
}
