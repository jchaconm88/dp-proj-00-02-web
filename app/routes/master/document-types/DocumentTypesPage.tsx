import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import { getDocumentTypes, deleteDocumentType, deleteDocumentTypes, type DocumentTypeRecord } from "~/features/master/document-types";
import type { Route } from "./+types/DocumentTypesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef, type DpTableDefColumn } from "~/components/DpTable";
import { DOCUMENT_TYPE_CATEGORY } from "~/constants/status-options";
import DocumentTypeDialog from "./DocumentTypeDialog";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Tipos de Documento" },
    { name: "description", content: "Gestión de tipos de documento" },
  ];
}

type DocumentTypeRow = DocumentTypeRecord;

const TABLE_DEF: DpTableDefColumn[] = [
  { header: "Nombre", column: "name", order: 1, display: true, filter: true },
  { header: "Descripción", column: "description", order: 2, display: true, filter: true },
  { header: "Categoría", column: "type", order: 3, display: true, filter: true, type: "status", typeOptions: DOCUMENT_TYPE_CATEGORY },
];

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

  const dialogVisible = isAdd || !!editId;

  const handleFilter = (value: string) => {
    setFilterValue(value);
    tableRef.current?.filter(value);
  };

  const openAdd = () => navigate("/master/document-types/add");
  const openEdit = (row: DocumentTypeRow) => navigate(`/master/document-types/edit/${encodeURIComponent(row.id)}`);

  const handleDelete = async () => {
    const selected = tableRef.current?.getSelectedRows() ?? [];
    if (!selected.length) return;
    if (!confirm(`¿Eliminar ${selected.length} tipo(s) de documento?`)) return;

    setSaving(true);
    setError(null);
    try {
      if (selected.length === 1) {
        await deleteDocumentType(selected[0].id);
      } else {
        await deleteDocumentTypes(selected.map((r) => r.id));
      }
      tableRef.current?.clearSelectedRows();
      revalidator.revalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const handleSuccess = () => {
    navigate("/master/document-types");
    revalidator.revalidate();
  };

  const handleHide = () => navigate("/master/document-types");

  return (
    <DpContent title="TIPOS DE DOCUMENTO">
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        onCreate={openAdd}
        onDelete={handleDelete}
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
    </DpContent>
  );
}
