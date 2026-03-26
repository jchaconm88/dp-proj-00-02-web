import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigation } from "react-router";
import { Button } from "primereact/button";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { generateSequenceCode } from "~/features/system/sequences";
import { getTripStops, type TripStopRecord } from "~/features/transport/trips";
import { getEmployees, type EmployeeRecord } from "~/features/human-resource/employees";
import { getResources, type ResourceRecord } from "~/features/human-resource/resources";
import { getPositions, type PositionRecord } from "~/features/human-resource/positions";
import { getChargeTypesForTripAssignments } from "~/features/transport/charge-types";
import type { ChargeTypeRecord, ChargeTypeSource } from "~/features/transport/charge-types";
import {
  getTripAssignmentById,
  addTripAssignment,
  updateTripAssignment,
  type AssignmentEntityType,
  type TripAssignmentKind,
  type TripAssignmentScopeType,
} from "~/features/transport/trip-assignments";
import { TRIP_ASSIGNMENT_ENTITY_TYPE, TRIP_ASSIGNMENT_SCOPE_TYPE, statusToSelectOptions } from "~/constants/status-options";
import TripStopDialog from "./TripStopDialog";

export interface TripAssignmentDialogProps {
  visible: boolean;
  tripId: string;
  assignmentId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const ENTITY_TYPE_OPTIONS = statusToSelectOptions(TRIP_ASSIGNMENT_ENTITY_TYPE);
const SCOPE_TYPE_OPTIONS = statusToSelectOptions(TRIP_ASSIGNMENT_SCOPE_TYPE);

function chargeTypeKindToAssignmentType(kind: ChargeTypeRecord["type"]): TripAssignmentKind {
  return kind === "charge" ? "billable" : "operational";
}

/** Cómo elegir empleado/recurso según el origen del tipo de cargo. */
function sourceEntityPickMode(source: ChargeTypeSource): "choose" | "employee" | "resource" {
  if (source === "employee") return "employee";
  if (source === "resource") return "resource";
  return "choose";
}

function formatEmployeeDisplay(e: EmployeeRecord): string {
  const name = `${e.lastName} ${e.firstName}`.trim();
  return name || e.code.trim() || e.id;
}

function formatResourceDisplay(r: ResourceRecord): string {
  const name = `${r.lastName} ${r.firstName}`.trim();
  return name || r.code.trim() || r.id;
}

function stopDisplayCode(s: TripStopRecord): string {
  return (s.code || s.name || s.id).trim();
}

function stopSelectLabel(s: TripStopRecord): string {
  const d = stopDisplayCode(s);
  return `${d} · ${s.name}`;
}

function buildScopePayload(
  scopeType: TripAssignmentScopeType,
  stopId: string,
  fromStopId: string,
  toStopId: string,
  stops: TripStopRecord[]
) {
  if (scopeType === "trip") {
    return { type: "trip" as const, stopId: "", fromStopId: "", toStopId: "", display: "" };
  }
  const byId = (id: string) => stops.find((x) => x.id === id);
  if (scopeType === "stop") {
    const s = byId(stopId);
    return {
      type: "stop" as const,
      stopId: stopId.trim(),
      fromStopId: "",
      toStopId: "",
      display: s ? stopDisplayCode(s) : "",
    };
  }
  const a = byId(fromStopId);
  const b = byId(toStopId);
  const c1 = a ? stopDisplayCode(a) : fromStopId.trim();
  const c2 = b ? stopDisplayCode(b) : toStopId.trim();
  return {
    type: "segment" as const,
    stopId: "",
    fromStopId: fromStopId.trim(),
    toStopId: toStopId.trim(),
    display: `${c1} - ${c2}`,
  };
}

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

  /** Si el usuario eligió empleado/recurso antes de que cargara `positions`, reaplicar al llegar el catálogo. */
  const pendingPositionFromEntityRef = useRef<{ pid: string; name: string } | null>(null);
  /** Qué select de alcance rellenar tras crear una parada nueva. */
  const pendingNewStopTargetRef = useRef<"stop" | "from" | "to">("stop");

