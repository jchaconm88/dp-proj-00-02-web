import type { Route } from "./+types/RecipeResultAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Resultado" }];
}

export default function RecipeResultAdd() {
  return null;
}
