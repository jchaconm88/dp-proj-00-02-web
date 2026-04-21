/**
 * Lee un archivo binario y devuelve su contenido en Base64 (sin prefijo data URL).
 * Pensado para certificados .p12 en el cliente; el backend sigue recibiendo solo el string base64.
 */
export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") {
        reject(new Error("No se pudo leer el archivo."));
        return;
      }
      const comma = r.indexOf(",");
      resolve(comma >= 0 ? r.slice(comma + 1) : r);
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
    reader.readAsDataURL(file);
  });
}
