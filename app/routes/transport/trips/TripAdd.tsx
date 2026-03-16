import type { Route } from "./+types/TripAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Viaje" }];
}

export default function TripAdd() {
  return null;
}
