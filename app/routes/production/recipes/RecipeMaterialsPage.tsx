import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { DpContentInfo, DpContentHeader, DpTable, DpConfirmDialog, type DpTableRef } from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import { getRecipeById, getRecipeMaterials, deleteRecipeMaterial, type RecipeMaterialRecord } from "~/features/production";
import RecipeMaterialDialog from "./RecipeMaterialDialog";
import type { Route } from "./+types/RecipeMaterialsPage";

const TABLE_DEF = moduleTableDef("recipe-material");

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  await getAuthUser();
  const recipeId = params.id ?? "";
  const [recipe, { items }] = await Promise.all([
    getRecipeById(recipeId),
    getRecipeMaterials(recipeId),
  ]);
  if (!recipe) throw new Error("Receta no encontrada");
  return { recipe, recipeId, items };
}

export default function RecipeMaterialsPage({ loaderData }: Route.ComponentProps) {
  const { recipe, items, recipeId } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const tableRef = useRef<DpTableRef<RecipeMaterialRecord>>(null);
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const [filterValue, setFilterValue] = useState("");
  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const basePath = `/production/recipes/${encodeURIComponent(recipeId)}/materials`;
  const isAdd = !!useMatch("/production/recipes/:id/materials/add");
  const editMatch = useMatch("/production/recipes/:id/materials/edit/:materialId");
  const editMaterialId = editMatch?.params.materialId ?? null;
  const dialogVisible = isAdd || !!editMaterialId;

  const openAdd = () => navigate(`${basePath}/add`);
  const handleSuccess = () => { navigate(basePath); revalidator.revalidate(); };
  const handleHide = () => navigate(basePath);

  const openDeleteConfirm = useCallback(() => {
    const rows = tableRef.current?.getSelectedRows() ?? [];
    setPendingDeleteIds(rows.map((r: RecipeMaterialRecord) => r.id));
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setSaving(true);
    try {
      for (const id of pendingDeleteIds) {
        await deleteRecipeMaterial(recipeId, id);
      }
      setPendingDeleteIds([]);
      revalidator.revalidate();
    } finally {
      setSaving(false);
    }
  }, [pendingDeleteIds, recipeId, revalidator]);

  const closeDeleteConfirm = useCallback(() => setPendingDeleteIds([]), []);

  const handleEdit = (row: RecipeMaterialRecord) => {
    navigate(`${basePath}/edit/${encodeURIComponent(row.id)}`);
  };

  const handleDelete = (row: RecipeMaterialRecord) => {
    setPendingDeleteIds([row.id]);
  };

  return (
    <DpContentInfo
      title={`Materiales: ${recipe.name}`}
      breadcrumbItems={["PRODUCCIÓN", "RECETAS", "MATERIALES"]}
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

      <DpTable<RecipeMaterialRecord>
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
        message="¿Está seguro de eliminar los materiales seleccionados? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        loading={saving}
        severity="danger"
      />

      {dialogVisible && (
        <RecipeMaterialDialog
          visible={dialogVisible}
          recipeId={recipeId}
          materialId={editMaterialId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContentInfo>
  );
}
