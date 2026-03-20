import { useState, useEffect } from "react";
import { useNavigate, useNavigation } from "react-router";
import { Button } from "primereact/button";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getRouteById,
  addRoute,
  updateRoute,
} from "~/features/transport/routes";
import { getPlans } from "~/features/transport/plans";

export interface RouteDialogProps {
  visible: boolean;
  routeId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

export default function RouteDialog({
  visible,
  routeId,
  onSuccess,
  onHide,
}: RouteDialogProps) {
  const isEdit = !!routeId;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [planOptions, setPlanOptions] = useState<{ label: string; value: string }[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [planId, setPlanId] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [totalEstimatedKm, setTotalEstimatedKm] = useState("");
  const [totalEstimatedHours, setTotalEstimatedHours] = useState("");
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    getPlans()
      .then(({ items }) => {
        setPlanOptions([
          { label: "— Sin plan —", value: "" },
          ...items.map((p) => ({
            label: `${(p.code || p.id).trim()} — ${p.date} — ${p.zone}`,
            value: p.id,
          })),
        ]);
      })
      .catch(() => setPlanOptions([{ label: "— Sin plan —", value: "" }]));

    if (!routeId) {
      setName("");
      setCode("");
      setPlanId("");
      setPlanCode("");
      setTotalEstimatedKm("");
      setTotalEstimatedHours("");
      setActive(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    getRouteById(routeId)
      .then((data) => {
        if (!data) {
          setError("Ruta no encontrada.");
          return;
        }
        setName(data.name ?? "");
        setCode(data.code ?? "");
        setPlanId(data.planId ?? "");
        setPlanCode(data.planCode ?? "");
        setTotalEstimatedKm(String(data.totalEstimatedKm ?? ""));
        setTotalEstimatedHours(String(data.totalEstimatedHours ?? ""));
        setActive(data.active ?? true);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar.")
      )
      .finally(() => setLoading(false));
  }, [visible, routeId]);

  const onPlanChange = (value: string) => {
    const id = value ?? "";
    setPlanId(id);
    if (!id) {
      setPlanCode("");
      return;
    }
    getPlans().then(({ items }) => {
      const p = items.find((x) => x.id === id);
      setPlanCode(p ? (p.code || p.id).trim() : "");
    });
  };

  const save = async () => {
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim(),
        planId: planId.trim(),
        planCode: planId.trim() ? planCode.trim() : "",
        totalEstimatedKm: Number(totalEstimatedKm) || 0,
        totalEstimatedHours: Number(totalEstimatedHours) || 0,
        active,
      };
      if (routeId) {
        await updateRoute(routeId, payload);
      } else {
        await addRoute(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!name.trim() && !!code.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar ruta" : "Agregar ruta"}
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
          <DpInput
            type="input"
            label="Nombre"
            name="name"
            value={name}
            onChange={setName}
            placeholder="Lima - Ica - Nazca - Arequipa"
          />
          <DpInput
            type="input"
            label="Código"
            name="code"
            value={code}
            onChange={setCode}
            placeholder="LIM-ICA-NAZ-ARE"
          />
          <DpInput
            type="select"
            label="Plan"
            name="planId"
            value={planId}
            onChange={(v) => onPlanChange(String(v))}
            options={planOptions}
            placeholder="Seleccione un plan (opcional)"
            filter
          />
          <DpInput
            type="number"
            label="Km estimados totales"
            name="totalEstimatedKm"
            value={totalEstimatedKm}
            onChange={setTotalEstimatedKm}
            placeholder="1010"
          />
          <DpInput
            type="number"
            label="Horas estimadas totales"
            name="totalEstimatedHours"
            value={totalEstimatedHours}
            onChange={setTotalEstimatedHours}
            placeholder="18"
          />
          <DpInput
            type="check"
            label="Activo"
            name="active"
            value={active}
            onChange={setActive}
          />
          {isEdit && (
            <Button
              label="Gestionar paradas"
              severity="secondary"
              onClick={() => navigate(`/transport/routes/${encodeURIComponent(routeId!)}/stops`)}
              className="w-full"
            />
          )}
        </div>
    </DpContentSet>
  );
}
