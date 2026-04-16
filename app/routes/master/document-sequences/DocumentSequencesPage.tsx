import { useRef, useState } from "react";
import { useNavigate, useNavigation, useRevalidator, useMatch } from "react-router";
import {
  getDocumentSequences,
  deleteDocumentSequence,
  type DocumentSequenceRecord,
} from "~/features/master/document-sequences";
import type { Route } from "./+types/DocumentSequencesPage";
import { DpContent, DpContentHeader } from "~/components/DpContent";
import { DpTable, type DpTableRef } from "~/components/DpTable";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";
import { INVOICE_TYPE } from "~/constants/status-options";
import { moduleTableDef } from "~/data/system-modules";
import { getAuthUser } from "~/lib/get-auth-user";
import DocumentSequenceDialog from "./DocumentSequenceDialog";

export function meta() {
  return [{ title: "Secuencias de Documentos" }];
}

type DocumentSequenceRow = DocumentSequenceRecord;

const TABLE_DEF = moduleTableDef("document-sequence", { documentType: INVOICE_TYPE });

export async function clientLoader() {
  await getAuthUser();
  const { items } = await getDocumentSequences();
  return { items };
}

export default function DocumentSequencesPage({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const tableRef = useRef<DpTableRef<DocumentSequenceRow>>(null);

  const isLoading = navigation.state !== "idle" || revalidator.state === "loading";
  const isAdd = !!useMatch("master/document-sequences/add");
  const editMatch = useMatch("master/document-sequences/edit/:id");
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

  const openAdd = () => navigate("/master/document-sequences/add");
  const openEdit = (row: DocumentSequenceRow) => navigate(`/master/document-sequences/edit/${encodeURIComponent(row.id)}`);

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
      for (const id of ids) {
        await deleteDocumentSequence(id);
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
    revalidator.revalidate();
    navigate("/master/document-sequences");
  };

  const handleHide = () => navigate("/master/document-sequences");

  return (
    <DpContent
      title="SECUENCIAS DE DOCUMENTOS"
      breadcrumbItems={["MAESTROS", "SECUENCIAS DE DOCUMENTOS"]}
      onCreate={openAdd}
    >
      <DpContentHeader
        onLoad={() => revalidator.revalidate()}
        showCreateButton={false}
        onDelete={openDeleteConfirm}
        deleteDisabled={selectedCount === 0 || saving}
        filterValue={filterValue}
        onFilter={handleFilter}
        filterPlaceholder="Filtrar..."
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpTable<DocumentSequenceRow>
        ref={tableRef}
        data={loaderData.items}
        loading={isLoading || saving}
        tableDef={TABLE_DEF}
        onSelectionChange={(rows) => setSelectedCount(rows.length)}
        onEdit={openEdit}
        showFilterInHeader={false}
        emptyMessage="No hay secuencias de documentos."
        emptyFilterMessage="No se encontraron secuencias de documentos."
      />

      {dialogVisible && (
        <DocumentSequenceDialog
          visible={dialogVisible}
          sequenceId={editId}
          onSuccess={handleSuccess}
          onHide={handleHide}
        />
      )}

      <DpConfirmDialog
        visible={pendingDeleteIds !== null}
        onHide={closeDeleteConfirm}
        title="Eliminar secuencias de documentos"
        message={
          pendingDeleteIds?.length
            ? `¿Eliminar ${pendingDeleteIds.length} secuencia(s) de documento? Esta acción no se puede deshacer.`
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
