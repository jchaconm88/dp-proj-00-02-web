import { useState, useRef, useCallback } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { Button } from "primereact/button";
import { DpContent, DpContentHeader, DpTable, DpTColumn, DpConfirmDialog, type DpTableRef } from "~/components/ui";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import { getRecipes, deleteRecipe, activateRecipe, deactivateRecipe, type RecipeRecord } from "~/features/production";
import RecipeDialog from "./RecipeDialog";
import type { Route } from "./+types/RecipesPage";

const STATUS_OPTIONS = {
  active: { label: "Activo", severity: "success" as const },
  inactive: { label: "Inactivo", severity: "secondary" as const },
};

const TABLE_DEF = moduleTableDef("recipe", { status: STATUS_OPTIONS });

export async function clientLoader() {
  await getAuthUser();
  const { items } = await getRecipes();
  return { items };
}

export default function RecipesPage({ loaderData }: Route.ComponentProps) {
  const { items } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const navigation = useNavigation();
  const tableRef = useRef<DpTableRef<RecipeRecord>>(null);
  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";

  const [filterValue, setFilterValue] = useState("");
  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isAdd = !!useMatch("/production/recipes/add");
  const editMatch = useMatch("/production/recipes/edit/:id");
  const editId = editMatch?.params.id ?? null;
  const dialogVisible = isAdd || !!editId;

  const openAdd = () => navigate("/production/recipes/add");
  const handleSuccess = () => { navigate("/production/recipes"); revalidator.revalidate(); };
  const handleHide = () => navigate("/production/recipes");

  const openDeleteConfirm = useCallback(() => {
    const rows = tableRef.current?.getSelectedRows() ?? [];
    setPendingDeleteIds(rows.map((r: RecipeRecord) => r.id));
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setSaving(true);
    try {
      for (const id of pendingDeleteIds) {
        await deleteRecipe(id);
      }
      setPendingDeleteIds([]);
      revalidator.revalidate();
    } finally {
      setSaving(false);
    }
  }, [pendingDeleteIds, revalidator]);

  const closeDeleteConfirm = useCallback(() => setPendingDeleteIds([]), []);

  const handleActivate = async (id: string) => {
    try {
      await activateRecipe(id);
      revalidator.revalidate();
    } catch (err) {
      console.error("Error activating recipe:", err);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateRecipe(id);
      revalidator.revalidate();
    } catch (err) {
      console.error("Error deactivating recipe:", err);
    }
  };

  const handleEdit = (row: RecipeRecord) => {
    navigate(`/production/recipes/edit/${encodeURIComponent(row.id)}`);
  };

  return (
    <DpContent
      title="Recetas"
      breadcrumbItems={["PRODUCCIÓN", "RECETAS"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        filterValue={filterValue}
        onFilter={handleFilter}
        onLoad={() => revalidator.revalidate()}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedIds.length === 0}
        filterPlaceholder="Filtrar..."
      />

      <DpTable<RecipeRecord>
        ref={tableRef}
        data={items}
        loading={isLoading}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedIds(rows.map((r: RecipeRecord) => r.id))}
        onEdit={handleEdit}
        showFilterInHeader={false}
      >
        <DpTColumn<RecipeRecord> name="status">
          {(row) => (
            <Button
              type="button"
              size="small"
              severity="secondary"
              label={row.status === "inactive" ? "Activar" : "Desactivar"}
              onClick={() => (row.status === "inactive" ? handleActivate(row.id) : handleDeactivate(row.id))}
            />
          )}
        </DpTColumn>
        <DpTColumn<RecipeRecord> name="recipeMaterials">
          {(row) => (
            <button
              type="button"
              onClick={() => navigate(`/production/recipes/${encodeURIComponent(row.id)}/materials`)}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Materiales"
              title="Materiales"
            >
              <i className="pi pi-box" />
            </button>
          )}
        </DpTColumn>
        <DpTColumn<RecipeRecord> name="recipeResults">
          {(row) => (
            <button
              type="button"
              onClick={() => navigate(`/production/recipes/${encodeURIComponent(row.id)}/results`)}
              className="p-button p-button-text p-button-rounded p-button-icon-only"
              aria-label="Productos"
              title="Productos"
            >
              <i className="pi pi-cog" />
            </button>
          )}
        </DpTColumn>
      </DpTable>

      <DpConfirmDialog
        visible={pendingDeleteIds.length > 0}
        onHide={closeDeleteConfirm}
        message="¿Está seguro de eliminar las recetas seleccionadas? Esta acción no se puede deshacer."
        title="Confirmar eliminación"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        loading={saving}
        severity="danger"
      />

      {dialogVisible && (
        <RecipeDialog
          visible={dialogVisible}
          recipeId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}
    </DpContent>
  );
}
