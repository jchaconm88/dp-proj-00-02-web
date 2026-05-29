import { useEffect, useMemo, useState } from "react";
import { DpContentSet, DpInput } from "~/components/ui";
import { createVariant, updateVariant, validateVariantSkuAgainstParent } from "~/features/inventory/products";
import type { ProductVariantInput, ProductVariantRecord } from "~/features/inventory/products";
import type { VariantAttributeTypeRecord } from "~/features/inventory/variant-attribute-types";

export function ProductVariantDialog({
  visible,
  companyId,
  productId,
  parentSku,
  variant,
  applicableTypes,
  onHide,
  onSuccess,
}: {
  visible: boolean;
  companyId: string;
  productId: string;
  parentSku: string;
  variant: ProductVariantRecord | null;
  applicableTypes: VariantAttributeTypeRecord[];
  onHide: () => void;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(variant?.id);
  const [sku, setSku] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [salePrice, setSalePrice] = useState(0);
  const [salePricePromo, setSalePricePromo] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedTypes = useMemo(
    () => [...applicableTypes].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
    [applicableTypes]
  );

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (variant) {
      setSku(variant.sku);
      setAttributes({ ...(variant.attributes ?? {}) });
      setSalePrice(variant.salePrice);
      setSalePricePromo(variant.salePricePromo);
      setWeightKg(variant.weightKg ?? null);
      setActive(variant.active);
      return;
    }
    setSku("");
    setAttributes({});
    setSalePrice(0);
    setSalePricePromo(null);
    setWeightKg(null);
    setActive(true);
  }, [visible, variant]);

  const setAttributeValue = (code: string, value: string) => {
    setAttributes((prev) => {
      const next = { ...prev };
      if (!value) delete next[code];
      else next[code] = value;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const skuError = validateVariantSkuAgainstParent(parentSku, sku);
    if (skuError) {
      setError(skuError);
      setSaving(false);
      return;
    }
    try {
      const input: ProductVariantInput = {
        sku: sku.trim(),
        attributes,
        salePrice,
        salePricePromo: salePricePromo ?? undefined,
        weightKg: weightKg ?? undefined,
        active,
      };
      if (isEdit && variant) {
        await updateVariant(productId, variant.id, input, companyId);
      } else {
        await createVariant(productId, input, companyId);
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={isEdit ? "Editar Variación" : "Nueva Variación"}
      visible={visible}
      onHide={onHide}
      onCancel={onHide}
      onSave={handleSave}
      saving={saving}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="field">
        <label>SKU</label>
        <input className="p-inputtext w-full" value={sku} onChange={(e) => setSku(e.target.value)} />
        {parentSku.trim() ? (
          <p className="text-sm text-zinc-500 mt-1">Debe ser distinto al SKU del producto ({parentSku.trim()}).</p>
        ) : null}
      </div>

      {sortedTypes.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
          Este producto no tiene tipos de atributo configurados. Edite el producto padre y seleccione los tipos en
          «Atributos de variante», o cree tipos en Inventario → Tipos de variante.
        </p>
      ) : (
        sortedTypes.map((type) => {
          const options = type.values.map((v) => ({ label: v, value: v }));
          return (
            <DpInput
              key={type.code}
              type="select"
              label={type.label}
              name={`attr-${type.code}`}
              value={attributes[type.code] ?? ""}
              onChange={(v) => setAttributeValue(type.code, String(v))}
              options={[{ label: "— Seleccionar —", value: "" }, ...options]}
              placeholder="Seleccione..."
            />
          );
        })
      )}

      <div className="field">
        <label>Precio</label>
        <input
          className="p-inputtext w-full"
          type="number"
          value={salePrice}
          onChange={(e) => setSalePrice(Number(e.target.value))}
        />
      </div>
      <div className="field">
        <label>Precio Promo</label>
        <input
          className="p-inputtext w-full"
          type="number"
          value={salePricePromo ?? ""}
          onChange={(e) => setSalePricePromo(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
      <div className="field">
        <label>Peso (kg)</label>
        <input
          className="p-inputtext w-full"
          type="number"
          value={weightKg ?? ""}
          onChange={(e) => setWeightKg(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
      <div className="field">
        <label>Activo</label>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </div>
    </DpContentSet>
  );
}
