import type { Route } from "./+types/TransportServiceAdd";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Agregar Servicio de Transporte" },
        { name: "description", content: "Formulario para agregar servicio de transporte" },
    ];
}

export default function TransportServiceAddPage() {
    return null;
}
