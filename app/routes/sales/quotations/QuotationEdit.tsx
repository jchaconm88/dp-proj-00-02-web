// La lógica del diálogo "Editar cotización" reside en el layout padre (QuotationsPage.tsx),
// que detecta la ruta /sales/quotations/edit/:id con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Editar cotización" },
    { name: "description", content: "Formulario para editar una cotización existente" },
  ];
}

export default function QuotationEditPage() {
  return null;
}
