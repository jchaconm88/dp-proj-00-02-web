import type { Route } from "./+types/DocumentTypeAdd";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Agregar Tipo de Documento" },
  ];
}

export default function DocumentTypeAdd() {
  return null;
}
