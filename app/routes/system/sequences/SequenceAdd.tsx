// La lógica del diálogo "Agregar secuencia" reside en el layout padre (sequences.tsx),
// que detecta la ruta /system/sequences/add con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Agregar secuencia" },
    { name: "description", content: "Formulario para agregar una nueva secuencia de numeración" },
  ];
}

export default function SequencesAddPage() {
  return null;
}
