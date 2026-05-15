// La lógica del diálogo "Agregar orden de venta" reside en el layout padre (SaleOrdersPage.tsx),
// que detecta la ruta /sales/sale-orders/add con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Agregar orden de venta" },
    { name: "description", content: "Formulario para agregar una nueva orden de venta" },
  ];
}

export default function SaleOrderAddPage() {
  return null;
}
