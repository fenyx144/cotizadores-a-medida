/**
 * Textos e imágenes fijos de la web (marca SunShade).
 * Separarlos de los componentes facilita cambiar el copy sin tocar el diseño.
 */
export const BRAND = {
  name: "SunShade",
  tagline: "Toldos y pérgolas a medida",
  phone: "+31 20 123 45 67",
  email: "hola@sunshade.example",
  city: "Haarlem",
};

/** Foto ambiente por tipo de modelo. */
export const TYPE_IMAGES: Record<string, string> = {
  retractil: "/img/modelo-retractil.webp",
  cofre: "/img/modelo-cofre.webp",
  vertical: "/img/modelo-vertical.webp",
  pergola: "/img/modelo-pergola.webp",
};

export const TYPE_LABELS: Record<string, string> = {
  retractil: "Retráctil de brazos",
  cofre: "Cofre",
  vertical: "Vertical",
  pergola: "Pérgola",
};

/** Etiqueta de la segunda medida según el tipo. */
export function projectionLabel(type: string) {
  return type === "vertical" ? "Caída" : type === "pergola" ? "Fondo" : "Salida";
}

export const TESTIMONIALS = [
  {
    quote: "Comemos fuera de mayo a septiembre. Con el sensor ni lo pensamos: si sopla, se recoge solo.",
    name: "Marieke y Tom",
    place: "Casa adosada, Haarlem",
    detail: "Cofre de 4,5 m, lona Lino",
  },
  {
    quote: "Doce mesas más en la terraza que antes no podíamos usar a mediodía. Se pagó en un verano.",
    name: "Café De Linde",
    place: "Utrecht",
    detail: "Dos retráctiles de 5 m",
  },
  {
    quote: "Vinieron, midieron y en tres semanas estaba puesta. Ni una sorpresa en la factura.",
    name: "Joris",
    place: "Ático, Amersfoort",
    detail: "Pérgola de 4 × 3 m",
  },
];

/** Cifras modestas y creíbles. */
export const FIGURES = [
  { value: "340", label: "terrazas instaladas desde 2014" },
  { value: "4,8", label: "de media en 126 reseñas" },
  { value: "3 sem.", label: "plazo habitual de montaje" },
];
