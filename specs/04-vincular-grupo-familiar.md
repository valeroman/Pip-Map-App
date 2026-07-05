# SPEC 04 — Vincular familiares a un grupo (crear / unirse con código)

> **Status:** Aprobado
> **Depends on:** SPEC 01 (auth/perfil), SPEC 03 (asume `group_id` resuelto vía `group_members`, ahora se completa el flujo para obtenerlo)
> **Date:** 2026-07-04
> **Objective:** Permitir que un usuario sin grupo cree uno o se una a uno existente mediante un código de invitación, y ver el nombre, código y miembros de su grupo actual desde el modal de la app.

## Scope

**In:**

- Extender `lib/group.ts` con funciones que envuelven los RPCs/queries de Supabase: `createGroup(name)` (→ `create_group`), `joinGroup(code)` (→ `join_group`), `leaveGroup()` (→ `delete` de la propia fila en `group_members`), `getGroupDetails(groupId)` (nombre + `join_code` del grupo) y `getGroupMembers(groupId)` (lista de `display_name` desde `profiles`, cruzando por `user_id`).
- Nuevo `context/GroupContext.tsx`: fuente única de verdad del grupo actual — `{ groupId, groupName, joinCode, members, loading, error, refresh, leaveGroup }`. Se resuelve al iniciar sesión (similar patrón a `AuthContext`).
- Nueva pantalla "Crear o unirse a un grupo" (gate): formulario con dos acciones — crear grupo (input de nombre) o unirse (input de código). Estilo Pip-Boy consistente con login/registro.
- Redirección en `app/_layout.tsx`: con sesión pero sin grupo (`groupId === null` y no está cargando) → pantalla de gate en vez de `(tabs)`. Con sesión y grupo → `(tabs)` como hoy.
- Actualizar `app/modal.tsx`: nueva sección "Mi grupo" — nombre del grupo, código de invitación (texto en pantalla, copiable), lista de miembros (`display_name`), botón "Salir del grupo" (con confirmación).
- `hooks/useLocationTransmission.ts` pasa a leer `groupId` desde `GroupContext` en vez de llamar `getCurrentUserGroupId` por su cuenta (una sola fuente de verdad, sin cambiar su comportamiento externo ni sus criterios de aceptación de Spec 03).

**Out of scope (specs futuras):**

- Ver la ubicación o el recorrido de otros miembros del grupo en el mapa (píldora `SUJETOS`, marcadores/polylines ajenos, suscripción realtime a `live_locations`) → Spec 05.
- Pertenecer a más de un grupo / selector de grupo activo (se asume un solo grupo por usuario).
- Expulsar miembros desde la UI (aunque la policy RLS ya permite al `owner` borrar filas de `group_members` de otros).
- Regenerar o hacer expirar el código de invitación desde la app (`code_expires_at` existe en el schema pero no se usa en esta spec).
- Compartir el código vía share sheet nativo (solo se muestra en pantalla para copiar/dictar).
- Editar el nombre del grupo después de creado, o borrar el grupo explícitamente desde la app.
- Cualquier cambio al SQL/schema de Supabase (ya está aplicado en el proyecto real).

## Data model

No se crean tablas nuevas (el schema ya está aplicado en Supabase). Se referencian las tablas existentes relevantes para esta spec:

```sql
-- groups (ya existe)
id               uuid primary key
name             text
owner_id         uuid        -- FK a auth.users.id
join_code        text unique -- 6 caracteres, ej. "A3F9K1"
code_expires_at  timestamptz -- null en esta spec (no se usa)
created_at       timestamptz

-- group_members (ya existe)
group_id   uuid
user_id    uuid
joined_at  timestamptz

-- profiles (ya existe, Spec 01)
id            uuid
display_name  text
```

RPCs de Supabase ya existentes que se invocan desde `lib/group.ts`:

```ts
supabase.rpc('create_group', { p_name: string }): Promise<{ data: Group, error }>
supabase.rpc('join_group', { p_code: string }): Promise<{ data: Group, error }>
```

Tipos nuevos en `lib/group.ts`:

```ts
type Group = {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
};

type GroupMember = {
  user_id: string;
  display_name: string;
};

createGroup(name: string): Promise<Group>;
joinGroup(code: string): Promise<Group>;
leaveGroup(groupId: string, userId: string): Promise<void>;         // delete own row en group_members
getGroupDetails(groupId: string): Promise<Group | null>;
getGroupMembers(groupId: string): Promise<GroupMember[]>;
```

Estado de `context/GroupContext.tsx`:

```ts
{
  groupId: string | null,
  groupName: string | null,
  joinCode: string | null,
  members: GroupMember[],
  loading: boolean,             // true mientras se resuelve el grupo al iniciar sesión
  error: string | null,
  refresh: () => Promise<void>, // re-consulta tras crear/unirse/salir
  leaveGroup: () => Promise<void>,
}
```

