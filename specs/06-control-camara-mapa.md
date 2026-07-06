# SPEC 06 — Control de cámara: recentrar en usuario propio + FAB

> **Status:** Aprobado
> **Depends on:** SPEC 02 (mapa Leaflet), SPEC 03 (recorrido/GPS propio), SPEC 05 (otros miembros en el mapa)
> **Date:** 2026-07-06
> **Objective:** Que el mapa deje de forzar el centrado en el usuario propio en cada tick de GPS, permitiendo arrastrar para inspeccionar el mapa, con un FAB que reactiva el seguimiento y recentra en la posición propia.

## Scope

**In:**

- `components/PipMap.tsx`: el seguimiento de cámara pasa a un estado interno (`useState`, inicial `true`) en vez de la prop `follow` fija. `FollowOnUpdate` recentra en la posición propia solo mientras ese estado esté activo.
- `components/PipMap.tsx`: al arrastrar el mapa (`dragstart` de Leaflet) el seguimiento se apaga automáticamente. El recentrado programático y el zoom por FAB no cuentan como gesto del usuario.
- `components/PipMap.tsx`: nuevo FAB HTML sobre el mapa (esquina inferior derecha, paleta Pip verde). Siempre visible. Al tocarlo: reactiva el seguimiento y recentra en la posición propia (`map.setView`). Estado visual: relleno/verde cuando la cámara sigue, contorno/apagado cuando no.
- `app/(tabs)/index.tsx`: se elimina la prop `follow` que hoy pasa hardcodeada a `<PipMap>`.

**Out of scope (specs futuras):**

- Seguir la trayectoria de otro miembro al tocar su ping (SPEC 07).
- Que el zoom con pellizco apague el seguimiento (solo lo apaga arrastrar).
- Controles de zoom in/out propios (Leaflet `zoomControl` sigue desactivado).
- Persistir el estado de seguimiento entre sesiones (arranca siempre en `true`).
- Cambios de estética/paleta del resto de la UI (píldoras, `TransmitSwitch`).
- Reubicar o rediseñar los overlays existentes (`SEÑAL`, `SUJETOS`).

## Data model

No se crean tablas, structs de dominio ni datos persistentes nuevos. El único estado nuevo es UI local en memoria dentro de `components/PipMap.tsx`, se pierde al desmontar y arranca siempre igual:

```ts
// Estado interno de PipMap (reemplaza a la prop `follow` fija)
const [following, setFollowing] = useState(true); // ¿la cámara sigue la posición propia?
```

Cambio en la interfaz `Props` de `PipMap.tsx`: se **elimina** `follow: boolean` (ya no llega desde `index.tsx`). El resto de props (`lat`, `lng`, `accuracy`, `routePoints`, `otherMembers`, `dom`) queda igual.

Sin cambios de schema en Supabase ni en `useLocation` / `useGroupPresence` / `useLocationTransmission`.

## Implementation plan

1. **Estado de follow interno en `PipMap.tsx`.** Agregar `const [following, setFollowing] = useState(true)`. `FollowOnUpdate` pasa a leer `following` en vez de la prop. Eliminar `follow` de la interfaz `Props` y del `<PipMap>` en `app/(tabs)/index.tsx:98`. Test manual: la app corre igual que antes — al moverse, la cámara sigue centrando en la posición propia (comportamiento actual intacto).

2. **Apagar seguimiento al arrastrar.** Dentro de un hijo de `MapContainer` con `useMap()`, registrar `map.on('dragstart', () => setFollowing(false))` (con su cleanup en el `useEffect`). Test manual: con la posición propia moviéndose, arrastrar el mapa con el dedo y confirmar que la cámara ya NO vuelve a saltar a la posición propia en el siguiente tick de GPS — queda donde se dejó.

3. **FAB de recentrar (siempre visible, esquina inferior derecha).** Botón HTML sobre el mapa, estilizado con la paleta Pip verde en el bloque `<style>` existente, con glifo de mira/target. `onClick`: `setFollowing(true)` + `map.setView([lat, lng], map.getZoom(), { animate: true })`. Estado visual: relleno/verde cuando `following === true`, contorno/apagado cuando `false`. Test manual: tras arrastrar (FAB apagado), tocar el FAB → la cámara recentra en la posición propia, el FAB se ve activo y vuelve a seguir en los siguientes ticks.

## Acceptance criteria

- [ ] Al abrir el mapa con posición fija, la cámara centra en la posición propia y la sigue mientras el usuario no toque el mapa (comportamiento inicial igual al actual).
- [ ] Al arrastrar el mapa con el dedo, la cámara NO vuelve a saltar a la posición propia en el siguiente tick de GPS: queda donde el usuario la dejó.
- [ ] Con el seguimiento apagado, el usuario puede arrastrar hasta el marcador/trayecto de otro miembro y quedarse mirándolo sin que la cámara lo arrastre de vuelta.
- [ ] El FAB está siempre visible en la esquina inferior derecha del mapa.
- [ ] Tocar el FAB recentra la cámara en la posición propia y reactiva el seguimiento.
- [ ] El FAB se ve en estado activo (relleno/verde) cuando la cámara sigue la posición propia, y en estado apagado (contorno) cuando no.
- [ ] El recentrado programático (tocar el FAB) y el zoom por FAB no cuentan como gesto de arrastre: no apagan el seguimiento por sí solos.
- [ ] No hay errores en consola al montar el mapa, arrastrar, ni tocar el FAB.

## Decisions

- **Sí:** el estado de seguimiento vive dentro de `PipMap.tsx` (WebView), no en RN. Toda la lógica de cámara (`setView`, detección de arrastre, tap) ya vive en Leaflet; manejarlo ahí evita round-trips por el bridge del DOM component y da respuesta inmediata.
- **Sí:** solo el arrastre (`dragstart`) apaga el seguimiento. Es el gesto claro de "quiero mirar otra cosa".
- **No:** el zoom con pellizco (`zoomstart`) no apaga el seguimiento. Se puede acercar/alejar sin perder el centrado; si molesta, se reconsidera en otra spec.
- **Sí:** el FAB siempre visible con estado visual activo/apagado. El usuario ve de un vistazo si la cámara lo sigue o no, sin adivinar.
- **No:** el FAB no se oculta cuando el seguimiento está activo. Ocultarlo obligaría a recordar dónde estaba; mostrarlo siempre es más predecible.
- **Sí:** el seguimiento arranca en `true` en cada montaje. Es el comportamiento esperado al abrir el mapa; no se persiste entre sesiones.
- **No:** seguir la trayectoria de otro miembro al tocar su ping. Es una interacción distinta (objetivo de seguimiento variable) y va en SPEC 07.

## Qué NO entra en esta spec

- Seguir la trayectoria de otro miembro al tocar su ping (SPEC 07).
- Que el zoom con pellizco apague el seguimiento.
- Controles de zoom in/out propios.
- Persistir el estado de seguimiento entre sesiones.
- Cambios de estética o reubicación de los overlays existentes (`SEÑAL`, `SUJETOS`, `TransmitSwitch`).

Cada uno, si aterriza, va en su propia spec.
