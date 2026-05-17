import { useState, useRef, useCallback } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { DpContentInfo, DpContentHeader, DpTable, DpConfirmDialog, type DpTableRef } from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import { getRecipeById, getRecipeResults, deleteRecipeResult, type RecipeResultRecord } from "~/features/production";
import RecipeResultDialog from "./RecipeResultDialog";
import type { Route } from "./+types/RecipeResultsPage";

const RESULT_TYPE_OPTIONS = {
  finished_good: { label: "Producto terminado", severity: "success" as const },
  by_product: { label: "Subproducto", severity: "info" as const },
  waste: { label: "Desperdicio", severity: "secondary" as const },
};

const TABLE_DEF = moduleTableDef("recipe-result", { type: RESULT_TYPE_OPTIONS });

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await getAuthUser();
  const recipeId = params.id ?? "";
  const [recipe, { items }] = await Promise.all([
    getRecipeById(recipeId),
    getRecipeResults(recipeId),
  ]);
  if (!recipe) throw new Error("Receta no encontrada");
  return { recipe, recipeId, items };
}

export default function RecipeResultsPage({ loaderData }: Route.ComponentProps) {
  const { recipe, items, recipeId } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const tableRef = useRef<DpTableRef<RecipeResultRecord>>(null);
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const [filterValue, setFilterValue] = useState("");
  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const basePath = `/production/recipes/${encodeURIComponent(recipeId)}/results`;
  const isAdd = !!useMatch("/production/recipes/:id/results/add");
  const editMatch = useMatch("/production/recipes/:id/results/edit/:resultId");
  const editResultId = editMatch?.params.resultId ?? null;
  const dialogVisible = isAdd || !!editResultId;

  const openAdd = () => navigate(`${basePath}/add`);
  const handleSuccess = () => { navigate(basePath); revalidator.revalidate(); };
  const handleHide = () => navigate(basePath);

  const openDeleteConfirm = useCallback(() => {
    const rows = tableRef.current?.getSelectedRows() ?? [];
    setPendingDeleteIds(rows.map((r: RecipeResultRecord) => r.id));
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setSaving(true);
    try {
      for (const id of pendingDeleteIds) {
        await deleteRecipeResult(recipeId, id);
      }
      setPendingDeleteIds([]);
      revalidator.revalidate();
    } finally {
      setSaving(false);
    }
  }, [pendingDeleteIds, recipeId, revalidator]);

  const closeDeleteConfirm = useCallback(() => setPendingDeleteIds([]), []);

  const handleEdit = (row: RecipeResultRecord) => {
    navigate(`${basePath}/edit/${encodeURIComponent(row.id)}`);
  };

  return (
    <DpContentInfo
      title={`Resultados: ${recipe.name}`}
      breadcrumbItems={["PRODUCCIÓN", "RECETAS", "RESULTADOS"]}
      backLabel="Volver a recetas"
      onBack={() => navigate("/production/recipes")}
      onCreate={openAdd}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
        deleteDisabled={pendingDeleteIds.length === 0}
        filterPlaceholder="Filtrar..."
      />

      <DpTable<RecipeResultRecord>
        ref={tableRef}
        data={items}
        loading={isLoading}
        tableDef={TABLE_DEF}
        onEdit={handleEdit}
        showFilterInHeader={false}
      />

      <DpConfirmDialog
        visible={pendingDeleteIds.length > 0}
        onHide={closeDeleteConfirm}
        message="¿Está seguro de eliminar los resultados seleccionados? Esta acción no se puede deshacer."
        title="Confirmar eliminación"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        loading={saving}
        severity="danger"
      />

      {dialogVisible && (
        <RecipeResultDialog
          visible={dialogVisible}
          recipeId={recipeId}
          resultId={editResultId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContentInfo>
  );
}
