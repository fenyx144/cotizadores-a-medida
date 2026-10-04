/**
 * Guarda la configuración del cliente en el navegador (localStorage) para
 * pasarla del configurador a "Pruébalo en casa" y a "Solicitar visita"
 * sin necesidad de cuenta.
 *
 * useSavedConfig() usa useSyncExternalStore: la forma recomendada por React
 * para leer una fuente externa (aquí, localStorage) sin efectos ni parpadeos
 * de hidratación (en el servidor devuelve null).
 */
import { useMemo, useSyncExternalStore } from "react";
import type { Configuration } from "@portafolio/core/pricing";

const KEY = "sunshade:config";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback); // cambios desde otra pestaña
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveConfig(config: Configuration) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    /* modo privado o almacenamiento lleno: no pasa nada */
  }
  notify();
}

export function clearConfig() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  notify();
}

/** Devuelve la configuración guardada (o null). Se actualiza sola al guardar. */
export function useSavedConfig(): Configuration | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Configuration;
    } catch {
      return null;
    }
  }, [raw]);
}
