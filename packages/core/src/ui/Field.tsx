/**
 * Piezas de formulario reutilizables (etiqueta + campo + error).
 * Usan los colores del tema de cada app: ink, muted, line, terracotta, paper.
 */
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputBase =
  "w-full bg-transparent border-0 border-b border-line px-0 py-2 text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none focus:ring-0 transition-colors";

export function FieldShell({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm text-muted">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextField({ label, error, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={props.id ?? props.name}>
      <input id={props.id ?? props.name} {...props} className={`${inputBase} ${props.className ?? ""}`} aria-invalid={!!error} />
    </FieldShell>
  );
}

export function TextAreaField({ label, error, hint, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string }) {
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={props.id ?? props.name}>
      <textarea id={props.id ?? props.name} rows={3} {...props} className={`${inputBase} resize-none ${props.className ?? ""}`} />
    </FieldShell>
  );
}

export function SelectField({ label, error, hint, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: string }) {
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={props.id ?? props.name}>
      <select id={props.id ?? props.name} {...props} className={`${inputBase} ${props.className ?? ""}`}>
        {children}
      </select>
    </FieldShell>
  );
}