  /** Aplica cargo por defecto desde empleado/recurso; el usuario puede cambiarlo después en el select. */
  const applyEntityDefaultPosition = useCallback(
    (positionIdFromEntity: string, positionNameFromEntity: string, catalog: PositionRecord[]) => {
      setOrphanPositionLabel("");
      let pid = String(positionIdFromEntity ?? "").trim();
      const nameHint = String(positionNameFromEntity ?? "").trim();
      if (!pid && nameHint && catalog.length) {
        const m = catalog.find((p) => p.name.trim() === nameHint);
        if (m) pid = m.id;
      }
      setPositionId(pid);
      const list = catalog.filter((p) => p.active !== false);
      if (pid && !list.some((p) => p.id === pid)) {
        if (nameHint) setOrphanPositionLabel(nameHint);
        else {
          const any = catalog.find((p) => p.id === pid);
          if (any?.name?.trim()) setOrphanPositionLabel(any.name.trim());
        }
      }
    },
    []
  );

  const [code, setCode] = useState("");
  const [chargeTypeId, setChargeTypeId] = useState("");
  const [chargeTypes, setChargeTypes] = useState<ChargeTypeRecord[]>([]);
  const [entityType, setEntityType] = useState<AssignmentEntityType>("employee");
  /** ID del empleado o recurso (valor del select; se persiste como entityId). */
  const [entitySelectId, setEntitySelectId] = useState("");
  /** Nombre a mostrar persistido; se actualiza al elegir empleado/recurso o al cargar edición. */
  const [displayName, setDisplayName] = useState("");
  const [positionId, setPositionId] = useState("");
  /** Texto del cargo si hay positionId que ya no está en catálogo (solo edición). */
  const [orphanPositionLabel, setOrphanPositionLabel] = useState("");

  const [scopeType, setScopeType] = useState<TripAssignmentScopeType>("trip");
  const [scopeStopId, setScopeStopId] = useState("");
  const [scopeFromStopId, setScopeFromStopId] = useState("");
  const [scopeToStopId, setScopeToStopId] = useState("");

  const [stops, setStops] = useState<TripStopRecord[]>([]);
  const [stopsLoading, setStopsLoading] = useState(false);

  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [listsLoading, setListsLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripStopDialogOpen, setTripStopDialogOpen] = useState(false);

  const stopOptions = useMemo(
    () => [{ label: "— Seleccionar parada —", value: "" }, ...stops.map((s) => ({ label: stopSelectLabel(s), value: s.id }))],
    [stops]
  );

  const employeeOptions = useMemo(() => {
    const active = employees.filter((e) => e.status === "active");
    const opts = active.map((e) => ({
      label: `${formatEmployeeDisplay(e)}${e.code ? ` · ${e.code}` : ""}`,
      value: e.id,
    }));
    if (entitySelectId && entityType === "employee" && !active.some((e) => e.id === entitySelectId)) {
      return [{ label: displayName.trim() || entitySelectId, value: entitySelectId }, ...opts];
    }
    return [{ label: "— Seleccionar empleado —", value: "" }, ...opts];
  }, [employees, entitySelectId, entityType, displayName]);

  const resourceOptions = useMemo(() => {
    const active = resources.filter((r) => r.status === "active");
    const opts = active.map((r) => ({
      label: `${formatResourceDisplay(r)}${r.code ? ` · ${r.code}` : ""}`,
      value: r.id,
    }));
    if (entitySelectId && entityType === "resource" && !active.some((r) => r.id === entitySelectId)) {
      return [{ label: displayName.trim() || entitySelectId, value: entitySelectId }, ...opts];
    }
    return [{ label: "— Seleccionar recurso —", value: "" }, ...opts];
  }, [resources, entitySelectId, entityType, displayName]);

  const positionOptions = useMemo(() => {
    const list = positions.filter((p) => p.active !== false);
    const opts = list.map((p) => ({ label: p.name.trim() || p.id, value: p.id }));
    if (positionId && !list.some((p) => p.id === positionId)) {
      return [
        { label: orphanPositionLabel.trim() || positionId, value: positionId },
        { label: "— Seleccionar cargo —", value: "" },
        ...opts,
      ];
    }
    return [{ label: "— Seleccionar cargo —", value: "" }, ...opts];
  }, [positions, positionId, orphanPositionLabel]);

  const selectedChargeType = useMemo(
    () => chargeTypes.find((c) => c.id === chargeTypeId),
    [chargeTypes, chargeTypeId]
  );

  const entityPickMode = selectedChargeType ? sourceEntityPickMode(selectedChargeType.source) : "choose";

