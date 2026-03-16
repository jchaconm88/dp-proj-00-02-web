import type { Route } from "./+types/OrderAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Pedido" }];
}

export default function OrderAdd() {
  return null;
}
