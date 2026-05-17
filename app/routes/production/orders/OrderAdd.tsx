import type { Route } from "./+types/OrderAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Nueva Orden de Producción" }];
}

export default function OrderAdd() {
  return null;
}
