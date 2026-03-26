import type { Route } from "./+types/ChargeTypeAdd";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Agregar Tipo de Cobro" },
    { name: "description", content: "Formulario para agregar tipo de cobro/costo" },
  ];
}

export default function ChargeTypeAddPage() {
  return null;
}

