import type { Route } from "./+types/MovementAdd";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Agregar Movimiento" },
  ];
}

export default function MovementAdd() {
  return null;
}
