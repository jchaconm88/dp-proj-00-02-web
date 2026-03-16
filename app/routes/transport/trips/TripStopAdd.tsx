import type { Route } from "./+types/TripStopAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Parada del Viaje" }];
}

export default function TripStopAdd() {
  return null;
}
