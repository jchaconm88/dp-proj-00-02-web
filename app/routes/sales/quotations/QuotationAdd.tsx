// La lógica del diálogo "Agregar cotización" reside en el layout padre (QuotationsPage.tsx),
// que detecta la ruta /sales/quotations/add con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Agregar cotización" },
    { name: "description", content: "Formulario para agregar una nueva cotización" },
  ];
}

export default function QuotationAddPage() {
  return null;
}
