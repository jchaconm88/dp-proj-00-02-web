import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { resolveCodeIfEmpty } from "~/features/system/sequences";
import {
  getTripAssignmentById,
  addTripAssignment,
  updateTripAssignment,
  type AssignmentEntityType,
} from "~/features/transport/trip-assignments";
import { TRIP_ASSIGNMENT_ENTITY_TYPE, statusToSelectOptions } from "~/constants/status-options";

export interface TripAssignmentDialogProps {
  visible: boolean;
  tripId: string;
  assignmentId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const ENTITY_TYPE_OPTIONS = statusToSelectOptions(TRIP_ASSIGNMENT_ENTITY_TYPE);

export default function TripAssignmentDialog({
  visible,
  tripId,
  assignmentId,
  onSuccess,
  onHide,
}: TripAssignmentDialogProps) {
  const isEdit = !!assignmentId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [entityType, setEntityType] = useState<AssignmentEntityType>("employee");
  const [entityId, setEntityId] = useState("");
  const [position, setPosition] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resourceCostId, setResourceCostId] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!assignmentId) {
      setCode("");
      setEntityType("employee");
      setEntityId("");
      setPosition("");
      setDisplayName("");
      setResourceCostId("");
      setLoading(false);
      return;
    }
    setLoading(true);
    getTripAssignmentById(assignmentId)
      .then((data) => {
        if (!data) {
          setError("Asignación no encontrada.");
          return;
        }
        setCode(data.code ?? "");
        setEntityType(data.entityType ?? "employee");
        setEntityId(data.entityId ?? "");
        setPosition(data.position ?? "");
        setDisplayName(data.displayName ?? "");
        setResourceCostId(data.resourceCostId ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, assignmentId]);

  const save = async () => {
    if (!entityId.trim() || !displayName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      try {
        finalCode = await resolveCodeIfEmpty(code, "trip-assignment");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }
      const payload = {
        code: finalCode,
        tripId,
        entityType,
        entityId: entityId.trim(),
        position: position.trim(),
        displayName: displayName.trim(),
        resourceCostId: entityType === "resource" && resourceCostId.trim() ? resourceCostId.trim() : undefined,
      };
      if (assignmentId) {
        await updateTripAssignment(assignmentId, payload);
      } else {
        await addTripAssignment(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!entityId.trim() && !!displayName.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar asignación" : "Agregar asignación"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
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
          <DpCodeInput entity="trip-assignment" label="Código" name="code" value={code} onChange={setCode} />
          <DpInput
            type="select"
            label="Tipo entidad"
            name="entityType"
            value={entityType}
            onChange={(v) => setEntityType(v as AssignmentEntityType)}
            options={ENTITY_TYPE_OPTIONS}
          />
          <DpInput type="input" label="ID entidad" name="entityId" value={entityId} onChange={setEntityId} placeholder="ID empleado o recurso" />
          <DpInput type="input" label="Posición" name="position" value={position} onChange={setPosition} placeholder="Ayudante, Conductor..." />
          <DpInput type="input" label="Nombre a mostrar" name="displayName" value={displayName} onChange={setDisplayName} placeholder="Juan Pérez" />
          {entityType === "resource" && (
            <DpInput
              type="input"
              label="ID costo recurso"
              name="resourceCostId"
              value={resourceCostId}
              onChange={setResourceCostId}
              placeholder="Opcional"
            />
          )}
        </div>
      )}
    </DpContentSet>
  );
}
