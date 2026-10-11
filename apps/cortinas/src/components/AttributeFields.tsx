"use client";
/** Campos del configurador generados a partir de los atributos de la familia (en orden, con reglas en vivo). */
import type { Evaluation, Values } from "@/lib/rules";

export function AttributeFields({ ev, values, onChange, disabled, inputClass, labelClass }: {
  ev: Evaluation; values: Values; onChange: (attributeId: number, v: number | boolean | null) => void;
  disabled?: boolean; inputClass: string; labelClass: string;
}) {
  return (
    <>
      {ev.fields.map((f) => {
        const id = f.attribute.id, err = ev.errors[`a${id}`], v = values[id];
        const title = `${f.attribute.name}${f.required ? "" : " (opcional)"}`;
        if (f.kind === "sino") {
          const yes = f.choices[0];
          return (
            <label key={id} className="col-span-2 flex items-center gap-2 text-sm" data-testid={`attr-${id}`}>
              <input type="checkbox" className="accent-[#1f3a5f]" checked={v === true} disabled={disabled || (!!yes?.disabled && v !== true)} onChange={(e) => onChange(id, e.target.checked)} />
              <span>{f.attribute.name}</span>
              {yes?.disabled && <span className="text-xs text-muted">— {yes.disabled}</span>}
              {err && <span className="block text-xs text-danger">{err}</span>}
            </label>
          );
        }
        if (f.kind === "numero") {
          return (
            <label key={id} data-testid={`attr-${id}`}>
              <span className={labelClass}>{title}{f.attribute.unit ? ` (${f.attribute.unit})` : ""}</span>
              <input className={`${inputClass} font-mono`} inputMode="decimal" disabled={disabled} value={typeof v === "number" ? v : ""}
                onChange={(e) => onChange(id, e.target.value === "" ? null : Number(e.target.value.replace(",", ".")) || 0)} />
              {err && <span className="mt-1 block text-xs text-danger">{err}</span>}
            </label>
          );
        }
        const current = f.choices.find((c) => c.value === v);
        return (
          <label key={id} data-testid={`attr-${id}`}>
            <span className={labelClass}>
              {current?.hex && <i className="mr-1.5 inline-block size-2.5 rounded-full border border-line align-middle" style={{ background: current.hex }} />}
              {title}
            </span>
            <select className={inputClass} disabled={disabled} value={typeof v === "number" ? v : ""} name={`attr-${id}`} aria-label={f.attribute.name}
              onChange={(e) => onChange(id, Number(e.target.value) || null)}>
              {(!f.required || v == null) && <option value="">{f.required ? "Elija…" : "—"}</option>}
              {f.choices.map((c) => <option key={c.value} value={c.value} disabled={!!c.disabled}>{c.label}{c.disabled ? ` — ${c.disabled}` : ""}</option>)}
            </select>
            {err && <span className="mt-1 block text-xs text-danger" data-testid="attr-error">{err}</span>}
          </label>
        );
      })}
    </>
  );
}
