import type { Route } from "./+types/RecipeMaterialAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Material" }];
}

export default function RecipeMaterialAdd() {
  return null;
}
