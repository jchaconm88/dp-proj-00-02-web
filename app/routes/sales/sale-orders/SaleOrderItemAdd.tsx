// La lógica del diálogo "Agregar ítem" reside en el layout padre (SaleOrderItemsPage.tsx),
// que detecta la ruta /sales/sale-orders/:id/items/add con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Agregar ítem" },
    { name: "description", content: "Formulario para agregar un ítem a la orden de venta" },
  ];
}

export default function SaleOrderItemAddPage() {
  return null;
}
