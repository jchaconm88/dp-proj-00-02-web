import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigation } from "react-router";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import { addCompany, getCompanyById, updateCompany } from "~/features/system/companies";
import { generateSequenceCode } from "~/features/system/sequences";
import { statusToSelectOptions, type StatusOption } from "~/constants/status-options";
import { storage } from "~/lib/firebase";

export type CompanyStatus = "active" | "inactive";
type LogoVariant = "light" | "dark";

const COMPANY_STATUS_MAP: Record<string, StatusOption> = {
  active: { label: "Activo", severity: "success" },
  inactive: { label: "Inactivo", severity: "secondary" },
};
const STATUS_OPTS = statusToSelectOptions(COMPANY_STATUS_MAP);
const LOGO_ACCEPT = "image/png,image/jpeg,image/svg+xml,image/webp,.png,.jpg,.jpeg,.svg,.webp";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "svg", "webp"]);

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
  return cleaned || "logo";
}

function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0 || idx === fileName.length - 1) return "";
  return fileName.slice(idx + 1).toLowerCase();
}

function isValidLogoFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  const hasValidExt = ALLOWED_EXTENSIONS.has(ext);
  const hasValidMime = !file.type || ALLOWED_MIME_TYPES.has(file.type);
  return hasValidExt && hasValidMime;
}

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

  const [logoLightFile, setLogoLightFile] = useState<File | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const [currentLogoLightUrl, setCurrentLogoLightUrl] = useState("");
  const [currentLogoLightPath, setCurrentLogoLightPath] = useState("");
  const [currentLogoDarkUrl, setCurrentLogoDarkUrl] = useState("");
  const [currentLogoDarkPath, setCurrentLogoDarkPath] = useState("");
  const [localPreviewLightUrl, setLocalPreviewLightUrl] = useState<string | null>(null);
  const [localPreviewDarkUrl, setLocalPreviewDarkUrl] = useState<string | null>(null);

  const lightFileInputRef = useRef<HTMLInputElement>(null);
  const darkFileInputRef = useRef<HTMLInputElement>(null);

  const setPreviewUrl = (variant: LogoVariant, nextUrl: string | null) => {
    if (variant === "light") {
      setLocalPreviewLightUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return nextUrl;
      });
      return;
    }
    setLocalPreviewDarkUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return nextUrl;
    });
  };

  const getPreviewUrl = (variant: LogoVariant): string => {
    if (variant === "light") return localPreviewLightUrl || currentLogoLightUrl;
    return localPreviewDarkUrl || currentLogoDarkUrl;
  };

  const buildLogoPath = (targetCompanyId: string, variant: LogoVariant, fileName: string): string => {
    const safeName = sanitizeFileName(fileName);
    return `companies/${targetCompanyId}/logo/${variant}-${Date.now()}-${safeName}`;
  };

  const uploadLogo = async (targetCompanyId: string, variant: LogoVariant, file: File) => {
    const logoPath = buildLogoPath(targetCompanyId, variant, file.name);
    const logoRef = ref(storage, logoPath);
    await uploadBytes(logoRef, file, { contentType: file.type || undefined });
    const logoUrl = await getDownloadURL(logoRef);
    return { logoPath, logoUrl };
  };

  const deleteLogoIfExists = async (logoPath?: string) => {
    if (!logoPath) return;
    try {
      await deleteObject(ref(storage, logoPath));
    } catch (_) {}
  };

  const resetLogosState = () => {
    setLogoLightFile(null);
    setLogoDarkFile(null);
    setCurrentLogoLightUrl("");
    setCurrentLogoLightPath("");
    setCurrentLogoDarkUrl("");
    setCurrentLogoDarkPath("");
    setPreviewUrl("light", null);
    setPreviewUrl("dark", null);
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!companyId) {
      setName("");
      setCode("");
      setTaxId("");
      setStatus("active");
      resetLogosState();
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
        setLogoLightFile(null);
        setLogoDarkFile(null);
        setCurrentLogoLightUrl(c.logoLightUrl ?? c.logoUrl ?? "");
        setCurrentLogoLightPath(c.logoLightPath ?? c.logoPath ?? "");
        setCurrentLogoDarkUrl(c.logoDarkUrl ?? "");
        setCurrentLogoDarkPath(c.logoDarkPath ?? "");
        setPreviewUrl("light", null);
        setPreviewUrl("dark", null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, companyId]);

  useEffect(
    () => () => {
      if (localPreviewLightUrl && localPreviewLightUrl.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewLightUrl);
      }
      if (localPreviewDarkUrl && localPreviewDarkUrl.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewDarkUrl);
      }
    },
    [localPreviewLightUrl, localPreviewDarkUrl]
  );

  const openLogoPicker = (variant: LogoVariant) => {
    if (variant === "light") lightFileInputRef.current?.click();
    else darkFileInputRef.current?.click();
  };

  const handleLogoChange = (variant: LogoVariant) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!isValidLogoFile(file)) {
      setError("Formato de logo no válido. Usa SVG, PNG, JPG/JPEG o WEBP.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("El logo excede el tamaño máximo permitido (2 MB).");
      return;
    }

    setError(null);
    if (variant === "light") setLogoLightFile(file);
    else setLogoDarkFile(file);
    setPreviewUrl(variant, URL.createObjectURL(file));
  };

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
        let nextLogoLightUrl = currentLogoLightUrl || undefined;
        let nextLogoLightPath = currentLogoLightPath || undefined;
        let nextLogoDarkUrl = currentLogoDarkUrl || undefined;
        let nextLogoDarkPath = currentLogoDarkPath || undefined;

        if (logoLightFile) {
          const uploadedLight = await uploadLogo(companyId, "light", logoLightFile);
          nextLogoLightUrl = uploadedLight.logoUrl;
          nextLogoLightPath = uploadedLight.logoPath;
        }
        if (logoDarkFile) {
          const uploadedDark = await uploadLogo(companyId, "dark", logoDarkFile);
          nextLogoDarkUrl = uploadedDark.logoUrl;
          nextLogoDarkPath = uploadedDark.logoPath;
        }

        await updateCompany(companyId, {
          name: n,
          code: finalCode || undefined,
          taxId: taxId.trim() || undefined,
          status,
          logoLightUrl: nextLogoLightUrl,
          logoLightPath: nextLogoLightPath,
          logoDarkUrl: nextLogoDarkUrl,
          logoDarkPath: nextLogoDarkPath,
          logoUrl: nextLogoLightUrl ?? nextLogoDarkUrl,
          logoPath: nextLogoLightPath ?? nextLogoDarkPath,
        });

        if (logoLightFile && currentLogoLightPath && currentLogoLightPath !== nextLogoLightPath) {
          await deleteLogoIfExists(currentLogoLightPath);
        }
        if (logoDarkFile && currentLogoDarkPath && currentLogoDarkPath !== nextLogoDarkPath) {
          await deleteLogoIfExists(currentLogoDarkPath);
        }
      } else {
        const createdId = await addCompany({
          name: n,
          code: finalCode || undefined,
          taxId: taxId.trim() || undefined,
        });

        if (logoLightFile || logoDarkFile) {
          try {
            const uploadedLight = logoLightFile
              ? await uploadLogo(createdId, "light", logoLightFile)
              : null;
            const uploadedDark = logoDarkFile ? await uploadLogo(createdId, "dark", logoDarkFile) : null;
            await updateCompany(createdId, {
              logoLightUrl: uploadedLight?.logoUrl,
              logoLightPath: uploadedLight?.logoPath,
              logoDarkUrl: uploadedDark?.logoUrl,
              logoDarkPath: uploadedDark?.logoPath,
              logoUrl: uploadedLight?.logoUrl ?? uploadedDark?.logoUrl,
              logoPath: uploadedLight?.logoPath ?? uploadedDark?.logoPath,
            });
          } catch (_) {
            onSuccess?.();
            onHide();
            return;
          }
        }
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const previewLight = getPreviewUrl("light");
  const previewDark = getPreviewUrl("dark");

  return (
    <DpContentSet
      title={isEdit ? "Editar empresa" : "Nueva empresa"}
      recordId={isEdit ? companyId : null}
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

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Logo para tema claro
        </label>
        <input
          ref={lightFileInputRef}
          type="file"
          accept={LOGO_ACCEPT}
          className="hidden"
          onChange={handleLogoChange("light")}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="p-button p-button-outlined" onClick={() => openLogoPicker("light")}>
            {logoLightFile || previewLight ? "Cambiar logo claro" : "Seleccionar logo claro"}
          </button>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700">
          {previewLight ? (
            <img src={previewLight} alt="Vista previa logo tema claro" className="h-20 w-24 rounded object-contain" />
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">Sin logo para tema claro</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Logo para tema oscuro
        </label>
        <input
          ref={darkFileInputRef}
          type="file"
          accept={LOGO_ACCEPT}
          className="hidden"
          onChange={handleLogoChange("dark")}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="p-button p-button-outlined" onClick={() => openLogoPicker("dark")}>
            {logoDarkFile || previewDark ? "Cambiar logo oscuro" : "Seleccionar logo oscuro"}
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Formatos: SVG, PNG, JPG/JPEG, WEBP. Max: 2 MB.
          </span>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
          {previewDark ? (
            <img src={previewDark} alt="Vista previa logo tema oscuro" className="h-20 w-24 rounded object-contain" />
          ) : (
            <span className="text-xs text-slate-300">Sin logo para tema oscuro</span>
          )}
        </div>
      </div>

      {isEdit && (
        <DpInput
          type="select"
          label="Estado"
          name="status"
          value={status}
          onChange={(v) => setStatus(String(v) as CompanyStatus)}
          options={STATUS_OPTS}
        />
      )}
    </DpContentSet>
  );
}
