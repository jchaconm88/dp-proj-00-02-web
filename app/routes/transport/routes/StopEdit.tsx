import type { Route } from "./+types/StopEdit";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Editar Parada" }];
}

export default function StopEdit() {
  return null;
}
