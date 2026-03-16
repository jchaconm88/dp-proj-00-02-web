import type { Route } from "./+types/StopAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Parada" }];
}

export default function StopAdd() {
  return null;
}
