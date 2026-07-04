# SPEC 03 — Transmisión de ubicación a Supabase y recorrido estilo Uber

> **Status:** Aprobado
> **Depends on:** SPEC 01 (auth/perfil), SPEC 02 (mapa Leaflet + useLocation)
> **Date:** 2026-07-04
> **Objective:** Transmitir mi posición GPS al grupo actual en Supabase (`live_locations` + `location_history`) mientras el `TransmitSwitch` está activo, y dibujar mi propio recorrido de la sesión como una polyline estilo Uber sobre el mapa de la Spec 02.

## Scope

**In:**

- Función/helper para resolver el `group_id` del usuario actual consultando `group_members` (se asume pertenencia a un solo grupo).
- Servicio de transmisión: mientras el `TransmitSwitch` está en ON, cada actualización de posición de `useLocation` (con throttle por distancia y/o tiempo) hace:
  - `upsert` en `live_locations` (`group_id, user_id, lat, lng, heading, speed, sharing=true, updated_at`).
  - `insert` en `location_history` (`group_id, user_id, lat, lng, created_at`).
- Al pasar el switch a OFF: se hace un `update` de `live_locations` con `sharing=false` (la fila y la última posición conocida quedan, pero marcadas como no compartiendo) y se detiene el insert en `location_history`.
- Acumulación en memoria (client-side) de los puntos transmitidos durante la sesión actual, para dibujar el recorrido — no se relee `location_history` histórico al abrir la pantalla.
- Actualización de `components/PipMap.tsx` para aceptar una lista de puntos y dibujar una `Polyline` (estilo Uber: línea sólida verde Pip-Boy) sobre el recorrido acumulado.
- Wiring real del `TransmitSwitch` en `app/(tabs)/index.tsx`: deja de ser un toggle inerte, arranca/detiene la transmisión.
- Throttle configurable (distancia mínima recorrida y/o tiempo mínimo) antes de escribir en Supabase, para no insertar en cada tick de `watchPositionAsync`.

**Out of scope (specs futuras):**

- Mostrar la ubicación o el recorrido de OTROS usuarios del grupo (píldora `SUJETOS`, suscripción realtime a `live_locations`) → Spec 04.
- Selector de grupo o soporte para pertenecer a varios grupos a la vez.
- Pantalla de historial: ver recorridos de sesiones/días anteriores leyendo `location_history`.
- Creación o gestión de `groups` / `group_members` (se asume que ya existen y el usuario ya pertenece a uno).
- Nuevas políticas RLS (ya existen y se asumen correctas).
- Ubicación en background (sigue el límite de foreground de la Spec 02).
- Borrado, purga o límite de retención de `location_history`.

## Data model

Tablas de Supabase (ya existentes, no se crean en esta spec — solo se leen/escriben):

```ts
// live_locations — una fila por usuario, se pisa con upsert
{
  group_id: string,    // uuid
  user_id: string,     // uuid
  lat: number,
  lng: number,
  heading: number | null,
  speed: number | null,
  sharing: boolean,
  updated_at: string,  // timestamptz
}

// location_history — una fila nueva por cada punto transmitido
{
  id: string,          // uuid, autogenerado
  group_id: string,
  user_id: string,
  lat: number,
  lng: number,
  created_at: string,  // timestamptz
}

// group_members — ya existe, solo se lee para resolver group_id
{
  group_id: string,
  user_id: string,
  joined_at: string,
}
```

Estado del nuevo hook `hooks/useLocationTransmission.ts`:

```ts
{
  sharing: boolean,                                // espejo del TransmitSwitch
  routePoints: { lat: number; lng: number }[],     // acumulado de ESTA sesión
  groupId: string | null,
  error: string | null,
}
```

Constantes de throttle (recomendadas, ajustables):

```ts
const MIN_DISTANCE_METERS = 15; // no transmitir si me moví menos de esto
const MIN_INTERVAL_MS = 5000; // no transmitir más seguido que esto
```

