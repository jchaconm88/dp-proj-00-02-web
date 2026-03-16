import { useState, useEffect } from "react";
import { useNavigation, useNavigate } from "react-router";
import { Button } from "primereact/button";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import {
    getClient,
    addClient,
    updateClient,
    type ClientStatus,
    type PaymentCondition,
} from "~/features/master/clients";
import { CLIENT_STATUS, PAYMENT_CONDITION, CURRENCY, statusToSelectOptions } from "~/constants/status-options";
import { resolveCodeIfEmpty } from "~/features/system/sequences";
import { getDocumentTypes } from "~/features/master/document-types";

export interface ClientDialogProps {
    visible: boolean;
    clientId: string | null;
    onSuccess?: () => void;
    onHide: () => void;
}

const CLIENT_STATUS_OPTIONS = statusToSelectOptions(CLIENT_STATUS);
const PAYMENT_OPTIONS = statusToSelectOptions(PAYMENT_CONDITION);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);



export default function ClientDialog({
    visible,
    clientId,
    onSuccess,
    onHide,
}: ClientDialogProps) {
    const isEdit = !!clientId;
    const navigate = useNavigate();
    const navigation = useNavigation();
    const isNavigating = navigation.state !== "idle";

    const [code, setCode] = useState("");
    const [businessName, setBusinessName] = useState("");
    const [commercialName, setCommercialName] = useState("");
    const [documentTypeId, setDocumentTypeId] = useState("");
    const [documentType, setDocumentType] = useState("");
    const [docTypesOpts, setDocTypesOpts] = useState<{ label: string; value: string }[]>([]);
    const [documentNumber, setDocumentNumber] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [creditDays, setCreditDays] = useState<string>("");
    const [creditLimit, setCreditLimit] = useState<string>("");
    const [currency, setCurrency] = useState("PEN");
    const [paymentCondition, setPaymentCondition] = useState<PaymentCondition>("transfer");
    const [priority, setPriority] = useState<string>("");
    const [requiresAppointment, setRequiresAppointment] = useState(false);
    const [defaultServiceTimeMin, setDefaultServiceTimeMin] = useState<string>("");
    const [status, setStatus] = useState<ClientStatus>("active");

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleHide = () => {
        if (!saving && !isNavigating) {
            onHide();
        }
    };

    useEffect(() => {
        if (!visible) return;
        setError(null);
        getDocumentTypes()
            .then(({ items }) => {
                setDocTypesOpts(items.map((i) => ({ label: i.name, value: i.id })));
            })
            .catch(() => setDocTypesOpts([]));
        if (!clientId) {
            setCode("");
            setBusinessName("");
            setCommercialName("");
            setDocumentTypeId("");
            setDocumentType("");
            setDocumentNumber("");
            setContactName("");
            setContactEmail("");
            setContactPhone("");
            setCreditDays("");
            setCreditLimit("");
            setCurrency("PEN");
            setPaymentCondition("transfer");
            setPriority("");
            setRequiresAppointment(false);
            setDefaultServiceTimeMin("");
            setStatus("active");
            setLoading(false);
            return;
        }

        setLoading(true);
        getClient(clientId)
            .then((data) => {
                if (!data) {
                    setError("Cliente no encontrado.");
                    return;
                }
                setCode(data.code ?? "");
                setBusinessName(data.businessName ?? "");
                setCommercialName(data.commercialName ?? "");
                setDocumentTypeId(data.documentTypeId ?? "");
                setDocumentType(data.documentType ?? "");
                setDocumentNumber(data.documentNumber ?? "");
                setContactName(data.contact.contactName ?? "");
                setContactEmail(data.contact.email ?? "");
                setContactPhone(data.contact.phone ?? "");
                setCreditDays(String(data.billing.creditDays ?? ""));
                setCreditLimit(String(data.billing.creditLimit ?? ""));
                setCurrency(data.billing.currency ?? "PEN");
                setPaymentCondition(data.billing.paymentCondition ?? "transfer");
                setPriority(String(data.logistics.priority ?? ""));
                setRequiresAppointment(data.logistics.requiresAppointment ?? false);
                setDefaultServiceTimeMin(String(data.logistics.defaultServiceTimeMin ?? ""));
                setStatus(data.status ?? "active");
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
            .finally(() => setLoading(false));
    }, [visible, clientId]);

    const save = async () => {
        if (!businessName.trim()) return;
        if (isEdit && !code.trim()) return;
        setSaving(true);
        setError(null);
        try {
            let finalCode: string;
            if (isEdit) {
                finalCode = code.trim();
            } else {
                try {
                    finalCode = await resolveCodeIfEmpty(code, "client");
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Error al generar código.");
                    setSaving(false);
                    return;
                }
            }

            const payload = {
                code: finalCode,
                businessName: businessName.trim(),
                commercialName: commercialName.trim(),
                documentTypeId: documentTypeId.trim(),
                documentType: documentType.trim(),
                documentNumber: documentNumber.trim(),
                contact: {
                    contactName: contactName.trim(),
                    email: contactEmail.trim(),
                    phone: contactPhone.trim(),
                },
                billing: {
                    creditDays: Number(creditDays) || 0,
                    creditLimit: Number(creditLimit) || 0,
                    currency: currency.trim() || "PEN",
                    paymentCondition,
                },
                logistics: {
                    priority: Number(priority) || 0,
                    requiresAppointment,
                    defaultServiceTimeMin: Number(defaultServiceTimeMin) || 0,
                },
                status,
            };

            if (clientId) {
                await updateClient(clientId, payload);
            } else {
                await addClient(payload);
            }
            onSuccess?.();
            onHide();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar.");
        } finally {
            setSaving(false);
        }
    };

    const valid = !!businessName.trim() && (isEdit ? !!code.trim() : true);

    const goToLocations = () => {
        if (clientId) navigate(`/master/clients/${encodeURIComponent(clientId)}/locations`);
    };

    return (
        <DpContentSet
            title={isEdit ? "Editar cliente" : "Agregar cliente"}
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <DpCodeInput entity="client" label="Código" name="code" value={code} onChange={setCode} />
                        <DpInput type="select" label="Estado" name="status" value={status} onChange={(v) => setStatus(v as ClientStatus)} options={CLIENT_STATUS_OPTIONS} />
                    </div>

                    <DpInput type="input" label="Razón social" name="businessName" value={businessName} onChange={setBusinessName} placeholder="Supermercados Norte SAC" />
                    <DpInput type="input" label="Nombre comercial" name="commercialName" value={commercialName} onChange={setCommercialName} placeholder="Super Norte" />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <DpInput
                            type="select" label="Tipo documento" name="documentTypeId"
                            value={documentTypeId}
                            onChange={(v) => {
                                setDocumentTypeId(String(v));
                                const found = docTypesOpts.find((o) => o.value === String(v));
                                setDocumentType(found ? found.label : "");
                            }}
                            options={docTypesOpts}
                            placeholder="Seleccione..."
                        />
                        <DpInput type="input" label="Nº documento" name="documentNumber" value={documentNumber} onChange={setDocumentNumber} placeholder="20123456789" />
                    </div>

                    <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
                        <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Contacto</h4>
                        <div className="flex flex-col gap-3">
                            <DpInput type="input" label="Nombre contacto" name="contactName" value={contactName} onChange={setContactName} placeholder="María Torres" />
                            <DpInput type="input" label="Email" name="contactEmail" value={contactEmail} onChange={setContactEmail} placeholder="maria.torres@supernorte.pe" />
                            <DpInput type="input" label="Teléfono" name="contactPhone" value={contactPhone} onChange={setContactPhone} placeholder="999888777" />
                        </div>
                    </div>

                    <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
                        <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Facturación</h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <DpInput type="number" label="Días de crédito" name="creditDays" value={creditDays} onChange={setCreditDays} placeholder="30" />
                            <DpInput type="number" label="Límite de crédito" name="creditLimit" value={creditLimit} onChange={setCreditLimit} placeholder="50000" />
                            <DpInput type="select" label="Moneda" name="currency" value={currency} onChange={(v) => setCurrency(String(v))} options={CURRENCY_OPTIONS} />
                            <DpInput type="select" label="Condición de pago" name="paymentCondition" value={paymentCondition} onChange={(v) => setPaymentCondition(v as PaymentCondition)} options={PAYMENT_OPTIONS} />
                        </div>
                    </div>

                    <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
                        <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Logística</h4>
                        <div className="flex flex-col gap-3">
                            <DpInput type="number" label="Prioridad" name="priority" value={priority} onChange={setPriority} placeholder="2" />
                            <DpInput type="number" label="Tiempo de servicio por defecto (min)" name="defaultServiceTimeMin" value={defaultServiceTimeMin} onChange={setDefaultServiceTimeMin} placeholder="30" />
                            <DpInput type="check" label="Requiere cita" name="requiresAppointment" value={requiresAppointment} onChange={setRequiresAppointment} />
                        </div>
                    </div>

                    {isEdit && clientId && (
                        <Button label="Gestionar ubicaciones" severity="secondary" onClick={goToLocations} className="w-full" type="button" />
                    )}
                </div>
            )}
        </DpContentSet>
    );
}
