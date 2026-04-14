import { getSystemModuleById, getSystemModules } from "~/data/system-modules";
import type { ModuleRecord, ModuleEditInput } from "./modules.types";

/** Obtiene un módulo por ID. */
export async function getModule(id: string): Promise<ModuleRecord | null> {
  return getSystemModuleById(id);
}

/** Lista todos los módulos. */
export async function getModules(): Promise<{ items: ModuleRecord[] }> {
  return { items: getSystemModules() };
}

/** Crea un módulo con id = name. */
export async function addModule(data: { name: string; description: string }): Promise<void> {
  void data;
  throw new Error("El mantenimiento de módulos está deshabilitado. Usa el catálogo estático del sistema.");
}

/** Actualiza un módulo (campos parciales). */
export async function saveModule(id: string, data: ModuleEditInput): Promise<void> {
  void id;
  void data;
  throw new Error("El mantenimiento de módulos está deshabilitado. Usa el catálogo estático del sistema.");
}

/** Elimina un módulo. */
export async function deleteModule(id: string): Promise<void> {
  void id;
  throw new Error("El mantenimiento de módulos está deshabilitado. Usa el catálogo estático del sistema.");
}
