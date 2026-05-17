import type { Route } from "./+types/RecipeEdit";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Editar Receta" }];
}

export default function RecipeEdit() {
  return null;
}
