import type { Route } from "./+types/ChargeTypeEdit";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Editar Tipo de Cobro" },
    { name: "description", content: "Formulario para editar tipo de cobro/costo" },
  ];
}

export default function ChargeTypeEditPage() {
  return null;
}

