import { useEffect, useMemo, useState } from "react";
import { useNavigation } from "react-router";
import { DpInput, DpCodeInput, DpContentSet } from "~/components/ui";
import { addRecipe, updateRecipe, getRecipeById, type RecipeRecord } from "~/features/production";
import { generateSequenceCode } from "~/features/system/sequences";
import { statusToSelectOptions } from "~/constants/status-options";
import { getUnitsOfMeasureCatalog, unitsCatalogToSelectOptions, type UnitOfMeasureRecord } from "~/features/system/units-of-measure";

const RECIPE_STATUS_OPTIONS = statusToSelectOptions({
  active: { label: "Activo", severity: "success" },
  inactive: { label: "Inactivo", severity: "secondary" },
});

export interface RecipeDialogProps {
  visible: boolean;
  recipeId: string | null;
  onSuccess: () => void;
  onHide: () => void;
}

export default function RecipeDialog({ visible, recipeId, onSuccess, onHide }: RecipeDialogProps) {
  const isEdit = !!recipeId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseQuantity, setBaseQuantity] = useState("1");
  const [baseUnitOfMeasureCode, setBaseUnitOfMeasureCode] = useState("unit");
  const [status, setStatus] = useState("inactive");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [unitsCatalog, setUnitsCatalog] = useState<UnitOfMeasureRecord[]>([]);

  const unitOptions = useMemo(() => unitsCatalogToSelectOptions(unitsCatalog), [unitsCatalog]);

  const valid = !!name.trim();

  const loadRecipe = async () => {
    if (!recipeId) return;
    setLoading(true);
    try {
      const recipe = await getRecipeById(recipeId);
      if (recipe) {
        setCode(recipe.code);
        setName(recipe.name);
        setDescription(recipe.description ?? "");
        setBaseQuantity(String(recipe.baseQuantity));
        setBaseUnitOfMeasureCode(recipe.baseUnitOfMeasureCode);
        setStatus(recipe.status);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar receta");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setUnitsLoading(true);
    getUnitsOfMeasureCatalog()
      .then((items) => {
        if (!cancelled) setUnitsCatalog(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setUnitsCatalog([]);
        setError(err instanceof Error ? err.message : "Error al cargar unidades");
      })
      .finally(() => {
        if (!cancelled) setUnitsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);
    if (!recipeId) {
      setCode("");
      setName("");
      setDescription("");
      setBaseQuantity("1");
      setBaseUnitOfMeasureCode("unit");
      setStatus("inactive");
      setLoading(false);
      return;
    }
    loadRecipe();
  }, [visible, recipeId]);

  const handleHide = () => {
    if (!saving && !isNavigating) onHide();
  };

  const save = async () => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const finalCode = await generateSequenceCode(code, "recipe");
      if (isEdit && recipeId) {
        await updateRecipe(recipeId, {
          code: finalCode,
          name: name.trim(),
          description: description.trim() || undefined,
          baseQuantity: Number(baseQuantity) || 1,
          baseUnitOfMeasureCode,
          status: status as any,
        });
      } else {
        await addRecipe({
          code: finalCode,
          name: name.trim(),
          description: description.trim() || undefined,
          baseQuantity: Number(baseQuantity) || 1,
          baseUnitOfMeasureCode,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={isEdit ? "Editar Receta" : "Nueva Receta"}
      recordId={isEdit ? recipeId : null}
      cancelLabel="Cancelar"
      onCancel={handleHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={handleHide}
      showLoading={loading || unitsLoading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <DpCodeInput entity="recipe" value={code} onChange={setCode} />
      <DpInput type="input" label="Nombre *" name="name" value={name} onChange={(v) => setName(String(v))} />
      <DpInput type="input" label="Descripción" name="description" value={description} onChange={(v) => setDescription(String(v))} />
      {isEdit && (
        <DpInput type="select" label="Estado" name="status" value={status} onChange={(v) => setStatus(String(v))} options={RECIPE_STATUS_OPTIONS} />
      )}
      <DpInput type="input" label="Cantidad base" name="baseQuantity" value={baseQuantity} onChange={(v) => setBaseQuantity(String(v))} />
      <DpInput type="select" label="Unidad de medida base" name="baseUnitOfMeasureCode" value={baseUnitOfMeasureCode} onChange={(v) => setBaseUnitOfMeasureCode(String(v))} options={unitOptions} />
    </DpContentSet>
  );
}
