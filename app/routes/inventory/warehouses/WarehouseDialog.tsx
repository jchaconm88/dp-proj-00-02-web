import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/ui";
import { DpCodeInput } from "~/components/ui";
import { DpContentSet } from "~/components/ui";
import {
  getWarehouseById,
  addWarehouse,
  updateWarehouse,
  type WarehouseType,
} from "~/features/inventory/warehouses";
import { generateSequenceCode } from "~/features/system/sequences";
import { getUbigeos } from "~/features/system/ubigeos";
import { WAREHOUSE_TYPE, statusToSelectOptions } from "~/constants/status-options";
import { useLocationContext } from "~/lib/location-context";

export interface WarehouseDialogProps {
  visible: boolean;
  warehouseId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const TYPE_OPTIONS = statusToSelectOptions(WAREHOUSE_TYPE);

export default function WarehouseDialog({
  visible,
  warehouseId,
  onSuccess,
  onHide,
}: WarehouseDialogProps) {
  const isEdit = !!warehouseId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const { activeLocationId, locations } = useLocationContext();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [ubigeo, setUbigeo] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [country, setCountry] = useState("PE");
  const [type, setType] = useState<WarehouseType | "">("");
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ubigeoOptions, setUbigeoOptions] = useState<{ label: string; value: string }[]>([]);
  const [ubigeoNameByCode, setUbigeoNameByCode] = useState<Record<string, string>>({});

  useEffect(() => {
    getUbigeos("PE")
      .then((items) => {
        const byCode: Record<string, string> = {};
        for (const item of items) byCode[item.code] = item.name;
        setUbigeoNameByCode(byCode);
        setUbigeoOptions(items.map((item) => ({ label: `${item.name} (${item.code})`, value: item.code })));
      })
      .catch(() => {
        setUbigeoNameByCode({});
        setUbigeoOptions([]);
      });
  }, []);

  const parseUbigeo = (name: string): { city: string; district: string } => {
    const parts = name.split("—").map((x) => x.trim()).filter(Boolean);
    return {
      district: parts[0] ?? "",
      city: parts[1] ?? parts[0] ?? "",
    };
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!warehouseId) {
      setCode("");
      setName("");
      setAddress("");
      setUbigeo("");
      setCity("");
      setDistrict("");
      setCountry("PE");
      setType("");
      setActive(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    getWarehouseById(warehouseId)
      .then((data) => {
        if (!data) {
          setError("Almacén no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setName(data.name ?? "");
        setAddress(data.address ?? "");
        setUbigeo(data.ubigeo ?? "");
        setCity(data.city ?? "");
        setDistrict(data.district ?? "");
        setCountry(data.country ?? "PE");
        setType(data.type ?? "");
        setActive(data.active ?? true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, warehouseId]);

  const save = async () => {
    if (!name.trim() || !type) {
      setError("Los campos nombre y tipo son obligatorios.");
      return;
    }

    const locationName =
      locations.find((l) => l.id === activeLocationId)?.name ?? "";

    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      if (isEdit) {
        finalCode = code.trim();
      } else {
        try {
          finalCode = await generateSequenceCode(code, "warehouse");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }
      }

      let finalCity = city.trim();
      let finalDistrict = district.trim();
      if (ubigeo.trim().length === 6) {
        const ubigeoName = ubigeoNameByCode[ubigeo.trim()] ?? "";
        const ubigeoDerived = parseUbigeo(ubigeoName);
        finalCity = ubigeoDerived.city;
        finalDistrict = ubigeoDerived.district;
      }

      const payload = {
        code: finalCode,
        name: name.trim(),
        address: address.trim(),
        ubigeo: ubigeo.trim(),
        district: finalDistrict,
        city: finalCity,
        country: country.trim(),
        type: type as WarehouseType,
        active,
        locationId: activeLocationId ?? "",
        locationName,
      };

      if (warehouseId) {
        await updateWarehouse(warehouseId, payload);
      } else {
        await addWarehouse(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!name.trim() && !!type;

  return (
    <DpContentSet
      title={isEdit ? "Editar almacén" : "Agregar almacén"}
      recordId={isEdit ? warehouseId : null}
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DpCodeInput
            entity="warehouse"
            value={code}
            onChange={setCode}
            disabled={isEdit}
          />
          <DpInput
            type="input"
            label="Nombre"
            name="name"
            value={name}
            onChange={setName}
            placeholder="Almacén principal"
          />
          <DpInput
            type="select"
            label="Tipo"
            name="type"
            value={type}
            onChange={(v) => setType(String(v) as WarehouseType)}
            options={TYPE_OPTIONS}
            placeholder="Seleccionar tipo"
          />
<DpInput
              type="input"
              label="Dirección"
              name="address"
              value={address}
              onChange={setAddress}
              placeholder="Av. Industrial 123"
            />
            <DpInput
              type="select"
              label="Ubigeo"
              name="ubigeo"
              value={ubigeo}
              onChange={(v) => {
                const code = String(v);
                const selectedName = ubigeoNameByCode[code] ?? "";
                const ubigeoDerived = parseUbigeo(selectedName);
                setUbigeo(code);
                setCity(ubigeoDerived.city);
                setDistrict(ubigeoDerived.district);
              }}
              options={[{ label: "— Seleccionar distrito —", value: "" }, ...ubigeoOptions]}
              placeholder="Buscar por nombre o UBIGEO"
              filter
            />
          <div className="md:col-span-2">
            <DpInput
              type="check"
              label="Activo"
              name="active"
              value={active}
              onChange={setActive}
            />
          </div>
        </div>
      </div>
    </DpContentSet>
  );
}
