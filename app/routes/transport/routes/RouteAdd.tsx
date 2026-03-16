import type { Route } from "./+types/RouteAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Ruta" }];
}

export default function RouteAdd() {
  return null;
}
