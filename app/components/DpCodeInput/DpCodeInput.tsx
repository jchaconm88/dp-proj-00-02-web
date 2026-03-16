import { useState, useEffect } from "react";
import { InputText } from "primereact/inputtext";
import { getActiveSequenceByEntity, type SequenceRecord } from "~/features/system/sequences";

const labelClass = "font-medium text-zinc-700 dark:text-zinc-300";
const controlClass = "w-full";

export interface DpCodeInputProps {
  /** Entidad de la secuencia (ej. "trip") para saber si permite override manual y mostrar hints. */
  entity: string;
  value: string;
  onChange: (value: string) => void;
  /** Etiqueta del campo (por defecto "Código"). */
  label?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  /** Deshabilitar el control desde fuera (ej. modo solo lectura del formulario). */
  disabled?: boolean;
}

/**
 * Control para campos "código" vinculados a una secuencia.
 * - Si la secuencia tiene allowManualOverride = false: el input es solo lectura; el código se genera al guardar.
 * - Si allowManualOverride = true: el usuario puede editar o dejar vacío; si está vacío se genera al guardar.
 * Usar resolveCodeIfEmpty(code, entity) al guardar para obtener el código final.
 */
export function DpCodeInput({
  entity,
  value,
  onChange,
  label = "Código",
  name,
  placeholder,
  className = "",
  disabled: disabledProp = false,
}: DpCodeInputProps) {
  const [sequence, setSequence] = useState<SequenceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entity.trim()) {
      setSequence(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getActiveSequenceByEntity(entity.trim())
      .then((seq) => {
        setSequence(seq ?? null);
      })
      .catch(() => setSequence(null))
      .finally(() => setLoading(false));
  }, [entity]);

  const id = name ?? label.replace(/\s+/g, "-").toLowerCase();
  /** Solo deshabilitar edición cuando existe secuencia y no permite override manual. Sin secuencia se permite escribir. */
  const allowManual = sequence === null || sequence.allowManualOverride === true;
  const effectiveDisabled = disabledProp || loading || !allowManual;

  let effectivePlaceholder = placeholder;
  if (loading) {
    effectivePlaceholder = "Cargandoâ€¦";
  } else if (!sequence) {
    effectivePlaceholder = placeholder ?? "No hay secuencia para esta entidad";
  } else if (!allowManual) {
    effectivePlaceholder = placeholder ?? "Se genera automáticamente al guardar";
  } else {
    effectivePlaceholder = placeholder ?? "Opcional: se genera al guardar si está vacío";
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <InputText
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={effectivePlaceholder}
        disabled={effectiveDisabled}
        readOnly={!allowManual && !loading}
        className={controlClass}
      />
    </div>
  );
}
