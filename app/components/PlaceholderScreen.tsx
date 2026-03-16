import { useLocation } from "react-router";

const TITLES: Record<string, string> = {
  "/system/modules": "Módulos",
  "/system/sequences": "Secuencias",
  "/system/counters": "Contadores",
  "/master/document-types": "Tipos de Documento",
  "/master/documents": "Documentos",
  "/master/clients": "Clientes",
  "/human-resource/employees": "Empleados",
  "/human-resource/contracts": "Contratos Laborales",
  "/human-resource/positions": "Cargos",
  "/human-resource/resources": "Recursos Externos",
  "/logistic/orders": "Pedidos",
  "/transport/transport-services": "Servicios",
  "/transport/transport-contracts": "Contratos",
  "/transport/vehicles": "Vehículos",
  "/transport/drivers": "Conductores",
  "/transport/plans": "Planes",
  "/transport/routes": "Rutas",
  "/transport/trips": "Viajes",
};

export default function PlaceholderScreen() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? pathname.split("/").filter(Boolean).pop() ?? "Pantalla";
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8 dark:border-navy-600 dark:bg-navy-800">
      <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-navy-100">{title}</h1>
      <p className="text-zinc-600 dark:text-navy-300">Pantalla en construcción.</p>
    </div>
  );
}
