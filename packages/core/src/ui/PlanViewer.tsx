"use client";
/**
 * Visor de planos y fotos con anotaciones (Leaflet en modo CRS.Simple).
 *
 * - CRS.Simple trata la imagen como un plano cartesiano en píxeles: no hay
 *   mapas ni coordenadas geográficas. Así el zoom profundo, el arrastre y el
 *   "ajustar a pantalla" vienen resueltos por Leaflet.
 * - Las anotaciones se guardan en coordenadas relativas (0-1) respecto a la
 *   imagen: si mañana se sube el plano en otra resolución, siguen en su sitio.
 * - Herramientas: mover, punto numerado, rectángulo y calibrar (dos puntos).
 * - Ctrl/Cmd/Shift + clic para seleccionar varias anotaciones.
 * - Minimapa propio (una miniatura con el rectángulo de la vista actual).
 *
 * Importante: Leaflet usa `window`, así que este componente debe cargarse
 * solo en el navegador (next/dynamic con ssr: false) y la app debe importar
 * "leaflet/dist/leaflet.css".
 */
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

export type PlanTool = "pan" | "point" | "rect" | "calibrate";

export interface PlanAnnotation {
  id: number;
  label: string;
  shape: "point" | "rect";
  x: number;
  y: number;
  w?: number | null;
  h?: number | null;
  color: string;
}

export interface NewAnnotation {
  shape: "point" | "rect";
  x: number;
  y: number;
  w?: number;
  h?: number;
}

interface Props {
  imageUrl: string;
  width: number; // px de la imagen
  height: number;
  annotations: PlanAnnotation[];
  selectedIds?: number[];
  focusIds?: number[]; // al cambiar, el visor encuadra estas anotaciones
  tool?: PlanTool;
  onCreate?: (a: NewAnnotation) => void;
  onSelect?: (ids: number[], additive: boolean) => void;
  onCalibrate?: (a: { x: number; y: number }, b: { x: number; y: number }) => void;
  className?: string;
}

const TOOL_CURSOR: Record<PlanTool, string> = { pan: "grab", point: "crosshair", rect: "crosshair", calibrate: "crosshair" };

