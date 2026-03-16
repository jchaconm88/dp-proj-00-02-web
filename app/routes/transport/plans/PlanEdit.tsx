import type { Route } from "./+types/PlanEdit";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Editar Plan" }];
}

export default function PlanEdit() {
  return null;
}
