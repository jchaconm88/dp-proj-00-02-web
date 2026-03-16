import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getDocumentTypeById,
  addDocumentType,
  updateDocumentType,
  type DocumentTypeCategory,
} from "~/features/master/document-types";
import { DOCUMENT_TYPE_CATEGORY, statusToSelectOptions } from "~/constants/status-options";

export interface DocumentTypeDialogProps {
  visible: boolean;
  documentTypeId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const CATEGORY_OPTIONS = statusToSelectOptions(DOCUMENT_TYPE_CATEGORY);

export default function DocumentTypeDialog({
  visible,
  documentTypeId,
  onSuccess,
  onHide,
}: DocumentTypeDialogProps) {
  const isEdit = !!documentTypeId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<DocumentTypeCategory>("identity");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!documentTypeId) {
      setName("");
      setDescription("");
      setType("identity");
      setLoading(false);
      return;
    }

    setLoading(true);
    getDocumentTypeById(documentTypeId)
      .then((data) => {
        if (!data) {
          setError("Tipo de documento no encontrado.");
          return;
        }
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setType(data.type ?? "identity");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, documentTypeId]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        type,
      };

      if (documentTypeId) {
        await updateDocumentType(documentTypeId, payload);
      } else {
        await addDocumentType(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!name.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar tipo de documento" : "Agregar tipo de documento"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
    >
      {loading ? (
        <div className="py-8 text-center text-zinc-500">Cargando...</div>
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <DpInput type="input" label="Nombre" name="name" value={name} onChange={setName} placeholder="DNI, RUC, etc." />
          <DpInput type="input" label="Descripción" name="description" value={description} onChange={setDescription} placeholder="Documento Nacional de Identidad" />
          <DpInput type="select" label="Categoría (Tipo)" name="type" value={type} onChange={(v) => setType(v as DocumentTypeCategory)} options={CATEGORY_OPTIONS} />
        </div>
      )}
    </DpContentSet>
  );
}
