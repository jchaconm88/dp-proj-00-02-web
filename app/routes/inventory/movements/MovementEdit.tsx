import type { Route } from "./+types/MovementEdit";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Editar Movimiento" },
  ];
}

export default function MovementEdit() {
  return null;
}
