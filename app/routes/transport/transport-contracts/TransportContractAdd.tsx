import type { Route } from "./+types/TransportContractAdd";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Agregar Contrato" },
    { name: "description", content: "Formulario para agregar contrato" },
  ];
}

export default function ContractAddPage() {
  return null;
}
