/**
 * Textos e imágenes fijos de la web (marca SunShade).
 * Separarlos de los componentes facilita cambiar el copy sin tocar el diseño.
 */
export const BRAND = {
  name: "SunShade",
  tagline: "Toldos y pérgolas a medida",
  phone: "+51 54 123 456",
  email: "hola@sunshade.example",
  city: "Arequipa",
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
    quote: "Con el sol de Arequipa la terraza era imposible después de las once. Ahora almorzamos fuera casi todos los días.",
    name: "Lucía y Martín",
    place: "Casa en Cayma",
    detail: "Cofre de 4,5 m, lona Lino · S/ 1,250",
  },
  {
    quote: "Ocho mesas más en la terraza que antes no usábamos a mediodía. Se pagó en una temporada.",
    name: "Café El Tambo",
    place: "Yanahuara",
    detail: "Dos retráctiles de 5 m",
  },
  {
    quote: "Vinieron, midieron y en dos semanas estaba puesta. Ni una sorpresa en el precio.",
    name: "Jorge",
    place: "Azotea, Cerro Colorado",
    detail: "Pérgola de 4 × 3 m",
  },
];

/** Cifras modestas y creíbles. */
export const FIGURES = [
  { value: "260", label: "terrazas instaladas desde 2016" },
  { value: "4,8", label: "de media en 94 reseñas" },
  { value: "2 sem.", label: "plazo habitual de montaje" },
];
