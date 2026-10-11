
Esta **API** tiene la finalidad de obtener en diferentes tiendas online de videojuego el nombre, precio, imagen, descuento y url para devolver en formato json, cuenta con las plataformas de [steam](https://store.steampowered.com/?l=spanish), [instant gaming](https://www.instant-gaming.com/) y [gog galaxy](https://gog.com/).

## Tabla de contenidos

- [Visión general](#visión-general)
  - [Enlaces](#enlaces)
  -  [Rutas](#rutas)
- [Tecnologías usadas](#tecnologías-usadas)
- [Autor](#autor)

## Visión general
Todas las rutas devuelven un json para consumir con la siguiente estructura:
```
[
	{
		name : "nombre del videojuego",
		imgUrl: "ruta de la imagen",
		price: [
		{
			now: "Precio actual",
			old: "Precio anterior"
		},
		discount: "Porcentaje de descuento",
		url: "Url del sitio web"
		]
	}
]
imgUrl y discount en caso de no encontrar un valor devuelve null
price en caso de no haber descuento solo devuelve el parametro now
```

### Enlaces
- Solución URL: [GitHub](https://github.com/MarcosRubi/API-gaming-scraping)
- Sitio Web URL: [Vercel](http://api-gaming-scraping.vercel.app/)

### Rutas
#### De búsqueda
- **/steam/nombreJuego**
Espera un segundo parámetro con el nombre del videojuego para buscar en steam, devuelve hasta un máximo de 5 resultados.
- **/instant-gaming/nombreJuego**
Espera un segundo parámetro con el nombre del videojuego para buscar en instant gaming, devuelve hasta un máximo de 5 resultados.
- **/gog/nombreJuego**
Espera un segundo parámetro con el nombre del videojuego para buscar en gog, devuelve hasta un máximo de 5 resultados.

***Este límite puede ser modificado***

#### Steam
- **/top-sellers-steam**
Obtiene hasta un máximo de 30 videojuegos de la sección de más vendidos en steam.
- **/top-offers-steam**
Obtiene hasta un máximo de 30 videojuegos de la sección de mejores ofertas en steam.
- **/new-releases-steam**
Obtiene hasta un máximo de 30 videojuegos de la sección de nuevos lanzamientos en steam.

#### Instant gaming
- **/top-sellers-instant-gaming**
Obtiene hasta un máximo de 30 videojuegos de la sección de más vendidos en instant gaming.
- **/top-offers-instant-gaming**
Obtiene hasta un máximo de 30 videojuegos de la sección de mejores ofertas en instant gaming.
- **/top-indie-games-instant-gaming**
Obtiene hasta un máximo de 30 videojuegos de la sección juegos indie de instant gaming.

#### Gog galaxy
- **/top-sellers-gog**
Obtiene hasta un máximo de 30 videojuegos de la sección de más vendidos en gog.
- **/new-releases-gog**
Obtiene hasta un máximo de 30 videojuegos de la sección de nuevos lanzamientos de gog.
- **/top-old-games-gog**
Obtiene hasta un máximo de 30 videojuegos de la sección juegos clásicos de gog.

***Este límite puede ser modificado***

## Tecnologías usadas
- [Express.js](https://pptr.dev/) 
- [Puppeteer](https://pptr.dev/) 
- [Jsdom](https://www.npmjs.com/package/jsdom) 

## Autor
- Sitio web - [Marcos Rubí](https://mrubi.vercel.app/)