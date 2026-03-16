// La lógica del diálogo "Editar secuencia" reside en el layout padre (sequences.tsx),
// que detecta la ruta /system/sequences/edit/:id con useMatch y abre el diálogo.
export function meta() {
  return [
    { title: "Editar secuencia" },
    { name: "description", content: "Formulario para editar una secuencia de numeración" },
  ];
}

export default function SequencesEditPage() {
  return null;
}
