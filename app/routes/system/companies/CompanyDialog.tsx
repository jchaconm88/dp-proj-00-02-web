import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { addCompany, getCompanyById, updateCompany } from "~/features/system/companies";
import { generateSequenceCode } from "~/features/system/sequences";
import { statusToSelectOptions, type StatusOption } from "~/constants/status-options";

export type CompanyStatus = "active" | "inactive";

const COMPANY_STATUS_MAP: Record<string, StatusOption> = {
  active: { label: "Activo", severity: "success" },
  inactive: { label: "Inactivo", severity: "secondary" },
};
const STATUS_OPTS = statusToSelectOptions(COMPANY_STATUS_MAP);

export interface CompanyDialogProps {
  visible: boolean;
  companyId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

export default function CompanyDialog({
  visible,
  companyId,
  onSuccess,
  onHide,
}: CompanyDialogProps) {
  const isEdit = !!companyId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [taxId, setTaxId] = useState("");
  const [status, setStatus] = useState<CompanyStatus>("active");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!companyId) {
      setName("");
      setCode("");
      setTaxId("");
      setStatus("active");
      setLoading(false);
      return;
    }
    setLoading(true);
    getCompanyById(companyId)
      .then((c) => {
        if (!c) {
          setError("Empresa no encontrada.");
          return;
        }
        setName(c.name);
        setCode(c.code ?? "");
        setTaxId(c.taxId ?? "");
        setStatus(c.status);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, companyId]);

  const save = async () => {
    const n = name.trim();
    if (!n) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const finalCode = await generateSequenceCode(code, "company");
      if (companyId) {
        await updateCompany(companyId, {
          name: n,
          code: finalCode || undefined,
          taxId: taxId.trim() || undefined,
          status,
        });
      } else {
        await addCompany({
          name: n,
          code: finalCode || undefined,
          taxId: taxId.trim() || undefined,
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
      title={isEdit ? "Editar empresa" : "Nueva empresa"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!name.trim() || isNavigating}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <DpInput type="input" label="Nombre" name="name" value={name} onChange={setName} />
      <DpCodeInput entity="company" label="Código" name="code" value={code} onChange={setCode} />
      <DpInput type="input" label="RUC / ID fiscal" name="taxId" value={taxId} onChange={setTaxId} />
      {isEdit && (
        <DpInput
          type="select"
          label="Estado"
          name="status"
          value={status}
          onChange={(v) => setStatus(v as CompanyStatus)}
          options={STATUS_OPTS}
        />
      )}
    </DpContentSet>
  );
}
