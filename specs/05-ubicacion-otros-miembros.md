# SPEC 05 — Ver ubicación y recorrido de otros miembros del grupo

> **Status:** Implementado
> **Depends on:** SPEC 02 (mapa Leaflet), SPEC 03 (transmisión a `live_locations`/`location_history`), SPEC 04 (`GroupContext`, membresía de grupo)
> **Date:** 2026-07-04
> **Objective:** Mostrar en el mapa, en tiempo real vía Supabase Realtime, la posición actual y el recorrido de sesión de los demás miembros del grupo, diferenciados visualmente del marcador propio.

## Scope

**In:**

- Nuevo hook `hooks/useGroupPresence.ts`: se suscribe por Supabase Realtime a `live_locations` (filtrado por `group_id` del `GroupContext`) para posición/estado de cada miembro, y a los `INSERT` de `location_history` (mismo filtro) para ir acumulando el recorrido de sesión de cada uno.
- Filtro de "miembro activo": `sharing = true` **y** `updated_at` dentro de una ventana reciente (120s) — excluye al propio usuario.
- Cruce con `GroupContext.members` para resolver `display_name` a partir del `user_id` de cada posición recibida.
- Recálculo periódico de staleness (no solo disparado por eventos entrantes) para sacar del mapa a un miembro cuyo `live_locations` quedó viejo sin que llegue una actualización nueva (ej. cierre forzado de la app).
- Actualización de `components/PipMap.tsx`: nueva prop con la lista de otros miembros activos (posición + recorrido); renderiza un marcador ámbar por miembro (distinto del propio, verde) con popup mostrando `display_name` al tocarlo, y una `Polyline` ámbar independiente por cada uno.
- Wiring en `app/(tabs)/index.tsx`: usa `useGroupPresence`, pasa los otros miembros a `PipMap`, y la píldora `SUJETOS` pasa a mostrar la cantidad real de miembros activos (sin contarme a mí).

**Out of scope (specs futuras):**

- Backfill del recorrido histórico de otros miembros al abrir la pantalla (arranca vacío, igual que el propio en Spec 03).
- Colores individuales por usuario (todos los demás comparten el mismo color ámbar).
- Clustering de marcadores para grupos con muchos miembros activos a la vez.
- Alertas de proximidad / geofencing entre miembros.
- Ver miembros de otros grupos (se asume un solo grupo por usuario, como en Spec 04).
- Cache o persistencia offline de las posiciones/recorridos ajenos.
- Pantalla de historial de recorridos pasados (ya diferido desde Spec 03).
- Nuevas políticas RLS o cambios de schema en Supabase (se asume ya aplicado, según Spec 04).

## Data model

No se crean tablas nuevas: se reutilizan `live_locations`, `location_history` y `group_members` (ya existentes desde Spec 03/04), solo se leen vía Realtime.

Constante nueva:

```ts
const RECENT_WINDOW_MS = 120_000; // ventana para considerar "activo" un live_location
const STALE_CHECK_INTERVAL_MS = 15_000; // recalcula staleness aunque no lleguen eventos nuevos
```

Estado interno de `hooks/useGroupPresence.ts` (por `user_id`, en memoria, se pierde al desmontar):

```ts
type MemberPresence = {
  userId: string;
  displayName: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  updatedAt: string; // updated_at de live_locations, para el chequeo de staleness
  routePoints: { lat: number; lng: number }[]; // acumulado desde que se montó el hook
};
```

Retorno del hook:

```ts
{
  members: MemberPresence[]; // ya filtrados: sharing=true, no stale, excluye al propio usuario
  count: number;              // members.length, para la píldora SUJETOS
}
```

Prop nueva en `components/PipMap.tsx` (además de las de Spec 02/03):

```ts
{
  otherMembers: {
    userId: string;
    displayName: string;
    lat: number;
    lng: number;
    routePoints: {
      lat: number;
      lng: number;
    }
    [];
  }
  [];
}
```

## Implementation plan

