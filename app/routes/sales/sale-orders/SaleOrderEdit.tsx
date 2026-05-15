// La lógica del diálogo "Editar orden de venta" reside en el layout padre (SaleOrdersPage.tsx),
// que detecta la ruta /sales/sale-orders/edit/:id con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Editar orden de venta" },
    { name: "description", content: "Formulario para editar una orden de venta existente" },
  ];
}

export default function SaleOrderEditPage() {
  return null;
}
