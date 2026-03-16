import type { Route } from "./+types/PlanAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Agregar Plan" }];
}

export default function PlanAdd() {
  return null;
}
