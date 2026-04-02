import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { MultiSelect } from "primereact/multiselect";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  COMPANY_ADMIN_ROLE_MARKER,
  saveCompanyMembership,
  type CompanyUserRecord,
} from "~/features/system/company-users";
import { resolveAuthUidByEmail } from "~/features/system/auth/resolve-auth-uid.service";
import type { RoleRecord } from "~/features/system/roles";
import { statusToSelectOptions, type StatusOption } from "~/constants/status-options";

const MEMBER_STATUS_MAP: Record<string, StatusOption> = {
  active: { label: "Activo", severity: "success" },
  inactive: { label: "Inactivo", severity: "secondary" },
};
const STATUS_OPTS = statusToSelectOptions(MEMBER_STATUS_MAP);

export interface CompanyMemberDialogProps {
  visible: boolean;
  companyId: string | null;
  membership: CompanyUserRecord | null;
  roleOptions: RoleRecord[];
  onSuccess?: () => void;
  onHide: () => void;
}

function stripMarker(ids: string[]): string[] {
  return ids.filter((id) => id !== COMPANY_ADMIN_ROLE_MARKER);
}

function mergeRoleIds(realRoleIds: string[], companyAdmin: boolean): string[] {
  const base = [...new Set(stripMarker(realRoleIds))];
  if (companyAdmin) return [...base, COMPANY_ADMIN_ROLE_MARKER];
  return base;
}

export default function CompanyMemberDialog({
  visible,
  companyId,
  membership,
  roleOptions,
  onSuccess,
  onHide,
}: CompanyMemberDialogProps) {
  const isEdit = !!membership;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [email, setEmail] = useState("");
  const [resolvedUid, setResolvedUid] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [companyAdmin, setCompanyAdmin] = useState(false);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (membership) {
      setEmail("");
      setResolvedUid(membership.uid);
      setRoleIds(stripMarker(membership.roleIds));
      setCompanyAdmin(membership.roleIds.includes(COMPANY_ADMIN_ROLE_MARKER));
      setStatus(membership.status);
      return;
    }
    setEmail("");
    setResolvedUid("");
    setRoleIds([]);
    setCompanyAdmin(false);
    setStatus("active");
  }, [visible, membership]);

  const resolveUid = async () => {
    const em = email.trim().toLowerCase();
    if (!em) {
      setError("Introduce un email.");
      return;
    }
    setResolving(true);
    setError(null);
    try {
      const r = await resolveAuthUidByEmail(em);
      setResolvedUid(r.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resolver el email.");
      setResolvedUid("");
    } finally {
      setResolving(false);
    }
  };

  const save = async () => {
    const cid = companyId?.trim();
    if (!cid) {
      setError("No hay empresa seleccionada.");
      return;
    }
    const uid = resolvedUid.trim();
    if (!uid) {
      setError("Resuelve el UID del usuario (email + botón).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveCompanyMembership({
        companyId: cid,
        uid,
        roleIds: mergeRoleIds(roleIds, companyAdmin),
        status,
      });
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const roleSelectOptions = roleOptions.map((r) => ({
    label: r.name || r.id,
    value: r.id,
  }));

  return (
    <DpContentSet
      title={isEdit ? "Editar miembro" : "Agregar miembro"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!companyId || !resolvedUid.trim() || isNavigating}
      visible={visible}
      onHide={onHide}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      {!isEdit && (
        <div className="flex flex-col gap-2">
          <DpInput
            type="input"
            label="Email (Authentication)"
            name="email"
            value={email}
            onChange={setEmail}
            placeholder="usuario@dominio.com"
          />
          <Button
            type="button"
            label={resolving ? "Resolviendo…" : "Resolver UID"}
            onClick={() => void resolveUid()}
            disabled={resolving || saving}
            className="w-fit"
          />
        </div>
      )}
      {resolvedUid && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          UID: <code className="rounded bg-zinc-100 px-1 dark:bg-navy-800">{resolvedUid}</code>
        </p>
      )}
      {isEdit && (
        <p className="text-sm text-zinc-500">
          El UID no se puede cambiar desde aquí. Elimina la membresía y vuelve a agregar si hace falta.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Roles de la empresa
        </label>
        <MultiSelect
          value={roleIds}
          options={roleSelectOptions}
          onChange={(e) => setRoleIds((e.value as string[]) ?? [])}
          optionLabel="label"
          optionValue="value"
          placeholder="Seleccionar roles"
          display="chip"
          className="w-full"
          filter
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          inputId="co-admin"
          checked={companyAdmin}
          onChange={(e) => setCompanyAdmin(e.checked === true)}
        />
        <label htmlFor="co-admin" className="cursor-pointer text-sm text-zinc-700 dark:text-zinc-300">
          Administrador de empresa (puede gestionar miembros de esta empresa)
        </label>
      </div>

      <DpInput
        type="select"
        label="Estado"
        name="status"
        value={status}
        onChange={(v) => setStatus(v as "active" | "inactive")}
        options={STATUS_OPTS}
      />
    </DpContentSet>
  );
}
