# SPEC 07 — Seguir la trayectoria de otro miembro al tocar su ping

> **Status:** Implementado
> **Depends on:** SPEC 02 (mapa Leaflet), SPEC 05 (otros miembros en el mapa), SPEC 06 (seguimiento de cámara + FAB)
> **Date:** 2026-07-06
> **Objective:** Que al tocar el marcador de un miembro del grupo la cámara pase a seguir su posición en tiempo real (con recorrido incluido), hasta que el usuario arrastre el mapa o toque el FAB para volver a seguirse a sí mismo.

## Scope

**In:**

- `components/PipMap.tsx`: el estado interno de seguimiento (hoy `following: boolean`, de Spec 06) se generaliza a un "objetivo de seguimiento" con tres posibilidades: seguir la posición propia, seguir a un miembro específico, o no seguir nada.
- `components/PipMap.tsx`: tocar el marcador (`Marker`) de un miembro en `otherMembers` abre su `Popup` (comportamiento ya existente de Spec 05) **y** además pone a ese miembro como objetivo de seguimiento — la cámara empieza a recentrar en su posición en cada actualización (mismo mecanismo de `FollowOnUpdate` que hoy usa la posición propia).
- `components/PipMap.tsx`: arrastrar el mapa (`dragstart`) apaga el seguimiento sea cual sea el objetivo (propio o de un miembro) — mismo comportamiento ya implementado en Spec 06, generalizado al nuevo objetivo.
- `components/PipMap.tsx`: el FAB existente (Spec 06) sigue siendo el único control para "volver a mí mismo": tocarlo siempre recentra en la posición propia y la vuelve a poner como objetivo de seguimiento, sin importar si antes se seguía a un miembro o a nadie.
- `components/PipMap.tsx`: nuevo estado visual del FAB — ámbar (color de los miembros) mientras el objetivo de seguimiento es un miembro, además de los dos estados ya existentes (verde = sigo mi posición, apagado = no sigo nada).
- `components/PipMap.tsx`: si el miembro seguido deja de estar presente en `otherMembers` (se puso `stale` o salió del grupo, según Spec 05) mientras es el objetivo de seguimiento, el objetivo vuelve automáticamente a la posición propia.

**Out of scope (specs futuras):**

- Resaltar visualmente el marcador o la polyline del miembro seguido (más allá del color ámbar ya existente).
- Seguir a más de un miembro a la vez (ej. encuadrar a varios).
- Que tocar el marcador propio tenga algún efecto (hoy no tiene `Popup` ni acción).
- Persistir el objetivo de seguimiento entre sesiones (arranca siempre en "sigo mi posición propia", igual que Spec 06).
- Que el zoom con pellizco afecte el seguimiento (sigue sin apagarlo, decisión ya tomada en Spec 06).
- Notificar o avisar al usuario cuando el objetivo de seguimiento vuelve a la posición propia por desaparición del miembro (sucede en silencio, solo el FAB cambia de color).

## Data model

No se crean tablas, structs de dominio ni datos persistentes nuevos. Se reemplaza el estado interno `following: boolean` de `PipMap.tsx` (Spec 06) por un objetivo de seguimiento discriminado, en memoria, que se pierde al desmontar y arranca siempre igual:

```ts
type FollowTarget =
  | { type: "self" }
  | { type: "member"; userId: string }
  | { type: "none" };

const [followTarget, setFollowTarget] = useState<FollowTarget>({
  type: "self",
});
```

Derivación de las coordenadas objetivo (usada por `FollowOnUpdate` en vez de `lat`/`lng` propios fijos):

```ts
// null cuando followTarget es "none", o cuando es "member" pero ese userId
// ya no está en otherMembers (dispara el fallback a "self" antes de llegar acá)
const targetCoords: { lat: number; lng: number } | null = ...
```

Sin cambios de props en la interfaz `Props` de `PipMap.tsx` (`otherMembers` ya trae `userId`, `lat`, `lng` desde Spec 05, suficiente para resolver el objetivo). Sin cambios en `app/(tabs)/index.tsx`, `hooks/useGroupPresence.ts` ni en Supabase.

## Implementation plan

1. **Generalizar el estado de seguimiento.** Reemplazar `const [following, setFollowing] = useState(true)` por `followTarget` (`FollowTarget`, inicial `{ type: "self" }`). Calcular `targetCoords` a partir de `followTarget`: `self` → `{ lat, lng }` propios; `member` → busca el `userId` en `otherMembers` y usa su posición; `none` → `null`. `FollowOnUpdate` pasa a recibir `targetCoords` en vez de `lat`/`lng`/`follow` sueltos, y solo llama `map.setView` cuando `targetCoords` no es `null`. Test manual: la app corre igual que antes — al moverse, la cámara sigue centrando en la posición propia (comportamiento de Spec 06 intacto).

2. **Seguir a un miembro al tocar su marcador.** En el `Marker` de cada `otherMembers` (además del `Popup` ya existente), agregar `eventHandlers={{ click: () => setFollowTarget({ type: "member", userId: member.userId }) }}`. Test manual: con dos cuentas, tocar el marcador ámbar de la otra cuenta — se abre su popup con el nombre y, mientras se mueve, la cámara empieza a recentrar en su posición en cada actualización.

3. **Generalizar el apagado por arrastre.** `DragUnfollow` pasa a llamar `setFollowTarget({ type: "none" })` en vez de `setFollowing(false)`. Test manual: mientras se sigue a un miembro (o a uno mismo), arrastrar el mapa — la cámara deja de recentrar y queda donde se soltó, sin importar a quién seguía antes.

