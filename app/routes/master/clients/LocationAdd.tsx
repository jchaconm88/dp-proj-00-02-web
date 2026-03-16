import type { Route } from "./+types/LocationAdd";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Agregar Ubicación" },
        { name: "description", content: "Formulario para agregar ubicación al cliente" },
    ];
}

export default function LocationAddPage() {
    return null;
}
