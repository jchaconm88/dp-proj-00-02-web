import { useMemo } from "react";

interface SearchTriggerProps {
  onClick: () => void;
}

function getOsHint(): string {
  if (typeof navigator === "undefined") return "Ctrl+K";
  const ua = navigator.userAgent.toLowerCase();
  const isMac = ua.includes("mac") || ua.includes("darwin");
  return isMac ? "\u2318K" : "Ctrl+K";
}

export default function SearchTrigger({ onClick }: SearchTriggerProps) {
  const hint = useMemo(() => getOsHint(), []);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex w-56 items-center gap-2 rounded-full border border-white/10 bg-[var(--dp-surface-low)]/70 px-3 py-1.5 text-sm text-[var(--dp-on-surface-soft)] transition focus:border-[var(--dp-primary)] focus:outline-none md:w-80"
    >
      <i className="pi pi-search text-xs" aria-hidden />
      <span className="flex-1 text-left">Buscar...</span>
      <kbd className="hidden rounded-md border border-white/10 bg-[var(--dp-surface-low)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--dp-on-surface-soft)] md:inline-block">
        {hint}
      </kbd>
    </button>
  );
}