Estado local de la pantalla de gate (no persistido):

```ts
{
  mode: 'crear' | 'unirse',
  name: string,        // input para crear
  code: string,         // input para unirse
  submitting: boolean,
  error: string | null,
}
```

## Implementation plan

1. **Crear `context/GroupContext.tsx`.** `GroupProvider` que, cuando hay `session` (de `AuthContext`), llama `getCurrentUserGroupId(userId)` (ya existe en `lib/group.ts`) y si devuelve un id, trae `getGroupDetails` + `getGroupMembers`; expone `{ groupId, groupName, joinCode, members, loading, error, refresh, leaveGroup }`. Envolver `app/_layout.tsx` con `GroupProvider` dentro de `AuthProvider`. Test: loguear el estado por consola tras iniciar sesión y confirmar que `loading` pasa a `false` reflejando el grupo real (o `null` si no tiene).

2. **Extender `lib/group.ts`.** Agregar `createGroup(name)` → `supabase.rpc('create_group', { p_name: name })`; `joinGroup(code)` → `supabase.rpc('join_group', { p_code: code })`; `leaveGroup(groupId, userId)` → `delete` en `group_members` filtrando por ambos; `getGroupDetails(groupId)` → `select` en `groups`; `getGroupMembers(groupId)` → `select user_id` en `group_members` + `select display_name` en `profiles` con `.in('id', userIds)`. Test: invocarlas manualmente con un usuario de prueba y confirmar en el dashboard de Supabase que las filas se crean/asocian/borran correctamente.

3. **Crear pantalla `app/group-setup.tsx`.** Formulario Pip-Boy con dos modos (`crear` / `unirse`): modo crear pide nombre y llama `createGroup`; modo unirse pide código (6 caracteres) y llama `joinGroup`; en ambos casos, al resolver con éxito llama `refresh()` del `GroupContext`. Muestra errores estilizados (ej. "CÓDIGO INVÁLIDO O EXPIRADO" del RPC). Test: navegar manualmente a la ruta, crear un grupo con nombre válido y confirmar que aparece en Supabase con el usuario como `owner` y miembro.

4. **Wiring de redirección en `app/_layout.tsx`.** Ampliar el efecto de redirección existente: si `!authLoading && !groupLoading`, entonces — sin sesión → `(auth)/login` (como hoy); con sesión y `groupId === null` → `group-setup`; con sesión y `groupId` presente y está en `(auth)/*` o `group-setup` → `(tabs)`. Test: registrar una cuenta nueva (sin fila en `group_members`) y confirmar que tras login cae en `group-setup` en vez de las tabs; crear o unirse a un grupo ahí y confirmar que pasa a `(tabs)` automáticamente.

5. **Actualizar `app/modal.tsx`.** Agregar sección "Mi grupo": nombre del grupo, código de invitación (`joinCode`) mostrado como texto, lista de miembros (`display_name` de `members`), botón "Salir del grupo" (con confirmación) que llama `leaveGroup()` del contexto. Test: abrir el modal con un grupo activo y verificar que se ven nombre/código/miembros correctos; tocar "salir" y confirmar que redirige a `group-setup` y que la fila desaparece de `group_members` en Supabase.

6. **Actualizar `hooks/useLocationTransmission.ts`.** Reemplazar la llamada directa a `getCurrentUserGroupId` por leer `groupId` desde `useContext(GroupContext)`, sin cambiar el resto de su comportamiento. Test: repetir el test end-to-end de Spec 03 (activar `TransmitSwitch`, moverse, ver filas nuevas en `live_locations`/`location_history`) y confirmar que sigue funcionando igual, ahora con el `group_id` resuelto vía contexto.

## Acceptance criteria

- [ ] Un usuario recién registrado (sin fila en `group_members`) es redirigido a `group-setup` en lugar de `(tabs)` al iniciar sesión.
- [ ] Desde `group-setup`, crear un grupo con un nombre válido crea una fila en `groups` (con `owner_id` = usuario actual) y una fila en `group_members` para ese mismo usuario, y lo lleva automáticamente a `(tabs)`.
- [ ] Desde `group-setup`, unirse con un código válido (`join_code` existente) agrega al usuario a `group_members` de ese grupo y lo lleva automáticamente a `(tabs)`.
- [ ] Unirse con un código inválido o inexistente muestra un error estilizado Pip-Boy (no el texto crudo de Supabase) y no crea ninguna fila.
- [ ] Un usuario que ya pertenece a un grupo nunca ve la pantalla `group-setup` al reabrir la app (entra directo a `(tabs)`).
- [ ] En `app/modal.tsx`, un usuario con grupo ve el nombre del grupo, su `join_code` y la lista de `display_name` de todos los miembros (incluido él mismo).
- [ ] Si dos usuarios distintos se unen al mismo grupo (uno crea, otro se une con el código), ambos ven los mismos datos de grupo y a ambos en la lista de miembros.
- [ ] Tocar "Salir del grupo" en el modal borra la fila del usuario en `group_members`, lo redirige a `group-setup`, y el grupo sigue existiendo para los demás miembros (si los hay).
- [ ] Tras salir de un grupo, el usuario puede crear uno nuevo o unirse a otro sin quedar bloqueado.
- [ ] `useLocationTransmission` sigue transmitiendo correctamente a `live_locations`/`location_history` (criterios de Spec 03 intactos), ahora resolviendo `group_id` desde `GroupContext` en lugar de una llamada propia.
- [ ] No hay errores de Supabase (RLS, RPC) al crear, unirse o salir de un grupo con un usuario autenticado válido.

