import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import { addModule, saveModule, getModule } from "~/features/system/modules";

export interface ModuleDialogProps {
  visible: boolean;
  /** Si viene un id, se edita; si es null, se crea */
  moduleId: string | null;
  onSuccess?: (id: string) => void;
  onHide: () => void;
}

export default function ModuleDialog({
  visible,
  moduleId,
  onSuccess,
  onHide,
}: ModuleDialogProps) {
  const isEdit = !!moduleId;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!moduleId) {
      setName("");
      setDescription("");
      setLoading(false);
      return;
    }
    setLoading(true);
    getModule(moduleId)
      .then((data) => {
        if (!data) { setError("Módulo no encontrado."); return; }
        setName(data.id);
        setDescription(data.description ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar módulo."))
      .finally(() => setLoading(false));
  }, [visible, moduleId]);

  const save = async () => {
    const nameTrim = name.trim();
    const descTrim = description.trim();
    if (!nameTrim) return;
    setSaving(true);
    setError(null);
    try {
      if (moduleId) {
        await saveModule(moduleId, { description: descTrim });
        onSuccess?.(moduleId);
        onHide();
      } else {
        await addModule({ name: nameTrim, description: descTrim });
        onSuccess?.(nameTrim);
        onHide();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={isEdit ? "Editar módulo" : "Agregar módulo"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!name.trim() || isNavigating}
      visible={visible}
      onHide={onHide}
    >
      {loading ? (
        <div className="py-8 text-center text-zinc-500">Cargandoâ€¦</div>
      ) : (
        <>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <DpInput
            type="input"
            label="Nombre de la colección"
            name="name"
            value={name}
            onChange={setName}
            placeholder="Ej. user"
            disabled={isEdit}
          />
          {isEdit && (
            <span className="text-xs text-zinc-500">El nombre no se puede modificar.</span>
          )}
          <DpInput
            type="input"
            label="Descripción"
            name="description"
            value={description}
            onChange={setDescription}
            placeholder="Ej. Usuarios"
          />
        </>
      )}
    </DpContentSet>
  );
}
