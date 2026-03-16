import type { Route } from "./+types/TripCostAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Costo" }];
}

export default function TripCostAdd() {
  return null;
}
