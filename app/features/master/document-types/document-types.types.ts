export type DocumentTypeCategory = "identity" | "transport" | "vehicle";

export interface DocumentTypeRecord {
  id: string;
  name: string;
  description: string;
  type: DocumentTypeCategory;
  createdAt?: string;
  updatedAt?: string;
}

export type DocumentTypeAddInput = Omit<DocumentTypeRecord, "id" | "createdAt" | "updatedAt">;
export type DocumentTypeEditInput = Partial<DocumentTypeAddInput>;
