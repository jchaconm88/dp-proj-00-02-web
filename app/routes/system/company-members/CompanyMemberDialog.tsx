import { useMemo, useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { MultiSelect } from "primereact/multiselect";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import { saveCompanyMembership, type CompanyUserRecord } from "~/features/system/company-users";
import { resolveAuthUidByEmail } from "~/features/system/auth/resolve-auth-uid.service";
import { getAllRoles, type RoleRecord } from "~/features/system/roles";
import { getProfiles, type ProfileRecord } from "~/features/system/users";
import { statusToSelectOptions, type StatusOption } from "~/constants/status-options";

const MEMBER_STATUS_MAP: Record<string, StatusOption> = {
  active: { label: "Activo", severity: "success" },
  inactive: { label: "Inactivo", severity: "secondary" },
};
const STATUS_OPTS = statusToSelectOptions(MEMBER_STATUS_MAP);

function getErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code?: unknown }).code ?? "").trim();
  }
  return "";
}

function describeMemberError(err: unknown, context: string): string {
  const code = getErrorCode(err);
  switch (code) {
    case "permission-denied":
      return `${context}: no tienes permisos para esta acción en la empresa activa. Verifica que tu membresía esté activa y que tu rol incluya administración de miembros.`;
    case "unauthenticated":
      return `${context}: tu sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.`;
    case "not-found":
      return `${context}: no se encontró el registro solicitado (puede haber sido eliminado).`;
    case "unavailable":
      return `${context}: el servicio no está disponible temporalmente. Intenta nuevamente en unos segundos.`;
    case "deadline-exceeded":
      return `${context}: la operación tardó demasiado. Revisa tu conexión e inténtalo otra vez.`;
    case "failed-precondition":
      return `${context}: hay una precondición que no se cumple (reglas/índice/datos).`;
    default:
      if (err instanceof Error && err.message.trim()) {
        return `${context}: ${err.message}`;
      }
      return `${context}: ocurrió un error inesperado.`;
  }
}

function normalizeEmail(value?: string): string {
  return String(value ?? "").trim().toLowerCase();
}

function isMissingOrIdLike(value: string | undefined, membershipUserId: string): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return true;
  return raw === membershipUserId;
}

function findProfileForMembership(
  membership: CompanyUserRecord,
  profiles: ProfileRecord[]
): ProfileRecord | null {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const byEmail = new Map(profiles.map((p) => [normalizeEmail(p.email), p]));
  const usersDocId = String(membership.usersDocId ?? "").trim();
  const userEmail = normalizeEmail(membership.userEmail);
  return (
    (usersDocId ? byId.get(usersDocId) : undefined) ||
    (userEmail ? byEmail.get(userEmail) : undefined) ||
    byId.get(membership.userId) ||
    null
  );
}

export interface CompanyMemberDialogProps {
  visible: boolean;
  companyId: string | null;
  membership: CompanyUserRecord | null;
  onSuccess?: () => void;
  onHide: () => void;
}

