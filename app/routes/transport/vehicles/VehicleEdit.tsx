import type { Route } from "./+types/VehicleEdit";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Editar Vehículo" },
  ];
}

export default function VehicleEdit() {
  return null;
}
