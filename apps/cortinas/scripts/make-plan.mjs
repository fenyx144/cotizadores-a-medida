// Genera el plano de demostración (planta del Pabellón A de un colegio) como
// SVG dibujado por código y lo convierte a PNG con sharp. También guarda:
// - un PDF con el mismo plano (para probar la subida de PDF),
// - un JSON con la posición relativa (0-1) de cada ventana, que usa el seed.
// Escala: 50 px = 1 m (metersPerPx = 0.02).
// Uso: node scripts/make-plan.mjs
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

const PX = 50; // píxeles por metro
const W = 4800;
const H = 2600;
const OX = 300; // origen del edificio en px
const OY = 520;
const ROOM = 9; // ancho de aula (m)
const DEPTH = 9; // fondo de aula (m)
const CORR = 3; // pasillo (m)
const STAIR = 6; // núcleo de escalera (m)
const WALL = 0.25 * PX;
const INK = "#22262b";
const THIN = "#6b7178";
const FONT = "Archivo Narrow, DejaVu Sans, sans-serif";
const MONO = "DejaVu Sans Mono, monospace";

const m = (v) => v * PX;
const total = STAIR * 2 + ROOM * 8; // 84 m
const depth = DEPTH * 2 + CORR; // 21 m

const parts = [];
const windows = []; // {room, x, y, w, h} en px
const svg = (s) => parts.push(s);

// Retícula de ejes (A, B, C... en X y 1-4 en Y) en línea fina discontinua.
const axesX = [0, STAIR, ...Array.from({ length: 8 }, (_, i) => STAIR + ROOM * (i + 1)), total];
const uniqueX = [...new Set(axesX)];
uniqueX.forEach((ax, i) => {
  const x = OX + m(ax);
  svg(`<line x1="${x}" y1="${OY - 170}" x2="${x}" y2="${OY + m(depth) + 170}" stroke="${THIN}" stroke-width="1.2" stroke-dasharray="28 8 4 8"/>`);
  svg(`<circle cx="${x}" cy="${OY - 210}" r="30" fill="none" stroke="${INK}" stroke-width="2"/>`);
  svg(`<text x="${x}" y="${OY - 199}" font-family="${FONT}" font-size="30" text-anchor="middle" fill="${INK}">${String.fromCharCode(65 + i)}</text>`);
});
[0, DEPTH, DEPTH + CORR, depth].forEach((ay, i) => {
  const y = OY + m(ay);
  svg(`<line x1="${OX - 170}" y1="${y}" x2="${OX + m(total) + 170}" y2="${y}" stroke="${THIN}" stroke-width="1.2" stroke-dasharray="28 8 4 8"/>`);
  svg(`<circle cx="${OX - 210}" cy="${y}" r="30" fill="none" stroke="${INK}" stroke-width="2"/>`);
  svg(`<text x="${OX - 210}" y="${y + 11}" font-family="${FONT}" font-size="30" text-anchor="middle" fill="${INK}">${i + 1}</text>`);
});