export function PlanViewer({
  imageUrl,
  width,
  height,
  annotations,
  selectedIds = [],
  focusIds = [],
  tool = "pan",
  onCreate,
  onSelect,
  onCalibrate,
  className = "h-[560px]",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  // Guardamos los callbacks y la herramienta en refs para que los eventos de
  // Leaflet (registrados una sola vez) usen siempre la versión más reciente.
  const handlers = useRef({ onCreate, onSelect, onCalibrate, tool });
  const [view, setView] = useState({ x: 0, y: 0, w: 1, h: 1 }); // vista actual, relativa
  const [zoomPct, setZoomPct] = useState(100);

  useEffect(() => {
    handlers.current = { onCreate, onSelect, onCalibrate, tool };
  });

  // Conversión entre coordenadas relativas (0-1, y hacia abajo) y LatLng de CRS.Simple (y hacia arriba).
  const toLatLng = (x: number, y: number) => L.latLng((1 - y) * height, x * width);
  const toRel = (ll: L.LatLng) => ({
    x: Math.min(1, Math.max(0, ll.lng / width)),
    y: Math.min(1, Math.max(0, 1 - ll.lat / height)),
  });

  // 1) Crear el mapa una vez por imagen.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const bounds = L.latLngBounds([0, 0], [height, width]);
    const map = L.map(el, {
      crs: L.CRS.Simple,
      minZoom: -6,
      maxZoom: 3,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
      attributionControl: false,
      zoomControl: false,
      maxBounds: bounds.pad(0.5),
      boxZoom: false,
      doubleClickZoom: false,
    });
    L.imageOverlay(imageUrl, bounds, { className: "plan-image" }).addTo(map);
    map.fitBounds(bounds, { padding: [16, 16] });
    map.setMinZoom(map.getZoom() - 1);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Minimapa + porcentaje de zoom: se actualizan al moverse.
    const syncView = () => {
      const b = map.getBounds();
      const nw = toRel(b.getNorthWest());
      const se = toRel(b.getSouthEast());
      setView({ x: nw.x, y: nw.y, w: se.x - nw.x, h: se.y - nw.y });
      setZoomPct(Math.round(Math.pow(2, map.getZoom()) * 100));
    };
    map.on("moveend zoomend", syncView);
    syncView();

    // Dibujo: punto con un clic, rectángulo arrastrando, calibración con dos clics.
    let start: L.LatLng | null = null;
    let temp: L.Rectangle | null = null;
    let calib: L.LatLng[] = [];
    let calibLayer: L.Polyline | null = null;

    map.on("mousedown", (e: L.LeafletMouseEvent) => {
      if (handlers.current.tool !== "rect") return;
      start = e.latlng;
      temp = L.rectangle(L.latLngBounds(start, start), { color: "#1F3A5F", weight: 1, dashArray: "4 3", fillOpacity: 0.08 }).addTo(map);
    });
    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      if (start && temp) temp.setBounds(L.latLngBounds(start, e.latlng));
    });
    map.on("mouseup", (e: L.LeafletMouseEvent) => {
      if (!start || !temp) return;
      const a = toRel(start);
      const b = toRel(e.latlng);
      temp.remove();
      temp = null;
      start = null;
      const rect = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
      // Ignoramos rectángulos diminutos (clics accidentales).
      if (rect.w * width < 6 && rect.h * height < 6) return;
      handlers.current.onCreate?.({ shape: "rect", ...rect });
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      const t = handlers.current.tool;
      if (t === "point") handlers.current.onCreate?.({ shape: "point", ...toRel(e.latlng) });
      else if (t === "calibrate") {
        calib.push(e.latlng);
        calibLayer?.remove();
        calibLayer = L.polyline(calib, { color: "#B5532F", weight: 2, dashArray: "6 4" }).addTo(map);
        if (calib.length === 2) {
          handlers.current.onCalibrate?.(toRel(calib[0]), toRel(calib[1]));
          calib = [];
          setTimeout(() => calibLayer?.remove(), 1200);
        }
      } else if (t === "pan" && !(e.originalEvent.ctrlKey || e.originalEvent.metaKey || e.originalEvent.shiftKey)) {
        handlers.current.onSelect?.([], false);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // toLatLng/toRel dependen solo de width/height, ya incluidos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, width, height]);

  // 2) Herramienta activa: el arrastre del mapa solo en modo "mover".
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tool === "rect") map.dragging.disable();
    else map.dragging.enable();
    map.getContainer().style.cursor = TOOL_CURSOR[tool];
  }, [tool]);

  // 3) Dibujar anotaciones cada vez que cambian (son pocas decenas: redibujar es barato).
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const selected = new Set(selectedIds);
    for (const a of annotations) {
      const isSel = selected.has(a.id);
      const select = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        const ev = e.originalEvent;
        handlers.current.onSelect?.([a.id], ev.ctrlKey || ev.metaKey || ev.shiftKey);
      };
      let center = toLatLng(a.x, a.y);
      if (a.shape === "rect" && a.w != null && a.h != null) {
        const rect = L.rectangle(L.latLngBounds(toLatLng(a.x, a.y), toLatLng(a.x + a.w, a.y + a.h)), {
          color: a.color,
          weight: isSel ? 3 : 1.5,
          fillColor: a.color,
          fillOpacity: isSel ? 0.28 : 0.12,
        });
        rect.on("click", select);
        rect.addTo(layer);
        center = toLatLng(a.x + a.w / 2, a.y);
      }
      // Etiqueta numerada (V1, V2...). En rectángulos va sobre el borde superior.
      const icon = L.divIcon({
        className: "",
        iconSize: [0, 0],
        html: `<span data-annotation="${a.label}" style="background:${a.color};${isSel ? "box-shadow:0 0 0 2px #fff,0 0 0 4px " + a.color + ";" : ""}" class="absolute -translate-x-1/2 ${a.shape === "rect" ? "-translate-y-full -mt-0.5" : "-translate-y-1/2"} inline-block whitespace-nowrap rounded-[2px] px-1 py-px font-mono text-[10px] leading-[14px] text-white">${a.label}</span>`,
      });
      const marker = L.marker(center, { icon, keyboard: false, riseOnHover: true });
      marker.on("click", select);
      marker.addTo(layer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, selectedIds, width, height]);

  // 4) Encuadrar anotaciones (clic en la lista lateral o selección múltiple).
  const focusKey = focusIds.join(",");
  useEffect(() => {
    const map = mapRef.current;
    const list = annotations.filter((x) => focusIds.includes(x.id));
    if (!map || !list.length) return;
    const pad = 0.03;
    const b = L.latLngBounds([]);
    for (const a of list) {
      b.extend(toLatLng(a.x - pad, a.y - pad));
      b.extend(toLatLng(a.x + (a.w ?? 0) + pad, a.y + (a.h ?? 0) + pad));
    }
    map.flyToBounds(b, { maxZoom: 0, duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const fit = () => mapRef.current?.fitBounds(L.latLngBounds([0, 0], [height, width]), { padding: [16, 16] });

  // Clic en el minimapa: centrar la vista en ese punto.
  const onMinimap = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mapRef.current?.panTo(toLatLng((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height));
  };
  const miniW = 168;
  const miniH = Math.round((miniW * height) / width);

  return (
    <div className={`relative overflow-hidden border border-line bg-paper-deep ${className}`}>
      <div ref={containerRef} className="absolute inset-0 bg-paper-deep" data-testid="plan-viewer" />
      <div className="absolute right-3 top-3 z-[500] flex border border-line bg-paper text-sm">
        <button type="button" onClick={() => mapRef.current?.zoomIn()} className="w-8 py-1 hover:bg-paper-deep" aria-label="Acercar">+</button>
        <button type="button" onClick={() => mapRef.current?.zoomOut()} className="w-8 border-l border-line py-1 hover:bg-paper-deep" aria-label="Alejar">−</button>
        <button type="button" onClick={fit} className="border-l border-line px-2 py-1 hover:bg-paper-deep">Ajustar</button>
        <span className="border-l border-line px-2 py-1 font-mono text-xs leading-6 text-muted">{zoomPct}%</span>
      </div>
      <div
        className="absolute bottom-3 right-3 z-[500] cursor-pointer border border-line bg-paper"
        style={{ width: miniW, height: miniH }}
        onClick={onMinimap}
        title="Minimapa"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-fill opacity-80" draggable={false} />
        <div
          className="pointer-events-none absolute border border-accent bg-accent/10"
          style={{
            left: `${Math.max(0, view.x) * 100}%`,
            top: `${Math.max(0, view.y) * 100}%`,
            width: `${Math.min(1, view.w) * 100}%`,
            height: `${Math.min(1, view.h) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