1. **Crear `hooks/useGroupPresence.ts` (solo posición).** Se suscribe con `supabase.channel(...).on('postgres_changes', ...)` a `live_locations` filtrado por `group_id` (leído de `GroupContext`). Mantiene un mapa en memoria `user_id → última fila recibida`, cruza con `GroupContext.members` para resolver `display_name`, filtra `sharing=true` + `updated_at` reciente, excluye al propio `user_id`, y expone `{ members, count }` (todavía sin `routePoints`). Test: con dos cuentas logueadas en el mismo grupo, activar `TransmitSwitch` en una y confirmar por consola en la otra que `members` refleja su posición actualizándose en vivo.

2. **Agregar la suscripción a `location_history` al mismo hook.** Se suscribe a los `INSERT` de `location_history` (mismo filtro por `group_id`), y por cada evento agrega el punto a `routePoints` del `user_id` correspondiente dentro del mapa en memoria. Test: con las mismas dos cuentas transmitiendo, confirmar en consola que `routePoints` de la otra cuenta crece con cada punto nuevo, sin reiniciarse entre actualizaciones de posición.

3. **Agregar el recálculo periódico de staleness.** Un `setInterval` cada `STALE_CHECK_INTERVAL_MS` recorre el mapa en memoria y saca (o marca inactivo) a cualquier `user_id` cuyo `updated_at` superó `RECENT_WINDOW_MS`, aunque no haya llegado un evento nuevo de Realtime. Test: activar transmisión en la cuenta B, forzar el cierre de esa app (sin apagar el switch), y confirmar que pasados ~120s desaparece de `members` en la cuenta A sin recargar la pantalla.

4. **Actualizar `components/PipMap.tsx`.** Nueva prop `otherMembers`; por cada uno renderiza un marcador con ícono ámbar (variante del `pipIcon` existente, distinto color) con un `Popup` que muestra `displayName` al tocarlo, y una `Polyline` ámbar independiente con su `routePoints` (mismo criterio que la propia de Spec 03, pero en otro color). Test: montar el componente con 1-2 `otherMembers` de prueba fijos y verificar que los marcadores y polylines se dibujan en las posiciones correctas, sin interferir con el marcador/polyline propios.

5. **Wiring en `app/(tabs)/index.tsx`.** Llama a `useGroupPresence()`, pasa `members` a `PipMap` como `otherMembers`, y actualiza la píldora `SUJETOS` para mostrar `count` con padding a 2 dígitos (reemplaza el `00` fijo actual). Test end-to-end con dos cuentas: activar `TransmitSwitch` en ambas, confirmar que cada una ve el marcador y la polyline ámbar de la otra moviéndose en tiempo real, que la píldora `SUJETOS` refleja el conteo correcto, y que apagar el switch en una hace desaparecer su marcador de la otra dentro de la ventana de staleness.

## Acceptance criteria

- [x] Con dos cuentas en el mismo grupo, si la cuenta B activa `TransmitSwitch`, la cuenta A ve aparecer un marcador ámbar en la posición de B en tiempo real, sin recargar la pantalla.
- [x] Tocar el marcador de B en el mapa de A muestra un popup con el `display_name` de B.
- [x] Mientras B se mueve con el switch en ON, A ve crecer una polyline ámbar independiente que sigue el recorrido de B, sin alterar la propia polyline verde de A.
- [x] Si B desactiva el `TransmitSwitch`, su marcador y polyline desaparecen del mapa de A dentro de la ventana de staleness (120s desde el último `updated_at`).
- [x] Si B fuerza el cierre de la app sin apagar el switch, su marcador desaparece del mapa de A pasados ~120s, sin que A necesite recargar la pantalla.
- [x] La píldora `SUJETOS` en el mapa de A muestra la cantidad de miembros del grupo (sin contarse a sí misma) que están activamente compartiendo en ese momento.
- [x] Un usuario ajeno al grupo (no presente en `group_members` de ese `group_id`) nunca aparece en el mapa de A, aunque esté transmitiendo activamente a otro grupo.
- [x] Al reabrir la pantalla del mapa, el recorrido de los demás miembros arranca vacío y se acumula desde ese momento (no se relee `location_history` histórico).
- [x] No hay errores de Supabase (Realtime, RLS) al suscribirse o recibir eventos con un usuario autenticado válido y perteneciente al grupo.

## Decisions

