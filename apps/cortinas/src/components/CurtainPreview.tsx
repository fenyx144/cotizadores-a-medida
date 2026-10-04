/**
 * Dibujo técnico de la cortina (SVG): vano de la ventana, tela a la altura
 * elegida y cotas de ancho y alto. Sirve de referencia visual, no de render.
 */
interface Props {
  width: number; // cm
  height: number; // cm
  hex: string;
  type: string; // enrollable | dual | vertical | veneciana
  drop?: number; // 0-1: cuánto baja la tela
  className?: string;
}

export function CurtainPreview({ width, height, hex, type, drop = 0.72, className = "" }: Props) {
  // Encajamos la ventana en una caja de 320×260 manteniendo la proporción.
  const scale = Math.min(250 / width, 200 / height);
  const w = width * scale;
  const h = height * scale;
  const x = (320 - w) / 2 + 10;
  const y = 30;
  const fabricH = h * drop;
  const slats = Math.max(4, Math.round(w / 12)); // lamas verticales
  const m = (cm: number) => `${(cm / 100).toFixed(2).replace(".", ",")}`;

  return (
    <svg viewBox="0 0 340 280" className={className} role="img" aria-label={`Cortina de ${m(width)} × ${m(height)} m`}>
      {/* Vano y vidrio */}
      <rect x={x} y={y} width={w} height={h} fill="#dfe4e8" stroke="#16191d" strokeWidth="1.5" />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#9aa1a8" strokeWidth="1" />
      {/* Tela según el tipo */}
      {type === "vertical" &&
        Array.from({ length: slats }, (_, i) => (
          <rect key={i} x={x + (i * w) / slats + 1} y={y + 4} width={w / slats - 2} height={h - 4} fill={hex} stroke="#16191d" strokeOpacity="0.25" strokeWidth="0.6" />
        ))}
      {type === "veneciana" &&
        Array.from({ length: Math.round(fabricH / 5) }, (_, i) => <rect key={i} x={x + 2} y={y + 6 + i * 5} width={w - 4} height={3} fill={hex} stroke="#16191d" strokeOpacity="0.25" strokeWidth="0.5" />)}
      {(type === "enrollable" || type === "dual") && (
        <>
          <rect x={x + 2} y={y + 6} width={w - 4} height={fabricH} fill={hex} opacity={type === "dual" ? 0.9 : 0.94} />
          {type === "dual" && Array.from({ length: Math.round(fabricH / 10) }, (_, i) => <line key={i} x1={x + 2} x2={x + w - 2} y1={y + 10 + i * 10} y2={y + 10 + i * 10} stroke="#16191d" strokeOpacity="0.12" strokeWidth="3" />)}
          <rect x={x + 2} y={y + 6 + fabricH - 3} width={w - 4} height={4} fill="#16191d" opacity="0.7" />
        </>
      )}
      {/* Tubo / cabezal */}
      {type !== "vertical" && <rect x={x - 4} y={y - 2} width={w + 8} height={9} fill="#f1f0eb" stroke="#16191d" strokeWidth="1" />}
      {type === "vertical" && <rect x={x - 4} y={y - 2} width={w + 8} height={6} fill="#f1f0eb" stroke="#16191d" strokeWidth="1" />}
      {/* Cotas */}
      <g fontFamily="var(--font-plex-mono), monospace" fontSize="10" fill="#5f646b">
        <line x1={x} y1={y + h + 16} x2={x + w} y2={y + h + 16} stroke="#5f646b" strokeWidth="0.8" />
        <line x1={x} y1={y + h + 11} x2={x} y2={y + h + 21} stroke="#5f646b" strokeWidth="0.8" />
        <line x1={x + w} y1={y + h + 11} x2={x + w} y2={y + h + 21} stroke="#5f646b" strokeWidth="0.8" />
        <text x={x + w / 2} y={y + h + 32} textAnchor="middle">{m(width)} m</text>
        <line x1={x - 16} y1={y} x2={x - 16} y2={y + h} stroke="#5f646b" strokeWidth="0.8" />
        <line x1={x - 21} y1={y} x2={x - 11} y2={y} stroke="#5f646b" strokeWidth="0.8" />
        <line x1={x - 21} y1={y + h} x2={x - 11} y2={y + h} stroke="#5f646b" strokeWidth="0.8" />
        <text x={x - 22} y={y + h / 2} textAnchor="end" dominantBaseline="middle">{m(height)}</text>
      </g>
    </svg>
  );
}
