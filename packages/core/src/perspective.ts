/**
 * Matemática de perspectiva (homografía) para "Pruébalo en tu casa".
 *
 * Una homografía es una matriz 3×3 que transforma un rectángulo en cualquier
 * cuadrilátero (como cuando miras una pared en ángulo). Con ella:
 *  - generamos un `matrix3d` de CSS para la vista previa en vivo, y
 *  - deformamos la imagen en un <canvas> para descargar la foto final.
 */
export type Point = { x: number; y: number };
/** Esquinas en orden: arriba-izq, arriba-der, abajo-der, abajo-izq. */
export type Quad = [Point, Point, Point, Point];

/** Resuelve un sistema lineal Ax = b por eliminación gaussiana. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * Homografía que lleva el rectángulo (0,0)-(w,h) al cuadrilátero `dst`.
 * Devuelve [a,b,c,d,e,f,g,h] con: x' = (a·x+b·y+c)/(g·x+h·y+1), y' = (d·x+e·y+f)/(g·x+h·y+1)
 */
export function homography(w: number, h: number, dst: Quad): number[] {
  const src: Point[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  return solve(A, b);
}

/** Aplica la homografía a un punto. */
export function project(H: number[], p: Point): Point {
  const [a, b, c, d, e, f, g, h] = H;
  const den = g * p.x + h * p.y + 1;
  return { x: (a * p.x + b * p.y + c) / den, y: (d * p.x + e * p.y + f) / den };
}

/** Convierte la homografía en un `matrix3d(...)` de CSS (orden column-major). */
export function toCssMatrix3d(H: number[]): string {
  const [a, b, c, d, e, f, g, h] = H;
  const m = [a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1];
  return `matrix3d(${m.map((v) => +v.toFixed(10)).join(",")})`;
}

/**
 * Dibuja `img` deformada sobre el cuadrilátero `dst` en un canvas 2D.
 * El canvas 2D solo hace transformaciones afines, así que dividimos la imagen
 * en una malla de triángulos pequeños y dibujamos cada uno con su propia
 * transformación afín. Con 24×24 celdas el resultado es prácticamente perfecto.
 */
export function drawWarped(ctx: CanvasRenderingContext2D, img: CanvasImageSource, w: number, h: number, dst: Quad, cells = 24) {
  const H = homography(w, h, dst);
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const x0 = (i * w) / cells, x1 = ((i + 1) * w) / cells;
      const y0 = (j * h) / cells, y1 = ((j + 1) * h) / cells;
      const s = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
      const d = s.map((p) => project(H, p));
      drawTriangle(ctx, img, [s[0], s[1], s[2]], [d[0], d[1], d[2]]);
      drawTriangle(ctx, img, [s[0], s[2], s[3]], [d[0], d[2], d[3]]);
    }
  }
}

function drawTriangle(ctx: CanvasRenderingContext2D, img: CanvasImageSource, s: Point[], d: Point[]) {
  // Agrandamos un poco el triángulo destino para que no se vean costuras.
  const cx = (d[0].x + d[1].x + d[2].x) / 3;
  const cy = (d[0].y + d[1].y + d[2].y) / 3;
  const grow = (p: Point) => {
    const dx = p.x - cx, dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * 0.6, y: p.y + (dy / len) * 0.6 };
  };
  const g = d.map(grow);

  // Transformación afín que lleva el triángulo origen (u,v) al destino (x,y),
  // resolviendo el sistema con la regla de Cramer.
  const [u0, u1, u2] = s.map((p) => p.x);
  const [v0, v1, v2] = s.map((p) => p.y);
  const [x0, x1, x2] = d.map((p) => p.x);
  const [y0, y1, y2] = d.map((p) => p.y);
  const delta = u0 * v1 + v0 * u2 + u1 * v2 - v1 * u2 - v0 * u1 - u0 * v2;
  if (delta === 0) return;
  const a = (x0 * v1 + v0 * x2 + x1 * v2 - v1 * x2 - v0 * x1 - x0 * v2) / delta;
  const c = (u0 * x1 + x0 * u2 + u1 * x2 - x1 * u2 - x0 * u1 - u0 * x2) / delta;
  const e = (u0 * v1 * x2 + v0 * x1 * u2 + x0 * u1 * v2 - x0 * v1 * u2 - v0 * u1 * x2 - u0 * x1 * v2) / delta;
  const b = (y0 * v1 + v0 * y2 + y1 * v2 - v1 * y2 - v0 * y1 - y0 * v2) / delta;
  const dd = (u0 * y1 + y0 * u2 + u1 * y2 - y1 * u2 - y0 * u1 - u0 * y2) / delta;
  const f = (u0 * v1 * y2 + v0 * y1 * u2 + y0 * u1 * v2 - y0 * v1 * u2 - v0 * u1 * y2 - u0 * y1 * v2) / delta;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(g[0].x, g[0].y);
  ctx.lineTo(g[1].x, g[1].y);
  ctx.lineTo(g[2].x, g[2].y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, dd, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
