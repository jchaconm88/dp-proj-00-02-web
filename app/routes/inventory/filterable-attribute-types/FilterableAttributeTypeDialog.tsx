import { useEffect, useMemo, useState } from "react";
import { useNavigation } from "react-router";
import { Chips } from "primereact/chips";
import { DpInput, DpCodeInput, DpContentSet, DpConfirmDialog } from "~/components/ui";
import { generateSequenceCode } from "~/features/system/sequences";
import {
  createFilterableAttributeType,
  updateFilterableAttributeType,
  deleteFilterableAttributeType,
  type FilterableAttributeTypeRecord,
} from "~/features/inventory/filterable-attribute-types";

const CODE_RE = /^[a-z0-9_-]+$/;
const MAX_VALUES = 200;
const MAX_VALUE_LENGTH = 100;

export interface FilterableAttributeTypeDialogProps {
  visible: boolean;
  typeId: string | null;
  types: FilterableAttributeTypeRecord[];
  /** Products that use each value, keyed by value string. Used for removal warnings. */
  productsUsingValues?: Record<string, string[]>;
  onSuccess?: () => void;
  onHide: () => void;
  onDelete?: (id: string) => void;
}

export default function FilterableAttributeTypeDialog({
  visible,
  typeId,
  types,
  productsUsingValues,
  onSuccess,
  onHide,
  onDelete,
}: FilterableAttributeTypeDialogProps) {
  const isEdit = !!typeId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog for removing a value assigned to products
  const [pendingRemoveValue, setPendingRemoveValue] = useState<string | null>(null);
  const [pendingValues, setPendingValues] = useState<string[] | null>(null);

  // Delete confirmation
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
      setSortOrder("0");
      setActive(true);
      setLoading(false);
      return;
    }
    if (!existing) {
      setError("Tipo de atributo filtrable no encontrado.");
      setLoading(false);
      return;
    }
    setCode(existing.code);
    setLabel(existing.label);
    setValues([...existing.values]);
    setSortOrder(String(existing.sortOrder));
    setActive(existing.active !== false);
    setLoading(false);
  }, [visible, typeId, existing]);

  const handleValuesChange = (newValues: string[]) => {
    // Deduplicate and trim
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const v of newValues) {
      const trimmed = v.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      cleaned.push(trimmed);
    }

    // Check if a value was removed
    if (isEdit && existing) {
      const removedValues = existing.values.filter((v) => !cleaned.includes(v));
      for (const removed of removedValues) {
        const productsUsing = productsUsingValues?.[removed];
        if (productsUsing && productsUsing.length > 0) {
          // Show confirmation before removing
          setPendingRemoveValue(removed);
          setPendingValues(cleaned);
          return;
        }
      }
    }

    setValues(cleaned);
  };

  const confirmRemoveValue = () => {
    if (pendingValues) {
      setValues(pendingValues);
    }
    setPendingRemoveValue(null);
    setPendingValues(null);
  };

  const cancelRemoveValue = () => {
    setPendingRemoveValue(null);
    setPendingValues(null);
  };

  const validate = (): string | null => {
    const c = code.trim().toLowerCase();
    if (!isEdit && !c) {
      // Code can be empty if sequence generates it
    }
    if (c && !CODE_RE.test(c)) {
      return "El código solo puede contener letras minúsculas, números, guiones y guiones bajos.";
    }
    if (c && c.length > 50) {
      return "El código no puede exceder 50 caracteres.";
    }
    if (!label.trim()) return "La etiqueta es obligatoria.";
    if (label.trim().length > 100) return "La etiqueta no puede exceder 100 caracteres.";
    if (values.length === 0) return "Agregue al menos un valor permitido.";
    if (values.length > MAX_VALUES) return `No puede tener más de ${MAX_VALUES} valores.`;
    for (const v of values) {
      if (v.length > MAX_VALUE_LENGTH) {
        return `Cada valor no puede exceder ${MAX_VALUE_LENGTH} caracteres.`;
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
        try {
          finalCode = (await generateSequenceCode(code, "filterable-attribute-type")).trim().toLowerCase();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }
      }

      const payload = {
        code: finalCode,
        label: label.trim(),
        values,
        sortOrder: Number(sortOrder) || 0,
        active,
      };
      if (typeId) {
        await updateFilterableAttributeType(typeId, payload);
      } else {
        await createFilterableAttributeType(payload);
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
    setError(null);
    try {
      await deleteFilterableAttributeType(typeId);
      setShowDeleteConfirm(false);
      onDelete?.(typeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const isValid = !!label.trim() && values.length > 0;

  const productsUsingRemovedValue = pendingRemoveValue
    ? productsUsingValues?.[pendingRemoveValue] ?? []
    : [];

  return (
    <>
      <DpContentSet
        title={isEdit ? "Editar tipo de atributo filtrable" : "Agregar tipo de atributo filtrable"}
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
            entity="filterable-attribute-type"
            label="Código *"
            name="code"
            value={code}
            onChange={setCode}
            disabled={isEdit}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-2">
            Identificador interno. No se puede cambiar al editar.
          </p>

          <DpInput
            type="input"
            label="Etiqueta *"
            name="label"
            value={label}
            onChange={setLabel}
            placeholder="Marca, Género, Material"
          />

          <div className="flex flex-col gap-2">
            <label className="font-medium text-[var(--dp-menu-text)]">
              Valores permitidos *
            </label>
            <Chips
              value={values}
              onChange={(e) => handleValuesChange(e.value ?? [])}
              placeholder="Escriba un valor y presione Enter"
              className="w-full"
              disabled={saving}
              max={MAX_VALUES}
              allowDuplicate={false}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Escriba cada valor y presione Enter para agregarlo. Haga clic en la × para removerlo.
            </p>
          </div>

          <DpInput
            type="input"
            label="Orden"
            name="sortOrder"
            value={sortOrder}
            onChange={setSortOrder}
            placeholder="0"
          />

          <DpInput type="check" label="Activo" name="active" value={active} onChange={setActive} />

          {isEdit && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
              >
                Eliminar tipo de atributo
              </button>
            </div>
          )}
        </div>
      </DpContentSet>

      {/* Confirmation dialog for removing a value assigned to products */}
      <DpConfirmDialog
        visible={pendingRemoveValue !== null}
        onHide={cancelRemoveValue}
        title="Valor asignado a productos"
        message={
          pendingRemoveValue
            ? `El valor "${pendingRemoveValue}" está asignado a ${productsUsingRemovedValue.length} producto(s). ¿Desea removerlo del catálogo? Los productos existentes conservarán el valor hasta que se editen individualmente.`
            : ""
        }
        confirmLabel="Remover valor"
        cancelLabel="Cancelar"
        onConfirm={confirmRemoveValue}
        severity="danger"
        loading={false}
      />

      {/* Delete confirmation dialog */}
      <DpConfirmDialog
        visible={showDeleteConfirm}
        onHide={() => !deleting && setShowDeleteConfirm(false)}
        title="Eliminar tipo de atributo"
        message={
          existing
            ? `¿Eliminar el tipo "${existing.label}" (${existing.code})? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        severity="danger"
        loading={deleting}
      />
    </>
  );
}
