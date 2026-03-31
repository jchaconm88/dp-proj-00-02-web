/** Muletillas soportadas en asunto y cuerpo del correo de reporte (Cloud Functions). */
export const REPORT_NOTIFY_TEMPLATE_TOKENS: ReadonlyArray<{ label: string; token: string }> = [
  { label: "Título resuelto", token: "{{resolvedTitle}}" },
  { label: "Nombre del reporte", token: "{{definitionName}}" },
  { label: "Fecha desde", token: "{{dateFrom}}" },
  { label: "Fecha hasta", token: "{{dateTo}}" },
  { label: "Nombre de archivo", token: "{{fileName}}" },
  { label: "Enlace de descarga", token: "{{downloadUrl}}" },
];

export function reportNotifyTokensHelpInline(): string {
  return REPORT_NOTIFY_TEMPLATE_TOKENS.map((t) => t.token).join(" ");
}
