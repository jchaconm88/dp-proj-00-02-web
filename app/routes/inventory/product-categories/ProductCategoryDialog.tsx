import { useState, useEffect, useMemo } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/ui";
import { DpCodeInput } from "~/components/ui";
import { DpContentSet } from "~/components/ui";
import {
  addProductCategory,
  updateProductCategory,
  type ProductCategoryRecord,
} from "~/features/inventory/product-categories";
import { generateSequenceCode } from "~/features/system/sequences";

export interface ProductCategoryDialogProps {
  visible: boolean;
  /** Si viene un id, se edita; si es null, se crea */
  categoryId: string | null;
  /** Lista completa de categorías para validar jerarquía y poblar selector de padre */
  categories: ProductCategoryRecord[];
  onSuccess?: () => void;
  onHide: () => void;
}

/**
 * Calcula la profundidad (nivel) de una categoría en la jerarquía.
 * Nivel 1 = raíz (sin padre), Nivel 2 = hijo de raíz, Nivel 3 = nieto.
 */
function getCategoryDepth(
  categoryId: string,
  categoriesMap: Map<string, ProductCategoryRecord>
): number {
  let depth = 1;
  let current = categoriesMap.get(categoryId);
  while (current?.parentCategoryId) {
    depth++;
    current = categoriesMap.get(current.parentCategoryId);
    if (depth > 10) break; // safety guard against circular references
  }
  return depth;
}

/**
 * Valida si asignar `parentId` como padre de la categoría actual (editId)
 * respetaría el límite de 3 niveles de profundidad.
 */
function validateMaxDepth(
  parentId: string | undefined,
  editId: string | null,
  categoriesMap: Map<string, ProductCategoryRecord>
): boolean {
  if (!parentId) return true; // sin padre = nivel 1, siempre válido

  // Calcular profundidad del padre seleccionado
  const parentDepth = getCategoryDepth(parentId, categoriesMap);

  // La categoría actual estaría en parentDepth + 1
  const currentDepth = parentDepth + 1;
  if (currentDepth > 3) return false;

  // Si estamos editando, verificar que los hijos no excedan nivel 3
  if (editId) {
    const maxChildDepth = getMaxSubtreeDepth(editId, categoriesMap);
    if (currentDepth + maxChildDepth - 1 > 3) return false;
  }

  return true;
}

/**
 * Obtiene la profundidad máxima del subárbol de una categoría (incluyéndola).
 */
function getMaxSubtreeDepth(
  categoryId: string,
  categoriesMap: Map<string, ProductCategoryRecord>
): number {
  const children = Array.from(categoriesMap.values()).filter(
    (c) => c.parentCategoryId === categoryId
  );
  if (children.length === 0) return 1;
  const childDepths = children.map((c) => getMaxSubtreeDepth(c.id, categoriesMap));
  return 1 + Math.max(...childDepths);
}

export default function ProductCategoryDialog({
  visible,
  categoryId,
  categories,
  onSuccess,
  onHide,
}: ProductCategoryDialogProps) {
  const isEdit = !!categoryId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Build parent category options (exclude self and descendants when editing)
  const parentOptions = useMemo(() => {
    const excluded = new Set<string>();
    if (categoryId) {
      // Exclude self and all descendants
      const collectDescendants = (id: string) => {
        excluded.add(id);
        categories
          .filter((c) => c.parentCategoryId === id)
          .forEach((c) => collectDescendants(c.id));
      };
      collectDescendants(categoryId);
    }

    // Only show categories that are at depth 1 or 2 (so the child would be at max depth 3)
    return [
      { label: "— Sin categoría padre —", value: "" },
      ...categories
        .filter((c) => !excluded.has(c.id))
        .filter((c) => getCategoryDepth(c.id, categoriesMap) < 3)
        .map((c) => ({
          label: `${c.code} - ${c.name}`,
          value: c.id,
        })),
    ];
  }, [categories, categoryId, categoriesMap]);

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!categoryId) {
      setCode("");
      setName("");
      setDescription("");
      setParentCategoryId("");
      setActive(true);
      setLoading(false);
      return;
    }

    // Load existing category data
    const existing = categories.find((c) => c.id === categoryId);
    if (!existing) {
      setError("Categoría no encontrada.");
      setLoading(false);
      return;
    }
    setCode(existing.code ?? "");
    setName(existing.name ?? "");
    setDescription(existing.description ?? "");
    setParentCategoryId(existing.parentCategoryId ?? "");
    setActive(existing.active !== false);
    setLoading(false);
  }, [visible, categoryId, categories]);

  const validate = (): string | null => {
    if (isEdit && !code.trim()) {
      return "El campo Código es obligatorio.";
    }
    if (code.trim().length > 20) {
      return "El código no puede exceder 20 caracteres.";
    }
    if (!name.trim()) {
      return "El campo Nombre es obligatorio.";
    }
    if (name.trim().length > 100) {
      return "El nombre no puede exceder 100 caracteres.";
    }
    if (description && description.trim().length > 250) {
      return "La descripción no puede exceder 250 caracteres.";
    }
    // Validate max 3 levels of depth
    if (parentCategoryId) {
      if (!validateMaxDepth(parentCategoryId, categoryId, categoriesMap)) {
        return "No se puede asignar esta categoría padre: se excedería el máximo de 3 niveles de profundidad.";
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
        finalCode = code.trim();
      } else {
        try {
          finalCode = await generateSequenceCode(code, "product-category");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }
      }

      if (categoryId) {
        await updateProductCategory(categoryId, {
          code: finalCode,
          name: name.trim(),
          description: description.trim() || undefined,
          parentCategoryId: parentCategoryId || undefined,
          active,
        });
      } else {
        await addProductCategory({
          code: finalCode,
          name: name.trim(),
          description: description.trim() || undefined,
          parentCategoryId: parentCategoryId || undefined,
          active,
        });
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const isValid = !!name.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar categoría de producto" : "Agregar categoría de producto"}
      recordId={isEdit ? categoryId : null}
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
          entity="product-category"
          value={code}
          onChange={setCode}
          disabled={isEdit}
        />
        <DpInput
          type="input"
          label="Nombre *"
          name="name"
          value={name}
          onChange={setName}
          placeholder="Nombre de la categoría"
        />
        <DpInput
          type="textarea"
          label="Descripción"
          name="description"
          value={description}
          onChange={setDescription}
          placeholder="Descripción opcional"
        />
        <DpInput
          type="select"
          label="Categoría padre"
          name="parentCategoryId"
          value={parentCategoryId}
          onChange={(v) => setParentCategoryId(String(v))}
          options={parentOptions}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Máximo 3 niveles de profundidad en la jerarquía.
        </p>
        <DpInput
          type="check"
          label="Activo"
          name="active"
          value={active}
          onChange={setActive}
        />
      </div>
    </DpContentSet>
  );
}
