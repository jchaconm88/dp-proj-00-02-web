import { useState, useEffect } from "react";
import { useNavigate, useNavigation } from "react-router";
import { Button } from "primereact/button";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { resolveCodeIfEmpty } from "~/features/system/sequences";
import {
  getTripById,
  addTrip,
  updateTrip,
  type TripStatus,
} from "~/features/transport/trips";
import { getRoutes } from "~/features/transport/routes";
import { getTransportServices } from "~/features/transport/transport-services";
import { getClients } from "~/features/master/clients";
import { getDrivers } from "~/features/transport/drivers";
import { getVehicles } from "~/features/transport/vehicles";
import { TRIP_STATUS, statusToSelectOptions } from "~/constants/status-options";

export interface TripDialogProps {
  visible: boolean;
  tripId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const STATUS_OPTIONS = statusToSelectOptions(TRIP_STATUS);

export default function TripDialog({
  visible,
  tripId,
  onSuccess,
  onHide,
}: TripDialogProps) {
  const isEdit = !!tripId;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [routeId, setRouteId] = useState("");
  const [isExternalRoute, setIsExternalRoute] = useState(false);
  const [route, setRoute] = useState("");
  const [transportServiceId, setTransportServiceId] = useState("");
  const [transportService, setTransportService] = useState("");
  const [clientId, setClientId] = useState("");
  const [client, setClient] = useState("");
  const [driverId, setDriverId] = useState("");
  const [driver, setDriver] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [transportGuide, setTransportGuide] = useState("");
  const [status, setStatus] = useState<TripStatus>("scheduled");
  const [scheduledStart, setScheduledStart] = useState("");

  const [routeOptions, setRouteOptions] = useState<{ label: string; value: string }[]>([]);
  const [serviceOptions, setServiceOptions] = useState<{ label: string; value: string }[]>([]);
  const [clientOptions, setClientOptions] = useState<{ label: string; value: string }[]>([]);
  const [driverOptions, setDriverOptions] = useState<{ label: string; value: string }[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<{ label: string; value: string }[]>([]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    getRoutes().then(({ items }) => {
      setRouteOptions([
        { label: "— Sin ruta —", value: "" },
        ...items.map((r) => ({ label: `${r.name} (${r.code || r.id})`, value: r.id })),
      ]);
    }).catch(() => setRouteOptions([{ label: "— Sin ruta —", value: "" }]));
    getTransportServices().then(({ items }) => {
      setServiceOptions([
        { label: "— Sin servicio —", value: "" },
        ...items.map((s) => ({ label: `${(s.name || s.code || s.id).trim()}`, value: s.id })),
      ]);
    }).catch(() => setServiceOptions([{ label: "— Sin servicio —", value: "" }]));
    getClients().then(({ items }) => {
      setClientOptions([
        { label: "— Sin cliente —", value: "" },
        ...items.map((c) => ({
          label: `${(c.commercialName || c.businessName || c.code || c.id).trim()}`,
          value: c.id,
        })),
      ]);
    }).catch(() => setClientOptions([{ label: "— Sin cliente —", value: "" }]));
    getDrivers().then(({ items }) => {
      setDriverOptions(
        items.map((d) => ({
          label: `${(d.licenseNo || "").trim()} - ${(d.lastName || "").trim()} ${(d.firstName || "").trim()}`.trim() || d.id,
          value: d.id,
        }))
      );
    }).catch(() => setDriverOptions([]));
    getVehicles().then(({ items }) => {
      setVehicleOptions(items.map((v) => ({ label: (v.plate || "").trim() || v.id, value: v.id })));
    }).catch(() => setVehicleOptions([]));

    if (!tripId) {
      setCode("");
      setRouteId("");
      setIsExternalRoute(false);
      setRoute("");
      setTransportServiceId("");
      setTransportService("");
      setClientId("");
      setClient("");
      setDriverId("");
      setDriver("");
      setVehicleId("");
      setVehicle("");
      setTransportGuide("");
      setStatus("scheduled");
      setScheduledStart("");
      setLoading(false);
      return;
    }

    setLoading(true);
    getTripById(tripId)
      .then((data) => {
        if (!data) {
          setError("Viaje no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setRouteId(data.routeId ?? "");
        setIsExternalRoute(data.isExternalRoute ?? false);
        setRoute(data.route ?? "");
        setTransportServiceId(data.transportServiceId ?? "");
        setTransportService(data.transportService ?? "");
        setClientId(data.clientId ?? "");
        setClient(data.client ?? "");
        setDriverId(data.driverId ?? "");
        setDriver(data.driver ?? "");
        setVehicleId(data.vehicleId ?? "");
        setVehicle(data.vehicle ?? "");
        setTransportGuide(data.transportGuide ?? "");
        setStatus(data.status ?? "scheduled");
        setScheduledStart(data.scheduledStart ? data.scheduledStart.slice(0, 16) : "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, tripId]);

  const onRouteChange = (value: string) => {
    setRouteId(value ?? "");
    if (!value) {
      setRoute("");
      return;
    }
    getRoutes().then(({ items }) => {
      const r = items.find((x) => x.id === value);
      setRoute(r ? (r.code || r.name || r.id).trim() : "");
    });
  };

  const onServiceChange = (value: string) => {
    setTransportServiceId(value ?? "");
    getTransportServices().then(({ items }) => {
      const s = items.find((x) => x.id === value);
      setTransportService(s ? (s.name || s.code || s.id).trim() : "");
    });
  };

  const onClientChange = (value: string) => {
    const id = value ?? "";
    setClientId(id);
    getClients().then(({ items }) => {
      const c = items.find((x) => x.id === id);
      setClient(c ? (c.commercialName || c.businessName || c.code || c.id).trim() : "");
    });
  };

  const onDriverChange = (value: string) => {
    setDriverId(value ?? "");
    getDrivers().then(({ items }) => {
      const d = items.find((x) => x.id === value);
      setDriver(d ? `${(d.licenseNo || "").trim()} - ${(d.lastName || "").trim()} ${(d.firstName || "").trim()}`.trim() : "");
    });
  };

  const onVehicleChange = (value: string) => {
    setVehicleId(value ?? "");
    getVehicles().then(({ items }) => {
      const v = items.find((x) => x.id === value);
      setVehicle(v ? (v.plate || "").trim() : "");
    });
  };

  const save = async () => {
    const routeOk = isExternalRoute ? !!route.trim() : !!routeId;
    if (!routeOk || !driverId || !vehicleId) return;
    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      try {
        finalCode = await resolveCodeIfEmpty(code, "trip");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }
      const payload = {
        code: finalCode,
        routeId: isExternalRoute ? "" : routeId.trim(),
        route: route.trim(),
        isExternalRoute,
        transportServiceId: transportServiceId.trim(),
        transportService: transportService.trim(),
        clientId: clientId.trim(),
        client: client.trim(),
        driverId: driverId.trim(),
        driver: driver.trim(),
        vehicleId: vehicleId.trim(),
        vehicle: vehicle.trim(),
        transportGuide: transportGuide.trim(),
        status,
        scheduledStart: scheduledStart.trim() || "",
      };
      if (tripId) {
        await updateTrip(tripId, payload);
      } else {
        await addTrip(payload);
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
    (isExternalRoute ? !!route.trim() : !!routeId) && !!driverId && !!vehicleId;

  return (
    <DpContentSet
      title={isEdit ? "Editar viaje" : "Agregar viaje"}
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
          <DpCodeInput entity="trip" label="Código" name="code" value={code} onChange={setCode} />
          <DpInput
            type="check"
            label="Ruta externa"
            name="isExternalRoute"
            value={isExternalRoute}
            onChange={(v) => {
              setIsExternalRoute(!!v);
              setRouteId("");
              setRoute("");
            }}
          />
          {isExternalRoute ? (
            <DpInput type="input" label="Ruta" name="route" value={route} onChange={setRoute} placeholder="Ingresar ruta manualmente" />
          ) : (
            <DpInput
              type="select"
              label="Ruta"
              name="routeId"
              value={routeId}
              onChange={(v) => onRouteChange(String(v))}
              options={routeOptions}
              placeholder="Seleccionar ruta"
              filter
            />
          )}
          <DpInput
            type="select"
            label="Servicio de transporte"
            name="transportServiceId"
            value={transportServiceId}
            onChange={(v) => onServiceChange(String(v))}
            options={serviceOptions}
            placeholder="Seleccionar servicio"
            filter
          />
          <DpInput
            type="input"
            label="Guía de transporte"
            name="transportGuide"
            value={transportGuide}
            onChange={setTransportGuide}
            placeholder="Número o código de guía"
          />
          <DpInput
            type="select"
            label="Cliente"
            name="clientId"
            value={clientId}
            onChange={(v) => onClientChange(String(v))}
            options={clientOptions}
            placeholder="Seleccionar cliente"
            filter
          />
          <DpInput
            type="select"
            label="Conductor"
            name="driverId"
            value={driverId}
            onChange={(v) => onDriverChange(String(v))}
            options={driverOptions}
            placeholder="Seleccionar conductor"
            filter
          />
          <DpInput
            type="select"
            label="Vehículo"
            name="vehicleId"
            value={vehicleId}
            onChange={(v) => onVehicleChange(String(v))}
            options={vehicleOptions}
            placeholder="Seleccionar vehículo"
            filter
          />
          <DpInput
            type="select"
            label="Estado"
            name="status"
            value={status}
            onChange={(v) => setStatus(v as TripStatus)}
            options={STATUS_OPTIONS}
          />
          <DpInput
            type="datetime"
            label="Inicio programado"
            name="scheduledStart"
            value={scheduledStart}
            onChange={setScheduledStart}
          />
          {isEdit && tripId && (
            <Button
              label="Gestionar paradas del viaje"
              severity="secondary"
              onClick={() => navigate(`/transport/trips/${encodeURIComponent(tripId)}/trip-stops`)}
              className="w-full"
            />
          )}
        </div>
      )}
    </DpContentSet>
  );
}
