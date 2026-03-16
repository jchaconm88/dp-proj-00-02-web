import type { Route } from "./+types/TripEdit";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Editar Viaje" }];
}

export default function TripEdit() {
  return null;
}
