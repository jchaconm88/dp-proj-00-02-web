import { useMemo } from "react";
import { Dropdown } from "primereact/dropdown";

interface DashboardPeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
}

/** Month names in Spanish */
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/**
 * Builds the last 12 months as options with human-readable labels.
 * Returns array of { label: "Enero 2025", value: "2025-01" }
 */
function buildPeriodOptions(): Array<{ label: string; value: string }> {
  const options: Array<{ label: string; value: string }> = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed
    const value = `${year}-${String(month + 1).padStart(2, "0")}`;
    const label = `${MONTH_NAMES[month]} ${year}`;
    options.push({ label, value });
  }

  return options;
}

/**
 * Period selector dropdown showing the last 12 months.
 * Default is the current month in YYYY-MM format.
 * Labels are human-readable (e.g., "Enero 2025", "Diciembre 2024").
 */
export default function DashboardPeriodSelector({ value, onChange }: DashboardPeriodSelectorProps) {
  const options = useMemo(() => buildPeriodOptions(), []);

  return (
    <Dropdown
      value={value}
      onChange={(e) => onChange(String(e.value ?? ""))}
      options={options}
      optionLabel="label"
      optionValue="value"
      placeholder="Seleccionar periodo"
      className="w-52"
      aria-label="Selector de periodo"
    />
  );
}
