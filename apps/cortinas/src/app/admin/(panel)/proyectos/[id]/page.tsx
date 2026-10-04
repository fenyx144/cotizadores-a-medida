import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMeters, formatMoney } from "@portafolio/core/pricing";
import { LINE_STATUS_COLORS, LINE_STATUS_LABELS, PROJECT_STATUSES, PROJECT_STATUS_LABELS, type LineStatus } from "@portafolio/core/projects";
import { loadProject, locationName, projectSummary } from "@/lib/project";
import { DRIVE_LABELS } from "@/lib/content";
import { updateProjectStatus } from "@/app/admin/actions";
import { AdminPlanView } from "@/components/admin/AdminPlanView";

export default async function AdminProject({ params }: { params: Promise<{ id: string }> }) {
  const data = await loadProject(Number((await params).id));
  if (!data) notFound();
  const { project, client } = data;
  const s = projectSummary(data);
  const locs = new Map(data.locations.map((l) => [l.id, l]));
  const mr = project.measurementRequest;

  return (
    <div>
      <Link href="/admin" className="font-mono text-xs text-muted hover:text-ink">← Proyectos</Link>
      <div className="mt-3 grid gap-6 border-b border-line pb-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="font-mono text-xs text-muted">{project.reference} · {project.kind === "particular" ? "Particular" : "Empresa"} · creado {project.createdAt.toLocaleDateString("es-PE")}</p>
          <h1 className="mt-2 text-4xl leading-tight">{project.name}</h1>
        </div>
        <div className="flex flex-wrap items-end gap-4 lg:col-span-5 lg:justify-end">
          <form action={updateProjectStatus} className="flex items-end gap-2">
            <input type="hidden" name="id" value={project.id} />
            <select name="status" defaultValue={project.status} className="border-b border-line bg-transparent py-1.5 text-sm" aria-label="Estado">
              {PROJECT_STATUSES.map((st) => <option key={st} value={st}>{PROJECT_STATUS_LABELS[st]}</option>)}
            </select>
            <button className="border border-line px-3 py-1.5 text-sm hover:border-ink">Cambiar estado</button>
          </form>
          <a href={`/api/proyecto/${project.id}/pdf`} target="_blank" className="border border-line px-3 py-1.5 text-sm hover:border-ink" data-testid="admin-pdf">PDF</a>
          <a href={`/api/proyecto/${project.id}/xlsx`} className="border border-line px-3 py-1.5 text-sm hover:border-ink" data-testid="admin-xlsx">Excel</a>
        </div>
      </div>

      <div className="mt-6 grid gap-6 text-sm md:grid-cols-4">
        <div><p className="font-mono text-[11px] text-muted">Cliente</p><p className="mt-1">{client.company || client.name}</p>{client.ruc && <p className="text-muted">RUC {client.ruc}</p>}</div>
        <div><p className="font-mono text-[11px] text-muted">Contacto</p><p className="mt-1">{client.name}</p><p className="text-muted">{client.phone} · {client.email}</p></div>
        <div><p className="font-mono text-[11px] text-muted">Obra</p><p className="mt-1">{project.address}</p><p className="text-muted">{project.district}</p></div>
        <div>
          <p className="font-mono text-[11px] text-muted">Total con IGV</p>
          <p className="mt-1 font-serif text-3xl leading-none">{formatMoney(s.total)}</p>
          <p className="text-muted">{s.windows} cortinas · {s.pending} pendientes{s.discountPercent ? ` · −${s.discountPercent}%` : ""}</p>
        </div>
      </div>
      {(project.notes || mr) && (
        <div className="mt-6 grid gap-6 border-t border-line pt-4 text-sm md:grid-cols-2">
          {project.notes && <p><span className="font-mono text-[11px] text-muted">Notas del cliente · </span>{project.notes}</p>}
          {mr && <p className="text-blue"><span className="font-mono text-[11px] text-muted">Medición en obra · </span>{mr.approxWindows} ventanas aprox. · {mr.address}, {mr.district}{mr.preferredDate ? ` · ${mr.preferredDate}` : ""}</p>}
        </div>
      )}

      {data.plans.length > 0 && (
        <section className="mt-10">
          <AdminPlanView plans={data.plans} lines={data.lines} comments={data.comments} locations={data.locations} />
        </section>
      )}

      <section className="mt-12">
        <h2 className="border-b border-ink pb-2 text-2xl">Líneas</h2>
        <table className="w-full text-left text-sm">
          <thead className="font-mono text-[11px] text-muted">
            <tr className="border-b border-line">
              <th className="py-2 font-normal">Cód.</th><th className="py-2 font-normal">Ubicación</th><th className="py-2 font-normal">Producto</th><th className="py-2 font-normal">Accionamiento</th>
              <th className="py-2 font-normal">Medidas</th><th className="py-2 text-right font-normal">Cant.</th><th className="py-2 text-right font-normal">Total</th><th className="py-2 pl-4 font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l) => (
              <tr key={l.id} className="border-b border-line">
                <td className="py-2 font-mono text-xs">{l.label}</td>
                <td className="py-2">{l.locationId && locs.get(l.locationId) ? locationName(locs.get(l.locationId)!) : "—"}</td>
                <td className="py-2">{l.config ? `${l.config.modelName} · ${l.config.fabricName}` : "—"}</td>
                <td className="py-2 text-muted">{l.config ? DRIVE_LABELS[l.config.drive] : ""}</td>
                <td className="py-2 font-mono text-xs">{l.width && l.height ? `${formatMeters(l.width)} × ${formatMeters(l.height)}` : "—"}</td>
                <td className="py-2 text-right font-mono text-xs">{l.quantity}</td>
                <td className="py-2 text-right">{l.config && l.unitPrice ? formatMoney(l.unitPrice * l.quantity) : "—"}</td>
                <td className="py-2 pl-4 text-xs" style={{ color: LINE_STATUS_COLORS[l.status as LineStatus] }}>{LINE_STATUS_LABELS[l.status as LineStatus]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.lines.length === 0 && <p className="mt-4 text-sm text-muted">Sin líneas: el cliente pidió medición en obra.</p>}
      </section>
    </div>
  );
}
