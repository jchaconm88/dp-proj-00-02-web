import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getDocumentTypes, deleteDocumentType, deleteDocumentTypes, type DocumentTypeRecord } from "~/features/master/document-types";
import type { Route } from "./+types/DocumentTypesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { DOCUMENT_TYPE_CATEGORY } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import DocumentTypeDialog from "./DocumentTypeDialog";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Tipos de Documento" },
    { name: "description", content: "Gestión de tipos de documento" },
  ];
}

type DocumentTypeRow = DocumentTypeRecord;

const TABLE_DEF = moduleTableDef("document-type", { type: DOCUMENT_TYPE_CATEGORY });

export async function clientLoader() {
  const { items } = await getDocumentTypes();
  return { items };
}

export default function DocumentTypesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<DocumentTypeRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("/master/document-types/add");
  const editMatch = useMatch("/master/document-types/edit/:id");
  const editId = editMatch?.params.id ?? null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/master/document-types/add");
  const openEdit = (row: DocumentTypeRow) => navigate(`/master/document-types/edit/${encodeURIComponent(row.id)}`);

  const openDeleteConfirm = () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    setPendingDeleteIds(selected.map((r) => r.id));
  };

  const handleConfirmDelete = async () => {
    const ids = pendingDeleteIds;
    if (!ids?.length) return;
    setSaving(true);
    setError(null);
    try {
      if (ids.length === 1) {
        await deleteDocumentType(ids[0]);
      } else {
        await deleteDocumentTypes(ids);
      }
      tableRef.current?.clearSelectedRows();
      setPendingDeleteIds(null);
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const closeDeleteConfirm = () => {
    if (!saving) setPendingDeleteIds(null);
  };

  const handleSuccess = () => {
    navigate("/master/document-types");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/master/document-types");

  return (
    <DpContent
      title="TIPOS DE DOCUMENTO"
      breadcrumbItems={["MAESTROS", "TIPOS DE DOCUMENTO"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar por nombre..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<DocumentTypeRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay tipos de documento."
        emptyFilterMessage="No se encontraron tipos de documento."
      />

      {dialogVisible && (
        <DocumentTypeDialog
          visible={dialogVisible}
          documentTypeId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar tipos de documento"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} tipo(s) de documento? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        severity="danger"
        loading={saving}
      />
    </DpContent>
  );
}
