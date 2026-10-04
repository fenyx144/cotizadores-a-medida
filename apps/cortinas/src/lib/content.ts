/**
 * Textos y datos fijos de la marca (ficticia) Cota.
 * Todo lo editable por el negocio (productos, telas, precios) vive en la base de datos.
 */
import type { Drive } from "@portafolio/core/pricing";

export const BRAND = {
  name: "Cota",
  line: "Cortinas y persianas para espacios que trabajan",
  city: "Arequipa",
  phone: "+51 54 281 440",
  email: "proyectos@cota.pe",
  address: "Av. Ejército 710, Yanahuara, Arequipa",
};

export const TYPE_LABELS: Record<string, string> = {
  enrollable: "Enrollable",
  dual: "Día y noche",
  vertical: "Vertical",
  veneciana: "Veneciana",
};

export const MATERIAL_LABELS: Record<string, string> = {
  screen: "Screen",
  blackout: "Blackout",
  mixto: "Screen + blackout",
  pvc: "PVC",
  aluminio: "Aluminio",
};

export const USE_LABELS: Record<string, string> = {
  educacion: "Educación",
  oficinas: "Oficinas",
  salud: "Salud",
};

/** Etiquetas de accionamiento propias de cortinas (el core usa manual/motor/sensor). */
export const DRIVE_LABELS: Record<Drive, string> = {
  manual: "Cadena",
  motor: "Motor con mando",
  sensor: "Motor + control centralizado",
};

export const SECTORS = [
  {
    key: "educacion",
    title: "Educación",
    text: "Aulas que se pueden oscurecer para proyectar sin perder ventilación. Cadenas con tope de seguridad.",
    image: "/img/sector-educacion.webp",
  },
  {
    key: "oficinas",
    title: "Oficinas",
    text: "Screen que corta el reflejo en pantallas y mantiene la vista. Motorización por zonas.",
    image: "/img/sector-oficinas.webp",
  },
  {
    key: "salud",
    title: "Salud",
    text: "Telas lavables y verticales de PVC para consultorios, tópicos y salas de espera.",
    image: "/img/sector-salud.webp",
  },
];

/** Casos de estudio (ficticios, con números modestos). */
export const CASE_STUDIES = [
  {
    slug: "colegio-san-lazaro",
    name: "Colegio particular San Lázaro",
    place: "Cercado, Arequipa",
    sector: "Educación",
    size: "Pequeño",
    windows: 22,
    rooms: "6 aulas, dirección y sala de profesores",
    product: "Roller Screen 5% con cadena",
    weeks: 2,
    image: "/img/proyecto-colegio.webp",
    text: "Cambiamos cortinas de tela por screen en un pabellón de dos pisos. Se instaló en dos sábados, sin interrumpir clases.",
  },
  {
    slug: "instituto-misti",
    name: "Instituto tecnológico Misti",
    place: "Cayma, Arequipa",
    sector: "Educación",
    size: "Mediano",
    windows: 54,
    rooms: "12 aulas, 2 laboratorios y biblioteca",
    product: "Blackout en laboratorios, screen en aulas",
    weeks: 4,
    image: "/img/proyecto-instituto.webp",
    text: "El cliente subió el plano del pabellón y marcó cada ventana. Medimos en obra solo las que tenían dudas.",
  },
  {
    slug: "universidad-sede-norte",
    name: "Universidad privada, sede norte",
    place: "Cerro Colorado, Arequipa",
    sector: "Educación",
    size: "Grande",
    windows: 118,
    rooms: "Dos pabellones, auditorio y oficinas",
    product: "Roller gran formato motorizado y screen",
    weeks: 7,
    image: "/img/proyecto-universidad.webp",
    text: "Auditorio con motores agrupados por fachada y aulas con cadena. Entregas por piso para no cerrar el campus.",
  },
  {
    slug: "oficinas-umacollo",
    name: "Oficinas de un estudio contable",
    place: "Yanahuara, Arequipa",
    sector: "Oficinas",
    size: "Pequeño",
    windows: 16,
    rooms: "Planta libre y dos salas de reunión",
    product: "Doble roller día y noche",
    weeks: 1,
    image: "/img/sector-oficinas.webp",
    text: "Screen para trabajar con luz natural y blackout para las presentaciones de los viernes.",
  },
];

export const DISTRICTS = [
  "Arequipa (Cercado)",
  "Yanahuara",
  "Cayma",
  "Cerro Colorado",
  "José Luis Bustamante y Rivero",
  "Sachaca",
  "Paucarpata",
  "Mariano Melgar",
  "Miraflores",
  "Socabaya",
];
