// La lógica del diálogo "Agregar ítem" reside en el layout padre (QuotationItemsPage.tsx),
// que detecta la ruta /sales/quotations/:id/items/add con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Agregar ítem de cotización" },
    { name: "description", content: "Formulario para agregar un ítem a la cotización" },
  ];
}

export default function QuotationItemAddPage() {
  return null;
}
