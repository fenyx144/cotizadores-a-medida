"use client";
/** Formularios del área de cliente (ingreso, registro y nuevo proyecto). */
import { useActionState } from "react";
import { SelectField, TextField } from "@portafolio/core/ui/Field";
import { createProject, login, loginDemo, register } from "@/app/actions/client";
import { DISTRICTS } from "@/lib/content";

const button = "w-full bg-blue px-6 py-3 text-white-stone transition-colors hover:bg-ink disabled:opacity-50";

export function ClientLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="next" value={next ?? "/cliente"} />
      <TextField label="Correo" name="email" type="email" autoComplete="username" required defaultValue={state?.values?.email} />
      <TextField label="Contraseña" name="password" type="password" autoComplete="current-password" required />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className={button}>{pending ? "Ingresando…" : "Ingresar"}</button>
    </form>
  );
}

/** Credenciales de demostración visibles y un botón para entrar sin registrarse. */
export function DemoAccessCard({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginDemo, undefined);
  return (
    <form action={action} className="border border-line p-5 text-sm">
      <input type="hidden" name="next" value={next ?? "/cliente"} />
      <p className="font-mono text-xs text-muted">Cuenta de demostración</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted">Correo</dt><dd className="font-mono">cliente@demo.com</dd>
        <dt className="text-muted">Contraseña</dt><dd className="font-mono">demo1234</dd>
      </dl>
      <p className="mt-3 text-muted">Incluye un colegio con plano y 50 ventanas marcadas.</p>
      {state?.error && <p className="mt-3 text-danger">{state.error}</p>}
      <button disabled={pending} className="mt-4 w-full border border-ink px-4 py-2 transition-colors hover:bg-ink hover:text-white-stone disabled:opacity-50">
        {pending ? "Entrando…" : "Entrar con la cuenta demo"}
      </button>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(register, undefined);
  const f = state?.fields ?? {};
  const v = state?.values ?? {};
  return (
    <form action={action} className="grid gap-6 sm:grid-cols-2">
      <input type="hidden" name="next" value={next ?? "/cliente"} />
      <div className="sm:col-span-2"><TextField label="Institución o empresa" name="company" defaultValue={v.company} error={f.company} placeholder="Colegio Los Álamos" /></div>
      <TextField label="RUC" name="ruc" inputMode="numeric" maxLength={11} error={f.ruc} placeholder="20456789123" />
      <TextField label="Teléfono" name="phone" defaultValue={v.phone} error={f.phone} placeholder="959 214 780" />
      <div className="sm:col-span-2"><TextField label="Nombre de contacto" name="name" defaultValue={v.name} error={f.name} autoComplete="name" /></div>
      <TextField label="Correo" name="email" type="email" error={f.email} autoComplete="email" />
      <TextField label="Contraseña" name="password" type="password" error={f.password} hint="Mínimo 8 caracteres" autoComplete="new-password" />
      {state?.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2"><button disabled={pending} className={button}>{pending ? "Creando cuenta…" : "Crear cuenta"}</button></div>
    </form>
  );
}

export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProject, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2"><TextField label="Nombre del proyecto" name="name" error={f.name} placeholder="Pabellón B — aulas del segundo piso" /></div>
      <SelectField label="Sector" name="sector" defaultValue="educacion">
        <option value="educacion">Educación</option>
        <option value="oficinas">Oficinas</option>
        <option value="salud">Salud</option>
        <option value="otro">Otro</option>
      </SelectField>
      <SelectField label="Distrito" name="district" defaultValue="" error={f.district}>
        <option value="" disabled>Elija…</option>
        {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
        <option>Otro (fuera de Arequipa)</option>
      </SelectField>
      <div className="md:col-span-2"><TextField label="Dirección de la obra" name="address" error={f.address} placeholder="Dirección de la obra" /></div>
      <div><button disabled={pending} className={button}>{pending ? "Creando…" : "Crear y abrir"}</button></div>
    </form>
  );
}