Prop nueva en `components/PipMap.tsx` (además de las de Spec 02):

```ts
{
  routePoints: { lat: number; lng: number }[], // para dibujar la Polyline del recorrido
}
```

## Implementation plan

1. **Crear `lib/group.ts`.** Función `getCurrentUserGroupId()` que consulta `group_members` filtrando por el `user_id` del usuario autenticado (de `AuthContext`) y devuelve el `group_id` (se asume un solo grupo). Test: loguear el resultado en consola tras iniciar sesión y confirmar que devuelve un uuid válido.

2. **Crear `lib/locationTransmission.ts`.** Funciones `upsertLiveLocation(point)` e `insertLocationHistory(point)` que llaman a Supabase (`.upsert` sobre `live_locations`, `.insert` sobre `location_history`). Test: invocarlas manualmente con datos de prueba desde una pantalla temporal y confirmar en el dashboard de Supabase que las filas aparecen/actualizan.

3. **Crear `hooks/useLocationTransmission.ts`.** Recibe `coords/accuracy/heading/speed` de `useLocation` y un flag `sharing`; aplica el throttle (`MIN_DISTANCE_METERS` / `MIN_INTERVAL_MS`) antes de llamar a `upsertLiveLocation` + `insertLocationHistory`; acumula cada punto transmitido en `routePoints`. Al pasar `sharing` de `true` a `false`, hace un último `update` de `live_locations` con `sharing=false`. Test: montar el hook con `sharing=true` fijo, simular movimiento y verificar en consola/Supabase que los puntos se acumulan y las tablas se actualizan.

4. **Actualizar `components/PipMap.tsx`.** Acepta prop `routePoints` y renderiza una `Polyline` de `react-leaflet` (línea sólida verde Pip-Boy) con esos puntos, además del marcador de posición actual ya existente. Test: montar con un array fijo de puntos y verificar que la línea se dibuja correctamente.

5. **Wiring en `app/(tabs)/index.tsx`.** El estado de `TransmitSwitch` pasa a controlar `sharing` en `useLocationTransmission`; se pasa `routePoints` a `PipMap`. Test end-to-end: activar el switch, moverme (o simular movimiento), ver la polyline crecer en el mapa y filas nuevas en `location_history`/`live_locations` en Supabase; desactivar el switch y confirmar `sharing=false` y que no se insertan más filas.

## Acceptance criteria

- [ ] Con el `TransmitSwitch` en OFF, no se escribe nada en `live_locations` ni en `location_history`.
- [ ] Al activar el `TransmitSwitch`, aparece (o se actualiza) una fila en `live_locations` para mi `user_id` y `group_id`, con `sharing=true` y mi posición actual.
- [ ] Al moverme con el switch en ON, se insertan nuevas filas en `location_history` respetando el throttle (no una fila por cada tick de GPS).
- [ ] Las filas insertadas en `live_locations`/`location_history` tienen el `group_id` correcto, resuelto desde `group_members`.
- [ ] `heading` y `speed` se guardan en `live_locations` cuando `expo-location` los provee (no quedan siempre en `null` si el dispositivo los reporta).
- [ ] En el mapa, se dibuja una polyline verde Pip-Boy que va creciendo con los puntos acumulados desde que activé el switch en esta sesión.
- [ ] Al desactivar el `TransmitSwitch`, se actualiza `live_locations` con `sharing=false` y dejan de insertarse filas en `location_history`.
- [ ] Si apago y vuelvo a prender el switch dentro de la misma sesión, la polyline sigue acumulando (no se reinicia); el corte de transmisión no borra el recorrido dibujado.
- [ ] Cerrar la app con el switch en ON y reabrirla no muestra el recorrido anterior (se acumula de nuevo desde cero, según lo definido en Scope).
- [ ] No hay errores de Supabase (RLS, columnas faltantes) al hacer upsert/insert con un usuario autenticado válido.

