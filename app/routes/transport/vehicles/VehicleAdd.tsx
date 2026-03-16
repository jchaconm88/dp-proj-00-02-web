import type { Route } from "./+types/VehicleAdd";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Agregar Vehículo" },
  ];
}

export default function VehicleAdd() {
  return null;
}
