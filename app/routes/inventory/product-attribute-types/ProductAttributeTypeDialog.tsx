import { useEffect, useMemo, useState } from "react";
import { useNavigation } from "react-router";
import { Chips } from "primereact/chips";
import { DpInput, DpCodeInput, DpContentSet, DpConfirmDialog } from "~/components/ui";
import { generateSequenceCode } from "~/features/system/sequences";
import {
  createProductAttributeType,
  updateProductAttributeType,
  deleteProductAttributeType,
  type ProductAttributeTypeRecord,
} from "~/features/inventory/product-attribute-types";

const CODE_RE = /^[a-z0-9_-]+$/;
const MAX_VALUES = 200;
const MAX_VALUE_LENGTH = 100;
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export interface ProductAttributeTypeDialogProps {
  visible: boolean;
  typeId: string | null;
  types: ProductAttributeTypeRecord[];
  productsUsingValues?: Record<string, string[]>;
  onSuccess?: () => void;
  onHide: () => void;
  onDelete?: (id: string) => void;
}

export default function ProductAttributeTypeDialog({
  visible,
  typeId,
  types,
  productsUsingValues,
  onSuccess,
  onHide,
  onDelete,
}: ProductAttributeTypeDialogProps) {
  const isEdit = !!typeId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [valueColors, setValueColors] = useState<Record<string, string>>({});
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);
  const [useForVariants, setUseForVariants] = useState(true);
  const [useForFilters, setUseForFilters] = useState(false);
  const [isColor, setIsColor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemoveValue, setPendingRemoveValue] = useState<string | null>(null);
  const [pendingValues, setPendingValues] = useState<string[] | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const existing = useMemo(
    () => (typeId ? types.find((t) => t.id === typeId) : undefined),
    [typeId, types]
  );

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setPendingRemoveValue(null);
    setPendingValues(null);
    setShowDeleteConfirm(false);
    if (!typeId) {
      setCode("");
      setLabel("");
      setValues([]);
      setValueColors({});
      setSortOrder("0");
      setActive(true);
      setUseForVariants(true);
      setUseForFilters(false);
      setIsColor(false);
      setLoading(false);
      return;
    }
    if (!existing) {
      setError("Tipo de atributo no encontrado.");
      setLoading(false);
      return;
    }
    setCode(existing.code);
    setLabel(existing.label);
    setValues([...existing.values]);
    setValueColors({ ...existing.valueColors });
    setSortOrder(String(existing.sortOrder));
    setActive(existing.active !== false);
    setUseForVariants(existing.useForVariants);
    setUseForFilters(existing.useForFilters);
    setIsColor(existing.isColor);
    setLoading(false);
  }, [visible, typeId, existing]);

  const syncColorsForValues = (nextValues: string[], prevColors: Record<string, string>) => {
    const next: Record<string, string> = {};
    for (const v of nextValues) {
      if (prevColors[v] && HEX_RE.test(prevColors[v])) next[v] = prevColors[v];
    }
    return next;
  };

  const handleValuesChange = (newValues: string[]) => {
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const v of newValues) {
      const trimmed = v.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      cleaned.push(trimmed);
    }

    if (isEdit && existing) {
      const removedValues = existing.values.filter((v) => !cleaned.includes(v));
      for (const removed of removedValues) {
        const productsUsing = productsUsingValues?.[removed];
        if (productsUsing && productsUsing.length > 0) {
          setPendingRemoveValue(removed);
          setPendingValues(cleaned);
          return;
        }
      }
    }

    setValues(cleaned);
    setValueColors((prev) => syncColorsForValues(cleaned, prev));
  };

  const confirmRemoveValue = () => {
    if (pendingValues) {
      setValues(pendingValues);
      setValueColors((prev) => syncColorsForValues(pendingValues, prev));
    }
    setPendingRemoveValue(null);
    setPendingValues(null);
  };

  const cancelRemoveValue = () => {
    setPendingRemoveValue(null);
    setPendingValues(null);
  };

  const setColorForValue = (value: string, hex: string) => {
    setValueColors((prev) => ({ ...prev, [value]: hex }));
  };

  const validate = (): string | null => {
    const c = code.trim().toLowerCase();
    if (c && !CODE_RE.test(c)) {
      return "El código solo puede contener letras minúsculas, números, guiones y guiones bajos.";
    }
    if (c && c.length > 50) return "El código no puede exceder 50 caracteres.";
    if (!label.trim()) return "La etiqueta es obligatoria.";
    if (!useForVariants && !useForFilters) {
      return "Active al menos «Usar en variantes» o «Usar en filtros de tienda».";
    }
    if (values.length === 0) return "Agregue al menos un valor permitido.";
    if (isColor) {
      for (const v of values) {
        const hex = valueColors[v];
        if (!hex || !HEX_RE.test(hex)) {
          return `Seleccione un color para el valor «${v}».`;
        }
      }
    }
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
        finalCode = (await generateSequenceCode(code, "product-attribute-type")).trim().toLowerCase();
      }

      const payload = {
        code: finalCode,
        label: label.trim(),
        values,
        valueColors: isColor ? valueColors : {},
        isColor,
        useForVariants,
        useForFilters,
        sortOrder: Number(sortOrder) || 0,
        active,
      };
      if (typeId) {
        await updateProductAttributeType(typeId, payload);
      } else {
        await createProductAttributeType(payload);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!typeId) return;
    setDeleting(true);
    try {
      await deleteProductAttributeType(typeId);
      setShowDeleteConfirm(false);
      onDelete?.(typeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const isValid =
    !!label.trim() &&
    values.length > 0 &&
    (useForVariants || useForFilters) &&
    (!isColor || values.every((v) => HEX_RE.test(valueColors[v] ?? "")));

  return (
    <>
      <DpContentSet
        title={isEdit ? "Editar tipo de atributo" : "Agregar tipo de atributo"}
        recordId={isEdit ? typeId : null}
        cancelLabel="Cancelar"
        onCancel={onHide}
        saveLabel="Guardar"
        onSave={save}
        saving={saving || isNavigating}
        saveDisabled={!isValid || isNavigating}
        visible={visible}
        onHide={onHide}
        showError={!!error}
        errorMessage={error ?? ""}
      >
        <div className="flex flex-col gap-4 pt-2">
          <DpCodeInput
            entity="product-attribute-type"
            label="Código *"
            name="code"
            value={code}
            onChange={setCode}
            disabled={isEdit}
          />
          <DpInput type="input" label="Etiqueta *" name="label" value={label} onChange={setLabel} />

          <DpInput type="check" label="Usar en variantes" name="useForVariants" value={useForVariants} onChange={setUseForVariants} />
          <DpInput type="check" label="Usar en filtros de tienda" name="useForFilters" value={useForFilters} onChange={setUseForFilters} />
          <DpInput type="check" label="Es atributo de color" name="isColor" value={isColor} onChange={setIsColor} />

          {!isColor ? (
            <div className="flex flex-col gap-2">
              <label className="font-medium text-[var(--dp-menu-text)]">Valores permitidos *</label>
              <Chips
                value={values}
                onChange={(e) => handleValuesChange(e.value ?? [])}
                placeholder="Escriba un valor y presione Enter"
                className="w-full"
                disabled={saving}
                max={MAX_VALUES}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="font-medium text-[var(--dp-menu-text)]">Valores y color *</label>
              {values.map((v) => (
                <div key={v} className="flex items-center gap-3">
                  <span className="min-w-[6rem] text-sm">{v}</span>
                  <input
                    type="color"
                    value={HEX_RE.test(valueColors[v] ?? "") ? valueColors[v] : "#000000"}
                    onChange={(e) => setColorForValue(v, e.target.value)}
                    disabled={saving}
                  />
                </div>
              ))}
              <Chips
                value={values}
                onChange={(e) => handleValuesChange(e.value ?? [])}
                placeholder="Agregar valor (Enter)"
                className="w-full"
                disabled={saving}
                max={MAX_VALUES}
              />
            </div>
          )}

          <DpInput type="input" label="Orden" name="sortOrder" value={sortOrder} onChange={setSortOrder} />
          <DpInput type="check" label="Activo" name="active" value={active} onChange={setActive} />

          {isEdit && (
            <button
              type="button"
              className="text-sm text-red-600"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving || deleting}
            >
              Eliminar tipo de atributo
            </button>
          )}
        </div>
      </DpContentSet>

      <DpConfirmDialog
        visible={pendingRemoveValue !== null}
        onHide={cancelRemoveValue}
        title="Valor asignado a productos"
        message={`El valor «${pendingRemoveValue ?? ""}» está en productos. ¿Removerlo del catálogo?`}
        confirmLabel="Remover valor"
        cancelLabel="Cancelar"
        onConfirm={confirmRemoveValue}
        severity="danger"
        loading={false}
      />

      <DpConfirmDialog
        visible={showDeleteConfirm}
        onHide={() => !deleting && setShowDeleteConfirm(false)}
        title="Eliminar tipo de atributo"
        message={existing ? `¿Eliminar «${existing.label}» (${existing.code})?` : ""}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        severity="danger"
        loading={deleting}
      />
    </>
  );
}
