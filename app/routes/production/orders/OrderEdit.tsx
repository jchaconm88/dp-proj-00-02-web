import type { Route } from "./+types/OrderEdit";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Editar Orden de Producción" }];
}

export default function OrderEdit() {
  return null;
}
