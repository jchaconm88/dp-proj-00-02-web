// La lógica del diálogo "Editar contador" reside en el layout padre (counters.tsx),
// que detecta la ruta /system/counters/edit/:id con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Editar contador" },
    { name: "description", content: "Formulario para editar un contador de secuencia" },
  ];
}

export default function CountersEditPage() {
  return null;
}