- **Sí:** mostrar posición Y recorrido de los demás miembros (no solo un marcador de posición). Elegido explícitamente pese a que implica más estado por sincronizar (acumular puntos por usuario, no solo el propio).
- **Sí:** filtrar por `sharing = true` **y** `updated_at` reciente (ventana de 120s), no solo `sharing = true`. Evita marcadores fantasma de apps cerradas a la fuerza sin apagar el switch — mismo riesgo ya identificado en Spec 03.
- **Sí:** Supabase Realtime (`postgres_changes`) sobre `live_locations` y `location_history`, en vez de polling. Ya está habilitado en el proyecto (Decisions de Spec 04) y es el uso previsto de esas tablas.
- **Sí:** mismo color/ícono ámbar para todos los miembros ajenos, distinto del propio (verde). El `display_name` se resuelve en un popup al tocar el marcador; no hace falta una paleta dinámica por usuario.
- **Sí:** la píldora `SUJETOS` cuenta solo a los demás miembros activos, no a mí mismo.
- **No:** backfill del recorrido histórico de otros miembros al abrir la pantalla. Se acumula desde cero, igual que el propio en Spec 03 — consistencia entre ambos casos y evita una carga inicial cara de `location_history`.
- **No:** clustering de marcadores, geofencing/alertas de proximidad, colores individuales por usuario, ni ver miembros de otros grupos. No fue pedido y agrega complejidad fuera del objetivo de esta spec.
- **No:** cache o persistencia offline de las posiciones/recorridos ajenos. Se pierden al cerrar la pantalla, igual que el propio recorrido (Spec 03).
- **No:** nuevas políticas RLS o cambios de schema. Se asume que el proyecto Supabase ya soporta lectura de `live_locations`/`location_history` de otros miembros del mismo grupo (declarado en Spec 04); si falla, es un fix de configuración, no de código.

## Implementation notes (post-implementación)

- `location_history` no estaba agregada a la publicación `supabase_realtime` en el proyecto Supabase real (a pesar de que Spec 04 asumía que "el schema completo, incluida Realtime, ya está aplicado"). Sin esto, el canal se suscribía sin error aparente en el cliente, pero el servidor de Realtime rechazaba en silencio la suscripción a esa tabla (visible solo inspeccionando los frames crudos del WebSocket, no en los logs normales de la app). Se resolvió con `alter publication supabase_realtime add table public.location_history;` directamente en el proyecto — no fue un cambio de código.
- `live_locations` sí estaba correctamente configurada de antes (publicación, RLS, `REPLICA IDENTITY FULL`), por eso la posición/marcador funcionó antes que el recorrido durante las pruebas.
- Para diagnosticar este tipo de problema a futuro: si un canal de Realtime queda en estado `SUBSCRIBED` pero nunca llegan eventos, inspeccionar los frames del WebSocket (DevTools → Network → click en la conexión `websocket` → pestaña Messages) en vez de confiar solo en los callbacks de `supabase-js`, ya que un fallo de suscripción a nivel de tabla se reporta como un mensaje `"system"` con `status: "error"` dentro del socket, no como un error de JavaScript en el cliente.

## Identified risks

| Risk                                                                                                             | Mitigation                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Corte de red interrumpe temporalmente la suscripción Realtime.                                                   | Supabase Realtime reconecta automáticamente; mientras tanto se mantiene el último estado conocido de cada miembro en memoria hasta que expire por staleness o llegue una actualización. |
| Muchos miembros transmitiendo a la vez generan muchos eventos y renders simultáneos.                             | Fuera de alcance optimizar para grupos grandes en esta spec — el modelo de "grupo familiar" asume pocos miembros activos a la vez.                                                      |
| El chequeo de staleness por `setInterval` depende del reloj del dispositivo para el `now` de comparación.        | Se compara contra `updated_at` (timestamp del servidor), solo el `now` local es aproximado; con una ventana de 120s el desfase típico de reloj es despreciable.                         |
| RLS no permite a un miembro leer filas de `live_locations`/`location_history` de otros usuarios del mismo grupo. | Se asume ya resuelto (Spec 04 declara el schema completo, incluida RLS, ya aplicado en el proyecto real); si falla al probar, es un fix de configuración en Supabase, no de código.     |
