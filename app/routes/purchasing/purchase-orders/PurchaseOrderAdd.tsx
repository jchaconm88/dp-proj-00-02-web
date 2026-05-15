// La lógica del diálogo "Agregar orden de compra" reside en el layout padre (PurchaseOrdersPage.tsx),
// que detecta la ruta /purchasing/purchase-orders/add con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Agregar orden de compra" },
    { name: "description", content: "Formulario para agregar una nueva orden de compra" },
  ];
}

export default function PurchaseOrderAddPage() {
  return null;
}
