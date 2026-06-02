import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "primereact/button";

export interface PendingImage {
  file: File;
  previewUrl: string;
}

export interface ImageUploadHandle {
  getPendingFiles: () => File[];
}

interface ImageUploadProps {
  images: string[];
  pendingImages: PendingImage[];
  onImagesChange: (urls: string[]) => void;
  onPendingImagesChange: (pending: PendingImage[]) => void;
  disabled?: boolean;
}

const ImageUpload = forwardRef<ImageUploadHandle, ImageUploadProps>(
  function ImageUpload(
    { images, pendingImages, onImagesChange, onPendingImagesChange, disabled },
    ref
  ) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      getPendingFiles: () => pendingImages.map((p) => p.file),
    }));

    // Cleanup blob URLs on unmount or when pending images change
    useEffect(() => {
      return () => {
        pendingImages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      };
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const previewUrl = URL.createObjectURL(file);
      onPendingImagesChange([...pendingImages, { file, previewUrl }]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveRemote = (index: number) => {
      const newUrls = images.filter((_, i) => i !== index);
      onImagesChange(newUrls);
    };

    const handleRemovePending = (index: number) => {
      const removed = pendingImages[index];
      URL.revokeObjectURL(removed.previewUrl);
      const newPending = pendingImages.filter((_, i) => i !== index);
      onPendingImagesChange(newPending);
    };

    const totalCount = images.length + pendingImages.length;

    const moveUp = (globalIndex: number) => {
      if (globalIndex <= 0) return;
      if (globalIndex < images.length) {
        // Both in remote array
        const newUrls = [...images];
        [newUrls[globalIndex - 1], newUrls[globalIndex]] = [newUrls[globalIndex], newUrls[globalIndex - 1]];
        onImagesChange(newUrls);
      } else if (globalIndex === images.length) {
        // First pending item moving into last remote position
        const pendingIdx = 0;
        const pending = pendingImages[pendingIdx];
        // Cannot swap a pending file into the remote array (it has no URL yet)
        // Instead, move the last remote image down (after the pending)
        // This is a no-op for cross-boundary; keep simple by disabling
      } else {
        // Both in pending array
        const pendingIdx = globalIndex - images.length;
        const newPending = [...pendingImages];
        [newPending[pendingIdx - 1], newPending[pendingIdx]] = [newPending[pendingIdx], newPending[pendingIdx - 1]];
        onPendingImagesChange(newPending);
      }
    };

    const moveDown = (globalIndex: number) => {
      if (globalIndex >= totalCount - 1) return;
      if (globalIndex < images.length - 1) {
        // Both in remote array
        const newUrls = [...images];
        [newUrls[globalIndex], newUrls[globalIndex + 1]] = [newUrls[globalIndex + 1], newUrls[globalIndex]];
        onImagesChange(newUrls);
      } else if (globalIndex === images.length - 1) {
        // Last remote moving into pending territory — no-op for cross-boundary
      } else {
        // Both in pending array
        const pendingIdx = globalIndex - images.length;
        const newPending = [...pendingImages];
        [newPending[pendingIdx], newPending[pendingIdx + 1]] = [newPending[pendingIdx + 1], newPending[pendingIdx]];
        onPendingImagesChange(newPending);
      }
    };

    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Imágenes
        </label>
        <div className="flex flex-wrap gap-2">
          {/* Remote (already uploaded) images */}
          {images.map((url, i) => (
            <div key={`remote-${i}`} className="relative">
              <img
                src={url}
                alt={`Imagen ${i + 1}`}
                className="h-20 w-20 rounded border object-cover"
              />
              <div className="absolute -right-2 -top-2 flex gap-0.5">
                {i > 0 && (
                  <Button
                    icon="pi pi-chevron-up"
                    className="p-button-rounded p-button-text p-button-sm"
                    onClick={() => moveUp(i)}
                    type="button"
                  />
                )}
                {i < totalCount - 1 && i < images.length - 1 && (
                  <Button
                    icon="pi pi-chevron-down"
                    className="p-button-rounded p-button-text p-button-sm"
                    onClick={() => moveDown(i)}
                    type="button"
                  />
                )}
                <Button
                  icon="pi pi-times"
                  className="p-button-rounded p-button-danger p-button-text p-button-sm"
                  onClick={() => handleRemoveRemote(i)}
                  type="button"
                  disabled={disabled}
                />
              </div>
              {i === 0 && (
                <span className="absolute -bottom-1 left-1 rounded bg-blue-600 px-1 text-xs text-white">
                  Featured
                </span>
              )}
            </div>
          ))}

          {/* Pending (local, not yet uploaded) images */}
          {pendingImages.map((pending, i) => {
            const globalIdx = images.length + i;
            return (
              <div key={`pending-${i}`} className="relative">
                <img
                  src={pending.previewUrl}
                  alt={`Imagen pendiente ${i + 1}`}
                  className="h-20 w-20 rounded border object-cover opacity-80"
                />
                <div className="absolute -right-2 -top-2 flex gap-0.5">
                  {i > 0 && (
                    <Button
                      icon="pi pi-chevron-up"
                      className="p-button-rounded p-button-text p-button-sm"
                      onClick={() => moveUp(globalIdx)}
                      type="button"
                    />
                  )}
                  {globalIdx < totalCount - 1 && (
                    <Button
                      icon="pi pi-chevron-down"
                      className="p-button-rounded p-button-text p-button-sm"
                      onClick={() => moveDown(globalIdx)}
                      type="button"
                    />
                  )}
                  <Button
                    icon="pi pi-times"
                    className="p-button-rounded p-button-danger p-button-text p-button-sm"
                    onClick={() => handleRemovePending(i)}
                    type="button"
                    disabled={disabled}
                  />
                </div>
                {globalIdx === 0 && (
                  <span className="absolute -bottom-1 left-1 rounded bg-blue-600 px-1 text-xs text-white">
                    Featured
                  </span>
                )}
                <span className="absolute -bottom-1 right-1 rounded bg-amber-500 px-1 text-xs text-white">
                  Pendiente
                </span>
              </div>
            );
          })}

          {/* Add button */}
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded border-2 border-dashed">
            <i className="pi pi-plus text-xl text-zinc-400" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
              disabled={disabled}
            />
          </label>
        </div>
      </div>
    );
  }
);

export default ImageUpload;
