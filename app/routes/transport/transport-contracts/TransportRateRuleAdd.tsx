import type { Route } from "./+types/TransportRateRuleAdd";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Agregar Regla de Tarifa" },
    { name: "description", content: "Formulario para agregar regla de tarifa" },
  ];
}

export default function RateRuleAddPage() {
  return null;
}
