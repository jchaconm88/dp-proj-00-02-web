import type { Route } from "./+types/SettlementItemAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Nuevo ítem de liquidación" }];
}

export default function SettlementItemAdd() {
  return null;
}
