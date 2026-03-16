import type { Route } from "./+types/TransportRateRuleEdit";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Editar Regla de Tarifa" },
    { name: "description", content: "Formulario para editar regla de tarifa" },
  ];
}

export default function RateRuleEditPage() {
  return null;
}
