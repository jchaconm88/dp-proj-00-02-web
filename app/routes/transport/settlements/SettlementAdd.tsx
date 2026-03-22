import type { Route } from "./+types/SettlementAdd";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Nueva liquidación" }];
}

export default function SettlementAdd() {
  return null;
}
