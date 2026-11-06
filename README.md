# Ciudad de los muertos

Recorrido inmersivo por ocho tumbas del Panteón de Santiago de Saltillo, Coahuila.
Una entrega de [Historias de Saltillo](https://vanguardia.com.mx/historias-de-saltillo) de VANGUARDIA MX.

- Fotografía: Homero Sánchez
- Investigación y manejo de archivos: [Carlos Mirón](https://vanguardia.com.mx/autor/-/meta/carlos-m-m-)
- Lecturas: Carlos Recio Dávila (historiador), Arturo Villarreal y Griselda Salas (arquitectos)
- Dirección creativa y vibe coding: [César Gaytán](https://vanguardia.com.mx/autor/-/meta/cesar-gaytan)
- Una entrega de [Historias de Saltillo](https://vanguardia.com.mx/historias-de-saltillo) · VANGUARDIA MX
- Una experiencia de VANGUARDIA IA HUB

## Por qué es abierto

El periodismo y las humanidades digitales ganan cuando el método es visible. Compartimos
el código para que una redacción local, un archivo, una universidad o un colectivo puedan
contar su propio panteón, barrio o colección con la misma estructura: de lo general al detalle,
con lecturas expertas y relaciones entre piezas.

## Cómo abrirlo

No necesita instalación ni servidor de aplicaciones. Sube la carpeta a cualquier hosting
estático (GitHub Pages, Netlify, el servidor del medio) y abre `index.html`.
Para probarlo en tu computadora: `python3 -m http.server` dentro de la carpeta y visita
`http://localhost:8000`.

## Estructura

```
index.html   estructura de las cuatro vistas: portada, plano, tumba y código
estilos.css  diseño visual y adaptación a móvil
datos.js     todo el contenido editorial (window.CDM)
app.js       navegación, plano generativo, lente en primera persona, hilos y glosario
sonido.js    paisaje sonoro sintetizado con Web Audio (sin archivos de audio)
img/         fachada y retratos de quienes hicieron las lecturas
fotos/       tumba1_PG.jpg … tumba8_D3.jpg
```

## Replicarlo con otro lugar

1. **Elige el lugar y el corte.** Ocho conjuntos fue nuestra medida; el código acepta cualquier número.
2. **Fotografía de lo general a lo particular.** Cinco vistas por conjunto: `PG` plano general,
   `PP` primer plano, `D1`, `D2`, `D3` detalles. Nómbralas `tumbaN_PG.jpg`, `tumbaN_PP.jpg`…
   y colócalas en `fotos/`. Si una foto falta, la experiencia dibuja una silueta provisional.
3. **Escribe un pie por foto** (`fotos[].pie` en `datos.js`) que diga qué mirar.
4. **Agrega las lecturas** de tus especialistas en `voces` y en cada `tumbas[].lecturas`.
5. **Etiqueta los hilos** (`tumbas[].hilos`) usando nombres de `categorias`. El plano conecta
   automáticamente las piezas que comparten un hilo.
6. **Ajusta el plano**: `tumbas[].plano` son coordenadas en un lienzo de 1000 × 640.

### Esquema de una tumba en datos.js

```js
{
  id: 1,
  nombre: "Sepulcro de la familia Purcell",
  corto: "Purcell",                  // rótulo en el plano
  sub: "Guillermo Purcell y familia",
  silueta: "templete",               // forma provisional: templete, capilla, aguja, mausoleo,
                                     // baldaquino, parabola, cupula, ancla
  plano: [246, 292],                 // posición en el plano
  tono: 0,                           // semitonos del dron sonoro
  relato: "…",                       // descripción general
  ficha: [["Ubicación", "…"], …],    // pares etiqueta / valor
  lecturas: { recio: "…", villarreal: "…", salas: "…" },
  extendida: { titulo: "…", parrafos: ["…"] },   // opcional
  hilos: ["Neogótico", "Mármol de Carrara", …],
  fotos: [{ clave: "PG", src: "fotos/tumba1_PG.jpg", pie: "…" }, …]
}
```

## Compartir

En `datos.js`, escribe en `proyecto.url_publica` la dirección final donde vivirá la experiencia. Así los enlaces para compartir apuntan ahí. Si se deja vacía, se usa la dirección actual del navegador.

## Detalles técnicos

- HTML, CSS y JavaScript nativos. Solo se cargan tres tipografías de Google Fonts
  (Marcellus, Newsreader, IBM Plex Mono).
- Rutas por hash: `#inicio`, `#panteon`, `#tumba-3`, `#codigo`. Cada tumba se puede compartir.
- La foto es ~18 % más grande que la pantalla y se desplaza con el cursor o el dedo para
  simular la mirada en primera persona. Clic o toque acerca; deslizar cambia de vista.
- Teclado: ← → vistas, [ ] tumbas, F ficha, Esc vuelve al plano.
- Respeta `prefers-reduced-motion`.

## Licencias

Código: MIT (ver `LICENSE`). Fotografías, textos y lecturas: derechos reservados de sus autores
y de VANGUARDIA MX.
