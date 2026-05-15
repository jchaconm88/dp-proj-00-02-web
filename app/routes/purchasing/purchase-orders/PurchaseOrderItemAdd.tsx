// La lógica del diálogo "Agregar ítem" reside en el layout padre (PurchaseOrderItemsPage.tsx),
// que detecta la ruta /purchasing/purchase-orders/:id/items/add con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Agregar ítem" },
    { name: "description", content: "Formulario para agregar un ítem a la orden de compra" },
  ];
}

export default function PurchaseOrderItemAddPage() {
  return null;
}
