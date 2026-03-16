import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getResource,
  addResource,
  updateResource,
  type ResourceEngagementType,
  type ResourceStatus,
} from "~/features/human-resource/resources";
import { getPositions } from "~/features/human-resource/positions";
import { getDocumentTypes } from "~/features/master/document-types";
import { resolveCodeIfEmpty } from "~/features/system/sequences";
import {
  RESOURCE_ENGAGEMENT_TYPE,
  RESOURCE_STATUS,
  statusToSelectOptions,
} from "~/constants/status-options";

export interface ResourceDialogProps {
  visible: boolean;
  resourceId: string | null;
  onSuccess?: () => void;
  onHide?: () => void;
}

const ENGAGEMENT_OPTIONS = statusToSelectOptions(RESOURCE_ENGAGEMENT_TYPE);
const STATUS_OPTIONS = statusToSelectOptions(RESOURCE_STATUS);

export default function ResourceDialog({
  visible,
  resourceId,
  onSuccess,
  onHide,
}: ResourceDialogProps) {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const isEdit = !!resourceId;
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [docTypesOpts, setDocTypesOpts] = useState<{ label: string; value: string }[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [positionId, setPositionId] = useState("");
  const [position, setPosition] = useState("");
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
  const [hireDate, setHireDate] = useState("");
  const [engagementType, setEngagementType] = useState<ResourceEngagementType>("sporadic");
  const [status, setStatus] = useState<ResourceStatus>("active");
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHide = () => {
    if (!saving && !isNavigating) {
      onHide?.();
    }
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);
    getPositions().then(({ items }) => setPositions(items.map((p) => ({ id: p.id, name: p.name })))).catch(() => setPositions([]));
    getDocumentTypes().then(({ items }) => setDocTypesOpts(items.map((i) => ({ label: i.name, value: i.id })))).catch(() => setDocTypesOpts([]));

    if (!resourceId) {
      setCode("");
      setFirstName("");
      setLastName("");
      setDocumentNo("");
      setDocumentTypeId("");
      setDocumentType("");
      setPhone("");
      setEmail("");
      setPositionId("");
      setPosition("");
      setHireDate("");
      setEngagementType("sporadic");
      setStatus("active");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    getResource(resourceId)
      .then((data) => {
        if (!data) {
          setError("Recurso no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
        setDocumentNo(data.documentNo ?? "");
        setDocumentTypeId(data.documentTypeId ?? "");
        setDocumentType(data.documentType ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
        setPositionId(data.positionId ?? "");
        setPosition(data.position ?? "");
        setHireDate(data.hireDate ?? "");
        setEngagementType(data.engagementType ?? "sporadic");
        setStatus(data.status ?? "active");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, resourceId]);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      try {
        finalCode = await resolveCodeIfEmpty(code, "resource");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
        setSaving(false);
        return;
      }
      
      const payload = {
        code: finalCode,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        documentNo: documentNo.trim(),
        documentTypeId: documentTypeId.trim(),
        documentType: documentType.trim(),
        phone: phone.trim(),
        email: email.trim(),
        positionId: positionId.trim(),
        position: position.trim(),
        hireDate: hireDate.trim(),
        engagementType,
        status,
      };

      if (resourceId) {
        await updateResource(resourceId, payload);
      } else {
        await addResource(payload);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const positionOptions = positions.map((p) => ({ label: p.name, value: p.id }));
  
  const onPositionChange = (v: string | number | boolean | null) => {
    const id = v != null ? String(v) : "";
    setPositionId(id);
    const found = positions.find((p) => p.id === id);
    setPosition(found ? found.name : "");
  };

  const valid = !!firstName.trim() && !!lastName.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar recurso" : "Agregar recurso"}
      cancelLabel="Cancelar"
      onCancel={handleHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={handleHide}
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
          
          <DpCodeInput entity="resource" label="Código" name="code" value={code} onChange={setCode} />
          
          <div className="grid gap-4 md:grid-cols-2">
            <DpInput type="input" label="Nombre" name="firstName" value={firstName} onChange={setFirstName} placeholder="Miguel" />
            <DpInput type="input" label="Apellidos" name="lastName" value={lastName} onChange={setLastName} placeholder="Torres" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DpInput
              type="select"
              label="Tipo de documento"
              name="documentTypeId"
              value={documentTypeId}
              onChange={(v) => {
                setDocumentTypeId(String(v));
                const found = docTypesOpts.find((o) => o.value === String(v));
                setDocumentType(found ? found.label : "");
              }}
              options={docTypesOpts}
              placeholder="Seleccione..."
            />
            <DpInput type="input" label="Nº documento" name="documentNo" value={documentNo} onChange={setDocumentNo} placeholder="12345678" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DpInput type="input" label="Teléfono" name="phone" value={phone} onChange={setPhone} placeholder="999 999 999" />
            <DpInput type="input" label="Email" name="email" value={email} onChange={setEmail} placeholder="juan@empresa.com" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DpInput
              type="select"
              label="Cargo"
              name="position"
              value={positionId}
              onChange={(v) => onPositionChange(v)}
              options={positionOptions}
              placeholder="Seleccionar cargo"
            />
            <DpInput type="date" label="Fecha de ingreso" name="hireDate" value={hireDate} onChange={setHireDate} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DpInput
              type="select"
              label="Tipo de vinculación"
              name="engagementType"
              value={engagementType}
              onChange={(v) => setEngagementType(v as ResourceEngagementType)}
              options={ENGAGEMENT_OPTIONS}
            />
            <DpInput
              type="select"
              label="Estado"
              name="status"
              value={status}
              onChange={(v) => setStatus(v as ResourceStatus)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      )}
    </DpContentSet>
  );
}
