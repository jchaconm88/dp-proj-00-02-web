import { useRef, useState } from "react";
import { useNavigate, useRevalidator, type LoaderFunctionArgs } from "react-router";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import {
  getEcommerceSaleOrders,
  retrySaleOrderIntegrationWebhook,
  type SaleOrderRecord,
} from "~/features/sales/sale-orders";
import { getAuthUser } from "~/lib/get-auth-user";
import { requireActiveCompanyId } from "~/lib/tenant";
import type { Route } from "./+types/EcommerceOrdersPage";
import { DpContent, DpContentHeader } from "~/components/ui";
import type { DpTableRef } from "~/components/ui";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Pedidos e-commerce" },
    { name: "description", content: "Órdenes de venta sincronizadas desde WooCommerce" },
  ];
}

export async function clientLoader({}: LoaderFunctionArgs) {
  await getAuthUser();
  requireActiveCompanyId();
  const { items } = await getEcommerceSaleOrders();
  return { items };
}

export default function EcommerceOrdersPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<SaleOrderRecord>>(null);
  const [filterValue, setFilterValue] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredItems = loaderData.items.filter((row) => {
    if (!filterValue.trim()) return true;
    const q = filterValue.toLowerCase();
    return (
      row.code.toLowerCase().includes(q) ||
      (row.externalId ?? "").toLowerCase().includes(q) ||
      row.clientName.toLowerCase().includes(q)
    );
  });

  const handleRetry = async (row: SaleOrderRecord) => {
    setRetryingId(row.id);
    setError(null);
    try {
      await retrySaleOrderIntegrationWebhook(row.id);
      revalidator.revalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al reintentar webhook");
    } finally {
      setRetryingId(null);
    }
  };

  const syncBody = (row: SaleOrderRecord) => (
    <Tag
      value={row.integrationSyncStatus || "none"}
      severity={
        row.integrationSyncStatus === "synced" ? "success" : row.integrationLastError ? "danger" : "info"
      }
    />
  );

  const actionsBody = (row: SaleOrderRecord) => (
    <div className="flex gap-1">
      <Button
        icon="pi pi-eye"
        rounded
        text
        severity="secondary"
        tooltip="Ver detalle"
        onClick={() => navigate(`/sales/sale-orders/edit/${encodeURIComponent(row.id)}`)}
      />
      <Button
        icon="pi pi-refresh"
        rounded
        text
        severity="help"
        tooltip="Reintentar notificación webhook"
        loading={retryingId === row.id}
        onClick={() => handleRetry(row)}
      />
    </div>
  );

  return (
    <DpContent title="PEDIDOS E-COMMERCE" breadcrumbItems={["VENTAS", "E-COMMERCE"]}>
      <DpContentHeader
        filterValue={filterValue}
        onFilter={setFilterValue}
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        filterPlaceholder="Filtrar por código, cliente, ID tienda..."
      />
      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      <DataTable
        ref={tableRef as never}
        value={filteredItems}
        dataKey="id"
        size="small"
        paginator
        rows={20}
        emptyMessage="No hay pedidos WooCommerce"
      >
        <Column field="code" header="Código" sortable />
        <Column field="externalId" header="ID tienda" body={(r: SaleOrderRecord) => r.externalId || "—"} />
        <Column field="clientName" header="Cliente" sortable />
        <Column field="status" header="Estado" sortable />
        <Column field="paymentStatus" header="Pago" body={(r: SaleOrderRecord) => r.paymentStatus || "—"} />
        <Column
          field="total"
          header="Total"
          body={(r: SaleOrderRecord) => `${r.currency} ${r.total.toFixed(2)}`}
        />
        <Column header="Sync" body={syncBody} />
        <Column header="Acciones" body={actionsBody} />
      </DataTable>
    </DpContent>
  );
}
