/** Validación compartida: SKU de variante ≠ SKU del producto padre. */
export function validateVariantSkuAgainstParent(parentSku: string, variantSku: string): string | null {
  const variant = variantSku.trim();
  if (!variant) {
    return "El SKU de la variación es obligatorio.";
  }
  const parent = parentSku.trim();
  if (parent && parent.toLowerCase() === variant.toLowerCase()) {
    return "El SKU de la variación debe ser distinto al SKU del producto padre.";
  }
  return null;
}
