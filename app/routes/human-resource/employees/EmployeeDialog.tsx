import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getEmployeeById,
  addEmployee,
  updateEmployee,
  type EmployeeStatus,
  type SalaryType,
} from "~/features/human-resource/employees";
import { resolveCodeIfEmpty } from "~/features/system/sequences";
import { getPositions } from "~/features/human-resource/positions";
import { getDocumentTypes } from "~/features/master/document-types";
import { EMPLOYEE_STATUS, SALARY_TYPE, CURRENCY, statusToSelectOptions } from "~/constants/status-options";

export interface EmployeeDialogProps {
  visible: boolean;
  employeeId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const STATUS_OPTIONS   = statusToSelectOptions(EMPLOYEE_STATUS);
const SALARY_OPTIONS   = statusToSelectOptions(SALARY_TYPE);
const CURRENCY_OPTIONS = statusToSelectOptions(CURRENCY);

export default function EmployeeDialog({
  visible,
  employeeId,
  onSuccess,
  onHide,
}: EmployeeDialogProps) {
  const isEdit = !!employeeId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [code, setCode]             = useState("");
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [docTypesOpts, setDocTypesOpts] = useState<{ label: string; value: string }[]>([]);
  const [phone, setPhone]           = useState("");
  const [email, setEmail]           = useState("");
  const [positionId, setPositionId] = useState("");
  const [position, setPosition]     = useState("");
  const [positionsOpts, setPositionsOpts] = useState<{ label: string; value: string }[]>([]);
  const [hireDate, setHireDate]     = useState("");
  const [status, setStatus]         = useState<EmployeeStatus>("active");
  // Nómina
  const [salaryType, setSalaryType] = useState<SalaryType>("monthly");
  const [baseSalary, setBaseSalary] = useState("");
  const [currency, setCurrency]     = useState("PEN");
  // Beneficios
  const [cts, setCts]                       = useState(true);
  const [gratification, setGratification]   = useState(true);
  const [vacationDays, setVacationDays]     = useState("30");
  // UI
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Cargar datos al abrir el diálogo
  useEffect(() => {
    if (!visible) return;
    setError(null);
    getPositions()
      .then(({ items }) => {
        setPositionsOpts(items.map((p) => ({ label: p.name, value: p.id })));
      })
      .catch(() => setPositionsOpts([]));

    getDocumentTypes()
      .then(({ items }) => {
        setDocTypesOpts(items.map((i) => ({ label: i.name, value: i.id })));
      })
      .catch(() => setDocTypesOpts([]));

    if (!employeeId) {
      setCode(""); setFirstName(""); setLastName(""); setDocumentNo("");
      setDocumentTypeId(""); setDocumentType(""); setPhone(""); setEmail(""); setPositionId("");
      setPosition(""); setHireDate(""); setStatus("active");
      setSalaryType("monthly"); setBaseSalary(""); setCurrency("PEN");
      setCts(true); setGratification(true); setVacationDays("30");
      setLoading(false);
      return;
    }
    setLoading(true);
    getEmployeeById(employeeId)
      .then((data) => {
        if (!data) { setError("Empleado no encontrado."); return; }
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
        setStatus(data.status ?? "active");
        setSalaryType(data.payroll?.salaryType ?? "monthly");
        setBaseSalary(String(data.payroll?.baseSalary ?? ""));
        setCurrency(data.payroll?.currency ?? "PEN");
        setCts(data.benefits?.cts !== false);
        setGratification(data.benefits?.gratification !== false);
        setVacationDays(String(data.benefits?.vacationDays ?? 30));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, employeeId]);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let finalCode: string;
      try {
        finalCode = await resolveCodeIfEmpty(code, "employee");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al generar código.");
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
        status,
        payroll: {
          salaryType,
          baseSalary: Number(baseSalary) || 0,
          currency: currency.trim() || "PEN",
        },
        benefits: {
          cts,
          gratification,
          vacationDays: Number(vacationDays) || 0,
        },
      };
      if (employeeId) {
        await updateEmployee(employeeId, payload);
      } else {
        await addEmployee(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!firstName.trim() && !!lastName.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar empleado" : "Agregar empleado"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
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

          <DpCodeInput entity="employee" label="Código" name="code" value={code} onChange={setCode} />
          <DpInput type="input"  label="Nombre"       name="firstName"  value={firstName}  onChange={setFirstName}  placeholder="Carlos" />
          <DpInput type="input"  label="Apellidos"    name="lastName"   value={lastName}   onChange={setLastName}   placeholder="Ramirez" />
          <DpInput type="input"  label="Nº documento" name="documentNo" value={documentNo} onChange={setDocumentNo} placeholder="12345678" />
          <DpInput
            type="select" label="Tipo doc." name="documentTypeId"
            value={documentTypeId}
            onChange={(v) => {
              setDocumentTypeId(String(v));
              const found = docTypesOpts.find((o) => o.value === String(v));
              setDocumentType(found ? found.label : "");
            }}
            options={docTypesOpts}
            placeholder="Seleccione..."
          />
          <DpInput type="input"  label="Teléfono"     name="phone"      value={phone}      onChange={setPhone}      placeholder="999 999 999" />
          <DpInput type="input"  label="Email"        name="email"      value={email}      onChange={setEmail}      placeholder="carlos@empresa.com" />
          <DpInput
            type="select" label="Cargo" name="positionId"
            value={positionId}
            onChange={(v) => {
              setPositionId(v as string);
              const found = positionsOpts.find((p) => p.value === v);
              setPosition(found ? found.label : "");
            }}
            options={positionsOpts}
          />
          <DpInput type="date" label="Fecha ingreso" name="hireDate" value={hireDate} onChange={setHireDate} placeholder="DD/MM/YYYY" />
          <DpInput
            type="select" label="Estado" name="status"
            value={status} onChange={(v) => setStatus(v as EmployeeStatus)}
            options={STATUS_OPTIONS}
          />

          {/* Sección Nómina */}
          <div className="rounded border border-zinc-200 p-3 dark:border-navy-600">
            <div className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Nómina</div>
            <div className="flex flex-col gap-2">
              <DpInput
                type="select" label="Tipo de salario" name="salaryType"
                value={salaryType} onChange={(v) => setSalaryType(v as SalaryType)}
                options={SALARY_OPTIONS}
              />
              <DpInput type="number" label="Salario base" name="baseSalary" value={baseSalary} onChange={setBaseSalary} placeholder="2800" />
              <DpInput
                type="select" label="Moneda" name="currency"
                value={currency} onChange={(v) => setCurrency(String(v))}
                options={CURRENCY_OPTIONS}
              />
            </div>
          </div>

          {/* Sección Beneficios */}
          <div className="rounded border border-zinc-200 p-3 dark:border-navy-600">
            <div className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Beneficios</div>
            <div className="flex flex-col gap-2">
              <DpInput type="check"  label="CTS"               name="cts"           value={cts}           onChange={setCts} />
              <DpInput type="check"  label="Gratificación"     name="gratification" value={gratification} onChange={setGratification} />
              <DpInput type="number" label="Días de vacaciones" name="vacationDays" value={vacationDays}   onChange={setVacationDays} placeholder="30" />
            </div>
          </div>
        </div>
      )}
    </DpContentSet>
  );
}
