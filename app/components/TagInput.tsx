import { Chips } from "primereact/chips";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export default function TagInput({ value, onChange, disabled }: TagInputProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Etiquetas
      </label>
      <Chips
        value={value}
        onChange={(e) => onChange(e.value ?? [])}
        placeholder="Escriba una etiqueta y presione Enter"
        className="w-full"
        disabled={disabled}
      />
    </div>
  );
}
