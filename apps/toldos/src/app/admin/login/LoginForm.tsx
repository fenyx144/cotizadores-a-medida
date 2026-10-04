"use client";
import { useActionState } from "react";
import { TextField } from "@portafolio/core/ui/Field";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-6">
      <TextField label="Correo" name="email" type="email" defaultValue="demo@demo.com" autoComplete="username" />
      <TextField label="Contraseña" name="password" type="password" defaultValue="demo1234" autoComplete="current-password" />
      {state?.error && <p className="text-sm text-terracotta">{state.error}</p>}
      <button disabled={pending} className="w-full bg-ink px-6 py-3 text-paper hover:bg-terracotta disabled:opacity-50">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
