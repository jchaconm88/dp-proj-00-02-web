import { useEffect, useState } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { generateSequenceCode } from "~/features/system/sequences";
import {
  getChargeType,
  addChargeType,
  updateChargeType,
  type ChargeTypeKind,
  type ChargeTypeSource,
  type ChargeTypeCategory,
} from "~/features/transport/charge-types";
import {
  CHARGE_TYPE_KIND,
  CHARGE_TYPE_SOURCE,
  CHARGE_TYPE_CATEGORY,
  statusToSelectOptions,
} from "~/constants/status-options";

export interface ChargeTypeDialogProps {
  visible: boolean;
  chargeTypeId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const KIND_OPTIONS = statusToSelectOptions(CHARGE_TYPE_KIND);
const SOURCE_OPTIONS = statusToSelectOptions(CHARGE_TYPE_SOURCE);
const CATEGORY_OPTIONS = statusToSelectOptions(CHARGE_TYPE_CATEGORY);

export default function ChargeTypeDialog({
  visible,
  chargeTypeId,
  onSuccess,
  onHide,
}: ChargeTypeDialogProps) {
  const isEdit = !!chargeTypeId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode] = useState("");
  const [type, setType] = useState<ChargeTypeKind>("charge");
  const [source, setSource] = useState<ChargeTypeSource>("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ChargeTypeCategory>("extra");
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHide = () => {
    if (!saving && !isNavigating) onHide();
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!chargeTypeId) {
      setCode("");
      setType("charge");
      setSource("");
      setName("");
      setCategory("extra");
      setActive(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    getChargeType(chargeTypeId)
      .then((data) => {
        if (!data) {
          setError("Tipo no encontrado.");
          return;
        }
        setCode(data.code);
        setType(data.type);
        setSource(data.source);
        setName(data.name);
        setCategory(data.category);
        setActive(data.active);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, chargeTypeId]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let finalCode = "";
      try {
        finalCode = await generateSequenceCode(code, "charge-type");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        return;
      }

      const payload = {
        code: finalCode,
        type,
        source,
        name: name.trim(),
        category,
        active,
      };
      if (chargeTypeId) {
        await updateChargeType(chargeTypeId, payload);
      } else {
        await addChargeType(payload);
      }
      onSuccess?.();
      handleHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!name.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar Tipo de Cobro" : "Agregar Tipo de Cobro"}
      recordId={isEdit ? chargeTypeId : null}
      cancelLabel="Cancelar"
      onCancel={handleHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={handleHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpCodeInput entity="charge-type" label="Código" name="code" value={code} onChange={setCode} />

        <DpInput
          type="input"
          label="Nombre"
          name="name"
          value={name}
          onChange={setName}
          placeholder="Apoyo extra"
        />

        <DpInput
          type="select"
          label="Tipo"
          name="type"
          value={type}
          onChange={(v) => setType(v as ChargeTypeKind)}
          options={KIND_OPTIONS}
        />

        <DpInput
          type="select"
          label="Origen"
          name="source"
          value={source}
          onChange={(v) => setSource(v as ChargeTypeSource)}
          options={SOURCE_OPTIONS}
        />

        <DpInput
          type="select"
          label="Categoría"
          name="category"
          value={category}
          onChange={(v) => setCategory(v as ChargeTypeCategory)}
          options={CATEGORY_OPTIONS}
        />

        <div className="mt-2 flex flex-col gap-2">
          <DpInput type="check" label="Activo" name="active" value={active} onChange={setActive} />
        </div>
      </div>
    </DpContentSet>
  );
}

