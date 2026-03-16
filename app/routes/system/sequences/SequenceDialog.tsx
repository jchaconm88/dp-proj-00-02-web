import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getSequenceById,
  addSequence,
  updateSequence,
  type ResetPeriod,
} from "~/features/system/sequences";
import { RESET_PERIOD, statusToSelectOptions } from "~/constants/status-options";

export interface SequenceDialogProps {
  visible: boolean;
  /** Si viene un id, se edita; si es null, se crea */
  sequenceId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const RESET_PERIOD_OPTIONS = statusToSelectOptions(RESET_PERIOD);

const FORMAT_PLACEHOLDERS = "prefix | year | month | day | number";

export default function SequenceDialog({
  visible,
  sequenceId,
  onSuccess,
  onHide,
}: SequenceDialogProps) {
  const isEdit = !!sequenceId;
  const [entity, setEntity] = useState("");
  const [prefix, setPrefix] = useState("");
  const [digits, setDigits] = useState("6");
  const [format, setFormat] = useState("{prefix}-{year}-{number}");
  const [resetPeriod, setResetPeriod] = useState<ResetPeriod>("yearly");
  const [allowManualOverride, setAllowManualOverride] = useState(false);
  const [preventGaps, setPreventGaps] = useState(false);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!sequenceId) {
      setEntity("");
      setPrefix("");
      setDigits("6");
      setFormat("{prefix}-{year}-{number}");
      setResetPeriod("yearly");
      setAllowManualOverride(false);
      setPreventGaps(false);
      setActive(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSequenceById(sequenceId)
      .then((data) => {
        if (!data) {
          setError("Secuencia no encontrada.");
          return;
        }
        setEntity(data.entity ?? "");
        setPrefix(data.prefix ?? "");
        setDigits(String(data.digits ?? 6));
        setFormat(data.format ?? "{prefix}-{year}-{number}");
        setResetPeriod(data.resetPeriod ?? "yearly");
        setAllowManualOverride(!!data.allowManualOverride);
        setPreventGaps(!!data.preventGaps);
        setActive(data.active !== false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, sequenceId]);

  const save = async () => {
    if (!entity.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const digitsNum = Math.max(0, Number(digits) || 6);
      if (sequenceId) {
        await updateSequence(sequenceId, {
          entity: entity.trim(),
          prefix: prefix.trim(),
          digits: digitsNum,
          format: format.trim() || "{prefix}-{number}",
          resetPeriod,
          allowManualOverride,
          preventGaps,
          active,
        });
      } else {
        await addSequence({
          entity: entity.trim(),
          prefix: prefix.trim(),
          digits: digitsNum,
          format: format.trim() || "{prefix}-{number}",
          resetPeriod,
          allowManualOverride,
          preventGaps,
          active,
        });
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!entity.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar secuencia" : "Agregar secuencia"}
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
        <div className="py-8 text-center text-zinc-500">Cargandoâ€¦</div>
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <DpInput
            type="input"
            label="Entidad"
            name="entity"
            value={entity}
            onChange={setEntity}
            placeholder="trip"
          />
          <DpInput
            type="input"
            label="Prefijo"
            name="prefix"
            value={prefix}
            onChange={setPrefix}
            placeholder="TRIP"
          />
          <DpInput
            type="number"
            label="Dígitos"
            name="digits"
            value={digits}
            onChange={setDigits}
            placeholder="6"
          />
          <DpInput
            type="input"
            label="Formato"
            name="format"
            value={format}
            onChange={setFormat}
            placeholder="{prefix}-{year}-{number}"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Placeholders: {FORMAT_PLACEHOLDERS}
          </p>
          <DpInput
            type="select"
            label="Reinicio"
            name="resetPeriod"
            value={resetPeriod}
            onChange={(v) => setResetPeriod(v as ResetPeriod)}
            options={RESET_PERIOD_OPTIONS}
          />
          <DpInput
            type="check"
            label="Permitir override manual"
            name="allowManualOverride"
            value={allowManualOverride}
            onChange={setAllowManualOverride}
          />
          <DpInput
            type="check"
            label="Evitar huecos"
            name="preventGaps"
            value={preventGaps}
            onChange={setPreventGaps}
          />
          <DpInput
            type="check"
            label="Activo"
            name="active"
            value={active}
            onChange={setActive}
          />
        </div>
      )}
    </DpContentSet>
  );
}
