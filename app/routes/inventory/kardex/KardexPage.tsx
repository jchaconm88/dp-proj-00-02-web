import { useMemo, useRef, useState } from "react";
import { useNavigation, useRevalidator, useSearchParams } from "react-router";
import { getAuthUser } from "~/lib/get-auth-user";
import { getStockLevels, type StockLevelRecord } from "~/features/inventory/stock";
import { getKardex, type KardexLineRecord } from "~/features/inventory/kardex";
import type { Route } from "./+types/KardexPage";
import { DpContent, DpContentHeader, DpInput } from "~/components/ui";
import { DpTable, type DpTableDefColumn, type DpTableRef } from "~/components/ui";

const KARDEX_TABLE_DEF: DpTableDefColumn[] = [
  { header: "Fecha", column: "date", order: 1, display: true, filter: true },
  { header: "Tipo", column: "type", order: 2, display: true, filter: true },
  { header: "Entrada", column: "quantityIn", order: 3, display: true },
  { header: "Salida", column: "quantityOut", order: 4, display: true },
  { header: "Saldo", column: "balanceAfter", order: 5, display: true },
  { header: "Costo unit.", column: "unitCostApplied", order: 6, display: true },
  { header: "Costo prom.", column: "averageUnitCostAfter", order: 7, display: true },
  { header: "Valor saldo", column: "balanceValueAfter", order: 8, display: true },
  { header: "Referencia", column: "referenceId", order: 9, display: true, filter: true },
];

export function meta() {
  return [{ title: "Kardex" }];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await getAuthUser();
  const url = new URL(request.url);
  const stockLevelKey = url.searchParams.get("stockLevelKey")?.trim() ?? "";
  const [{ items: stockLevels }, kardex] = await Promise.all([
    getStockLevels(),
    stockLevelKey ? getKardex(stockLevelKey) : Promise.resolve({ items: [] as KardexLineRecord[], stockLevelKey: "" }),
  ]);
  return { stockLevels, stockLevelKey, kardexItems: kardex.items };
}

export default function KardexPage({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const [, setSearchParams] = useSearchParams();
  const tableRef = useRef<DpTableRef<KardexLineRecord>>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedKey, setSelectedKey] = useState(loaderData.stockLevelKey);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const stockOptions = useMemo(
    () =>
      loaderData.stockLevels.map((s: StockLevelRecord) => ({
        value: s.stockLevelKey,
        label: `${s.productName}${s.variantSku ? ` (${s.variantSku})` : ""} · ${s.warehouseName} · ${s.quantity}`,
      })),
    [loaderData.stockLevels]
  );

  const applyStockKey = (key: string) => {
    setSelectedKey(key);
    const params = new URLSearchParams();
    if (key) params.set("stockLevelKey", key);
    setSearchParams(params, { preventScrollReset: true });
    revalidator.revalidate();
  };

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  return (
    <DpContent title="KARDEX" breadcrumbItems={["INVENTARIO", "KARDEX"]}>
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar movimientos..."
        loading={isLoading}
      />
      <div className="mb-4 max-w-2xl">
        <DpInput
          type="select"
          label="Nivel de stock (stockLevelKey) *"
          name="stockLevelKey"
          value={selectedKey}
          onChange={(v) => applyStockKey(String(v))}
          options={stockOptions}
          placeholder="Seleccione producto / variante y almacén"
        />
      </div>
      <DpTable<KardexLineRecord>
        ref={tableRef}
        data={loaderData.kardexItems}
        loading={isLoading}
        tableDef={KARDEX_TABLE_DEF}
        showFilterInHeader={false}
        emptyMessage={
          selectedKey
            ? "No hay movimientos para este nivel de stock"
            : "Seleccione un nivel de stock para ver el kardex"
        }
        emptyFilterMessage="No se encontraron líneas de kardex"
      />
    </DpContent>
  );
}
