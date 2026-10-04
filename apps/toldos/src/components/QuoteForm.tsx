"use client";
/**
 * Formulario "Solicitar visita". No pide cuenta.
 * - Recupera el diseño guardado del configurador.
 * - Comprueba el código postal contra las zonas de servicio (API).
 * - Valida con el mismo esquema Zod que el servidor.
 * - Envía todo (incluidas las fotos) como FormData a /api/leads.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TextField, TextAreaField, SelectField } from "@portafolio/core/ui/Field";
import { FileDropzone } from "@portafolio/core/ui/FileDropzone";
import { calculatePrice, DRIVE_LABELS, formatEuro, formatMeters } from "@portafolio/core/pricing";
import { fieldErrors, normalizePostalCode, quoteRequestSchema, toDateKey, POSTAL_CODE_REGEX } from "@portafolio/core/validation";
import type { Catalog } from "@/lib/catalog";
import { clearConfig, useSavedConfig } from "@/lib/saved-config";
import { AwningPreview } from "./AwningPreview";

/** Resultado de la comprobación de zona para un código postal concreto. */
type ZoneResult = { cp: string; zone: string | null };

export function QuoteForm({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const config = useSavedConfig();
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [zoneResult, setZoneResult] = useState<ZoneResult | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [sending, setSending] = useState(false);

  // Comprobamos la zona cuando el código postal tiene un formato válido
  // (con una pequeña espera para no llamar a la API en cada tecla).
  const cp = normalizePostalCode(postalCode);
  const cpValid = POSTAL_CODE_REGEX.test(postalCode.trim());
  useEffect(() => {
    if (!cpValid) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/zonas?cp=${encodeURIComponent(cp)}`);
      const data = await res.json();
      setZoneResult({ cp, zone: data.zone });
    }, 350);
    return () => clearTimeout(t);
  }, [cp, cpValid]);

  // Estado de la zona derivado (sin estado extra): idle, checking, ok u out.
  const zone = !cpValid
    ? { status: "idle" as const }
    : zoneResult?.cp !== cp
      ? { status: "checking" as const }
      : zoneResult.zone
        ? { status: "ok" as const, name: zoneResult.zone }
        : { status: "out" as const };

  const model = config && catalog.models.find((m) => m.id === config.modelId);
  const fabric = config && catalog.fabrics.find((f) => f.id === config.fabricId);
  const frame = config && catalog.frameColors.find((c) => c.id === config.frameColorId);
  const price = config && model ? calculatePrice(config, { model, fabric, frameColor: frame, rules: catalog.rules }).total : null;

  // Fechas permitidas en el selector: de mañana a 90 días.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      postalCode: normalizePostalCode(String(fd.get("postalCode") ?? "")),
      address: String(fd.get("address") ?? ""),
      city: String(fd.get("city") ?? ""),
      preferredDate: String(fd.get("preferredDate") ?? ""),
      preferredSlot: String(fd.get("preferredSlot") ?? "manana"),
      message: String(fd.get("message") ?? ""),
      configuration: model ? config : null,
      consent: fd.get("consent") === "on",
    };

    const parsed = quoteRequestSchema.safeParse(data);
    const errs = parsed.success ? {} : fieldErrors(parsed.error);
    if (zone.status === "out") errs.postalCode = "Todavía no llegamos a tu zona. Escríbenos y lo vemos.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSending(true);
    const body = new FormData();
    body.set("data", JSON.stringify(data));
    files.forEach((f) => body.append("photos", f));
    const res = await fetch("/api/leads", { method: "POST", body });
    const json = await res.json();
    setSending(false);
    if (!res.ok) {
      setErrors(json.fields ?? { _: json.error ?? "No se pudo enviar. Inténtalo de nuevo." });
      return;
    }
    clearConfig();
    router.push(`/solicitar-visita/gracias?ref=${encodeURIComponent(json.reference)}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-14 lg:grid-cols-12">
      {/* ---------- Resumen del diseño ---------- */}
      <aside className="lg:col-span-4">
        <div className="lg:sticky lg:top-24">
          <p className="text-sm text-muted">Tu diseño</p>
          {model && fabric && frame && config ? (
            <>
              <div className="mt-3 bg-paper-deep/60">
                <AwningPreview type={model.type} width={config.width} projection={config.projection} fabric={fabric} frameHex={frame.hex} drive={config.drive} showDims={false} className="block w-full" />
              </div>
              <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
                <div className="flex justify-between py-2"><dt className="text-muted">Modelo</dt><dd>{model.name}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted">Medidas</dt><dd>{formatMeters(config.width)} × {formatMeters(config.projection)}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted">Lona</dt><dd>{fabric.name}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted">Estructura</dt><dd>{frame.name}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted">Accionamiento</dt><dd>{DRIVE_LABELS[config.drive]}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted">Orientativo</dt><dd className="font-serif text-lg">desde {formatEuro(price ?? 0)}</dd></div>
              </dl>
              <Link href="/configurador" className="link-grow mt-3 inline-block text-sm text-muted">Cambiar diseño</Link>
            </>
          ) : (
            <div className="mt-3 border-y border-line py-6">
              <p className="font-serif text-xl">Sin diseño todavía</p>
              <p className="mt-2 text-sm text-muted">No pasa nada: lo vemos juntos en la visita. Si quieres, puedes <Link href="/configurador" className="underline underline-offset-4">diseñarlo antes</Link>.</p>
            </div>
          )}
        </div>
      </aside>

      {/* ---------- Datos ---------- */}
      <div className="space-y-14 lg:col-span-7 lg:col-start-6">
        <fieldset className="grid gap-6 md:grid-cols-2">
          <legend className="mb-6 font-serif text-2xl">¿Dónde es?</legend>
          <div>
            <TextField label="Código postal" name="postalCode" placeholder="2011 AB" autoComplete="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} error={errors.postalCode} />
            {!errors.postalCode && zone.status !== "idle" && (
              <p className={`mt-1 text-sm ${zone.status === "out" ? "text-terracotta" : "text-olive"}`}>
                {zone.status === "checking" && "Comprobando…"}
                {zone.status === "ok" && `Trabajamos en tu zona · ${zone.name}`}
                {zone.status === "out" && "Todavía no llegamos a tu zona."}
              </p>
            )}
          </div>
          <TextField label="Localidad" name="city" autoComplete="address-level2" error={errors.city} />
          <div className="md:col-span-2">
            <TextField label="Calle y número" name="address" autoComplete="street-address" error={errors.address} />
          </div>
        </fieldset>

        <fieldset className="grid gap-6 md:grid-cols-2">
          <legend className="mb-6 font-serif text-2xl">¿Cuándo te viene bien?</legend>
          <TextField label="Fecha preferida" name="preferredDate" type="date" min={toDateKey(tomorrow)} max={toDateKey(maxDate)} error={errors.preferredDate} hint="De lunes a sábado" />
          <SelectField label="Franja" name="preferredSlot" defaultValue="manana">
            <option value="manana">Mañana (9–13 h)</option>
            <option value="tarde">Tarde (14–18 h)</option>
          </SelectField>
        </fieldset>

        <fieldset className="grid gap-6 md:grid-cols-2">
          <legend className="mb-6 font-serif text-2xl">Tus datos</legend>
          <div className="md:col-span-2">
            <TextField label="Nombre" name="name" autoComplete="name" error={errors.name} />
          </div>
          <TextField label="Correo electrónico" name="email" type="email" autoComplete="email" error={errors.email} />
          <TextField label="Teléfono" name="phone" type="tel" autoComplete="tel" error={errors.phone} />
          <div className="md:col-span-2">
            <TextAreaField label="¿Algo que debamos saber? (opcional)" name="message" placeholder="Orientación, si hay viento, tipo de fachada…" />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 font-serif text-2xl">Fotos del sitio</legend>
          <p className="mb-5 text-sm text-muted">Opcional, pero nos ayuda a preparar la visita. Hasta 4 fotos.</p>
          <FileDropzone onChange={setFiles} hint="JPG, PNG o HEIC · máximo 8 MB cada una" />
        </fieldset>

        <div className="border-t border-line pt-8">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" className="mt-1 accent-ink" />
            <span className="text-muted">Acepto que SunShade use estos datos para contactarme sobre esta visita.</span>
          </label>
          {errors.consent && <p className="mt-2 text-sm text-terracotta">{errors.consent}</p>}
          {errors._ && <p className="mt-4 text-sm text-terracotta">{errors._}</p>}
          <button disabled={sending} className="mt-8 w-full bg-ink px-6 py-4 text-paper transition-colors hover:bg-terracotta disabled:opacity-50 md:w-auto md:px-12">
            {sending ? "Enviando…" : "Solicitar visita"}
          </button>
          <p className="mt-4 text-sm text-muted">Te llamamos en un día laborable para confirmar la hora.</p>
        </div>
      </div>
    </form>
  );
}
