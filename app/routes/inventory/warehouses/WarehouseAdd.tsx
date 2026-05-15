import type { Route } from "./+types/WarehouseAdd";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Agregar Almacén" },
  ];
}

export default function WarehouseAdd() {
  return null;
}
