// Script de tratamiento de imágenes.
// Toma las fotos originales (assets-src/) y genera versiones .webp optimizadas
// en public/img/ con un mismo "look" cálido y algo desaturado, para que todas
// las fotos de distintas fuentes se vean como una sola sesión fotográfica.
// Uso: pnpm images
import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve("assets-src");
const OUT = path.resolve("public/img");

await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png)$/i.test(f));

// Recortes opcionales (proporción vertical a conservar: de top a bottom).
const CROPS = { "fachada-demo": { top: 0.2, bottom: 1 } };

for (const file of files) {
  const name = file.replace(/\.(jpe?g|png)$/i, "");
  let img = sharp(path.join(SRC, file)).rotate();
  const crop = CROPS[name];
  if (crop) {
    const { width, height } = await img.metadata();
    const top = Math.round(height * crop.top);
    img = sharp(await img.extract({ left: 0, top, width, height: Math.round(height * crop.bottom) - top }).toBuffer());
  }
  await img
    .resize({ width: 1800, withoutEnlargement: true })
    // Bajamos un poco la saturación y subimos levemente el brillo.
    .modulate({ saturation: 0.8, brightness: 1.02 })
    // Matriz de color: empuja rojos/amarillos (tono lino/terracota) y baja azules.
    .recomb([
      [1.06, 0.02, 0.0],
      [0.01, 1.0, 0.0],
      [0.0, 0.02, 0.9],
    ])
    // Contraste suave (curva lineal): sombras un poco más "lavadas", tipo película.
    .linear(0.92, 12)
    .webp({ quality: 78 })
    .toFile(path.join(OUT, `${name}.webp`));
  console.log("✓", name);
}
