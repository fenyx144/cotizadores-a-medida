/**
 * Dibujo SVG del toldo que cambia en vivo con la configuración.
 *
 * Todo se calcula con geometría sencilla:
 *  - El ancho (cm) se convierte en píxeles con una escala fija.
 *  - La salida hace que el borde delantero baje y se ensanche un poco,
 *    simulando la perspectiva de alguien que mira desde la terraza.
 * Hay dos modos:
 *  - "scene": con pared, puerta, sombras y cotas (configurador).
 *  - "overlay": solo el toldo, recortado, para "Pruébalo en tu casa".
 */
import type { Drive } from "@portafolio/core/pricing";

export interface AwningFabric {
  hex: string;
  pattern: string; // "liso" | "rayas"
  stripeHex?: string | null;
}

export interface AwningPreviewProps {
  type: string; // retractil | cofre | vertical | pergola
  width: number; // cm
  projection: number; // cm
  fabric: AwningFabric;
  frameHex: string;
  drive: Drive;
  mode?: "scene" | "overlay";
  showDims?: boolean;
  className?: string;
  title?: string;
}

const S = 0.9; // píxeles por centímetro
const CX = 400; // centro horizontal de la escena
const GROUND = 440; // línea del suelo

/** Oscurece (amount < 0) o aclara (amount > 0) un color hex. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.round(Math.min(255, Math.max(0, v)));
  });
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fmt = (cm: number) => `${(cm / 100).toFixed(2).replace(".", ",")} m`;

/** Geometría básica compartida por la escena y el modo overlay. */
export function awningGeometry(type: string, width: number, projection: number) {
  const half = (width * S) / 2;
  if (type === "vertical") {
    const top = 150;
    const bottom = Math.min(GROUND - 10, top + 18 + projection * S * 0.9);
    return { kind: "vertical" as const, backL: CX - half, backR: CX + half, backY: top, frontL: CX - half, frontR: CX + half, frontY: bottom, bbox: { x: CX - half - 8, y: top - 6, w: half * 2 + 16, h: bottom - top + 16 } };
  }
  if (type === "pergola") {
    const backY = 120;
    const k = 1 + projection / 1400;
    const frontY = backY + projection * S * 0.16;
    const frontL = CX - half * k, frontR = CX + half * k;
    return { kind: "pergola" as const, backL: CX - half, backR: CX + half, backY, frontL, frontR, frontY, bbox: { x: frontL - 10, y: backY - 12, w: frontR - frontL + 20, h: GROUND + 20 - backY + 12 } };
  }
  const backY = 150;
  const k = 1 + projection / 1600;
  const frontY = backY + projection * S * 0.42;
  const frontL = CX - half * k, frontR = CX + half * k;
  return { kind: "arm" as const, backL: CX - half, backR: CX + half, backY, frontL, frontR, frontY, bbox: { x: frontL - 10, y: backY - 32, w: frontR - frontL + 20, h: frontY + 34 - (backY - 32) } };
}

/** Proporción ancho/alto del toldo recortado (para el overlay). */
export function overlayAspect(type: string, width: number, projection: number) {
  const { bbox } = awningGeometry(type, width, projection);
  return bbox.w / bbox.h;
}

