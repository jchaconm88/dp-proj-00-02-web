// La lógica del diálogo "Editar ítem" reside en el layout padre (SaleOrderItemsPage.tsx),
// que detecta la ruta /sales/sale-orders/:id/items/edit/:itemId con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Editar ítem" },
    { name: "description", content: "Formulario para editar un ítem de la orden de venta" },
  ];
}

export default function SaleOrderItemEditPage() {
  return null;
}
