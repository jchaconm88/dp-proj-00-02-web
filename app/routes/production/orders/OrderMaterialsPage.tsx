import { useRef } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { DpContentInfo, DpTable, type DpTableRef } from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import { getOrderById, getOrderMaterials, type OrderMaterialRecord } from "~/features/production";
import type { Route } from "./+types/OrderMaterialsPage";

const TABLE_DEF = moduleTableDef("order-material");

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await getAuthUser();
  const orderId = params.id ?? "";
  const [order, { items }] = await Promise.all([
    getOrderById(orderId),
    getOrderMaterials(orderId),
  ]);
  if (!order) throw new Error("Orden no encontrada");
  return { order, orderId, items };
}

export default function OrderMaterialsPage({ loaderData }: Route.ComponentProps) {
  const { order, items, orderId } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const tableRef = useRef<DpTableRef<OrderMaterialRecord>>(null);
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  return (
    <DpContentInfo
      title={`Materiales: ${order.code}`}
      breadcrumbItems={["PRODUCCIÓN", "ÓRDENES", "MATERIALES"]}
      backLabel="Volver a órdenes"
      onBack={() => navigate("/production/orders")}
    >
      <DpTable<OrderMaterialRecord>
        ref={tableRef}
        data={items}
        loading={isLoading}
        tableDef={TABLE_DEF}
      />
    </DpContentInfo>
  );
}
