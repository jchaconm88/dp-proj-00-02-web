import type { ReactNode } from "react";
import { Panel } from "primereact/panel";

export interface DpContentProps {
  /** Título del panel (ej. "USUARIOS") */
  title: string;
  children: ReactNode;
}

export default function DpContent({ title, children }: DpContentProps) {
  return (
    <Panel header={title}>
      <div className="space-y-4">{children}</div>
    </Panel>
  );
}
