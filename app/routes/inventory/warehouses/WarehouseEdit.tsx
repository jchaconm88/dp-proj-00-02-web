import type { Route } from "./+types/WarehouseEdit";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Editar Almacén" },
  ];
}

export default function WarehouseEdit() {
  return null;
}
