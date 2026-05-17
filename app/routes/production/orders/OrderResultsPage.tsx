import { useRef } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { DpContentInfo, DpTable, type DpTableRef } from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import { getOrderById, getOrderResults, type OrderResultRecord } from "~/features/production";
import OrderResultDialog from "./OrderResultDialog";
import type { Route } from "./+types/OrderResultsPage";

const RESULT_TYPE_OPTIONS = {
  finished_good: { label: "Producto terminado", severity: "success" as const },
  by_product: { label: "Subproducto", severity: "info" as const },
  waste: { label: "Desperdicio", severity: "secondary" as const },
};

const TABLE_DEF = moduleTableDef("order-result", { type: RESULT_TYPE_OPTIONS });

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await getAuthUser();
  const orderId = params.id ?? "";
  const [order, { items }] = await Promise.all([
    getOrderById(orderId),
    getOrderResults(orderId),
  ]);
  if (!order) throw new Error("Orden no encontrada");
  return { order, orderId, items };
}

export default function OrderResultsPage({ loaderData }: Route.ComponentProps) {
  const { order, items, orderId } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const tableRef = useRef<DpTableRef<OrderResultRecord>>(null);
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const isEdit = !!useMatch("/production/orders/:id/results/edit/:resultId");
  const editMatch = useMatch("/production/orders/:id/results/edit/:resultId");
  const editResultId = editMatch?.params.resultId ?? null;
  const dialogVisible = isEdit && !!editResultId;

  const handleSuccess = () => { navigate(`/production/orders/${encodeURIComponent(orderId)}/results`); revalidator.revalidate(); };
  const handleHide = () => navigate(`/production/orders/${encodeURIComponent(orderId)}/results`);

  const handleEdit = (row: OrderResultRecord) => {
    navigate(`/production/orders/${encodeURIComponent(orderId)}/results/edit/${encodeURIComponent(row.id)}`);
  };

  return (
    <DpContentInfo
      title={`Resultados: ${order.code}`}
      breadcrumbItems={["PRODUCCIÓN", "ÓRDENES", "RESULTADOS"]}
      backLabel="Volver a órdenes"
      onBack={() => navigate("/production/orders")}
    >
      <DpTable<OrderResultRecord>
        ref={tableRef}
        data={items}
        loading={isLoading}
        tableDef={TABLE_DEF}
        onEdit={order.status === "en_proceso" ? handleEdit : undefined}
      />

      {dialogVisible && (
        <OrderResultDialog
          visible={dialogVisible}
          orderId={orderId}
          resultId={editResultId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContentInfo>
  );
}