export default function CompanyMemberDialog({
  visible,
  companyId,
  membership,
  onSuccess,
  onHide,
}: CompanyMemberDialogProps) {
  const isEdit = !!membership;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [selectedUserDocId, setSelectedUserDocId] = useState("");
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserDocId) ?? null,
    [users, selectedUserDocId]
  );
  const editMembershipProfile = useMemo(() => {
    if (!isEdit || !membership) return null;
    return findProfileForMembership(membership, users);
  }, [isEdit, membership, users]);
  const editUserLabel = useMemo(() => {
    if (!isEdit || !membership) return "";
    return (
      editMembershipProfile?.displayName?.trim() ||
      editMembershipProfile?.email?.trim() ||
      membership.user?.trim() ||
      membership.userDisplayName?.trim() ||
      membership.userEmail?.trim() ||
      membership.usersDocId?.trim() ||
      membership.userId
    );
  }, [isEdit, membership, editMembershipProfile]);
  const userSelectOptions = useMemo(
    () =>
      users.map((u) => ({
        label: (u.displayName?.trim() || u.email || u.id).trim(),
        value: u.id,
      })),
    [users]
  );

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (membership) {
      setSelectedUserDocId(membership.usersDocId ?? "");
      setRoleIds(membership.roleIds ?? []);
      setStatus(membership.status);
      return;
    }
    setSelectedUserDocId("");
    setRoleIds([]);
    setStatus("active");
  }, [visible, membership]);

  useEffect(() => {
    if (!visible || !companyId) return;
    let cancelled = false;
    setRolesLoading(true);
    getAllRoles(companyId)
      .then((rows) => {
        if (!cancelled) setRoles(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setRoles([]);
          setError(describeMemberError(err, "No se pudieron cargar los roles"));
        }
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, companyId]);

  const loadUsers = async () => {
    if (usersLoading) return;
    setUsersLoading(true);
    setError(null);
    try {
      const { items } = await getProfiles();
      setUsers(items);
    } catch (err) {
      setError(describeMemberError(err, "No se pudo cargar la lista de usuarios"));
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (isEdit) return;
    if (users.length > 0) return;
    void loadUsers();
  }, [visible, users.length, isEdit]);

  const resolveAuthUidForSave = async (): Promise<{
    userId: string;
    user?: string;
    usersDocId?: string;
    userEmail?: string;
    userDisplayName?: string;
  }> => {
    if (isEdit && membership) {
      let profile = editMembershipProfile;
      const shouldRepairDenorm =
        isMissingOrIdLike(membership.user, membership.userId) ||
        isMissingOrIdLike(membership.userDisplayName, membership.userId) ||
        isMissingOrIdLike(membership.userEmail, membership.userId) ||
        !String(membership.usersDocId ?? "").trim();

      if (!profile && shouldRepairDenorm) {
        const { items } = await getProfiles();
        profile = findProfileForMembership(membership, items);
      }

      const fallbackUser =
        profile?.displayName?.trim() ||
        profile?.email?.trim().toLowerCase() ||
        membership.user?.trim() ||
        membership.userDisplayName?.trim() ||
        membership.userEmail?.trim() ||
        membership.usersDocId?.trim() ||
        membership.userId;

      return {
        userId: membership.userId,
        user: fallbackUser,
        usersDocId: profile?.id ?? membership.usersDocId,
        userEmail: profile?.email?.trim().toLowerCase() || membership.userEmail,
        userDisplayName: profile?.displayName?.trim() || membership.userDisplayName,
      };
    }
    if (!selectedUser) {
      throw new Error("Selecciona un usuario existente.");
    }
    if (!selectedUser.email.trim()) {
      throw new Error("El usuario seleccionado no tiene email.");
    }
    const email = selectedUser.email.trim().toLowerCase();
    const displayName = selectedUser.displayName?.trim() || undefined;
    const usersDocId = selectedUser.id.trim() || undefined;
    const resolved = await resolveAuthUidByEmail(email);
    return {
      userId: resolved.uid,
      user: displayName || email,
      usersDocId,
      userEmail: email,
      userDisplayName: displayName,
    };
  };

  const roleNameById = new Map(roles.map((r) => [r.id, r.name || r.id]));

  const save = async () => {
    const cid = companyId?.trim();
    if (!cid) {
      setError("No hay empresa seleccionada.");
      return;
    }
    const normalizedRoleIds = [...new Set(roleIds.map((x) => String(x).trim()).filter(Boolean))];
    if (normalizedRoleIds.length === 0) {
      setError("Debes asignar al menos un rol.");
      return;
    }
    try {
      const auth = await resolveAuthUidForSave();
      if (!auth.userId.trim()) {
        setError("No se pudo resolver el ID del usuario.");
        return;
      }
      const normalizedUser =
        auth.user?.trim() ||
        auth.userDisplayName?.trim() ||
        auth.userEmail?.trim() ||
        auth.usersDocId?.trim() ||
        auth.userId.trim();
      setSaving(true);
      setError(null);
      await saveCompanyMembership({
        companyId: cid,
        userId: auth.userId.trim(),
        user: normalizedUser || undefined,
        usersDocId: auth.usersDocId,
        userEmail: auth.userEmail,
        userDisplayName: auth.userDisplayName,
        roleIds: normalizedRoleIds,
        roleNames: normalizedRoleIds
          .map((id) => roleNameById.get(id) || id)
          .map((name) => String(name).trim())
          .filter(Boolean),
        status,
      });
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(describeMemberError(err, "No se pudo guardar el miembro"));
    } finally {
      setSaving(false);
    }
  };

  const roleSelectOptions = roles.map((r) => ({
    label: r.name || r.id,
    value: r.id,
  }));

  return (
    <DpContentSet
      title={isEdit ? "Editar miembro" : "Agregar miembro"}
      recordId={isEdit ? (membership?.userId ?? null) : null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={
        !companyId ||
        (!isEdit && !selectedUserDocId.trim()) ||
        roleIds.length === 0 ||
        rolesLoading ||
        (!isEdit && usersLoading) ||
        isNavigating
      }
      visible={visible}
      onHide={onHide}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      {!isEdit && (
        <div className="space-y-2">
          <DpInput
            type="select"
            label="Usuario"
            name="usersDocId"
            value={selectedUserDocId}
            onChange={(v) => setSelectedUserDocId(String(v))}
            options={userSelectOptions}
            placeholder={usersLoading ? "Cargando usuarios..." : "Seleccionar usuario existente"}
            filter
            onRefresh={() => void loadUsers()}
            refreshing={usersLoading}
            refreshAriaLabel="Recargar usuarios"
          />
        </div>
      )}
      {isEdit && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Usuario: <strong>{editUserLabel}</strong>
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
          disabled={rolesLoading}
        />
      </div>

      <DpInput
        type="select"
        label="Estado"
        name="status"
        value={status}
        onChange={(v) => setStatus(String(v) as "active" | "inactive")}
        options={STATUS_OPTS}
      />
    </DpContentSet>
  );
}
