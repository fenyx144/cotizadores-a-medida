-- Datos de ejemplo (solo si aún no hay familias).
INSERT INTO "product_families" ("id","name","description","requires_fabric","requires_frame","requires_drive","min_width","max_width","min_height","max_height","allowed_drives","allowed_frame_ids","sort_order")
SELECT * FROM (VALUES
  (1,'Enrollable estándar','Cortinas enrollables de una tela: screen o blackout.',true,true,true,40,300,40,320,'','',1),
  (2,'Doble roller','Día y noche con franjas alternas.',true,true,true,60,280,60,300,'manual,motor','',2),
  (3,'Enrollable gran formato','Paños grandes, siempre motorizados.',true,true,true,250,500,200,600,'motor,sensor','1,2',3),
  (4,'Vertical','Lamas verticales sobre riel de aluminio (sin color de perfil).',true,false,true,60,500,60,350,'manual,motor','',4),
  (5,'Veneciana','Persianas de lamas horizontales.',true,false,true,40,240,40,260,'manual','',5)
) AS v(id,name,description,rf,rp,rd,minw,maxw,minh,maxh,drives,frames,so)
WHERE NOT EXISTS (SELECT 1 FROM "product_families");
SELECT setval(pg_get_serial_sequence('product_families','id'), (SELECT max(id) FROM product_families));
UPDATE "product_models" SET "family_id" = CASE "slug" WHEN 'roller-screen' THEN 1 WHEN 'roller-blackout' THEN 1 WHEN 'doble-roller' THEN 2 WHEN 'roller-gran-formato' THEN 3 WHEN 'vertical-pvc' THEN 4 WHEN 'persiana-aluminio' THEN 5 END WHERE "family_id" IS NULL;
INSERT INTO "constraint_rules" ("name","kind","family_id","model_id","if_option","then_option","max_width","max_height","message")
SELECT * FROM (VALUES
  ('Arena no va con perfil negro','incompatibilidad',NULL::int,NULL::int,'tela:6','perfil:3',NULL::int,NULL::int,'Tela Arena no disponible con perfil negro RAL 9005.'),
  ('Blackout con cadena: ancho máx. 2,50 m','dimension',NULL,2,'accionamiento:manual',NULL,250,NULL,'Con cadena el blackout llega hasta 2,50 m de ancho; para más, elija motor.'),
  ('Doble roller sin control centralizado','incompatibilidad',2,NULL,'producto:3','accionamiento:sensor',NULL,NULL,'El doble roller no admite control centralizado.'),
  ('Gama estándar: caída máx. 3,00 m','dimension',1,NULL,NULL,NULL,NULL,300,'En la gama estándar la caída máxima es 3,00 m.')
) AS v(name,kind,fam,model,a,b,mw,mh,msg)
WHERE NOT EXISTS (SELECT 1 FROM "constraint_rules");
INSERT INTO "price_rules" ("name","kind","amount","option_ref","active")
SELECT 'Perfil negro RAL 9005 (lacado especial)','fijo',18,'perfil:3',true
WHERE NOT EXISTS (SELECT 1 FROM "price_rules" WHERE "option_ref" = 'perfil:3');
