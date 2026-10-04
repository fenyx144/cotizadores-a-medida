/** Muestra de lona en SVG: color + textura de tejido (+ rayas si aplica). */
import { shade } from "./AwningPreview";

export function FabricSwatch({ hex, pattern, stripeHex, className }: { hex: string; pattern: string; stripeHex?: string | null; className?: string }) {
  const alt = stripeHex || shade(hex, 0.55);
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="100" height="100" fill={hex} />
      {pattern === "rayas" && [0, 1, 2, 3, 4].map((i) => <rect key={i} x={i * 20 + 10} width="10" height="100" fill={alt} />)}
      {/* Trama: líneas finas horizontales y verticales con poca opacidad */}
      {Array.from({ length: 40 }).map((_, i) => (
        <g key={i} stroke="#000" strokeWidth="0.5">
          <line x1="0" x2="100" y1={i * 2.5} y2={i * 2.5} strokeOpacity="0.035" />
          <line y1="0" y2="100" x1={i * 2.5 + 1.25} x2={i * 2.5 + 1.25} strokeOpacity="0.02" />
        </g>
      ))}
    </svg>
  );
}
