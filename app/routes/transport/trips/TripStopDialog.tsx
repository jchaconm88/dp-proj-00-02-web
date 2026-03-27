import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { generateSequenceCode } from "~/features/system/sequences";
import {
  getTripStop,
  addTripStop,
  updateTripStop,
  type TripStopType,
  type TripStopStatus,
} from "~/features/transport/trips";
import { STOP_TYPE, STOP_STATUS, statusToSelectOptions } from "~/constants/status-options";
import { getDistrictNameById, peruDistrictSelectOptions } from "~/data/peru-districts";

const TRIP_STOP_SEQUENCE_ENTITY = "trip-stop";

export interface TripStopDialogProps {
  visible: boolean;
  tripId: string;
  stopId: string | null;
  /** Tras crear parada, recibe el `id` del documento; en edición no se pasa argumento. */
  onSuccess?: (createdStopId?: string) => void;
  onHide: () => void;
  /** Si el diálogo se abre encima de otro modal (mayor z-index). */
  nestedInDialog?: boolean;
}

const TYPE_OPTIONS = statusToSelectOptions(STOP_TYPE);
const STATUS_OPTIONS = statusToSelectOptions(STOP_STATUS);

export default function TripStopDialog({
  visible,
  tripId,
  stopId,
  onSuccess,
  onHide,
  nestedInDialog = false,
}: TripStopDialogProps) {
  const isEdit = !!stopId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [order, setOrder] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<TripStopType>("checkpoint");
  const [name, setName] = useState("");
  const [externalDocument, setExternalDocument] = useState("");
  const [districtId, setDistrictId] = useState("");
  /** Denormalizado; si el id no está en el catálogo, se conserva el nombre cargado de Firestore. */
  const [districtName, setDistrictName] = useState("");
  const [observations, setObservations] = useState("");
  const [status, setStatus] = useState<TripStopStatus>("pending");
  const [plannedArrival, setPlannedArrival] = useState("");

  /** Coordenadas y horas reales no se editan en este formulario; se conservan al guardar. */
  const hiddenGeoRef = useRef({
    lat: 0,
    lng: 0,
    actualArrival: null as string | null,
    actualDeparture: null as string | null,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const districtOptions = useMemo(() => {
    return [{ label: "— Seleccionar distrito —", value: "" }, ...peruDistrictSelectOptions()];
  }, []);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!stopId) {
      setOrder("");
      setCode("");
      setType("checkpoint");
      setName("");
      setExternalDocument("");
      setDistrictId("");
      setDistrictName("");
      setObservations("");
      setStatus("pending");
      setPlannedArrival("");
      hiddenGeoRef.current = {
        lat: 0,
        lng: 0,
        actualArrival: null,
        actualDeparture: null,
      };
      setLoading(false);
      return;
    }
    setLoading(true);
    getTripStop(tripId, stopId)
      .then((data) => {
        if (!data) {
          setError("Parada no encontrada.");
          return;
        }
        setOrder(String(data.order ?? ""));
        setCode(data.code ?? "");
        setType(data.type ?? "checkpoint");
        setName(data.name ?? "");
        setExternalDocument(data.externalDocument ?? "");
        const did = (data.districtId ?? "").trim();
        setDistrictId(did);
        const fromCatalog = did ? getDistrictNameById(did) : "";
        setDistrictName(fromCatalog || (data.districtName ?? "").trim());
        setObservations(data.observations ?? "");
        setStatus(data.status ?? "pending");
        setPlannedArrival(data.plannedArrival ? data.plannedArrival.slice(0, 16) : "");
        hiddenGeoRef.current = {
          lat: data.lat ?? 0,
          lng: data.lng ?? 0,
          actualArrival: data.actualArrival,
          actualDeparture: data.actualDeparture,
        };
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, tripId, stopId]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const did = districtId.trim();
      const dname = did ? getDistrictNameById(did) || districtName.trim() : "";
      const finalCode = await generateSequenceCode(code, TRIP_STOP_SEQUENCE_ENTITY);
      const h = hiddenGeoRef.current;
      const payload = {
        order: Number(order) || 0,
        code: finalCode.trim(),
        type,
        name: name.trim(),
        externalDocument: externalDocument.trim(),
        districtId: did,
        districtName: dname,
        observations: observations.trim(),
        lat: h.lat,
        lng: h.lng,
        status,
        plannedArrival: plannedArrival.trim() || "",
        actualArrival: h.actualArrival,
        actualDeparture: h.actualDeparture,
      };
      if (stopId) {
        await updateTripStop(tripId, stopId, payload);
        onSuccess?.();
      } else {
        const generatedId = `stop-${Date.now()}`;
        await addTripStop(tripId, { id: generatedId, ...payload });
        onSuccess?.(generatedId);
      }
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!name.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar parada del viaje" : "Agregar parada del viaje"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
      dialogBaseZIndex={nestedInDialog ? 12_000 : undefined}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpCodeInput
          entity={TRIP_STOP_SEQUENCE_ENTITY}
          label="Código"
          name="code"
          value={code}
          onChange={setCode}
        />
        <DpInput type="number" label="Orden" name="order" value={order} onChange={setOrder} placeholder="1" />
        <DpInput
          type="select"
          label="Distrito (Perú)"
          name="districtId"
          value={districtId}
          onChange={(v) => {
            const id = String(v);
            setDistrictId(id);
            setDistrictName(id ? getDistrictNameById(id) : "");
          }}
          options={districtOptions}
          placeholder="Buscar por nombre o UBIGEO"
          filter
        />
        <DpInput type="select" label="Tipo" name="type" value={type} onChange={(v) => setType(v as TripStopType)} options={TYPE_OPTIONS} />
        <DpInput type="input" label="Nombre" name="name" value={name} onChange={setName} placeholder="Almacén Lima" />
        <DpInput
          type="input"
          label="Documento externo"
          name="externalDocument"
          value={externalDocument}
          onChange={setExternalDocument}
          placeholder="DOC-EXT-001"
        />
        <DpInput
          type="textarea"
          label="Observaciones"
          name="observations"
          value={observations}
          onChange={setObservations}
          placeholder="Notas sobre la parada"
          rows={4}
        />
        <DpInput type="select" label="Estado" name="status" value={status} onChange={(v) => setStatus(v as TripStopStatus)} options={STATUS_OPTIONS} />
        <DpInput
          type="datetime"
          label="Llegada planificada"
          name="plannedArrival"
          value={plannedArrival}
          onChange={setPlannedArrival}
        />
      </div>
    </DpContentSet>
  );
}
