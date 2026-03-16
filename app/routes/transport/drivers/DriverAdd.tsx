import type { Route } from "./+types/DriverAdd";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Agregar Conductor" },
        { name: "description", content: "Formulario para agregar conductor" },
    ];
}

export default function DriverAddPage() {
    return null;
}
