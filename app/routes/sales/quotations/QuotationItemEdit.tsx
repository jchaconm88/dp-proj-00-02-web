// La lógica del diálogo "Editar ítem" reside en el layout padre (QuotationItemsPage.tsx),
// que detecta la ruta /sales/quotations/:id/items/edit/:itemId con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Editar ítem de cotización" },
    { name: "description", content: "Formulario para editar un ítem de la cotización" },
  ];
}

export default function QuotationItemEditPage() {
  return null;
}
