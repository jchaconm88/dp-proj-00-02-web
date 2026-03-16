import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import { getCounterById, addCounter, updateCounter } from "~/features/system/counters";
import { getSequences, type SequenceRecord } from "~/features/system/sequences";

export interface CounterDialogProps {
  visible: boolean;
  /** Si viene un id, se edita; si es null, se crea */
  counterId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

export default function CounterDialog({
  visible,
  counterId,
  onSuccess,
  onHide,
}: CounterDialogProps) {
  const isEdit = !!counterId;
  const [sequenceId, setSequenceId] = useState("");
  const [period, setPeriod] = useState("");
  const [lastNumber, setLastNumber] = useState("0");
  const [active, setActive] = useState(true);
  const [sequences, setSequences] = useState<SequenceRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  useEffect(() => {
    if (!visible) return;
    setError(null);
    // Cargar lista de secuencias disponibles
    getSequences()
      .then(({ items }) => setSequences(items))
      .catch(() => setSequences([]));

    if (!counterId) {
      setSequenceId("");
      setPeriod("");
      setLastNumber("0");
      setActive(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    getCounterById(counterId)
      .then((data) => {
        if (!data) {
          setError("Contador no encontrado.");
          return;
        }
        setSequenceId(data.sequenceId ?? "");
        setPeriod(data.period ?? "");
        setLastNumber(String(data.lastNumber ?? 0));
        setActive(data.active !== false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, counterId]);

  const save = async () => {
    if (!sequenceId.trim() || !period.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const num = Math.max(0, Number(lastNumber) || 0);
      const seq = sequences.find((s) => s.id === sequenceId.trim());
      const sequenceLabel = seq ? `${seq.entity} (${seq.prefix})`.trim() : "";
      if (counterId) {
        await updateCounter(counterId, {
          sequenceId: sequenceId.trim(),
          sequence: sequenceLabel,
          period: period.trim(),
          lastNumber: num,
          active,
        });
      } else {
        await addCounter({
          sequenceId: sequenceId.trim(),
          sequence: sequenceLabel,
          period: period.trim(),
          lastNumber: num,
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

  const sequenceOptions = sequences.map((s) => ({
    label: `${s.entity} (${s.prefix})`,
    value: s.id,
  }));

  const valid = !!sequenceId.trim() && !!period.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar contador" : "Agregar contador"}
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
            type="select"
            label="Secuencia"
            name="sequenceId"
            value={sequenceId}
            onChange={(v) => setSequenceId(String(v ?? ""))}
            options={sequenceOptions}
            placeholder="Seleccionar secuencia"
            disabled={isEdit}
          />
          <DpInput
            type="input"
            label="Periodo"
            name="period"
            value={period}
            onChange={setPeriod}
            placeholder="2026 | 2026-01 | 2026-01-15 | all"
            disabled={isEdit}
          />
          <DpInput
            type="number"
            label="Último número"
            name="lastNumber"
            value={lastNumber}
            onChange={setLastNumber}
            placeholder="0"
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
