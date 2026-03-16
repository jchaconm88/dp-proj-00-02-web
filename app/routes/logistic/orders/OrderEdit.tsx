import type { Route } from "./+types/OrderEdit";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Editar Pedido" }];
}

export default function OrderEdit() {
  return null;
}
