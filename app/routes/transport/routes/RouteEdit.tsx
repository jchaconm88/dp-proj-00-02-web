import type { Route } from "./+types/RouteEdit";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Editar Ruta" }];
}

export default function RouteEdit() {
  return null;
}
