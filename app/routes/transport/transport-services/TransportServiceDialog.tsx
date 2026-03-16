import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
    getTransportService,
    addTransportService,
    updateTransportService,
    type ServiceTypeCategory,
    type CalculationType,
} from "~/features/transport/transport-services";
import { SERVICE_TYPE_CATEGORY, CALCULATION_TYPE, statusToSelectOptions } from "~/constants/status-options";

export interface TransportServiceDialogProps {
    visible: boolean;
    serviceId: string | null;
    onSuccess?: () => void;
    onHide: () => void;
}

const CATEGORY_OPTIONS = statusToSelectOptions(SERVICE_TYPE_CATEGORY);
const CALCULATION_OPTIONS = statusToSelectOptions(CALCULATION_TYPE);

export default function TransportServiceDialog({
    visible,
    serviceId,
    onSuccess,
    onHide,
}: TransportServiceDialogProps) {
    const isEdit = !!serviceId;
    const navigation = useNavigation();
    const isNavigating = navigation.state !== "idle";

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<ServiceTypeCategory>("distribution");
    const [defaultServiceTimeMin, setDefaultServiceTimeMin] = useState<number>(0);
    const [calculationType, setCalculationType] = useState<CalculationType>("fixed");
    const [requiresAppointment, setRequiresAppointment] = useState(false);
    const [allowConsolidation, setAllowConsolidation] = useState(true);
    const [active, setActive] = useState(true);

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

        if (!serviceId) {
            setCode("");
            setName("");
            setDescription("");
            setCategory("distribution");
            setDefaultServiceTimeMin(0);
            setCalculationType("fixed");
            setRequiresAppointment(false);
            setAllowConsolidation(true);
            setActive(true);
            setLoading(false);
            return;
        }

        setLoading(true);
        getTransportService(serviceId)
            .then((data) => {
                if (!data) {
                    setError("Servicio de transporte no encontrado.");
                    return;
                }
                setCode(data.code);
                setName(data.name);
                setDescription(data.description);
                setCategory(data.category);
                setDefaultServiceTimeMin(data.defaultServiceTimeMin);
                setCalculationType(data.calculationType);
                setRequiresAppointment(data.requiresAppointment);
                setAllowConsolidation(data.allowConsolidation);
                setActive(data.active);
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
            .finally(() => setLoading(false));
    }, [visible, serviceId]);

    const save = async () => {
        if (!code.trim() || !name.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const payload = {
                code: code.trim(),
                name: name.trim(),
                description: description.trim(),
                category,
                defaultServiceTimeMin: defaultServiceTimeMin || 0,
                calculationType,
                requiresAppointment,
                allowConsolidation,
                active,
            };

            if (serviceId) {
                await updateTransportService(serviceId, payload);
            } else {
                await addTransportService(payload);
            }
            onSuccess?.();
            handleHide();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar.");
        } finally {
            setSaving(false);
        }
    };

    const valid = !!code.trim() && !!name.trim();

    return (
        <DpContentSet
            title={isEdit ? "Editar Servicio de Transporte" : "Agregar Servicio de Transporte"}
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

                    <DpInput type="input" label="Código" name="code" value={code} onChange={setCode} placeholder="DIST-001" disabled={isEdit} />
                    <DpInput type="input" label="Nombre" name="name" value={name} onChange={setName} placeholder="Distribución Local" />
                    <DpInput type="input" label="Descripción" name="description" value={description} onChange={setDescription} placeholder="Detalle del servicio" />

                    <DpInput
                        type="select"
                        label="Categoría"
                        name="category"
                        value={category}
                        onChange={(v) => setCategory(v as ServiceTypeCategory)}
                        options={CATEGORY_OPTIONS}
                    />

                    <DpInput
                        type="input-decimal"
                        label="Tiempo estimado (minutos)"
                        name="defaultServiceTimeMin"
                        value={String(defaultServiceTimeMin)}
                        onChange={(val) => setDefaultServiceTimeMin(Number(val) || 0)}
                    />

                    <DpInput
                        type="select"
                        label="Tipo de cálculo"
                        name="calculationType"
                        value={calculationType}
                        onChange={(v) => setCalculationType(v as CalculationType)}
                        options={CALCULATION_OPTIONS}
                    />

                    <div className="mt-2 flex flex-col gap-2">
                        <DpInput type="check" label="Requiere Cita" name="requiresAppointment" value={requiresAppointment} onChange={setRequiresAppointment} />
                        <DpInput type="check" label="Permite Consolidación" name="allowConsolidation" value={allowConsolidation} onChange={setAllowConsolidation} />
                        <DpInput type="check" label="Activo" name="active" value={active} onChange={setActive} />
                    </div>
                </div>
            )}
        </DpContentSet>
    );
}
