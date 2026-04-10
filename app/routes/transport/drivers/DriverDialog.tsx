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
import { getResources } from "~/features/human-resource/resources";
import { DRIVER_STATUS, DRIVER_RELATIONSHIP, statusToSelectOptions } from "~/constants/status-options";

export interface DriverDialogProps {
    visible: boolean;
    driverId: string | null;
    onSuccess?: () => void;
    onHide: () => void;
}

const RELATIONSHIP_OPTIONS = statusToSelectOptions(DRIVER_RELATIONSHIP);
const DRIVER_STATUS_OPTIONS = statusToSelectOptions(DRIVER_STATUS);

export default function DriverDialog({
    visible,
    driverId,
    onSuccess,
    onHide,
}: DriverDialogProps) {
    const isEdit = !!driverId;
    const navigation = useNavigation();
    const isNavigating = navigation.state !== "idle";

    const [relationshipType, setRelationshipType] = useState<DriverRelationshipType>("employee");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [documentNo, setDocumentNo] = useState("");
    const [documentTypeId, setDocumentTypeId] = useState<string | null>(null);
    const [documentType, setDocumentType] = useState("");
    const [phoneNo, setPhoneNo] = useState("");
    const [licenseNo, setLicenseNo] = useState("");
    const [licenseCategory, setLicenseCategory] = useState("");
    const [licenseExpiration, setLicenseExpiration] = useState("");
    const [status, setStatus] = useState<DriverStatus>("available");
    const [currentTripId, setCurrentTripId] = useState("");

    const [employees, setEmployees] = useState<{ id: string; label: string; raw: any }[]>([]);
    const [resources, setResources] = useState<{ id: string; label: string; raw: any }[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleHide = () => {
        if (!saving && !isNavigating) {
            onHide();
        }
    };

    const isEmployee = relationshipType === "employee";
    const isResource = relationshipType === "resource";

    const loadEmployeeIntoForm = useCallback((emp: any) => {
        setFirstName(emp.firstName ?? "");
        setLastName(emp.lastName ?? "");
        setDocumentNo(emp.documentNo ?? "");
        setDocumentTypeId(emp.documentTypeId ?? "");
        setDocumentType(emp.documentType ?? "");
        setPhoneNo(emp.phone ?? "");
    }, []);

    const loadResourceIntoForm = useCallback((res: any) => {
        setFirstName(res.firstName ?? "");
        setLastName(res.lastName ?? "");
        setDocumentNo(res.documentNo ?? "");
        setDocumentTypeId(res.documentTypeId ?? "");
        setDocumentType(res.documentType ?? "");
        setPhoneNo(res.phone ?? "");
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
        getResources()
            .then(({ items }) => {
                setResources(items.map((r) => ({
                    id: r.id,
                    label: `${r.firstName} ${r.lastName} (${r.code})`,
                    raw: r,
                })));
            })
            .catch(() => setResources([]));

        if (!driverId) {
            setRelationshipType("employee");
            setSelectedEmployeeId(null);
            setSelectedResourceId(null);
            setFirstName("");
            setLastName("");
            setDocumentNo("");
            setDocumentTypeId(null);
            setDocumentType("");
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
                setSelectedResourceId(data.resourceId ?? null);
                setFirstName(data.firstName);
                setLastName(data.lastName);
                setDocumentNo(data.documentNo);
                setDocumentTypeId(data.documentTypeId || null);
                setDocumentType(data.documentType || "");
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

    useEffect(() => {
        if (!visible || !isResource || !selectedResourceId) return;
        const res = resources.find((r) => r.id === selectedResourceId);
        if (res && res.raw) {
            loadResourceIntoForm(res.raw);
        }
    }, [visible, isResource, selectedResourceId, resources, loadResourceIntoForm]);

    const onRelationshipTypeChange = (value: DriverRelationshipType) => {
        setRelationshipType(value);
        setFirstName("");
        setLastName("");
        setDocumentNo("");
        setDocumentTypeId(null);
        setDocumentType("");
        setPhoneNo("");
        if (value === "employee") {
            setSelectedResourceId(null);
        } else {
            setSelectedEmployeeId(null);
        }
    };

    const save = async () => {
        if (!firstName.trim() || !lastName.trim()) return;
        if (isEmployee && !selectedEmployeeId) return;
        if (isResource && !selectedResourceId) return;
        if (!documentTypeId) return;

        const empId = isEmployee ? selectedEmployeeId : null;
        const resId = isResource ? selectedResourceId : null;
        const docTypeId = documentTypeId ?? "";
        const docType = documentType ?? "";

        setSaving(true);
        setError(null);
        try {
            const payload = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                documentNo: documentNo.trim(),
                documentTypeId: docTypeId,
                documentType: docType,
                phoneNo: phoneNo.trim(),
                licenseNo: licenseNo.trim(),
                licenseCategory: licenseCategory.trim(),
                licenseExpiration: licenseExpiration.trim() || "",
                relationshipType,
                employeeId: empId,
                resourceId: resId,
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
    const resourceOptions = resources.map((r) => ({ label: r.label, value: r.id }));

    const valid =
        !!firstName.trim() &&
        !!lastName.trim() &&
        (isEmployee ? !!selectedEmployeeId : !!selectedResourceId) &&
        !!documentTypeId;

    return (
        <DpContentSet
            title={isEdit ? "Editar conductor" : "Agregar conductor"}
            recordId={isEdit ? driverId : null}
            cancelLabel="Cancelar"
            onCancel={handleHide}
            saveLabel="Guardar"
            onSave={save}
            saving={saving || isNavigating}
            saveDisabled={!valid || isNavigating}
            visible={visible}
            onHide={handleHide}
            showLoading={loading}
            showError={!!error}
            errorMessage={error ?? ""}
        >
                <div className="flex flex-col gap-4 pt-2">
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
                    )}

                    {isResource && (
                        <DpInput
                            type="select"
                            label="Recurso"
                            name="resourceId"
                            value={selectedResourceId ?? ""}
                            onChange={(v) => setSelectedResourceId(v ? String(v) : null)}
                            options={resourceOptions}
                            placeholder="Seleccionar recurso"
                            filter
                        />
                    )}

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
                    </div>

                </div>
        </DpContentSet>
    );
}