4. **FAB siempre vuelve a uno mismo.** `RecenterFab` pasa a llamar `setFollowTarget({ type: "self" })` (en vez de `setFollowing(true)`) además del `map.setView` ya existente con la posición propia. Estado visual: `pip-fab-active` (verde) cuando `followTarget.type === "self"`, nueva clase `pip-fab-following-member` (ámbar) cuando `followTarget.type === "member"`, `pip-fab-inactive` (apagado) cuando `followTarget.type === "none"`. Test manual: siguiendo a un miembro, tocar el FAB — la cámara recentra en la posición propia, el FAB pasa de ámbar a verde.

5. **Fallback cuando el miembro seguido desaparece.** Un `useEffect` que depende de `followTarget` y `otherMembers`: si `followTarget.type === "member"` y ese `userId` ya no está en `otherMembers`, ejecutar `setFollowTarget({ type: "self" })`. Test manual: seguir a un miembro, hacer que su `TransmitSwitch` se apague (o forzar cierre de su app) y esperar la ventana de staleness (~120s, Spec 05) — la cámara vuelve sola a la posición propia y el FAB pasa a verde, sin que el usuario toque nada.

## Acceptance criteria

- [x] Con dos cuentas en el mismo grupo, tocar el marcador ámbar de la cuenta B en el mapa de A abre su popup con el `display_name` (comportamiento de Spec 05 intacto).
- [x] Al tocar el marcador de B, mientras B se mueve con `TransmitSwitch` en ON, la cámara de A recentra automáticamente en la posición de B en cada actualización, sin que A tenga que arrastrar nada.
- [x] El FAB se ve en ámbar mientras la cámara sigue a un miembro, verde mientras sigue la posición propia, y apagado (contorno) cuando no sigue nada.
- [x] Arrastrar el mapa mientras se sigue a un miembro apaga el seguimiento: la cámara no vuelve a saltar a la posición de ese miembro en la siguiente actualización, y el FAB pasa a apagado.
- [x] Tocar el FAB mientras se sigue a un miembro recentra la cámara en la posición propia, pone el FAB en verde, y los siguientes movimientos de ese miembro ya no mueven la cámara.
- [x] Si B deja de compartir (apaga el switch o cierra la app a la fuerza) mientras A lo está siguiendo, pasada la ventana de staleness (~120s) la cámara de A vuelve sola a la posición propia y el FAB pasa a verde, sin que A toque nada.
- [x] Tocar el marcador propio (verde) no tiene ningún efecto nuevo (sigue sin `Popup` ni acción, comportamiento actual).
- [x] No hay errores en consola al tocar el marcador de un miembro, arrastrar, tocar el FAB, ni cuando un miembro seguido desaparece del grupo.

## Decisions

- **Sí:** tocar el marcador de un miembro abre su popup **y** empieza a seguirlo a la vez. Es el gesto más directo, coincide con "al tocar su ping" del pedido original, y no requiere agregar un botón nuevo dentro del popup.
- **Sí:** el FAB existente de Spec 06 es el único mecanismo para "volver a mí mismo" — no se agrega un control separado para "dejar de seguir sin recentrar". Simplifica la UI y coincide con la descripción del pedido ("hasta que el usuario recentre en sí mismo").
- **Sí:** arrastrar el mapa apaga el seguimiento sea cual sea el objetivo (propio o de un miembro), reusando el mismo `dragstart` de Spec 06. Consistencia: un solo gesto, un solo significado ("quiero mirar otra cosa"), sin importar a quién se seguía.
- **Sí:** el FAB cambia a ámbar mientras sigue a un miembro (en vez de resaltar el marcador/polyline del miembro). Cambio mínimo sobre el widget de estado que ya existe; el usuario ya identifica el ámbar como "color de los demás miembros" desde Spec 05.
- **Sí:** si el miembro seguido desaparece (stale o sale del grupo) mientras se lo sigue, el objetivo vuelve solo a la posición propia. Evita dejar la cámara congelada mirando la última posición conocida de alguien que ya no está, sin que el usuario tenga que notar el problema y tocar el FAB manualmente.
- **No:** encuadrar o seguir a más de un miembro a la vez. No fue pedido y el modelo de "un solo objetivo de seguimiento" (Spec 06) ya cubre el caso de uso.
- **No:** resaltar visualmente el marcador o la polyline del miembro seguido. El color ámbar del FAB ya comunica el estado; agregar más resaltado es una mejora visual que puede evaluarse en otra spec si hace falta.
- **No:** persistir el objetivo de seguimiento entre sesiones. Arranca siempre en `{ type: "self" }`, igual que la decisión ya tomada en Spec 06 para `following`.

## Identified risks

| Risk                                                                                                                                                                                                                                                                       | Mitigation                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El fallback a "self" cuando el miembro seguido desaparece depende del recálculo periódico de staleness de `useGroupPresence` (Spec 05, cada 15s). La cámara puede tardar hasta ese intervalo en volver a la posición propia tras la última actualización real del miembro. | Aceptado: mismo intervalo ya usado y aceptado en Spec 05 para hacer desaparecer marcadores; no se justifica un mecanismo más agresivo solo para el seguimiento de cámara. |
| Si el miembro seguido se mueve mucho entre actualizaciones (señal débil, intervalos largos), la cámara puede saltar de forma brusca en cada recentrado.                                                                                                                    | Mismo comportamiento y mismo riesgo ya aceptado para el seguimiento de la posición propia desde Spec 06; no se agrega suavizado nuevo en esta spec.                       |
