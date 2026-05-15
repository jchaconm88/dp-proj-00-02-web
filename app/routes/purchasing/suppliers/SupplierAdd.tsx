// La lógica del diálogo "Agregar proveedor" reside en el layout padre (SuppliersPage.tsx),
// que detecta la ruta /purchasing/suppliers/add con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Agregar proveedor" },
    { name: "description", content: "Formulario para agregar un nuevo proveedor" },
  ];
}

export default function SupplierAddPage() {
  return null;
}
