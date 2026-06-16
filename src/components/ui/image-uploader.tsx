import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';

interface ImageUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingUrls?: string[];
  onRemoveExisting?: (url: string) => void;
  maxFiles?: number;
}

export function ImageUploader({
  files,
  onFilesChange,
  existingUrls = [],
  onRemoveExisting,
  maxFiles = 3,
}: ImageUploaderProps) {
  const totalCount = files.length + existingUrls.length;
  const remaining = maxFiles - totalCount;

  const onDrop = useCallback(
    (accepted: File[]) => {
      const next = [...files, ...accepted].slice(0, maxFiles - existingUrls.length);
      onFilesChange(next);
    },
    [files, existingUrls.length, maxFiles, onFilesChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: remaining,
    disabled: remaining <= 0,
  });

  const removeNew = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {remaining > 0 && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/5'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-900/50'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="size-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
            Arrastra imágenes aquí o haz clic
          </p>
          <p className="text-slate-400 text-xs mt-1">
            JPG, PNG · máx. {maxFiles} en total ({remaining} restante{remaining !== 1 ? 's' : ''})
          </p>
        </div>
      )}

      {(existingUrls.length > 0 || files.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {existingUrls.map((url) => (
            <div
              key={url}
              className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-100 dark:bg-slate-900"
            >
              <img src={url} alt="Imagen adjunta" className="w-full h-full object-cover" />
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(url)}
                  className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}

          {files.map((file, idx) => {
            const preview = URL.createObjectURL(file);
            return (
              <div
                key={idx}
                className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-100 dark:bg-slate-900"
              >
                <img src={preview} alt="Vista previa" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNew(idx)}
                  className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
