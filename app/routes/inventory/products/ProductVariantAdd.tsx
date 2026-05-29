import type { Route } from "./+types/ProductVariantAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Nueva variación" }];
}

export default function ProductVariantAdd() {
  return null;
}

