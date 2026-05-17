import type { Route } from "./+types/RecipeAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Receta" }];
}

export default function RecipeAdd() {
  return null;
}
