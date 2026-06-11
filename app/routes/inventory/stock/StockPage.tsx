import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator } from "react-router";
import { getAuthUser } from "~/lib/get-auth-user";
import { getStockLevels, type StockLevelRecord } from "~/features/inventory/stock";
import type { Route } from "./+types/StockPage";
import { DpContent, DpContentHeader } from "~/components/ui";
import { DpTable, type DpTableRef } from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Stock" },
    { name: "description", content: "Consulta de niveles de stock" },
  ];
}

type StockRow = StockLevelRecord;

const TABLE_DEF = moduleTableDef("stock-level");

export async function clientLoader() {
  await getAuthUser();
  const { items } = await getStockLevels();
  return { items };
}

export default function StockPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<StockRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const [filterValue, setFilterValue] = useState("");

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  return (
    <DpContent
      title="STOCK"
      breadcrumbItems={["INVENTARIO", "STOCK"]}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por producto, almacén..."
      />
      <DpTable<StockRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading}
        tableDef={TABLE_DEF}
        linkColumn="productName"
        onDetail={(row) => {
          const key = encodeURIComponent(row.stockLevelKey);
          navigate(`/inventory/kardex?stockLevelKey=${key}`);
        }}
        showFilterInHeader={false}
        emptyMessage="No se encontraron registros de stock"
        emptyFilterMessage="No se encontraron registros de stock"
      />
    </DpContent>
  );
}
