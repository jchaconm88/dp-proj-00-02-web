import { redirect } from "react-router";
import type { Route } from "./+types/OrderDetailPage";

/** Redirige al listado: transiciones y acciones viven en /production/orders */
export async function clientLoader(_args: Route.ClientLoaderArgs) {
  throw redirect("/production/orders");
}

export default function OrderDetailPage() {
  return null;
}
