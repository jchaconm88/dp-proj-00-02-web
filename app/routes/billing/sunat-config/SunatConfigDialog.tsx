import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useNavigation } from "react-router";
import { DpContentSet } from "~/components/DpContent";
import { DpInput } from "~/components/DpInput";
import { getSunatConfig, saveSunatConfig } from "~/features/billing/sunat-config";
import { readFileAsBase64 } from "~/lib/file-to-base64";
import { DpConfirmDialog } from "~/components/DpConfirmDialog";

function downloadP12FromBase64(base64: string, fileName: string) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/x-pkcs12" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safe = fileName.trim() || "certificado";
  a.download = safe.toLowerCase().endsWith(".p12") || safe.toLowerCase().endsWith(".pfx") ? safe : `${safe}.p12`;
  a.click();
  URL.revokeObjectURL(url);
}

const BETA_BILL_URL = "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService";
const BETA_CONSULT_URL = "https://e-beta.sunat.gob.pe/ol-ti-itcpgem-beta/billConsultService";
const PROD_BILL_URL = "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService";
const PROD_CONSULT_URL = "https://e-factura.sunat.gob.pe/ol-ti-itcpgem/billConsultService";

export interface SunatConfigDialogProps {
  visible: boolean;
  /** null = alta; siempre el id del doc = empresa activa. */
  configId: string | null;
  canEdit: boolean;
  onSuccess: () => void;
  onHide: () => void;
}

