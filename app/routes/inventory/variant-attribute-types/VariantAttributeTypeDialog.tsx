import { useEffect, useMemo, useState } from "react";
import { useNavigation } from "react-router";
import { DpInput, DpCodeInput, DpContentSet } from "~/components/ui";
import { generateSequenceCode } from "~/features/system/sequences";
import {
  addVariantAttributeType,
  updateVariantAttributeType,
  type VariantAttributeTypeRecord,
} from "~/features/inventory/variant-attribute-types";

const CODE_RE = /^[a-z0-9_-]+$/;

function parseValuesText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/[\n,]+/)) {
    const v = line.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function valuesToText(values: string[]): string {
  return values.join("\n");
}

export interface VariantAttributeTypeDialogProps {
  visible: boolean;
  typeId: string | null;
  types: VariantAttributeTypeRecord[];
  onSuccess?: () => void;
  onHide: () => void;
}

export default function VariantAttributeTypeDialog({
  visible,
  typeId,
  types,
  onSuccess,
  onHide,
}: VariantAttributeTypeDialogProps) {
  const isEdit = !!typeId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [valuesText, setValuesText] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existing = useMemo(
    () => (typeId ? types.find((t) => t.id === typeId) : undefined),
    [typeId, types]
  );

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!typeId) {
      setCode("");
      setLabel("");
      setValuesText("");
      setSortOrder("0");
      setActive(true);
      setLoading(false);
      return;
    }
    if (!existing) {
      setError("Tipo de variante no encontrado.");
      setLoading(false);
      return;
    }
    setCode(existing.code);
    setLabel(existing.label);
    setValuesText(valuesToText(existing.values));
    setSortOrder(String(existing.sortOrder));
    setActive(existing.active !== false);
    setLoading(false);
  }, [visible, typeId, existing]);

  const validate = (): string | null => {
    const c = code.trim().toLowerCase();
    if (isEdit && !c) return "El código es obligatorio.";
    if (c && !CODE_RE.test(c)) {
      return "El código solo puede contener letras minúsculas, números, guiones y guiones bajos.";
    }
    if (!label.trim()) return "La etiqueta es obligatoria.";
    const values = parseValuesText(valuesText);
    if (values.length === 0) return "Agregue al menos un valor permitido.";
    return null;
  };

  const save = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      if (isEdit) {
        finalCode = code.trim().toLowerCase();
      } else {
        try {
          finalCode = (await generateSequenceCode(code, "variant-attribute-type")).trim().toLowerCase();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }
      }

      const payload = {
        code: finalCode,
        label: label.trim(),
        values: parseValuesText(valuesText),
        sortOrder: Number(sortOrder) || 0,
        active,
      };
      if (typeId) {
        await updateVariantAttributeType(typeId, payload);
      } else {
        await addVariantAttributeType(payload);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const isValid = !!label.trim() && parseValuesText(valuesText).length > 0;

  return (
    <DpContentSet
      title={isEdit ? "Editar tipo de variante" : "Agregar tipo de variante"}
      recordId={isEdit ? typeId : null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!isValid || isNavigating}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpCodeInput
          entity="variant-attribute-type"
          label="Código *"
          name="code"
          value={code}
          onChange={setCode}
          disabled={isEdit}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-2">
          Identificador interno (secuencia VT-0001 o manual si la secuencia lo permite). No se puede cambiar al editar.
        </p>
        <DpInput
          type="input"
          label="Etiqueta *"
          name="label"
          value={label}
          onChange={setLabel}
          placeholder="Talla, Color, Género"
        />
        <DpInput
          type="textarea"
          label="Valores permitidos *"
          name="values"
          value={valuesText}
          onChange={setValuesText}
          placeholder={"S\nM\nL\nXL"}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-2">
          Un valor por línea (o separados por coma).
        </p>
        <DpInput
          type="input"
          label="Orden"
          name="sortOrder"
          value={sortOrder}
          onChange={setSortOrder}
          placeholder="0"
        />
        <DpInput type="check" label="Activo" name="active" value={active} onChange={setActive} />
      </div>
    </DpContentSet>
  );
}
