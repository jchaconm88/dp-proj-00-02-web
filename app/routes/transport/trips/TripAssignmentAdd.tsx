import type { Route } from "./+types/TripAssignmentAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Asignación" }];
}

export default function TripAssignmentAdd() {
  return null;
}
