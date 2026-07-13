# SPEC 09 — Vistas de mapa (estándar / satelital / terreno)

> **Status:** Implementado
> **Depends on:** SPEC 02 (mapa Leaflet), SPEC 06 (FAB de recentrado en `components/PipMap.tsx`)
> **Date:** 2026-07-13
> **Objective:** Agregar un FAB que cicle entre tres vistas del mapa — estándar (OpenStreetMap, la actual), satelital (Esri World Imagery) y terreno/topográfico (Esri World Topo Map) — arrancando siempre en estándar.

## Scope

**In:**

- `components/PipMap.tsx`: nuevo estado interno `mapLayer` (`"standard" | "satellite" | "terrain"`, inicial `"standard"`) que decide qué `TileLayer` se renderiza.
- `components/PipMap.tsx`: tercera fuente de tiles — Esri World Topo Map (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`), con su propio `attribution`, además de la fuente satelital Esri World Imagery ya definida.
- `components/PipMap.tsx`: nuevo FAB "capas" (ícono de capas superpuestas, sin texto), columna con el FAB de recentrado existente, mismo lado (esquina inferior derecha), posicionado arriba de él. Al tocarlo, cicla `mapLayer` en el orden `standard → satellite → terrain → standard → ...`.
- Estilos nuevos del FAB de capas en el bloque `<style>` existente, siguiendo la paleta Pip verde y la convención visual del FAB de recentrado.

**Out of scope (specs futuras):**

- Persistir la vista elegida entre sesiones o entre pantallas (siempre arranca en `"standard"`).
- Más de tres capas (híbrido con labels sobre satelital, tránsito, etc.).
- Cambiar la fuente de tiles estándar actual (OpenStreetMap).
- Indicador textual (ej. "SAT"/"STD"/"TER") o label junto al FAB, ni un menú/selector explícito de las tres opciones (el ciclo por tap es suficiente).
- Ajustar el nivel de zoom o comportamiento de cámara al cambiar de capa (se mantiene el `center`/`zoom` actual del mapa tal cual estén).
- Precarga o caché de tiles satelitales/terreno para uso offline.

## Data model

No se crean tablas ni datos persistentes nuevos. Solo estado UI local en memoria dentro de `components/PipMap.tsx`, se pierde al desmontar y arranca siempre igual:

```ts
// Estado interno de PipMap
type MapLayer = "standard" | "satellite" | "terrain";
const [mapLayer, setMapLayer] = useState<MapLayer>("standard");

// Orden del ciclo al tocar el FAB de capas
const LAYER_CYCLE: MapLayer[] = ["standard", "satellite", "terrain"];
```

```ts
// Definición de las tres fuentes de tiles (constante, fuera del componente)
const TILE_LAYERS: Record<MapLayer, { url: string; attribution: string }> = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
  terrain: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, USGS, NOAA",
  },
};
```

No hay cambios en `Props`, ni en `useLocation` / `useGroupPresence` / `useLocationTransmission`, ni en el schema de Supabase.

## Implementation plan

1. **Estado de capa + tabla de tiles en `PipMap.tsx`.** Agregar el tipo `MapLayer`, el estado `mapLayer` (inicial `"standard"`), la constante `LAYER_CYCLE` y la constante `TILE_LAYERS` (las tres fuentes) fuera del componente. Reemplazar el `<TileLayer url=... attribution=...>` fijo actual por `<TileLayer url={TILE_LAYERS[mapLayer].url} attribution={TILE_LAYERS[mapLayer].attribution} key={mapLayer} />` (el `key` fuerza a Leaflet a reemplazar la capa en vez de intentar mutarla). Test manual: la app sigue viéndose exactamente igual que hoy (vista estándar), sin errores en consola.

2. **FAB de capas (ciclo de 3 estados).** Nuevo componente `LayerFab` (o botón inline junto al `RecenterFab` existente) con el ícono de capas superpuestas, posicionado en la esquina inferior derecha, arriba del FAB de recentrado (ajustando `bottom` para que no se toquen). `onClick`: `setMapLayer(l => LAYER_CYCLE[(LAYER_CYCLE.indexOf(l) + 1) % LAYER_CYCLE.length])`. Estilos nuevos en el bloque `<style>` existente, con la paleta Pip verde. Test manual: tocar el FAB tres veces recorre estándar → satelital → terreno → estándar; el FAB de recentrado sigue funcionando igual y no se superpone visualmente con el nuevo FAB.

3. **Verificación de comportamiento de cámara al cambiar de capa.** Confirmar que cambiar `mapLayer` no dispara ningún reset de `center`/`zoom` ni afecta el estado `following`/`followTarget` del FAB de recentrado (son estados independientes). Test manual: con el seguimiento activo, ciclar las tres capas varias veces y confirmar que la cámara no salta ni el seguimiento se desactiva.

## Acceptance criteria

- [x] Al abrir el mapa, se ve la vista estándar (OpenStreetMap) tal como hoy.
- [x] Existe un FAB de capas en la esquina inferior derecha, arriba del FAB de recentrado, sin superponerse visualmente con él.
- [x] Tocar el FAB de capas cicla las vistas en el orden estándar → satelital → terreno → estándar → ...
- [x] El cambio de capa es inmediato y no reinicia el `center`/zoom actual del mapa.
- [x] El cambio de capa no afecta el estado de seguimiento de cámara (`following`/`followTarget`) ni el comportamiento del FAB de recentrado.
- [x] Al recargar la pantalla del mapa (remontar `PipMap`), la vista vuelve a arrancar en estándar (no se persiste la elección).
- [x] Los marcadores propios, de otros miembros y las trayectorias (`Polyline`) siguen visibles y correctos sobre las tres capas.
- [x] No hay errores en consola al montar el mapa, ciclar capas repetidamente, ni al arrastrar/zoom con cualquiera de las tres capas activas.

## Decisions

- **Sí:** usar Esri como fuente única para las dos capas nuevas (World Imagery para satelital, World Topo Map para terreno). Ambas son gratuitas, sin API key ni registro, y se integran igual que OSM hoy vía `TileLayer` de `react-leaflet` — sin cambiar de librería de mapas ni arquitectura, y sin sumar un segundo proveedor externo.
- **No:** migrar a `react-native-maps`/Google Maps. Requeriría reemplazar Leaflet/WebView por un mapa nativo y gestionar una API key de Google — cambio arquitectónico grande, desproporcionado para esta feature.
- **No:** Mapbox. Agrega dependencia de un servicio externo con cuenta/token y billing, sin necesidad dado que Esri cubre los tres casos sin esos costos.
- **Sí:** el control es un solo FAB que cicla las tres vistas por tap (`standard → satellite → terrain → standard`), con ícono de capas fijo, sin texto ni menú desplegable. Mantiene la interacción simple (un solo tap, sin submenús) y agrupa los controles de mapa en la misma esquina que el FAB de recentrado (SPEC 06).
- **No:** menú/selector explícito con las tres opciones visibles a la vez. Un ciclo por tap es suficiente para tres opciones; un selector se reconsidera si se agregan más capas a futuro.
- **No:** persistir la vista elegida entre sesiones. Consistente con SPEC 06 (el seguimiento de cámara tampoco persiste); arranca siempre en `"standard"`.
- **No:** indicador textual (ej. "SAT"/"STD"/"TER") junto al FAB. El ícono de capas ya comunica la acción; agregar texto es redundante con el estilo minimalista de los FABs existentes.
- **No:** capa híbrida (satelital + labels de calles superpuestos). Es una cuarta variante que agrega complejidad de superposición de tiles; se difiere a una spec futura si se necesita.

## Identified risks

| Risk                                                                                                                                                                               | Mitigation                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Esri World Imagery y World Topo Map no tienen tiles de alta resolución en todas las zonas/zooms (zonas rurales pueden verse borrosas o en blanco a zoom muy alto).                 | Aceptado como limitación conocida de los servicios gratuitos; no se implementa fallback ni mensaje especial — cada capa muestra lo que Esri sirve.           |
| El nuevo FAB se superpone visualmente con el FAB de recentrado o con los overlays `SEÑAL`/`SUJETOS` en pantallas chicas.                                                           | Ajustar `bottom`/`right` en píxeles durante la implementación, verificando visualmente en el tamaño de pantalla objetivo antes de cerrar el paso 2 del plan. |
| El `attribution` de Esri (satelital y terreno) no se muestra o se corta en el control de atribución de Leaflet (ya estilizado/oculto según CSS existente en `PipMap.tsx:230-234`). | Revisar que ambos textos de atribución respeten el mismo estilo que el de OSM; no es bloqueante para la funcionalidad del ciclo de capas.                    |
| Ciclar entre las tres capas repetidamente genera muchas requests de tiles y puede notarse lag en conexiones lentas.                                                                | Aceptado — no se implementa precaché ni debounce en esta spec; es un caso de uso ocasional (elegir vista), no un toggle de alta frecuencia.                  |
| Con un ciclo de 3 estados en un solo FAB, el usuario no tiene forma de saber a qué vista va a saltar sin tocarlo (a diferencia de un toggle binario, más predecible).              | Aceptado por decisión explícita de no agregar indicador textual ni selector; si genera confusión en uso real, se reconsidera en una spec futura.             |
