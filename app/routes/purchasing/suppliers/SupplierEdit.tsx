// La lógica del diálogo "Editar proveedor" reside en el layout padre (SuppliersPage.tsx),
// que detecta la ruta /purchasing/suppliers/edit/:id con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Editar proveedor" },
    { name: "description", content: "Formulario para editar un proveedor existente" },
  ];
}

export default function SupplierEditPage() {
  return null;
}