  const chargeTypeOptions = useMemo(() => {
    const opts = chargeTypes.map((ct) => {
      const c = (ct.code ?? "").trim();
      const n = (ct.name ?? "").trim();
      const label = c && n ? `${c} · ${n}` : n || c || ct.id;
      return { label, value: ct.id };
    });
    if (chargeTypeId && !chargeTypes.some((c) => c.id === chargeTypeId)) {
      return [
        { label: `Tipo de cargo (referencia) · ${chargeTypeId}`, value: chargeTypeId },
        { label: "— Seleccionar tipo de asignación —", value: "" },
        ...opts,
      ];
    }
    return [{ label: "— Seleccionar tipo de asignación —", value: "" }, ...opts];
  }, [chargeTypes, chargeTypeId]);

  useEffect(() => {
    if (!visible) setTripStopDialogOpen(false);
  }, [visible]);

  useEffect(() => {
    if (!visible || !tripId) return;
    setStopsLoading(true);
    getTripStops(tripId)
      .then(({ items }) => setStops(items))
      .catch(() => setStops([]))
      .finally(() => setStopsLoading(false));
  }, [visible, tripId]);

  useEffect(() => {
    if (!visible) {
      pendingPositionFromEntityRef.current = null;
      return;
    }
    setListsLoading(true);
    Promise.all([getEmployees(), getResources(), getPositions(), getChargeTypesForTripAssignments()])
      .then(([emp, res, pos, ctList]) => {
        setEmployees(emp.items);
        setResources(res.items);
        setPositions(pos.items);
        setChargeTypes(ctList);
      })
      .catch(() => {
        setEmployees([]);
        setResources([]);
        setPositions([]);
        setChargeTypes([]);
      })
      .finally(() => setListsLoading(false));
  }, [visible]);