export function AwningPreview({ type, width, projection, fabric, frameHex, drive, mode = "scene", showDims = true, className, title }: AwningPreviewProps) {
  const g = awningGeometry(type, width, projection);
  const scene = mode === "scene";
  const viewBox = scene ? "0 0 800 500" : `${g.bbox.x} ${g.bbox.y} ${g.bbox.w} ${g.bbox.h}`;
  const main = fabric.hex;
  const alt = fabric.stripeHex || shade(fabric.hex, 0.55);
  const striped = fabric.pattern === "rayas";
  const frameDark = shade(frameHex, -0.25);
  const line = "#1F1D1A";

  /** Rellena un cuadrilátero (atrás→delante) con tela lisa o a rayas. */
  function fabricQuad(bl: number, br: number, by: number, fl: number, fr: number, fy: number, darken = 0) {
    const stripes = striped ? Math.max(6, Math.round(width / 28)) : 1;
    const polys = [];
    for (let i = 0; i < stripes; i++) {
      const t0 = i / stripes, t1 = (i + 1) / stripes;
      const pts = [
        [lerp(bl, br, t0), by],
        [lerp(bl, br, t1), by],
        [lerp(fl, fr, t1), fy],
        [lerp(fl, fr, t0), fy],
      ];
      const color = striped && i % 2 === 1 ? alt : main;
      polys.push(<polygon key={i} points={pts.map((p) => p.join(",")).join(" ")} fill={darken ? shade(color, darken) : color} />);
    }
    return polys;
  }

  return (
    <svg viewBox={viewBox} preserveAspectRatio={scene ? "xMidYMid meet" : "none"} className={className} role="img" aria-label={title ?? "Vista previa del toldo"} xmlns="http://www.w3.org/2000/svg">
      {scene && (
        <g>
          {/* Pared, suelo y carpintería */}
          <rect x="0" y="0" width="800" height="500" fill="#F4EFE6" />
          <rect x="40" y="30" width="720" height={GROUND - 30} fill="#EAE2D3" />
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={i} x1="40" x2="760" y1={60 + i * 30} y2={60 + i * 30} stroke="#DED4C2" strokeWidth="0.6" />
          ))}
          <rect x="0" y={GROUND} width="800" height={500 - GROUND} fill="#E3D9C8" />
          <line x1="0" x2="800" y1={GROUND} y2={GROUND} stroke={line} strokeWidth="1" />
          {/* Puerta corredera */}
          <rect x="255" y="250" width="200" height={GROUND - 250} fill="#C9CFC9" stroke={line} strokeWidth="1.2" />
          <line x1="355" x2="355" y1="250" y2={GROUND} stroke={line} strokeWidth="1.2" />
          <line x1="270" x2="320" y1="265" y2="315" stroke="#fff" strokeWidth="1" opacity="0.6" />
          {/* Ventana */}
          <rect x="530" y="245" width="130" height="95" fill="#C9CFC9" stroke={line} strokeWidth="1.2" />
          <line x1="595" x2="595" y1="245" y2="340" stroke={line} strokeWidth="1" />
          {/* Maceta con planta */}
          <path d="M150 440 L158 400 L192 400 L200 440 Z" fill="#B4552F" />
          <path d="M175 400 C160 360 140 350 132 330 M175 400 C178 350 190 330 200 310 M175 400 C190 370 214 362 222 350" stroke="#5E6236" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}

      {/* Sombra proyectada en pared y suelo (sensación de "sombra real") */}
      {scene && g.kind === "arm" && (
        <g fill={line}>
          <polygon opacity="0.045" points={`${g.backL},${g.backY} ${g.backR},${g.backY} ${g.backR + 20},${Math.min(GROUND, g.frontY + projection * 0.35)} ${g.backL - 20},${Math.min(GROUND, g.frontY + projection * 0.35)}`} />
          <polygon opacity="0.12" points={`${g.frontL + 30},${GROUND + 6} ${g.frontR - 30},${GROUND + 6} ${g.frontR + 10},${GROUND + 6 + Math.min(52, projection * 0.14)} ${g.frontL - 10},${GROUND + 6 + Math.min(52, projection * 0.14)}`} />
        </g>
      )}
      {scene && g.kind === "pergola" && (
        <polygon fill={line} opacity="0.12" points={`${g.backL},${GROUND} ${g.backR},${GROUND} ${g.frontR + 10},${GROUND + 50} ${g.frontL - 10},${GROUND + 50}`} />
      )}

      {/* ---------- Toldo de brazos (retráctil o cofre) ---------- */}
      {g.kind === "arm" && (
        <g>
          {fabricQuad(g.backL, g.backR, g.backY, g.frontL, g.frontR, g.frontY)}
          {/* Faldón delantero (más oscuro: está en sombra) */}
          {fabricQuad(g.frontL, g.frontR, g.frontY, g.frontL, g.frontR, g.frontY + 24, -0.12)}
          <line x1={g.frontL} x2={g.frontR} y1={g.frontY + 24} y2={g.frontY + 24} stroke={shade(main, -0.35)} strokeWidth="1" />
          {/* Brazos articulados con codo */}
          {[0.12, 0.88].map((t) => {
            const wx = lerp(g.backL, g.backR, t);
            const fx = lerp(g.frontL, g.frontR, t < 0.5 ? 0.04 : 0.96);
            const ex = lerp(wx, fx, 0.55) + (t < 0.5 ? 26 : -26);
            const ey = lerp(g.backY + 40, g.frontY, 0.5) + 10;
            return (
              <g key={t} stroke={frameHex} strokeWidth="4" strokeLinecap="round" fill="none">
                <polyline points={`${wx},${g.backY + 40} ${ex},${ey} ${fx},${g.frontY}`} />
                <circle cx={ex} cy={ey} r="3.5" fill={frameDark} stroke="none" />
              </g>
            );
          })}
          {/* Barra de carga delantera */}
          <rect x={g.frontL - 4} y={g.frontY - 5} width={g.frontR - g.frontL + 8} height="8" rx="2" fill={frameHex} stroke={frameDark} strokeWidth="0.8" />
          {/* Cofre o barra de soporte */}
          {type === "cofre" ? (
            <g>
              <rect x={g.backL - 8} y={g.backY - 28} width={g.backR - g.backL + 16} height="30" rx="8" fill={frameHex} stroke={frameDark} strokeWidth="1" />
              <line x1={g.backL} x2={g.backR} y1={g.backY - 20} y2={g.backY - 20} stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />
            </g>
          ) : (
            <g>
              <rect x={g.backL - 4} y={g.backY - 12} width={g.backR - g.backL + 8} height="12" rx="2" fill={shade(main, -0.1)} stroke={frameDark} strokeWidth="0.8" />
              {[0.05, 0.5, 0.95].map((t) => (
                <rect key={t} x={lerp(g.backL, g.backR, t) - 6} y={g.backY - 18} width="12" height="24" fill={frameHex} stroke={frameDark} strokeWidth="0.8" />
              ))}
            </g>
          )}
        </g>
      )}

      {/* ---------- Toldo vertical ---------- */}
      {g.kind === "vertical" && (
        <g>
          {[g.backL + 4, g.backR - 4].map((x) => (
            <line key={x} x1={x} x2={x} y1={g.backY} y2={scene ? GROUND : g.frontY} stroke={frameDark} strokeWidth="1.2" />
          ))}
          <g opacity="0.9">{fabricQuad(g.backL + 6, g.backR - 6, g.backY + 18, g.frontL + 6, g.frontR - 6, g.frontY)}</g>
          {/* Textura de tejido "screen" */}
          {Array.from({ length: Math.floor((g.frontY - g.backY) / 6) }).map((_, i) => (
            <line key={i} x1={g.backL + 6} x2={g.backR - 6} y1={g.backY + 22 + i * 6} y2={g.backY + 22 + i * 6} stroke="#000" strokeOpacity="0.05" strokeWidth="1" />
          ))}
          <rect x={g.backL - 4} y={g.backY} width={g.backR - g.backL + 8} height="20" rx="4" fill={frameHex} stroke={frameDark} />
          <rect x={g.frontL + 2} y={g.frontY - 3} width={g.frontR - g.frontL - 4} height="7" rx="2" fill={frameHex} stroke={frameDark} />
        </g>
      )}

      {/* ---------- Pérgola ---------- */}
      {g.kind === "pergola" && (
        <g>
          {/* Lona del techo con lamas */}
          {fabricQuad(g.backL, g.backR, g.backY, g.frontL, g.frontR, g.frontY)}
          {Array.from({ length: 9 }).map((_, i) => {
            const t = (i + 1) / 10;
            return <line key={i} x1={lerp(g.backL, g.frontL, t)} x2={lerp(g.backR, g.frontR, t)} y1={lerp(g.backY, g.frontY, t)} y2={lerp(g.backY, g.frontY, t)} stroke={shade(main, -0.22)} strokeWidth="1.4" />;
          })}
          <rect x={g.backL - 6} y={g.backY - 10} width={g.backR - g.backL + 12} height="12" fill={frameHex} stroke={frameDark} />
          {/* Postes delanteros y viga */}
          {[g.frontL, g.frontR - 14].map((x) => (
            <rect key={x} x={x} y={g.frontY} width="14" height={GROUND + 20 - g.frontY} fill={frameHex} stroke={frameDark} />
          ))}
          <rect x={g.frontL - 4} y={g.frontY - 6} width={g.frontR - g.frontL + 8} height="22" fill={frameHex} stroke={frameDark} />
        </g>
      )}

      {/* ---------- Accionamiento ---------- */}
      {scene && drive === "manual" && g.kind !== "pergola" && (
        <g stroke={frameDark} strokeWidth="2.5" strokeLinecap="round">
          <line x1={g.backR - 18} y1={g.backY + 6} x2={g.backR - 30} y2={g.backY + 160} />
          <line x1={g.backR - 30} y1={g.backY + 160} x2={g.backR - 22} y2={g.backY + 172} />
        </g>
      )}
      {scene && drive !== "manual" && (
        <g>
          {/* Motor en el extremo y cable hasta el interruptor */}
          <rect x={g.backL + 2} y={g.backY - (g.kind === "pergola" ? 8 : 10)} width="20" height="8" rx="3" fill={line} opacity="0.8" />
          <path d={`M${g.backL + 6} ${g.backY} L${g.backL + 6} 300 L${g.backL - 14} 300`} stroke={line} strokeOpacity="0.45" strokeWidth="1" fill="none" />
          <rect x={g.backL - 24} y="292" width="12" height="16" rx="2" fill="#F4EFE6" stroke={line} strokeWidth="0.8" />
        </g>
      )}
      {scene && drive === "sensor" && (
        <g transform={`translate(${Math.min(720, g.backR + 40)} 70)`}>
          <circle r="9" fill="#F4EFE6" stroke={line} strokeWidth="1" />
          <circle r="3.5" fill="#B4552F" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" x2="17" y1="0" y2="0" transform={`rotate(${a})`} stroke={line} strokeWidth="1" opacity="0.6" />
          ))}
          <text x="24" y="4" fontSize="11" fill={line} opacity="0.7" fontFamily="var(--font-sans), sans-serif">sensor</text>
        </g>
      )}

      {/* ---------- Cotas ---------- */}
      {scene && showDims && (
        <g fontFamily="var(--font-serif), serif" fontSize="15" fill={line} stroke={line}>
          <line x1={g.backL} x2={g.backR} y1="48" y2="48" strokeWidth="0.8" />
          <line x1={g.backL} x2={g.backL} y1="42" y2="54" strokeWidth="0.8" />
          <line x1={g.backR} x2={g.backR} y1="42" y2="54" strokeWidth="0.8" />
          <rect x={CX - 34} y="38" width="68" height="20" fill="#EAE2D3" stroke="none" />
          <text x={CX} y="53" textAnchor="middle" stroke="none" fontStyle="italic">{fmt(width)}</text>
          <text x={Math.min(780, Math.max(g.backR, g.frontR) + 14)} y={(g.backY + g.frontY) / 2 + 5} stroke="none" fontStyle="italic" textAnchor={g.frontR > 700 ? "end" : "start"}>
            {g.kind === "vertical" ? "caída " : "salida "}
            {fmt(projection)}
          </text>
        </g>
      )}
    </svg>
  );
}