export default function SunatConfigDialog({
  visible,
  configId,
  canEdit,
  onSuccess,
  onHide,
}: SunatConfigDialogProps) {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [name, setName] = useState("Configuración SUNAT");
  const [active, setActive] = useState(true);
  const [urlServidorSunat, setUrlServidorSunat] = useState("");
  const [urlConsultaServidorSunat, setUrlConsultaServidorSunat] = useState("");
  const [usuarioSunat, setUsuarioSunat] = useState("");
  const [passwordSunat, setPasswordSunat] = useState("");
  /** Certificado nuevo desde archivo (.p12); se persiste como base64 al guardar. */
  const [certFromFileBase64, setCertFromFileBase64] = useState("");
  const [certFileName, setCertFileName] = useState<string | null>(null);
  /** Alternativa: pegar base64 a mano (tiene prioridad al guardar si no está vacío). */
  const [certManualBase64, setCertManualBase64] = useState("");
  const [passwordCertificado, setPasswordCertificado] = useState("");

  const certFileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCertOnServer, setHasCertOnServer] = useState(false);
  const [storedCertFileName, setStoredCertFileName] = useState<string | null>(null);
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!configId) {
      setName("Configuración SUNAT");
      setActive(true);
      setUrlServidorSunat(BETA_BILL_URL);
      setUrlConsultaServidorSunat(BETA_CONSULT_URL);
      setUsuarioSunat("");
      setPasswordSunat("");
      setCertFromFileBase64("");
      setCertFileName(null);
      setCertManualBase64("");
      setPasswordCertificado("");
      setHasCertOnServer(false);
      setStoredCertFileName(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getSunatConfig()
      .then((data) => {
        if (!data) {
          setError("Configuración no encontrada.");
          return;
        }
        setName(data.name);
        setActive(data.active);
        setUrlServidorSunat(data.urlServidorSunat);
        setUrlConsultaServidorSunat(data.urlConsultaServidorSunat);
        setUsuarioSunat(data.usuarioSunat);
        setPasswordSunat(data.passwordSunat);
        setCertFromFileBase64("");
        setCertFileName(null);
        setCertManualBase64("");
        setPasswordCertificado("");
        setHasCertOnServer(Boolean(data.hasCert));
        setStoredCertFileName(data.certOriginalFileName?.trim() || null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, configId]);

  const fillBeta = () => {
    setUrlServidorSunat(BETA_BILL_URL);
    setUrlConsultaServidorSunat(BETA_CONSULT_URL);
  };

  const fillProd = () => {
    setUrlServidorSunat(PROD_BILL_URL);
    setUrlConsultaServidorSunat(PROD_CONSULT_URL);
  };

  const newCertCombined =
    certManualBase64.trim() !== ""
      ? certManualBase64.trim()
      : certFromFileBase64.trim();

  const handleCertFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !canEdit) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".p12") && !lower.endsWith(".pfx")) {
      setError("Selecciona un archivo .p12 o .pfx.");
      return;
    }
    setError(null);
    try {
      const b64 = await readFileAsBase64(file);
      setCertFromFileBase64(b64);
      setCertFileName(file.name);
      setCertManualBase64("");
    } catch {
      setError("No se pudo leer el certificado.");
    }
  };

  const clearNewCert = () => {
    setCertFromFileBase64("");
    setCertFileName(null);
    setCertManualBase64("");
    if (certFileInputRef.current) certFileInputRef.current.value = "";
  };

  const valid =
    canEdit &&
    name.trim() !== "" &&
    urlServidorSunat.trim() !== "" &&
    urlConsultaServidorSunat.trim() !== "" &&
    usuarioSunat.trim() !== "" &&
    passwordSunat.trim() !== "" &&
    passwordCertificado.trim() !== "" &&
    (configId ? true : newCertCombined !== "");

  const save = async () => {
    if (!canEdit || !valid) return;
    setSaving(true);
    setError(null);
    try {
      const existing = await getSunatConfig();
      const certToSave = newCertCombined || (existing?.certBase64 ?? "");
      const nextCertOriginalName =
        (certFileName && certFileName.trim()) || existing?.certOriginalFileName?.trim() || "";
      await saveSunatConfig({
        name: name.trim(),
        active,
        urlServidorSunat: urlServidorSunat.trim(),
        urlConsultaServidorSunat: urlConsultaServidorSunat.trim(),
        usuarioSunat: usuarioSunat.trim(),
        passwordSunat: passwordSunat.trim(),
        certBase64: certToSave,
        passwordCertificado: passwordCertificado.trim(),
        certOriginalFileName: nextCertOriginalName || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const runDownloadCert = async () => {
    setDownloadConfirmOpen(false);
    setError(null);
    try {
      const cfg = await getSunatConfig();
      const b64 = cfg?.certBase64?.trim();
      if (!b64) {
        setError("No hay certificado almacenado.");
        return;
      }
      const name =
        storedCertFileName ||
        certFileName ||
        `certificado-${(usuarioSunat || "sunat").replace(/\W+/g, "_")}`;
      downloadP12FromBase64(b64, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el certificado.");
    }
  };

  return (
    <>
    <DpContentSet
      title={configId ? "Editar configuración SUNAT" : "Nueva configuración SUNAT"}
      visible={visible}
      onHide={onHide}
      onCancel={onHide}
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || saving}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpInput
          type="input"
          label="Nombre"
          name="name"
          value={name}
          onChange={setName}
          placeholder="Configuración SUNAT"
          disabled={!canEdit}
        />
        <DpInput
          type="check"
          label="Activo (facturación y procesos SUNAT solo si está activo)"
          name="active"
          value={active}
          onChange={setActive}
          disabled={!canEdit}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fillBeta}
            disabled={!canEdit}
            className="rounded border border-amber-400 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20 disabled:opacity-50"
          >
            Endpoints BETA
          </button>
          <button
            type="button"
            onClick={fillProd}
            disabled={!canEdit}
            className="rounded border border-green-500 px-3 py-1 text-xs text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20 disabled:opacity-50"
          >
            Endpoints producción
          </button>
        </div>

        <DpInput
          type="input"
          label="URL billService (envío)"
          name="urlServidorSunat"
          value={urlServidorSunat}
          onChange={setUrlServidorSunat}
          placeholder={BETA_BILL_URL}
          disabled={!canEdit}
        />
        <DpInput
          type="input"
          label="URL billConsultService (consulta CDR)"
          name="urlConsultaServidorSunat"
          value={urlConsultaServidorSunat}
          onChange={setUrlConsultaServidorSunat}
          placeholder={BETA_CONSULT_URL}
          disabled={!canEdit}
        />
        <DpInput
          type="input"
          label="Usuario SOL (sin RUC)"
          name="usuarioSunat"
          value={usuarioSunat}
          onChange={setUsuarioSunat}
          placeholder="MODDATOS"
          disabled={!canEdit}
        />
        <DpInput
          type="input"
          label="Contraseña SOL"
          name="passwordSunat"
          value={passwordSunat}
          onChange={setPasswordSunat}
          placeholder="••••••••"
          disabled={!canEdit}
        />

        <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {hasCertOnServer
            ? "Hay un certificado guardado. Puedes sustituirlo subiendo otro .p12 o pegando base64 abajo."
            : "Sube el archivo .p12 (recomendado) o pega el base64 en la sección avanzada."}
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-medium text-[var(--dp-menu-text)]">Certificado .p12</span>
          <input
            ref={certFileInputRef}
            type="file"
            accept=".p12,.pfx,application/x-pkcs12,application/pkcs12"
            className="hidden"
            disabled={!canEdit}
            onChange={handleCertFileChange}
            aria-label="Archivo de certificado PKCS12"
          />
          <div className="flex flex-wrap items-center gap-2">
            {hasCertOnServer && canEdit && (
              <button
                type="button"
                onClick={() => setDownloadConfirmOpen(true)}
                className="rounded-md border border-zinc-400 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-200 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
              >
                Descargar .p12
              </button>
            )}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => certFileInputRef.current?.click()}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Elegir archivo .p12
            </button>
            {certFileName && (
              <span className="text-sm text-zinc-600 dark:text-zinc-400" title={certFileName}>
                {certFileName}
              </span>
            )}
            {(certFromFileBase64 || certManualBase64) && canEdit && (
              <button
                type="button"
                onClick={clearNewCert}
                className="text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Quitar certificado nuevo
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--dp-on-surface-soft)]">
            El archivo se convierte a Base64 al elegirlo; no se envía el .p12 a otro sitio que no sea tu
            guardado de configuración (Firestore) como hasta ahora.
          </p>
        </div>

        <details className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-900/30">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Avanzado: pegar certificado en Base64
          </summary>
          <p className="mt-2 mb-2 text-xs text-[var(--dp-on-surface-soft)]">
            Si pegas aquí, tiene prioridad sobre el archivo seleccionado. Los procesos SUNAT siguen usando
            solo el string base64 almacenado (igual que antes).
          </p>
          <textarea
            name="certManualBase64"
            value={certManualBase64}
            onChange={(e) => {
              setCertManualBase64(e.target.value);
              if (e.target.value.trim()) {
                setCertFromFileBase64("");
                setCertFileName(null);
                if (certFileInputRef.current) certFileInputRef.current.value = "";
              }
            }}
            disabled={!canEdit}
            rows={4}
            placeholder="MIIKXAIBAzCCChQGCSqGSIb3DQEH..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </details>
        <DpInput
          type="input"
          label="Contraseña del certificado"
          name="passwordCertificado"
          value={passwordCertificado}
          onChange={setPasswordCertificado}
          placeholder="••••••••"
          disabled={!canEdit}
        />
      </div>
    </DpContentSet>
    <DpConfirmDialog
      visible={downloadConfirmOpen}
      onHide={() => setDownloadConfirmOpen(false)}
      title="Descargar certificado PKCS#12"
      message={
        <div className="space-y-2 text-sm">
          <p>
            Va a descargar el archivo <strong>.p12</strong> que contiene la clave privada del certificado
            digital. Trátelo como un secreto: guárdelo en un lugar seguro y no lo comparta.
          </p>
          <p className="text-amber-800 dark:text-amber-200">
            Cualquier persona con este archivo y la contraseña puede firmar en nombre de su empresa ante SUNAT.
          </p>
        </div>
      }
      confirmLabel="Descargar"
      cancelLabel="Cancelar"
      onConfirm={runDownloadCert}
      severity="primary"
    />
    </>
  );
}
