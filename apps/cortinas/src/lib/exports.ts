/**
 * Exportaciones de un proyecto: PDF (resumen + tabla de líneas + plano con
 * anotaciones numeradas) y Excel (líneas y resumen). Las usan cliente y admin.
 */
import "server-only";
import { buildPdf, type PdfPlan } from "@portafolio/core/pdf";
import { buildXlsx } from "@portafolio/core/xlsx";
import { formatMeters, formatMoney } from "@portafolio/core/pricing";
import { LINE_STATUS_COLORS, LINE_STATUS_LABELS, PROJECT_STATUS_LABELS, type LineStatus, type ProjectStatus } from "@portafolio/core/projects";
import { getFileWithDemoFallback } from "@portafolio/core/storage";
import { BRAND, DRIVE_LABELS } from "./content";
import { locationName, projectSummary, type ProjectData } from "./project";

function rowsFor(data: ProjectData) {
  const locs = new Map(data.locations.map((l) => [l.id, l]));
  return data.lines.map((l) => {
    const loc = l.locationId ? locs.get(l.locationId) : undefined;
    return {
      line: l,
      location: loc ? locationName(loc) : "Sin ubicación",
      product: l.config ? `${l.config.modelName} · ${l.config.fabricName}` : "Sin configurar",
      drive: l.config ? DRIVE_LABELS[l.config.drive] : "",
      size: l.width && l.height ? `${formatMeters(l.width)} x ${formatMeters(l.height)}` : "-",
      total: l.config && l.unitPrice ? l.unitPrice * l.quantity : null,
    };
  });
}

export async function projectPdf(data: ProjectData, origin: string): Promise<Uint8Array> {
  const s = projectSummary(data);
  const rows = rowsFor(data);
  const plans: PdfPlan[] = [];
  for (const plan of data.plans) {
    const file = await getFileWithDemoFallback(plan.imageKey, origin);
    if (!file) continue;
    plans.push({
      heading: `${plan.kind === "foto" ? "Foto" : "Plano"}: ${plan.name}`,
      image: file.body,
      mime: file.contentType === "image/png" ? "image/png" : "image/jpeg",
      annotations: data.lines
        .filter((l) => l.planId === plan.id && l.x != null && l.y != null)
        .map((l) => ({ label: l.label, shape: l.shape === "rect" ? "rect" : "point", x: l.x!, y: l.y!, w: l.w ?? undefined, h: l.h ?? undefined, color: LINE_STATUS_COLORS[l.status as LineStatus] })),
    });
  }
  const mr = data.project.measurementRequest;
  return buildPdf({
    brand: "COTA · Cortinas y persianas",
    accentHex: "#1F3A5F",
    title: data.project.name,
    subtitle: `${data.project.reference} · ${PROJECT_STATUS_LABELS[data.project.status as ProjectStatus]} · ${new Date().toLocaleDateString("es-PE")}`,
    sections: [
      {
        heading: "Cliente",
        rows: [
          ["Institución", data.client.company || "-"],
          ["RUC", data.client.ruc || "-"],
          ["Contacto", `${data.client.name} · ${data.client.phone} · ${data.client.email}`],
          ["Obra", `${data.project.address}, ${data.project.district}`],
          ...(data.project.notes ? ([["Notas", data.project.notes]] as [string, string][]) : []),
          ...(mr ? ([["Medición en obra", `${mr.approxWindows} ventanas aprox. · ${mr.address}${mr.preferredDate ? ` · ${mr.preferredDate}` : ""}`]] as [string, string][]) : []),
        ],
      },
      {
        heading: "Resumen",
        rows: [
          ["Cortinas", `${s.windows} (${s.configured} configuradas, ${s.pending} pendientes)`],
          ...s.byProduct.map((g) => [g.name, `${g.quantity} u. · ${formatMoney(g.amount)}`] as [string, string]),
        ],
      },
    ],
    tables: [
      {
        heading: "Líneas",
        columns: [
          { label: "Cód.", width: 34 },
          { label: "Ubicación", width: 128 },
          { label: "Producto", width: 130 },
          { label: "Medidas", width: 84 },
          { label: "Cant.", width: 30, align: "right" },
          { label: "P. unit.", width: 38, align: "right" },
          { label: "Total", width: 39, align: "right" },
        ],
        rows: rows.map((r) => [r.line.label, r.location, r.product, r.size, String(r.line.quantity), r.line.unitPrice && r.line.config ? String(r.line.unitPrice) : "-", r.total ? String(r.total) : "-"]),
        totals: [
          ["Subtotal", formatMoney(s.subtotal)],
          ...(s.discountPercent ? ([[`Descuento por volumen (${s.discountPercent}%)`, `- ${formatMoney(s.discount)}`]] as [string, string][]) : []),
          ["Total con IGV", formatMoney(s.total)],
          ["IGV incluido (18%)", formatMoney(s.igv)],
        ],
      },
    ],
    plans,
    footer: `${BRAND.name} · ${BRAND.email} · ${BRAND.phone} · Cotización referencial sujeta a medición en obra.`,
  });
}

export async function projectXlsx(data: ProjectData): Promise<Uint8Array> {
  const s = projectSummary(data);
  const rows = rowsFor(data);
  return buildXlsx(
    [
      {
        name: "Líneas",
        columns: [
          { header: "Código", key: "code", width: 8 },
          { header: "Ubicación", key: "location", width: 36 },
          { header: "Producto", key: "product", width: 32 },
          { header: "Accionamiento", key: "drive", width: 22 },
          { header: "Ancho (cm)", key: "width", width: 11 },
          { header: "Alto (cm)", key: "height", width: 11 },
          { header: "Cantidad", key: "qty", width: 10 },
          { header: "P. unitario (S/)", key: "unit", width: 15, numFmt: "#,##0" },
          { header: "Total (S/)", key: "total", width: 13, numFmt: "#,##0" },
          { header: "Estado", key: "status", width: 15 },
          { header: "Nota", key: "note", width: 40 },
        ],
        rows: rows.map((r) => ({
          code: r.line.label, location: r.location, product: r.product, drive: r.drive, width: r.line.width, height: r.line.height, qty: r.line.quantity,
          unit: r.line.config ? r.line.unitPrice : null, total: r.total, status: LINE_STATUS_LABELS[r.line.status as LineStatus], note: r.line.note,
        })),
      },
      {
        name: "Resumen",
        columns: [
          { header: "Concepto", key: "k", width: 40 },
          { header: "Cantidad", key: "q", width: 10 },
          { header: "Importe (S/)", key: "v", width: 14, numFmt: "#,##0" },
        ],
        rows: [
          ...s.byLocation.map((g) => ({ k: g.name, q: g.quantity, v: g.amount })),
          { k: "", q: null, v: null },
          { k: "Subtotal", q: s.configured, v: s.subtotal },
          { k: `Descuento por volumen (${s.discountPercent}%)`, q: null, v: -s.discount },
          { k: "Total con IGV", q: null, v: s.total },
        ],
      },
    ],
    "Cota",
  );
}
