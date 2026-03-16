// La lógica del diálogo "Agregar contador" reside en el layout padre (counters.tsx),
// que detecta la ruta /system/counters/add con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Agregar contador" },
    { name: "description", content: "Formulario para agregar un nuevo contador de secuencia" },
  ];
}

export default function CountersAddPage() {
  return null;
}
