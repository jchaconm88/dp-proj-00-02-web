import type { Route } from "./+types/TripStopEdit";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Editar Parada del Viaje" }];
}

export default function TripStopEdit() {
  return null;
}
