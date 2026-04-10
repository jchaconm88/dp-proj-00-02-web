import { useMemo } from "react";

interface DpDashboardSparklineProps {
  progressPct: number | null;
}

export default function DpDashboardSparkline({ progressPct }: DpDashboardSparklineProps) {
  const path = useMemo(() => {
    if (progressPct == null) {
      // Sin límite/porcentaje: línea neutra para evitar una tendencia falsa.
      return "M 0 40 L 176 40";
    }
    const pct = Math.max(0, Math.min(100, progressPct));
    const targetY = 56 - (pct / 100) * 44;
    return `M 0 56 L 48 56 L 96 ${targetY} L 176 ${targetY}`;
  }, [progressPct]);

  return (
    <svg viewBox="0 0 176 64" className="h-10 w-full opacity-85">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray={progressPct == null ? "4 4" : undefined}
      />
    </svg>
  );
}