// Muros exteriores (gruesos, rellenos) y tabiques interiores.
const x0 = OX, y0 = OY, x1 = OX + m(total), y1 = OY + m(depth);
svg(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#fbfbf9" stroke="none"/>`);
// Pasillo con un leve tono para diferenciarlo
svg(`<rect x="${x0 + m(STAIR)}" y="${y0 + m(DEPTH)}" width="${m(ROOM * 8)}" height="${m(CORR)}" fill="#f1f0ec"/>`);

const wallRect = (x, y, w, h) => svg(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${INK}"/>`);

// Ventana sobre un muro horizontal: hueco en el muro + doble línea de vidrio.
function windowH(cx, wallY, widthM, room) {
  const w = m(widthM);
  const x = cx - w / 2;
  svg(`<rect x="${x}" y="${wallY}" width="${w}" height="${WALL}" fill="#fbfbf9"/>`);
  svg(`<line x1="${x}" y1="${wallY}" x2="${x}" y2="${wallY + WALL}" stroke="${INK}" stroke-width="2"/>`);
  svg(`<line x1="${x + w}" y1="${wallY}" x2="${x + w}" y2="${wallY + WALL}" stroke="${INK}" stroke-width="2"/>`);
  svg(`<line x1="${x}" y1="${wallY + WALL * 0.38}" x2="${x + w}" y2="${wallY + WALL * 0.38}" stroke="${INK}" stroke-width="1.4"/>`);
  svg(`<line x1="${x}" y1="${wallY + WALL * 0.62}" x2="${x + w}" y2="${wallY + WALL * 0.62}" stroke="${INK}" stroke-width="1.4"/>`);
  windows.push({ room, widthCm: Math.round(widthM * 100), x, y: wallY, w, h: WALL });
}

// Muros exteriores norte y sur (los huecos de ventanas se dibujan encima).
wallRect(x0, y0, x1 - x0, WALL);
wallRect(x0, y1 - WALL, x1 - x0, WALL);
wallRect(x0, y0, WALL, y1 - y0);
wallRect(x1 - WALL, y0, WALL, y1 - y0);
// Muros del pasillo
const corrY0 = y0 + m(DEPTH);
const corrY1 = corrY0 + m(CORR);
wallRect(x0 + m(STAIR), corrY0 - 6, m(ROOM * 8), 12);
wallRect(x0 + m(STAIR), corrY1 - 6, m(ROOM * 8), 12);

// Escaleras en ambos extremos (huella cada 0,28 m)
for (const sx of [x0, x1 - m(STAIR)]) {
  wallRect(sx === x0 ? sx + m(STAIR) - 6 : sx - 6, y0, 12, y1 - y0);
  const fx = sx + m(1.2), fw = m(STAIR - 2.4);
  for (let t = 0; t < 22; t++) {
    const y = y0 + m(3) + t * m(0.28);
    svg(`<line x1="${fx}" y1="${y}" x2="${fx + fw}" y2="${y}" stroke="${THIN}" stroke-width="1.4"/>`);
  }
  svg(`<line x1="${fx + fw / 2}" y1="${y0 + m(3)}" x2="${fx + fw / 2}" y2="${y0 + m(3) + 21 * m(0.28)}" stroke="${INK}" stroke-width="1.5"/>`);
  svg(`<text x="${sx + m(STAIR / 2)}" y="${y1 - m(3.4)}" font-family="${FONT}" font-size="34" text-anchor="middle" fill="${INK}">ESCALERA</text>`);
  svg(`<text x="${sx + m(STAIR / 2)}" y="${y1 - m(2.6)}" font-family="${FONT}" font-size="26" text-anchor="middle" fill="${THIN}">SS.HH. bajo escalera</text>`);
}

// Ambientes: norte = 8 aulas; sur = 6 aulas + 4 ambientes administrativos (4,5 m).
const north = Array.from({ length: 8 }, (_, i) => ({ name: `Aula ${101 + i}`, w: ROOM, win: 3, winW: 1.8 }));
const south = [
  ...Array.from({ length: 6 }, (_, i) => ({ name: `Aula ${109 + i}`, w: ROOM, win: 3, winW: 1.8 })),
  { name: "Dirección", w: 4.5, win: 2, winW: 1.2 },
  { name: "Secretaría", w: 4.5, win: 2, winW: 1.2 },
  { name: "Tópico", w: 4.5, win: 2, winW: 1.2 },
  { name: "Sala de profesores", w: 4.5, win: 2, winW: 1.2 },
];

function drawRow(rooms, side) {
  let cx = x0 + m(STAIR);
  for (const [i, r] of rooms.entries()) {
    const rw = m(r.w);
    const ry0 = side === "N" ? y0 : corrY1;
    const ry1 = side === "N" ? corrY0 : y1;
    if (i > 0) wallRect(cx - 5, ry0, 10, ry1 - ry0);
    // Ventanas repartidas en el muro exterior
    const wallY = side === "N" ? y0 : y1 - WALL;
    for (let k = 0; k < r.win; k++) windowH(cx + (rw * (k + 0.5)) / r.win, wallY, r.winW, r.name);
    // Puerta hacia el pasillo con su arco de giro (0,9 m)
    const door = m(0.9);
    const dx = cx + rw - m(0.4) - door;
    const dy = side === "N" ? corrY0 : corrY1;
    svg(`<rect x="${dx}" y="${dy - 7}" width="${door}" height="14" fill="#fbfbf9"/>`);
    const sweep = side === "N" ? 0 : 1;
    const ey = side === "N" ? dy - door : dy + door;
    svg(`<path d="M ${dx} ${dy} L ${dx} ${ey} A ${door} ${door} 0 0 ${sweep} ${dx + door} ${dy}" fill="none" stroke="${THIN}" stroke-width="1.4"/>`);
    // Rótulo del ambiente + área
    const ty = (ry0 + ry1) / 2;
    const area = (r.w * DEPTH).toFixed(1);
    const small = r.w < 6;
    // En ambientes angostos partimos el nombre en dos líneas.
    const words = r.name.toUpperCase().split(" ");
    const nameLines = small && words.length > 2 ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")] : [r.name.toUpperCase()];
    nameLines.forEach((t, li) =>
      svg(`<text x="${cx + rw / 2}" y="${ty - 6 - (nameLines.length - 1 - li) * 32}" font-family="${FONT}" font-size="${small ? 28 : 40}" text-anchor="middle" fill="${INK}">${t}</text>`),
    );
    svg(`<text x="${cx + rw / 2}" y="${ty + 34}" font-family="${MONO}" font-size="${small ? 20 : 24}" text-anchor="middle" fill="${THIN}">${area} m²${small ? "" : "  NPT +0.15"}</text>`);
    // Carpetas esquemáticas en aulas (filas de rectángulos)
    if (r.w === ROOM) {
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 4; col++) {
          const px = cx + m(1.4) + col * m(1.7);
          const py = (side === "N" ? ry0 + m(1.4) : ry0 + m(5.6)) + row * m(0.9);
          svg(`<rect x="${px}" y="${py}" width="${m(1.2)}" height="${m(0.5)}" fill="none" stroke="#b9bdc2" stroke-width="1.2"/>`);
        }
    }
    cx += rw;
  }
}
drawRow(north, "N");
drawRow(south, "S");
svg(`<text x="${x0 + m(total / 2)}" y="${corrY0 + m(CORR / 2) + 12}" font-family="${FONT}" font-size="34" letter-spacing="6" text-anchor="middle" fill="${THIN}">PASILLO  ·  ANCHO 3.00 m</text>`);

// Cotas generales (línea con remates oblicuos)
function dimH(xa, xb, y, label) {
  svg(`<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="${INK}" stroke-width="1.4"/>`);
  for (const x of [xa, xb]) {
    svg(`<line x1="${x - 9}" y1="${y + 9}" x2="${x + 9}" y2="${y - 9}" stroke="${INK}" stroke-width="2"/>`);
    svg(`<line x1="${x}" y1="${y - 20}" x2="${x}" y2="${y + 20}" stroke="${INK}" stroke-width="1"/>`);
  }
  svg(`<text x="${(xa + xb) / 2}" y="${y - 12}" font-family="${MONO}" font-size="24" text-anchor="middle" fill="${INK}">${label}</text>`);
}
let acc = x0;
for (const w of [STAIR, ...north.map((r) => r.w), STAIR]) {
  dimH(acc, acc + m(w), y0 - 80, w.toFixed(2));
  acc += m(w);
}
dimH(x0, x1, y0 - 280, `${total.toFixed(2)} m`);
acc = x0;
for (const w of [STAIR, ...south.map((r) => r.w), STAIR]) {
  dimH(acc, acc + m(w), y1 + 90, w.toFixed(2));
  acc += m(w);
}

// Losa deportiva y jardinera (contexto del terreno, línea discontinua)
svg(`<rect x="${x0 + m(8)}" y="${y1 + m(5)}" width="${m(32)}" height="${m(12)}" fill="none" stroke="${THIN}" stroke-width="1.6" stroke-dasharray="14 10"/>`);
svg(`<text x="${x0 + m(24)}" y="${y1 + m(11.4)}" font-family="${FONT}" font-size="36" text-anchor="middle" fill="${THIN}">LOSA DEPORTIVA (referencial)</text>`);

// Norte
const nx = W - 380, ny = 300;
svg(`<circle cx="${nx}" cy="${ny}" r="70" fill="none" stroke="${INK}" stroke-width="2"/>`);
svg(`<path d="M ${nx} ${ny - 95} L ${nx + 22} ${ny + 30} L ${nx} ${ny + 10} L ${nx - 22} ${ny + 30} Z" fill="${INK}"/>`);
svg(`<text x="${nx}" y="${ny - 110}" font-family="${FONT}" font-size="36" text-anchor="middle" fill="${INK}">N</text>`);

// Rótulo (cajetín) abajo a la derecha
const bx = W - 1500, by = H - 470, bw = 1300, bh = 330;
svg(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#fbfbf9" stroke="${INK}" stroke-width="2.5"/>`);
svg(`<line x1="${bx}" y1="${by + 120}" x2="${bx + bw}" y2="${by + 120}" stroke="${INK}" stroke-width="1.2"/>`);
svg(`<line x1="${bx + 860}" y1="${by + 120}" x2="${bx + 860}" y2="${by + bh}" stroke="${INK}" stroke-width="1.2"/>`);
svg(`<text x="${bx + 30}" y="${by + 55}" font-family="${FONT}" font-size="44" fill="${INK}">COLEGIO LOS ÁLAMOS (FICTICIO) — PABELLÓN A</text>`);
svg(`<text x="${bx + 30}" y="${by + 100}" font-family="${FONT}" font-size="30" fill="${THIN}">Planta primer piso · Arquitectura · Distribución</text>`);
const rows = [["UBICACIÓN", "Dirección de demostración, Arequipa"], ["ESCALA", "1:100 (impresión A1)"], ["FECHA", "Agosto 2026"]];
rows.forEach(([k, v], i) => {
  svg(`<text x="${bx + 30}" y="${by + 170 + i * 52}" font-family="${MONO}" font-size="22" fill="${THIN}">${k}</text>`);
  svg(`<text x="${bx + 250}" y="${by + 170 + i * 52}" font-family="${FONT}" font-size="30" fill="${INK}">${v}</text>`);
});
svg(`<text x="${bx + 890}" y="${by + 175}" font-family="${MONO}" font-size="22" fill="${THIN}">LÁMINA</text>`);
svg(`<text x="${bx + 890}" y="${by + 270}" font-family="${FONT}" font-size="96" fill="${INK}">A-101</text>`);

// Escala gráfica (0-10 m)
const sx = 300, sy = H - 200;
for (let i = 0; i < 5; i++) svg(`<rect x="${sx + i * m(2)}" y="${sy}" width="${m(2)}" height="16" fill="${i % 2 ? "#fbfbf9" : INK}" stroke="${INK}" stroke-width="1.5"/>`);
[0, 2, 4, 6, 8, 10].forEach((v, i) => svg(`<text x="${sx + i * m(2)}" y="${sy + 52}" font-family="${MONO}" font-size="22" text-anchor="middle" fill="${INK}">${v}</text>`));
svg(`<text x="${sx + m(10) + 30}" y="${sy + 16}" font-family="${MONO}" font-size="22" fill="${INK}">m</text>`);

const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#f6f5f1"/>
<rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="${INK}" stroke-width="3"/>
${parts.join("\n")}
</svg>`;

const out = "assets-src/planos/plano-pabellon-a";
await writeFile(`${out}.svg`, doc);
const png = await sharp(Buffer.from(doc)).png({ compressionLevel: 9, palette: true, colors: 64 }).toBuffer();
await writeFile(`${out}.png`, png);

// PDF: el mismo plano en una página A1 apaisada (para probar la conversión PDF -> imagen).
const pdf = await PDFDocument.create();
const img = await pdf.embedPng(png);
const page = pdf.addPage([2384, 1684]);
const scale = Math.min(2384 / W, 1684 / H);
page.drawImage(img, { x: (2384 - W * scale) / 2, y: (1684 - H * scale) / 2, width: W * scale, height: H * scale });
await writeFile(`${out}.pdf`, await pdf.save());

// Ventanas en coordenadas relativas, con un margen para que el rectángulo sea fácil de tocar.
const pad = 10;
const rel = windows.map((w) => ({
  room: w.room,
  widthCm: w.widthCm,
  x: +((w.x - pad) / W).toFixed(5),
  y: +((w.y - pad * 1.6) / H).toFixed(5),
  w: +((w.w + pad * 2) / W).toFixed(5),
  h: +((w.h + pad * 3.2) / H).toFixed(5),
}));
await writeFile(`${out}.json`, JSON.stringify({ width: W, height: H, metersPerPx: 1 / PX, windows: rel }, null, 1));
console.log(`Plano ${W}×${H}, ${windows.length} ventanas, PNG ${(png.length / 1024).toFixed(0)} KB`);

// Recorte del plano para la portada (sección "Cotice sobre su plano").
await sharp(png).extract({ left: 560, top: 300, width: 2000, height: 1150 }).resize(1400).webp({ quality: 82 }).toFile("public/img/plano-detalle.webp");
