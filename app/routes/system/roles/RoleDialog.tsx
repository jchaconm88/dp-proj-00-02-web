import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import { getRoleById, addRole, updateRole } from "~/features/system/roles";

export interface RoleDialogProps {
  visible: boolean;
  /** Si viene un id, se edita; si es null, se crea */
  roleId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

export default function RoleDialog({
  visible,
  roleId,
  onSuccess,
  onHide,
}: RoleDialogProps) {
  const isEdit = !!roleId;
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
    if (!roleId) {
      setName("");
      setDescription("");
      setLoading(false);
      return;
    }
    setLoading(true);
    getRoleById(roleId)
      .then((data) => {
        if (!data) { setError("Rol no encontrado."); return; }
        setName(data.name ?? "");
        setDescription(data.description ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar rol."))
      .finally(() => setLoading(false));
  }, [visible, roleId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (roleId) {
        await updateRole(roleId, {
          name: name.trim(),
          description: description.trim(),
        });
      } else {
        await addRole({
          name: name.trim(),
          description: description.trim() || null,
        });
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={isEdit ? "Editar rol" : "Agregar rol"}
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
            label="Nombre"
            name="name"
            value={name}
            onChange={setName}
            placeholder="Ej. admin, editor"
          />
          <DpInput
            type="input"
            label="Descripción"
            name="description"
            value={description}
            onChange={setDescription}
            placeholder="Descripción del rol"
          />
        </>
      )}
    </DpContentSet>
  );
}
