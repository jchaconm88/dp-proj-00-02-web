export interface SunatConfigRecord {
  id: string;
  /** Etiqueta para listados (ej. "Principal"). */
  name: string;
  /** Si es false, envío/consulta SUNAT no usará esta configuración. */
  active: boolean;
  /** URL del webservice billService (envío de comprobantes). */
  urlServidorSunat: string;
  /** URL del webservice billConsultService (consulta CDR). */
  urlConsultaServidorSunat: string;
  /** Usuario SOL (sin RUC). */
  usuarioSunat: string;
  /** Contraseña SOL. */
  passwordSunat: string;
  /** Certificado PKCS#12 en base64. */
  certBase64: string;
  /** Contraseña del certificado. */
  passwordCertificado: string;
  /** Indica si el certificado está cargado (campo derivado, no persiste). */
  hasCert?: boolean;
  /** Nombre sugerido del archivo .p12 al exportar (opcional). */
  certOriginalFileName?: string;
}

export type SunatConfigInput = Omit<SunatConfigRecord, "id" | "hasCert">;

/** Fila de tabla (UI): ambiente derivado de URLs. */
export type SunatConfigTableRow = SunatConfigRecord & {
  environmentLabel: string;
};
