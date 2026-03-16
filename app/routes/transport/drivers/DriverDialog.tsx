import { useState, useEffect, useCallback } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
    getDriver,
    addDriver,
    updateDriver,
    type DriverRelationshipType,
    type DriverStatus,
} from "~/features/transport/drivers";
import { getEmployees } from "~/features/human-resource/employees";
import { DRIVER_STATUS, DRIVER_RELATIONSHIP, statusToSelectOptions } from "~/constants/status-options";

export interface DriverDialogProps {
    visible: boolean;
    driverId: string | null;
    onSuccess?: () => void;
    onHide: () => void;
}

const RELATIONSHIP_OPTIONS = statusToSelectOptions(DRIVER_RELATIONSHIP);
const DRIVER_STATUS_OPTIONS = statusToSelectOptions(DRIVER_STATUS);

const DOCUMENT_OPTIONS = [
    { label: "DNI", value: "DNI" },
    { label: "CE", value: "CE" },
    { label: "Pasaporte", value: "PASAPORTE" },
];

export default function DriverDialog({
    visible,
    driverId,
    onSuccess,
    onHide,
}: DriverDialogProps) {
    const isEdit = !!driverId;
    const navigation = useNavigation();
    const isNavigating = navigation.state !== "idle";

    const [relationshipType, setRelationshipType] = useState<DriverRelationshipType>("contractor");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [documentNo, setDocumentNo] = useState("");
    const [documentId, setDocumentId] = useState<string | null>(null);
    const [phoneNo, setPhoneNo] = useState("");
    const [licenseNo, setLicenseNo] = useState("");
    const [licenseCategory, setLicenseCategory] = useState("");
    const [licenseExpiration, setLicenseExpiration] = useState("");
    const [status, setStatus] = useState<DriverStatus>("available");
    const [currentTripId, setCurrentTripId] = useState("");

    const [employees, setEmployees] = useState<{ id: string; label: string; raw: any }[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleHide = () => {
        if (!saving && !isNavigating) {
            onHide();
        }
    };

    const isEmployee = relationshipType === "employee";
    const lockedFromEmployee = isEmployee && selectedEmployeeId;

    const loadEmployeeIntoForm = useCallback((emp: any) => {
        setFirstName(emp.firstName ?? "");
        setLastName(emp.lastName ?? "");
        setDocumentNo(emp.documentNo ?? "");
        setDocumentId(emp.documentTypeId ?? "DNI"); // Assuming employee has documentTypeId
        setPhoneNo(emp.phone ?? ""); // Assuming employee has phone
    }, []);

    useEffect(() => {
        if (!visible) return;
        setError(null);

        // Load employees asynchronously for the dropdown
        getEmployees()
            .then(({ items }) => {
                setEmployees(items.map((e) => ({
                    id: e.id,
                    label: `${e.firstName} ${e.lastName} (${e.code})`,
                    raw: e,
                })));
            })
            .catch(() => setEmployees([]));

        if (!driverId) {
            setRelationshipType("contractor");
            setSelectedEmployeeId(null);
            setFirstName("");
            setLastName("");
            setDocumentNo("");
            setDocumentId(null);
            setPhoneNo("");
            setLicenseNo("");
            setLicenseCategory("");
            setLicenseExpiration("");
            setStatus("available");
            setCurrentTripId("");
            setLoading(false);
            return;
        }

        setLoading(true);
        getDriver(driverId)
            .then((data) => {
                if (!data) {
                    setError("Conductor no encontrado.");
                    return;
                }
                setRelationshipType(data.relationshipType);
                setSelectedEmployeeId(data.employeeId);
                setFirstName(data.firstName);
                setLastName(data.lastName);
                setDocumentNo(data.documentNo);
                setDocumentId(data.documentId || null);
                setPhoneNo(data.phoneNo);
                setLicenseNo(data.licenseNo);
                setLicenseCategory(data.licenseCategory);
                setLicenseExpiration(data.licenseExpiration);
                setStatus(data.status);
                setCurrentTripId(data.currentTripId);
            })
            .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
            .finally(() => setLoading(false));
    }, [visible, driverId]);

    useEffect(() => {
        if (!visible || !isEmployee || !selectedEmployeeId) return;
        const emp = employees.find(e => e.id === selectedEmployeeId);
        if (emp && emp.raw) {
            loadEmployeeIntoForm(emp.raw);
        }
    }, [visible, isEmployee, selectedEmployeeId, employees, loadEmployeeIntoForm]);

    const onRelationshipTypeChange = (value: DriverRelationshipType) => {
        setRelationshipType(value);
        if (value === "contractor") {
            setSelectedEmployeeId(null);
            setFirstName("");
            setLastName("");
            setDocumentNo("");
            setDocumentId(null);
            setPhoneNo("");
        }
    };

    const save = async () => {
        if (!firstName.trim() || !lastName.trim()) return;
        if (isEmployee && !selectedEmployeeId) return;
        if (!isEmployee && !documentId) return;

        const empId = isEmployee ? selectedEmployeeId : null;
        const docId = documentId ?? "";

        setSaving(true);
        setError(null);
        try {
            const payload = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                documentNo: documentNo.trim(),
                documentId: docId,
                phoneNo: phoneNo.trim(),
                licenseNo: licenseNo.trim(),
                licenseCategory: licenseCategory.trim(),
                licenseExpiration: licenseExpiration.trim() || "",
                relationshipType,
                employeeId: empId,
                status,
                currentTripId: currentTripId.trim() || "",
            };

            if (driverId) {
                await updateDriver(driverId, payload);
            } else {
                await addDriver(payload);
            }
            onSuccess?.();
            handleHide();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar.");
        } finally {
            setSaving(false);
        }
    };

    const employeeOptions = employees.map((e) => ({ label: e.label, value: e.id }));

    const valid =
        !!firstName.trim() &&
        !!lastName.trim() &&
        (isEmployee ? !!selectedEmployeeId : !!documentId);

    return (
        <DpContentSet
            title={isEdit ? "Editar conductor" : "Agregar conductor"}
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
                        label="Tipo de vínculo"
                        name="relationshipType"
                        value={relationshipType}
                        onChange={(v) => onRelationshipTypeChange(v as DriverRelationshipType)}
                        options={RELATIONSHIP_OPTIONS}
                        placeholder="Seleccionar tipo"
                    />

                    {isEmployee && (
                        <div className="flex flex-col gap-2">
                            <DpInput
                                type="select"
                                label="Empleado"
                                name="employeeId"
                                value={selectedEmployeeId ?? ""}
                                onChange={(v) => setSelectedEmployeeId(v ? String(v) : null)}
                                options={employeeOptions}
                                placeholder="Seleccionar empleado"
                                filter
                            />
                            {lockedFromEmployee && (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Los datos personales se completan desde el empleado seleccionado.
                                </span>
                            )}
                        </div>
                    )}

                    <DpInput type="input" label="Nombres" name="firstName" value={firstName} onChange={setFirstName} placeholder="Juan" disabled={!!lockedFromEmployee} />
                    <DpInput type="input" label="Apellidos" name="lastName" value={lastName} onChange={setLastName} placeholder="Pérez" disabled={!!lockedFromEmployee} />
                    <DpInput type="input" label="Nº documento" name="documentNo" value={documentNo} onChange={setDocumentNo} placeholder="12345678" disabled={!!lockedFromEmployee} />

                    {isEmployee ? (
                        <DpInput type="input" label="Tipo de documento" name="documentId" value={documentId ?? ""} onChange={() => { }} disabled placeholder="Desde empleado" />
                    ) : (
                        <DpInput
                            type="select"
                            label="Tipo de documento"
                            name="documentId"
                            value={documentId ?? ""}
                            onChange={(v) => setDocumentId(v ? String(v) : null)}
                            options={DOCUMENT_OPTIONS}
                            placeholder="Seleccionar documento"
                        />
                    )}

                    <DpInput type="input" label="Teléfono" name="phoneNo" value={phoneNo} onChange={setPhoneNo} placeholder="999999999" disabled={!!lockedFromEmployee} />

                    <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
                        <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Datos de Licencia</h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <DpInput type="input" label="Nº Licencia" name="licenseNo" value={licenseNo} onChange={setLicenseNo} placeholder="A3C-445566" />
                            <DpInput type="input" label="Categoría" name="licenseCategory" value={licenseCategory} onChange={setLicenseCategory} placeholder="A3C" />
                        </div>
                        <div className="mt-4">
                            <DpInput type="date" label="Vencimiento licencia" name="licenseExpiration" value={licenseExpiration} onChange={setLicenseExpiration} />
                        </div>
                    </div>

                    <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
                        <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Asignación Operativa</h4>
                        <DpInput type="select" label="Estado" name="status" value={status} onChange={(v) => setStatus(v as DriverStatus)} options={DRIVER_STATUS_OPTIONS} />
                        <div className="mt-4">
                            <DpInput type="input" label="Viaje actual" name="currentTripId" value={currentTripId} onChange={setCurrentTripId} placeholder="TRIP-2026-0001" disabled />
                        </div>
                    </div>

                </div>
            )}
        </DpContentSet>
    );
}
