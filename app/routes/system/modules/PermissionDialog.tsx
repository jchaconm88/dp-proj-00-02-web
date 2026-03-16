import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import { saveModule } from "~/features/system/modules";
import type { ModulePermission } from "~/features/system/modules";

export interface PermissionDialogProps {
  visible: boolean;
  moduleId: string;
  /** null = agregar, number = editar en ese índice */
  permissionIndex: number | null;
  currentPermissions: ModulePermission[];
  onSuccess: () => void | Promise<void>;
  onHide: () => void;
}

export default function PermissionDialog({
  visible,
  moduleId,
  permissionIndex,
  currentPermissions,
  onSuccess,
  onHide,
}: PermissionDialogProps) {
  const isEdit = permissionIndex !== null;
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (permissionIndex === null) {
      setCode("");
      setLabel("");
      setDescription("");
    } else {
      const p = currentPermissions[permissionIndex];
      setCode(p?.code ?? "");
      setLabel(p?.label ?? "");
      setDescription(p?.description ?? "");
    }
  }, [visible, permissionIndex, currentPermissions]);

  const save = async () => {
    const codeTrim = code.trim();
    if (!codeTrim) return;
    const value: ModulePermission = {
      code: codeTrim,
      label: label.trim(),
      description: description.trim(),
    };
    setSaving(true);
    setError(null);
    try {
      const existing = Array.isArray(currentPermissions) ? currentPermissions : [];
      const newPermissions =
        permissionIndex === null
          ? [...existing, value]
          : existing.map((p, i) => (i === permissionIndex ? value : p));
      await saveModule(moduleId, { permissions: newPermissions });
      await onSuccess();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={isEdit ? "Editar permiso" : "Agregar permiso"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!code.trim() || isNavigating}
      visible={visible}
      onHide={onHide}
    >
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
      <DpInput
        type="input"
        label="Código"
        name="code"
        value={code}
        onChange={setCode}
        placeholder="Ej. view, create, edit"
      />
      <DpInput
        type="input"
        label="Etiqueta"
        name="label"
        value={label}
        onChange={setLabel}
        placeholder="Ej. Ver, Crear, Editar"
      />
      <DpInput
        type="input"
        label="Descripción"
        name="description"
        value={description}
        onChange={setDescription}
        placeholder="Ej. Permite visualizar la lista y el detalle."
      />
    </DpContentSet>
  );
}
