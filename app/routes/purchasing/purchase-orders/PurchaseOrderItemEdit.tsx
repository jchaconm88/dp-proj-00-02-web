// La lógica del diálogo "Editar ítem" reside en el layout padre (PurchaseOrderItemsPage.tsx),
// que detecta la ruta /purchasing/purchase-orders/:id/items/edit/:itemId con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Editar ítem" },
    { name: "description", content: "Formulario para editar un ítem de la orden de compra" },
  ];
}

export default function PurchaseOrderItemEditPage() {
  return null;
}
