# SPEC 08 — Mostrar el nombre del propio usuario en el header

> **Status:** Aprobado
> **Depends on:** SPEC 01 (login/registro Supabase: `display_name` en `user_metadata`), SPEC 05/06 (`StatusBarHeader` ya presente en la pantalla del mapa)
> **Date:** 2026-07-13
> **Objective:** Mostrar el `display_name` del usuario autenticado en el header (`StatusBarHeader`) de la pantalla del mapa, en modo solo lectura, para que sepa con qué identidad está logueado.

## Scope

**In:**

- `components/StatusBarHeader.tsx`: nueva prop opcional `userName?: string`. El bloque central del header pasa de un solo `PipText` (título) a una pila vertical: el título `'Vault-Tec Pip-Map'` arriba (igual que hoy) y, debajo, el `userName` en `variant="small"` atenuado. La línea del nombre solo se renderiza si `userName` viene definido (sin prop, el header se ve exactamente como hoy).
- `app/(tabs)/index.tsx`: derivar el nombre a mostrar desde `useAuth()` — `session.user.user_metadata?.display_name ?? session.user.email?.split('@')[0] ?? 'Usuario'` (mismo patrón que `ensureProfile`) — y pasarlo como `userName` a `StatusBarHeader`.

**Out of scope (specs futuras):**

- Editar / cambiar el `display_name` (perfil editable).
- Mostrar el nombre propio en el mapa (píldora u overlay propio junto a `SEÑAL`/`SUJETOS`).
- Distinguir "tú" dentro de la lista de miembros del modal (`app/modal.tsx`).
- Leer el nombre desde la tabla `profiles` o desde `GroupContext.members` (se usa la sesión).
- Avatar, foto o cualquier dato de perfil más allá del nombre.

## Data model

No se crean tablas, structs ni datos persistentes nuevos. Solo se agrega una prop de presentación:

```ts
// components/StatusBarHeader.tsx
type Props = {
  title?: string;
  userName?: string; // nuevo — display_name del usuario actual; si es undefined no se renderiza la línea
  onLogout?: () => void;
  loggingOut?: boolean;
};
```

El valor se lee de la sesión ya cargada (`useAuth()`), sin query adicional a Supabase.

## Implementation plan

1. **`components/StatusBarHeader.tsx`: prop `userName` + layout apilado.** Agregar `userName?: string` a `Props`. Envolver el título en una `View` central (columna): el `PipText` del título como hoy y, condicional a `userName`, un segundo `PipText variant="small"` con el nombre en color atenuado (`colors.textDim` o `colors.primaryDim`). Mantener el `row` como `space-between` (hora | bloque central | señal+logout). Test: renderizar con `userName="ROMAN"` y verificar dos líneas centradas; sin la prop, idéntico a hoy.

2. **`app/(tabs)/index.tsx`: derivar y pasar el nombre.** Con `const { session } = useAuth();`, calcular `const userName = session ? (session.user.user_metadata?.display_name ?? session.user.email?.split('@')[0] ?? 'Usuario') : undefined;` (envuelto en `useMemo` sobre `session`), y pasarlo a `<StatusBarHeader userName={userName} onLogout={handleLogout} loggingOut={loggingOut} />`. Test end-to-end: logueado, el header muestra el nombre real bajo el título; hacer logout e ingresar con otra cuenta y confirmar que el nombre cambia.

## Acceptance criteria

- [ ] El header de la pantalla del mapa muestra el `display_name` del usuario logueado, debajo del título `'Vault-Tec Pip-Map'`.
- [ ] Si el usuario no tiene `display_name` en `user_metadata`, se muestra el prefijo del email; si tampoco hay email, `'Usuario'`.
- [ ] Al cerrar sesión e ingresar con otra cuenta, el nombre mostrado cambia al de la nueva cuenta.
- [ ] El título `'Vault-Tec Pip-Map'` sigue visible (no se reemplaza por el nombre).
- [ ] No se dispara ninguna query extra a Supabase para obtener el nombre (se lee de la sesión ya cargada).
- [ ] No existe forma de editar el nombre desde esta pantalla (solo lectura).
- [ ] No hay errores en consola al montar la pantalla ni al cambiar de cuenta.

## Decisions

- **Sí:** leer el nombre de `session.user.user_metadata` vía `useAuth()`, no de la tabla `profiles` ni de `GroupContext.members`. Es instantáneo, sin red, ya está en la sesión persistida, y no depende de pertenecer a un grupo.
- **Sí:** fallback `display_name → prefijo del email → 'Usuario'`, replicando el patrón de `ensureProfile` (`AuthContext.tsx:26`) para consistencia de comportamiento.
- **Sí:** mostrar el nombre en `StatusBarHeader`, apilado bajo el título, conservando el branding `'Vault-Tec Pip-Map'`. Es el lugar natural para la identidad y no compite con las píldoras `SEÑAL`/`SUJETOS` del mapa.
- **No:** editar/cambiar el `display_name`. Solo lectura en esta spec; la edición de perfil se difiere a una spec futura.
- **No:** mostrar el nombre propio en el mapa (píldora u overlay). Descartado a favor del header.
- **No:** extraer un helper compartido `resolveDisplayName(session)`. La expresión es de una línea y se replica inline; no justifica un módulo nuevo (si se repite una tercera vez, se reevalúa).

## Identified risks

| Risk                                                             | Mitigation                                                                                                                                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session` momentáneamente `null` durante la hidratación de auth. | `MapScreen` solo se renderiza tras el gate de sesión en `app/_layout.tsx`; aun así, con `session` null no se pasa `userName` y el header se ve como hoy (sin línea de nombre), sin romperse. |
| `display_name` muy largo desborda el header.                     | Aplicar `numberOfLines={1}` / recorte en el `PipText` del nombre; el header ya tiene ancho fijo por el layout `space-between`.                                                               |
