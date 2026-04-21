import { useMemo, useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getCompanyLocation,
  addCompanyLocation,
  updateCompanyLocation,
} from "~/features/system/company-locations";
import { getDistrictNameById, peruDistrictSelectOptions } from "~/data/peru-districts";

export interface CompanyLocationDialogProps {
  visible: boolean;
  companyId: string;
  locationId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

function parsePeruDistrictName(fullName: string): { district: string; city: string } {
  const parts = fullName
    .split("—")
    .map((p) => p.trim())
    .filter(Boolean);
  // Formato típico: "Distrito — Provincia — Departamento"
  return {
    district: parts[0] ?? "",
    city: parts[1] ?? parts[2] ?? "",
  };
}

export default function CompanyLocationDialog({
  visible,
  companyId,
  locationId,
  onSuccess,
  onHide,
}: CompanyLocationDialogProps) {
  const isEdit = !!locationId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ubigeo, setUbigeo] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("PE");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const districtOptions = useMemo(
    () => [{ label: "— Seleccione distrito —", value: "" }, ...peruDistrictSelectOptions()],
    []
  );

  const referenceLabel = useMemo(() => {
    const fullName = getDistrictNameById(ubigeo);
    if (!ubigeo.trim()) return "—";
    if (fullName.trim()) return `${fullName} (${ubigeo})`;
    return `UBIGEO ${ubigeo}`;
  }, [ubigeo]);

  const onDistrictSelect = (id: string) => {
    const nextUbigeo = String(id ?? "").trim();
    if (!nextUbigeo) return;
    const fullName = getDistrictNameById(nextUbigeo);
    const mapped = parsePeruDistrictName(fullName);
    setUbigeo(nextUbigeo);
    if (mapped.district) setDistrict(mapped.district);
    if (mapped.city) setCity(mapped.city);
    if (!country.trim()) setCountry("PE");
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!locationId) {
      setName("");
      setDescription("");
      setUbigeo("");
      setCity("");
      setCountry("PE");
      setDistrict("");
      setAddress("");
      setActive(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    getCompanyLocation(companyId, locationId)
      .then((data) => {
        if (!data) {
          setError("Sede no encontrada.");
          return;
        }
        setName(data.name);
        setDescription(data.description);
        setUbigeo(data.ubigeo);
        setCity(data.city);
        setCountry(data.country || "PE");
        setDistrict(data.district);
        setAddress(data.address);
        setActive(data.active);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, companyId, locationId]);

  const valid = name.trim() !== "" && address.trim() !== "" && ubigeo.trim() !== "";

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        ubigeo: ubigeo.trim(),
        city: city.trim(),
        country: country.trim() || "PE",
        district: district.trim(),
        address: address.trim(),
        active,
      };
      if (locationId) {
        await updateCompanyLocation(companyId, locationId, payload);
      } else {
        await addCompanyLocation(companyId, payload);
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
      title={isEdit ? "Editar sede" : "Agregar sede"}
      recordId={isEdit ? locationId : null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpInput type="input" label="Nombre" name="name" value={name} onChange={setName} placeholder="Sede principal" />
        <DpInput
          type="input"
          label="Descripción"
          name="description"
          value={description}
          onChange={setDescription}
        />
        <DpInput type="input" label="Dirección" name="address" value={address} onChange={setAddress} />
        <DpInput
          type="select"
          label="Distrito (UBIGEO)"
          name="ubigeo"
          value={ubigeo}
          onChange={(v) => onDistrictSelect(String(v))}
          options={districtOptions}
          filter
          placeholder="Seleccione..."
        />
        <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300">
          <div className="font-medium">Referencia</div>
          <div>{referenceLabel}</div>
          {(district.trim() || city.trim() || country.trim()) && (
            <div className="mt-1 text-[var(--dp-on-surface-soft)]">
              {district.trim() ? `Distrito: ${district.trim()}` : ""}
              {city.trim() ? `${district.trim() ? " · " : ""}Ciudad/Provincia: ${city.trim()}` : ""}
              {country.trim() ? `${district.trim() || city.trim() ? " · " : ""}País: ${country.trim()}` : ""}
            </div>
          )}
        </div>
        <DpInput type="check" label="Activa" name="active" value={active} onChange={setActive} />
      </div>
    </DpContentSet>
  );
}
