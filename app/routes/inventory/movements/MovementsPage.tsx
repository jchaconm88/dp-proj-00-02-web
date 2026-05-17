import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getAuthUser } from "~/lib/get-auth-user";
import {
  getMovements,
  type InventoryMovementRecord,
} from "~/features/inventory/movements";
import { getUnitsOfMeasureCatalog } from "~/features/system/units-of-measure";
import type { Route } from "./+types/MovementsPage";
import { DpContent, DpContentHeader } from "~/components/ui";
import { DpTable, type DpTableRef } from "~/components/ui";
import { MOVEMENT_TYPE, MOVEMENT_REFERENCE_TYPE } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import MovementDialog from "./MovementDialog";

const TABLE_DEF = moduleTableDef("inventory-movement", {
  type: MOVEMENT_TYPE,
  referenceType: MOVEMENT_REFERENCE_TYPE,
});

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Movimientos de Inventario" },
    { name: "description", content: "Gestión de movimientos de inventario" },
  ];
}

export async function clientLoader() {
  await getAuthUser();
  const [{ items }, unitsCatalog] = await Promise.all([getMovements(), getUnitsOfMeasureCatalog()]);
  return { items, unitsCatalog };
}

export default function MovementsPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<InventoryMovementRecord>>(null);

  const { items, unitsCatalog } = loaderData;

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/inventory/movements/add");

  const [filterValue, setFilterValue] = useState("");

  const dialogVisible = isAdd;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/inventory/movements/add");

  const handleSuccess = () => {
    navigate("/inventory/movements");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/inventory/movements");

  return (
    <DpContent
      title="MOVIMIENTOS DE INVENTARIO"
      breadcrumbItems={["INVENTARIO", "MOVIMIENTOS"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        loading={isLoading}
        filterPlaceholder="Filtrar por código, producto, almacén..."
      />

      <DpTable<InventoryMovementRecord>
        ref={tableRef}
        data={items}
        loading={isLoading}
        tableDef={TABLE_DEF}
        showFilterInHeader={false}
        emptyMessage="No hay movimientos de inventario registrados."
        emptyFilterMessage="No se encontraron movimientos de inventario."
      />

      {dialogVisible && (
        <MovementDialog
          visible={dialogVisible}
          unitsCatalog={unitsCatalog}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContent>
  );
}