  /** Catálogo de cargos llegó después de elegir empleado/recurso: completar match por nombre / validar id. */
  useEffect(() => {
    const pending = pendingPositionFromEntityRef.current;
    if (!visible || !positions.length || !pending) return;
    pendingPositionFromEntityRef.current = null;
    applyEntityDefaultPosition(pending.pid, pending.name, positions);
  }, [positions, visible, applyEntityDefaultPosition]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!assignmentId) {
      setCode("");
      setChargeTypeId("");
      setEntityType("employee");
      setEntitySelectId("");
      setDisplayName("");
      setPositionId("");
      setOrphanPositionLabel("");
      setScopeType("trip");
      setScopeStopId("");
      setScopeFromStopId("");
      setScopeToStopId("");
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getTripAssignmentById(assignmentId), getPositions()])
      .then(([data, { items: posList }]) => {
        if (!data) {
          setError("Asignación no encontrada.");
          return;
        }
        setCode(data.code ?? "");
        setChargeTypeId(data.chargeTypeId ?? "");
        setEntityType(data.entityType ?? "employee");
        setEntitySelectId(data.entityId ?? "");
        setDisplayName(data.displayName ?? "");
        const sc = data.scope;
        setScopeType(sc?.type ?? "trip");
        setScopeStopId(sc?.stopId ?? "");
        setScopeFromStopId(sc?.fromStopId ?? "");
        setScopeToStopId(sc?.toStopId ?? "");

        let pid = String(data.positionId ?? "").trim();
        setOrphanPositionLabel("");
        if (!pid && data.position?.trim()) {
          const m = posList.find((p) => p.name.trim() === data.position.trim());
          if (m) pid = m.id;
        }
        setPositionId(pid);
        if (pid && !posList.some((p) => p.id === pid) && data.position?.trim()) {
          setOrphanPositionLabel(data.position.trim());
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, assignmentId]);

  const openNewTripStop = (target: "stop" | "from" | "to") => {
    pendingNewStopTargetRef.current = target;
    setTripStopDialogOpen(true);
  };

  const onTripStopNestedSuccess = (createdStopId?: string) => {
    setStopsLoading(true);
    getTripStops(tripId)
      .then(({ items }) => {
        setStops(items);
        if (createdStopId) {
          const t = pendingNewStopTargetRef.current;
          if (t === "stop") setScopeStopId(createdStopId);
          else if (t === "from") setScopeFromStopId(createdStopId);
          else setScopeToStopId(createdStopId);
        }
      })
      .catch(() => {})
      .finally(() => setStopsLoading(false));
  };

  const scopeValid = useMemo(() => {
    if (scopeType === "trip") return true;
    if (scopeType === "stop") return !!scopeStopId.trim();
    return !!scopeFromStopId.trim() && !!scopeToStopId.trim();
  }, [scopeType, scopeStopId, scopeFromStopId, scopeToStopId]);

  const onEntityTypeChange = (v: AssignmentEntityType) => {
    setEntityType(v);
    setEntitySelectId("");
    setDisplayName("");
    pendingPositionFromEntityRef.current = null;
  };

  const onChargeTypeChange = (id: string) => {
    setChargeTypeId(id);
    const ct = chargeTypes.find((c) => c.id === id);
    setEntitySelectId("");
    setDisplayName("");
    pendingPositionFromEntityRef.current = null;
    if (!ct) return;
    if (ct.source === "employee") setEntityType("employee");
    else if (ct.source === "resource") setEntityType("resource");
    else setEntityType("employee");
  };

  const onEmployeeSelect = (id: string) => {
    setEntitySelectId(id);
    if (!id.trim()) {
      setDisplayName("");
      pendingPositionFromEntityRef.current = null;
      return;
    }
    const e = employees.find((x) => x.id === id);
    setDisplayName(e ? formatEmployeeDisplay(e) : "");
    if (e) {
      if (positions.length) {
        pendingPositionFromEntityRef.current = null;
        applyEntityDefaultPosition(e.positionId, e.position, positions);
      } else {
        pendingPositionFromEntityRef.current = { pid: e.positionId, name: e.position };
        applyEntityDefaultPosition(e.positionId, e.position, []);
      }
    }
  };

  const onResourceSelect = (id: string) => {
    setEntitySelectId(id);
    if (!id.trim()) {
      setDisplayName("");
      pendingPositionFromEntityRef.current = null;
      return;
    }
    const r = resources.find((x) => x.id === id);
    setDisplayName(r ? formatResourceDisplay(r) : "");
    if (r) {
      if (positions.length) {
        pendingPositionFromEntityRef.current = null;
        applyEntityDefaultPosition(r.positionId, r.position, positions);
      } else {
        pendingPositionFromEntityRef.current = { pid: r.positionId, name: r.position };
        applyEntityDefaultPosition(r.positionId, r.position, []);
      }
    }
  };

  const onPositionSelect = (id: string) => {
    setPositionId(id);
    setOrphanPositionLabel("");
    pendingPositionFromEntityRef.current = null;
  };

  const save = async () => {
    if (!chargeTypeId.trim() || !selectedChargeType) {
      setError("Seleccione un tipo de asignación (tipo de cargo).");
      return;
    }
    if (!entitySelectId.trim() || !displayName.trim() || !positionId.trim() || !scopeValid) return;
    if (scopeType === "stop" || scopeType === "segment") {
      if (!stops.length) {
        setError("Defina paradas del viaje antes de usar alcance por parada o tramo.");
        return;
      }
    }
    const pos = positions.find((p) => p.id === positionId);
    const positionName = (pos?.name ?? "").trim() || orphanPositionLabel.trim();
    if (!positionName) {
      setError("Seleccione un cargo del catálogo.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      try {
        finalCode = await generateSequenceCode(code, "trip-assignment");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }
      const scope = buildScopePayload(scopeType, scopeStopId, scopeFromStopId, scopeToStopId, stops);
      const assignmentType = chargeTypeKindToAssignmentType(selectedChargeType.type);
      const payload = {
        chargeTypeId: chargeTypeId.trim(),
        type: assignmentType,
        code: finalCode,
        tripId,
        entityType,
        entityId: entitySelectId.trim(),
        position: positionName,
        positionId: positionId.trim(),
        displayName: displayName.trim(),
        scope,
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

  const valid =
    !!chargeTypeId.trim() &&
    !!selectedChargeType &&
    !!entitySelectId.trim() &&
    !!displayName.trim() &&
    !!positionId.trim() &&
    scopeValid;

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
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
      <DpCodeInput entity="trip-assignment" label="Código" name="code" value={code} onChange={setCode} />
      <DpInput
          type="select"
          label="Tipo de asignación"
          name="chargeTypeId"
          value={chargeTypeId}
          onChange={(v) => onChargeTypeChange(String(v))}
          options={chargeTypeOptions}
          placeholder={listsLoading ? "Cargando tipos de cargo…" : "Seleccionar tipo"}
          disabled={listsLoading}
          filter
        />
        {entityPickMode === "choose" && (
          <DpInput
            type="select"
            label="Tipo entidad"
            name="entityType"
            value={entityType}
            onChange={(v) => onEntityTypeChange(v as AssignmentEntityType)}
            options={ENTITY_TYPE_OPTIONS}
          />
        )}
        {(entityPickMode === "employee" || (entityPickMode === "choose" && entityType === "employee")) && (
          <DpInput
            type="select"
            label="Empleado"
            name="employeeId"
            value={entitySelectId}
            onChange={(v) => onEmployeeSelect(String(v))}
            options={employeeOptions}
            placeholder={listsLoading ? "Cargando empleados…" : "Seleccionar empleado"}
            disabled={listsLoading}
            filter
          />
        )}
        {(entityPickMode === "resource" || (entityPickMode === "choose" && entityType === "resource")) && (
          <DpInput
            type="select"
            label="Recurso"
            name="resourceId"
            value={entitySelectId}
            onChange={(v) => onResourceSelect(String(v))}
            options={resourceOptions}
            placeholder={listsLoading ? "Cargando recursos…" : "Seleccionar recurso"}
            disabled={listsLoading}
            filter
          />
        )}
        <DpInput
          type="select"
          label="Cargo (posición)"
          name="positionId"
          value={positionId}
          onChange={(v) => onPositionSelect(String(v))}
          options={positionOptions}
          placeholder={listsLoading ? "Cargando cargos…" : "Seleccionar cargo"}
          disabled={listsLoading}
          filter
        />
        <DpInput
          type="select"
          label="Alcance"
          name="scopeType"
          value={scopeType}
          onChange={(v) => {
            const t = v as TripAssignmentScopeType;
            setScopeType(t);
            setScopeStopId("");
            setScopeFromStopId("");
            setScopeToStopId("");
          }}
          options={SCOPE_TYPE_OPTIONS}
        />
        {scopeType === "stop" && (
          <div className="flex flex-col gap-2">
            <DpInput
              type="select"
              label="Parada"
              name="scopeStopId"
              value={scopeStopId}
              onChange={(v) => setScopeStopId(String(v))}
              options={stopOptions}
              placeholder={stopsLoading ? "Cargando paradas…" : "Seleccionar parada"}
              disabled={stopsLoading}
              filter
            />
            <Button
              type="button"
              label="Nueva parada…"
              icon="pi pi-plus"
              severity="secondary"
              outlined
              size="small"
              className="self-start"
              onClick={() => openNewTripStop("stop")}
            />
          </div>
        )}
        {scopeType === "segment" && (
          <>
            <div className="flex flex-col gap-2">
              <DpInput
                type="select"
                label="Parada inicio"
                name="scopeFromStopId"
                value={scopeFromStopId}
                onChange={(v) => setScopeFromStopId(String(v))}
                options={stopOptions}
                placeholder={stopsLoading ? "Cargando paradas…" : "Inicio"}
                disabled={stopsLoading}
                filter
              />
              <Button
                type="button"
                label="Nueva parada (inicio)…"
                icon="pi pi-plus"
                severity="secondary"
                outlined
                size="small"
                className="self-start"
                onClick={() => openNewTripStop("from")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <DpInput
                type="select"
                label="Parada fin"
                name="scopeToStopId"
                value={scopeToStopId}
                onChange={(v) => setScopeToStopId(String(v))}
                options={stopOptions}
                placeholder={stopsLoading ? "Cargando paradas…" : "Fin"}
                disabled={stopsLoading}
                filter
              />
              <Button
                type="button"
                label="Nueva parada (fin)…"
                icon="pi pi-plus"
                severity="secondary"
                outlined
                size="small"
                className="self-start"
                onClick={() => openNewTripStop("to")}
              />
            </div>
          </>
        )}
      </div>
      <TripStopDialog
        visible={tripStopDialogOpen}
        tripId={tripId}
        stopId={null}
        nestedInDialog
        onSuccess={onTripStopNestedSuccess}
        onHide={() => setTripStopDialogOpen(false)}
      />
    </DpContentSet>
  );
}
