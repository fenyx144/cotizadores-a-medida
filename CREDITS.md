# Créditos de imágenes

Todas las fotos son de bancos de imágenes gratuitos y se usan bajo su licencia
(uso comercial permitido, sin atribución obligatoria; la incluimos por cortesía).
Los originales están en `apps/toldos/assets-src/` y las versiones web en
`apps/toldos/public/img/`, generadas con `pnpm --filter toldos images`, que aplica
el mismo tratamiento de color a todas (algo menos de saturación, tono cálido,
contraste suave) para que parezcan de una misma sesión.

Los dibujos del configurador, el muestrario y "Pruébalo en tu casa" son SVG
hechos a mano en código (`apps/toldos/src/components/AwningPreview.tsx`).
No se ha usado ninguna imagen generada por IA.

| Archivo | Uso | Fuente | Autor | Licencia |
|---|---|---|---|---|
| hero-terraza | Portada | [Pexels 31624025](https://www.pexels.com/photo/charming-outdoor-cafe-with-greenery-and-tables-31624025/) | ver página | Licencia Pexels |
| modelo-retractil | Modelo Brisa | [Pexels 34968670](https://www.pexels.com/photo/sunny-outdoor-dining-area-with-wooden-furniture-34968670/) | ver página | Licencia Pexels |
| modelo-cofre | Modelo Cobijo | [Unsplash 3EBaa1CoymI](https://unsplash.com/photos/outdoor-cafe-with-striped-awnings-and-tables-3EBaa1CoymI) | ver página | Licencia Unsplash |
| modelo-vertical | Modelo Velo | [Pexels 4258280](https://www.pexels.com/photo/the-back-door-of-a-house-4258280/) | ver página | Licencia Pexels |
| modelo-pergola | Modelo Patio | [Unsplash ACA92yjUKpg](https://unsplash.com/photos/wooden-pergola-with-dining-table-and-chairs-outdoors-ACA92yjUKpg) | Dominik (@pajorstudio) | Licencia Unsplash |
| ambiente-pergola-moderna | Galería, login | [Unsplash 93TYtgVkGOo](https://unsplash.com/photos/modern-patio-with-pergola-fireplace-and-outdoor-kitchen-93TYtgVkGOo) | rosewooddecks.com | Licencia Unsplash |
| ambiente-aix | Galería | [Unsplash GRiwes2NY8E](https://unsplash.com/photos/a-patio-with-a-table-and-chairs-under-an-awning-GRiwes2NY8E) | Niklas (@niklasjesper) | Licencia Unsplash |
| ambiente-deck | Galería | [Pexels 37588542](https://www.pexels.com/photo/modern-patio-with-open-wooden-deck-and-furniture-37588542/) | ver página | Licencia Pexels |
| ambiente-mesa | Galería | [Unsplash 8YFtEzdrE1g](https://unsplash.com/photos/a-wooden-table-sitting-under-a-pergolated-roof-8YFtEzdrE1g) | ver página | Licencia Unsplash |
| fachada-demo | Foto de ejemplo en "Pruébalo en tu casa" (recortada) | [Pexels 6010278](https://www.pexels.com/photo/villa-with-sliding-glass-doors-and-a-balcony-6010278/) | ver página | Licencia Pexels |
| pruebalo-ejemplo | Inicio (composición propia: fachada-demo + toldo SVG) | derivada de Pexels 6010278 | — | Licencia Pexels |
| cafe-toldo | Testimonios | [Pexels 17016358](https://www.pexels.com/photo/table-and-chairs-under-an-awning-of-a-restaurant-17016358/) | ver página | Licencia Pexels |

- Licencia Unsplash: https://unsplash.com/license
- Licencia Pexels: https://www.pexels.com/license/

> Nota: algunas fotos son de terrazas de cafés y no de casas particulares; para una
> web real conviene sustituirlas por fotos de instalaciones propias.


## Cota (apps/cortinas)

Tratamiento común: `scripts/process-images.mjs` (saturación 0,62, matriz fría, contraste
suave) para que todas parezcan de la misma sesión. El plano de demostración
(`assets-src/planos/plano-pabellon-a.*`) está dibujado por código en
`scripts/make-plan.mjs`. Ninguna imagen es generada por IA.

| Archivo | Uso | Fuente | Autor | Licencia |
|---|---|---|---|---|
| hero-aula-magna | Portada, Roller gran formato | [Unsplash I8PUo5Xk8DU](https://unsplash.com/photos/empty-lecture-hall-with-rows-of-seats-I8PUo5Xk8DU) | Zsófia Hajnal (@zsofiahajnal) | Licencia Unsplash |
| sector-educacion | Sector educación, Roller Blackout | [Pexels 36244514](https://www.pexels.com/photo/36244514/) | Merve Nur Kirazlı | Licencia Pexels |
| sector-oficinas | Sector oficinas, caso de estudio | [Pexels 28715052](https://www.pexels.com/photo/28715052/) | Eric WANG | Licencia Pexels |
| sector-salud | Sector salud, Vertical PVC | [Pexels 14267573](https://www.pexels.com/photo/14267573/) | Viktorya Sergeeva | Licencia Pexels |
| producto-roller | Roller Screen 5% | [Pexels 7046155](https://www.pexels.com/photo/7046155/) | Max Vakhtbovych | Licencia Pexels |
| producto-veneciana | Persiana de aluminio | [Pexels 19304047](https://www.pexels.com/photo/19304047/) | Minh Phuc | Licencia Pexels |
| producto-blackout | Galería persiana | [Pexels 24428640](https://www.pexels.com/photo/24428640/) | Jaykumar Bherwani | Licencia Pexels |
| producto-detalle | Doble roller, galería | [Pexels 8955198](https://www.pexels.com/photo/8955198/) | Liviu Gorincioi | Licencia Pexels |
| producto-vertical | Galería vertical (sala de reuniones) | [Pexels 5511091](https://www.pexels.com/photo/5511091/) | Mike van Schoonderwalt | Licencia Pexels |
| proyecto-colegio | Caso colegio, galería | [Pexels 30281236](https://www.pexels.com/photo/30281236/) | Oliver Hung | Licencia Pexels |
| proyecto-universidad | Caso universidad | [Pexels 33892136](https://www.pexels.com/photo/33892136/) | ver página | Licencia Pexels |
| proyecto-instituto | Caso instituto, login admin | [Pexels 37420211](https://www.pexels.com/photo/37420211/) | ver página | Licencia Pexels |

> Nota: no se encontró una foto libre clara de cortinas verticales; el producto usa una
> foto de consultorio y el dibujo SVG. Las fotos de aulas y oficinas no muestran
> instalaciones de la marca (es ficticia).