## Decisions

- **Sí:** transmitir a `live_locations` (upsert) y `location_history` (insert) en cada punto que pase el throttle. `live_locations` da "dónde estoy ahora" para consumo futuro multiusuario; `location_history` da el histórico para reconstruir recorridos en web/otro dispositivo.
- **No:** concepto de "viaje" (`trip_id`) estilo Uber real. El usuario pidió explícitamente registro continuo sin cortes formales de viaje; simplifica el modelo y evita migrar las tablas existentes.
- **Sí:** el recorrido dibujado en el mapa se arma con puntos acumulados en memoria durante la sesión, no releyendo `location_history`. Evita una carga inicial cara y mantiene el mapa como "vista en vivo", no como visor de histórico.
- **No:** pantalla o feature de historial de recorridos pasados. Fuera de alcance → spec futura si se necesita.
- **Sí:** el recorrido sigue acumulando aunque se apague y prenda el switch en la misma sesión (no se reinicia por cortes de transmisión).
- **No:** reiniciar `routePoints` al abrir la app. Se acumula desde cero en cada sesión nueva; leer histórico persistido queda fuera de esta spec.
- **Sí:** throttle por distancia (`MIN_DISTANCE_METERS`) y tiempo (`MIN_INTERVAL_MS`) antes de escribir en Supabase. Evita saturar las tablas con puntos redundantes de `watchPositionAsync`.
- **Sí:** guardar `heading`/`speed` en `live_locations` cuando estén disponibles, aunque esta spec no los use visualmente. Ya son columnas existentes pensadas para consumo futuro (web, multiusuario).
- **No:** mostrar ubicación o recorrido de otros usuarios del grupo, ni suscripción realtime a `live_locations`. Explícitamente diferido a Spec 04 — el usuario no tenía definido ese comportamiento y mezclarlo complica esta spec.
- **No:** selector de grupo / soporte multi-grupo. Se asume un solo grupo por usuario, resuelto automáticamente desde `group_members`.
- **No:** nuevas políticas RLS ni gestión de `groups`/`group_members`. Ya existen y se asumen correctas y suficientes.

## Identified risks

| Risk                                                                                               | Mitigation                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group_members` no tiene fila para el usuario actual (grupo no asignado)                           | `getCurrentUserGroupId()` devuelve `null`/error; la transmisión no arranca y se muestra un estado Pip-Boy de error en vez de fallar silenciosamente.                                                          |
| Throttle mal calibrado genera muy pocos o demasiados puntos                                        | Valores iniciales (`15m` / `5s`) son ajustables en un solo lugar (`lib/locationTransmission.ts`); se pueden afinar tras probar en dispositivo real.                                                           |
| Escrituras a Supabase fallan por falta de red (viajando/GPS en movimiento)                         | Se pierde ese punto puntual (no hay cola de reintento en esta spec); el recorrido visual local no se ve afectado porque `routePoints` se acumula en cliente independientemente del resultado de la escritura. |
| RLS existente no contempla el patrón de uso de esta spec (insert/upsert desde cliente autenticado) | Se verifica manualmente contra las políticas actuales antes de dar la spec por cerrada; si falla, es un fix de configuración en Supabase, no de código.                                                       |
| Volumen de filas en `location_history` crece sin límite con el tiempo                              | Aceptado como fuera de alcance (sin purga/retención en esta spec); a revisar en una spec futura si se vuelve un problema real.                                                                                |

## What is **not** in this spec

- Mostrar ubicación o recorrido de otros usuarios del grupo (Spec 04).
- Selector de grupo / multi-grupo.
- Pantalla de historial de recorridos pasados.
- Creación/gestión de `groups` y `group_members`.
- Nuevas políticas RLS.
- Ubicación en background.
- Purga/retención de `location_history`.

Cada uno de estos, si se implementa, va en su propia spec.
