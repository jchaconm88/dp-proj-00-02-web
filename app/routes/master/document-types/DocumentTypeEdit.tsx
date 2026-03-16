import type { Route } from "./+types/DocumentTypeEdit";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Editar Tipo de Documento" },
  ];
}

export default function DocumentTypeEdit() {
  return null;
}
