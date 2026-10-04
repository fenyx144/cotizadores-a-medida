"use client";
/**
 * Zona para subir fotos con vista previa. Valida tipo y tamaño en el navegador
 * (el servidor vuelve a validar: nunca confiar solo en el cliente).
 */
import { useEffect, useRef, useState } from "react";

export interface FileDropzoneProps {
  maxFiles?: number;
  maxBytes?: number;
  accept?: string[];
  onChange: (files: File[]) => void;
  label?: string;
  hint?: string;
}

export function FileDropzone({
  maxFiles = 4,
  maxBytes = 8 * 1024 * 1024,
  accept = ["image/jpeg", "image/png", "image/webp", "image/heic"],
  onChange,
  label = "Arrastra tus fotos aquí o haz clic para elegirlas",
  hint,
}: FileDropzoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Creamos URLs temporales para las miniaturas y las liberamos al cambiar.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function add(list: FileList | null) {
    if (!list) return;
    setError(null);
    const next = [...files];
    for (const file of Array.from(list)) {
      if (!accept.includes(file.type)) {
        setError("Solo fotos JPG, PNG, WEBP o HEIC.");
        continue;
      }
      if (file.size > maxBytes) {
        setError(`Cada foto puede pesar como máximo ${Math.round(maxBytes / 1024 / 1024)} MB.`);
        continue;
      }
      if (next.length >= maxFiles) {
        setError(`Máximo ${maxFiles} fotos.`);
        break;
      }
      next.push(file);
    }
    setFiles(next);
    onChange(next);
  }

  function remove(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onChange(next);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`w-full border border-dashed px-6 py-8 text-left transition-colors ${dragging ? "border-ink bg-ink/5" : "border-line hover:border-ink/60"}`}
      >
        <span className="block text-ink">{label}</span>
        {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
      </button>
      <input ref={inputRef} type="file" accept={accept.join(",")} multiple hidden onChange={(e) => add(e.target.files)} />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {previews.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-3">
          {previews.map((src, i) => (
            <li key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Foto ${i + 1}`} className="h-20 w-28 object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-ink text-xs text-paper"
                aria-label={`Quitar foto ${i + 1}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