## Decisions

- **Sí:** vinculación por código de invitación (`join_code`), no por email/invitación aceptada. Es más simple, no requiere que el otro familiar ya esté registrado de antemano ni tabla de invitaciones pendientes; el schema ya lo soporta.
- **No:** compartir el código vía share sheet nativo. Se muestra en pantalla y se comparte por fuera de la app (WhatsApp, de palabra, etc.); agregar el share sheet es una mejora menor diferible.
- **Sí:** un solo grupo por usuario. Mantiene el supuesto ya usado en Spec 03 (`getCurrentUserGroupId`); evita selector de grupo activo y simplifica RLS/UI.
- **Sí:** pantalla `group-setup` obligatoria (gate) antes de entrar a `(tabs)` si el usuario no tiene grupo. Evita el estado de error silencioso que hoy produce `useLocationTransmission` cuando `group_id` es `null`, y resuelve el problema de raíz en vez de solo mostrar un mensaje de error.
- **Sí:** `GroupContext` como fuente única de verdad del grupo actual, reemplazando la llamada directa a `getCurrentUserGroupId` dentro de `useLocationTransmission`. Evita resolver el grupo dos veces (gate + transmisión) y dos fuentes de verdad divergentes, sin cambiar el comportamiento externo de Spec 03.
- **Sí:** cualquier miembro (incluido el creador) puede salir del grupo, y el grupo persiste con los miembros restantes. Es la opción menos disruptiva; no hay lógica especial de "transferir ownership" porque `owner_id` no afecta ninguna funcionalidad visible en esta spec.
- **No:** expulsar miembros (kick) desde la UI, aunque la policy RLS `members_delete` ya lo permite para el `owner`. No fue pedido; se difiere a una spec futura si hace falta.
- **No:** editar el nombre del grupo, regenerar/expirar el `join_code`, o borrar el grupo explícitamente desde la app. El schema soporta parte de esto (`code_expires_at`, policy `groups_delete`) pero no se expone UI en esta spec — quedan como mejoras futuras si se necesitan.
- **No:** ejecutar o modificar SQL en esta spec. El schema completo (tablas, RPCs, RLS, Realtime) ya está aplicado en el proyecto Supabase real; esta spec solo consume lo que ya existe.
- **No:** mostrar ubicación/recorrido de otros miembros del grupo en el mapa. Explícitamente diferido a Spec 05 — esta spec es solo "vincularse", no "verse".

## Identified risks

| Risk                                                                                                                                                                                                      | Mitigation                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carrera entre `AuthContext.loading` y `GroupContext.loading` al iniciar la app, causando un flash hacia `(tabs)` o `group-setup` antes de resolver el estado real.                                        | La redirección en `app/_layout.tsx` espera explícitamente a que **ambos** `loading` sean `false` antes de decidir a dónde navegar (igual patrón que ya usa Spec 01 para `session`).                                           |
| Un usuario sale del grupo (`leaveGroup`) mientras el `TransmitSwitch` está en ON: la fila de `live_locations` queda con un `group_id` al que ya no pertenece, y la policy RLS bloquea futuras escrituras. | Al salir del grupo, `GroupContext.leaveGroup()` también apaga la transmisión (equivalente a poner el switch en OFF) antes de borrar la membresía, evitando escrituras huérfanas.                                              |
| Un usuario intenta unirse a un grupo al que ya pertenece (código reingresado).                                                                                                                            | El RPC `join_group` usa `on conflict do nothing`; no lanza error, simplemente no duplica la fila — la app trata esto como éxito normal.                                                                                       |
| Falla de red durante `createGroup`/`joinGroup`.                                                                                                                                                           | Ambos RPCs son transaccionales en el propio Postgres (una sola función `plpgsql`), así que no puede quedar un estado a medias (grupo creado sin membresía, etc.); si falla la llamada, no se creó nada y se puede reintentar. |
| El código de invitación es case-sensitive para quien lo transcribe de palabra o a mano.                                                                                                                   | `join_group` normaliza con `upper(p_code)` en el propio SQL; la app puede mostrar el input en mayúsculas para reforzarlo visualmente, pero no es estrictamente necesario para que funcione.                                   |
