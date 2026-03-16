import type { Route } from "./+types/TransportContractEdit";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Editar Contrato" },
    { name: "description", content: "Formulario para editar contrato" },
  ];
}

export default function ContractEditPage() {
  return null;
}
