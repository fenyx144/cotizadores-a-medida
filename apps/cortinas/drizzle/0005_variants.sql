CREATE TABLE IF NOT EXISTS product_variants (
  id serial PRIMARY KEY,
  model_id integer NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  fabric_id integer,
  frame_color_id integer,
  attributes text NOT NULL DEFAULT '',
  price_adjustment integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);
INSERT INTO product_variants (model_id, code, name, fabric_id, frame_color_id, attributes, price_adjustment, sort_order)
SELECT * FROM (VALUES
  (1, 'RS5-0101', 'Blanco gris · perfil blanco', 1, 1, '', 0, 1),
  (1, 'RS5-0402', 'Gris perla · perfil aluminio', 2, 2, '', 0, 2),
  (1, 'RS3-0903', 'Carbón · perfil negro mate', 4, 3, 'Apertura 3 %', 30, 3),
  (2, 'RBK-0101', 'Blanco · perfil blanco', 5, 1, '', 0, 1),
  (2, 'RBK-0703', 'Gris piedra · perfil negro mate', 7, 3, '', 30, 2),
  (4, 'VPVC-01', 'Perla', 8, NULL, 'Lama 89 mm', 0, 1),
  (4, 'VPVC-02', 'Gris niebla', 9, NULL, 'Lama 89 mm', 0, 2),
  (6, 'PAL-01', 'Plata', 10, NULL, 'Lama 25 mm', 0, 1),
  (6, 'PAL-05', 'Grafito', 12, NULL, 'Lama 25 mm', 20, 2)
) v(model_id, code, name, fabric_id, frame_color_id, attributes, price_adjustment, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM product_variants);
