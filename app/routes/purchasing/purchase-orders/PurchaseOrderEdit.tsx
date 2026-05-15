// La lógica del diálogo "Editar orden de compra" reside en el layout padre (PurchaseOrdersPage.tsx),
// que detecta la ruta /purchasing/purchase-orders/edit/:id con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Editar orden de compra" },
    { name: "description", content: "Formulario para editar una orden de compra existente" },
  ];
}

export default function PurchaseOrderEditPage() {
  return null;
}
