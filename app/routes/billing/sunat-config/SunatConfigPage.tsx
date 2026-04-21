import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch, redirect } from "react-router";
import { getAuthUser } from "~/lib/get-auth-user";
import { listSunatConfigsForTable, type SunatConfigTableRow } from "~/features/billing/sunat-config";
import type { Route } from "./+types/SunatConfigPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { moduleTableDef } from "~/data/system-modules";
import SunatConfigDialog from "./SunatConfigDialog";

export async function clientLoader() {
  const user = await getAuthUser();
  if (!user) throw redirect("/login");

  try {
    const { items } = await listSunatConfigsForTable();
    return { items, loadError: null as string | null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err ?? "");
    // Mantener estándar del proyecto: loader no decide permisos, solo retorna error para UI.
    return { items: [], loadError: message };
  }
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Configuración SUNAT" }];
}

const TABLE_DEF = moduleTableDef("sunat-config", {});

export default function SunatConfigPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<SunatConfigTableRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/billing/sunat-config/add");
  const editMatch = useMatch("/billing/sunat-config/edit/:id");
  const editId = editMatch?.params.id ?? null;

  const [filterValue, setFilterValue] = useState("");

  const dialogVisible = isAdd || !!editId;
  const hasConfig = loaderData.items.length > 0;
  const loadError = (loaderData as unknown as { loadError?: string | null }).loadError ?? null;

  useEffect(() => {
    if (hasConfig && isAdd) {
      navigate("/billing/sunat-config", { replace: true });
    }
  }, [hasConfig, isAdd, navigate]);

  const openAdd = () => navigate("/billing/sunat-config/add");
  const openEdit = (row: SunatConfigTableRow) =>
    navigate(`/billing/sunat-config/edit/${encodeURIComponent(row.id)}`);

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const handleSuccess = () => {
    revalidator.revalidate();
    navigate("/billing/sunat-config");
  };

  const handleHide = () => navigate("/billing/sunat-config");

  return (
    <DpContent
      title="CONFIGURACIÓN SUNAT"
      breadcrumbItems={["FACTURACIÓN", "CONFIGURACIÓN SUNAT"]}
      onCreate={!hasConfig ? openAdd : undefined}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por nombre, usuario, ambiente..."
      />
      {loadError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {loadError}
        </div>
      )}

      {!loadError && (
        <DpTable<SunatConfigTableRow>
          ref={tableRef}
          data={loaderData.items}
          loading={isLoading}
          tableDef={TABLE_DEF}
          onEdit={openEdit}
          showFilterInHeader={false}
          emptyMessage="No hay configuración SUNAT. Usa Crear para registrar credenciales."
          emptyFilterMessage="No se encontraron registros."
        />
      )}

      {dialogVisible && !loadError && (
        <SunatConfigDialog
          visible={dialogVisible}
          configId={isAdd ? null : editId}
          canEdit={true}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContent>
  );
}
