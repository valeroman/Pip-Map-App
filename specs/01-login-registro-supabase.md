# SPEC 01 — Login y registro con Supabase Auth

> **Status:** Aprobado
> **Depends on:** Ninguna (primera spec del proyecto)
> **Date:** 2026-07-02
> **Objective:** Implementar login y registro con Supabase Auth (email/password), con sesión persistente y rutas protegidas, respetando el estilo visual Pip-Boy existente.

## Scope

**In:**

- Cliente Supabase (`lib/supabase.ts`) configurado con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Pantalla de login (`app/(auth)/login.tsx`): email + password.
- Pantalla de registro (`app/(auth)/register.tsx`): email + password + display_name, inserta fila en `profiles`.
- Persistencia de sesión con `@react-native-async-storage/async-storage`.
- Redirección automática: sin sesión → `(auth)/login`; con sesión → `(tabs)`.
- Botón de logout en `app/modal.tsx`.
- Validaciones mínimas en cliente: email con formato válido, password ≥ 6 caracteres.
- Mensajes de error de Supabase traducidos/estilizados en español como alerta Pip-Boy (ej: "ACCESO DENEGADO", "CREDENCIALES INVÁLIDAS").
- Estados de carga (loading) en botones de submit.

**Out of scope (for future specs):**

- Recuperar / resetear contraseña.
- Login social (Google, Apple, etc.) o magic link.
- Edición de perfil (cambiar display_name, avatar) después del registro.
- Pantalla de confirmación de email por link (se asume que la confirmación de email está desactivada en el proyecto Supabase; si está activada, el usuario deberá manejarlo manualmente por ahora).
- Transmisión y recepción de latitud/longitud en tiempo real (Spec 02).
- Roles o permisos diferenciados entre usuarios.

## Data model

Tabla `profiles` (ya existe en Supabase, no se crea en esta spec):

```sql
-- profiles
id            uuid        -- FK a auth.users.id
display_name  text
created_at    timestamptz
```

Al registrarse, se inserta una fila:

```js
{ id: user.id, display_name: displayName }
```

Estado de auth en cliente (`context/AuthContext.tsx`):

```js
{
  session: Session | null,   // de supabase-js
  loading: boolean,          // true mientras se resuelve la sesión inicial
}
```

Variables de entorno (`.env`, prefijo `EXPO_PUBLIC_` porque se leen en cliente):

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Implementation plan

1. Instalar dependencias: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`. Agregar `.env` con `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (placeholders hasta que pases las credenciales reales).
2. Crear `lib/supabase.ts`: cliente inicializado con `AsyncStorage` como storage, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`. Manual test: `import { supabase }` en cualquier pantalla sin errores de arranque.
3. Crear `components/PipInput.tsx`: input de texto con estilo Pip-Boy (reutiliza `colors`/`fonts` de `theme/`), consistente con `PipButton`. Manual test: montarlo en la pantalla `two.tsx` temporalmente, ver que renderiza con el estilo correcto.
4. Crear `context/AuthContext.tsx`: `AuthProvider` + hook `useAuth()`, expone `{ session, loading }`, se suscribe a `supabase.auth.onAuthStateChange`. Envolver `app/_layout.tsx` con `AuthProvider`. Manual test: loguear `session` por consola, confirmar que arranca en `null` y no rompe el árbol de navegación.
5. Crear `app/(auth)/_layout.tsx` (Stack simple) y `app/(auth)/login.tsx`: formulario email/password con `PipInput` + `PipButton`, llama `supabase.auth.signInWithPassword`, muestra error estilizado Pip-Boy si falla. Manual test: navegar manualmente a `/(auth)/login`, intentar login con credenciales inválidas y válidas.
6. Crear `app/(auth)/register.tsx`: formulario email/password/display_name, llama `supabase.auth.signUp` y luego inserta fila en `profiles`. Manual test: registrar un usuario nuevo, verificar en Supabase que aparece en `auth.users` y en `profiles`.
7. Agregar lógica de redirección en `app/_layout.tsx`: si `!loading && !session` → redirigir a `(auth)/login`; si `!loading && session` y está en `(auth)/*` → redirigir a `(tabs)`. Manual test: cerrar sesión manualmente (o limpiar storage) y confirmar que la app abre en login; loguear y confirmar que entra a los tabs.
8. Agregar botón de logout en `app/modal.tsx` que llama `supabase.auth.signOut()`. Manual test: loguear, abrir el modal, tocar logout, confirmar que redirige a login.

## Acceptance criteria

- [ ] Con `.env` configurado, la app arranca sin errores relacionados a Supabase.
- [ ] Sin sesión activa, abrir la app redirige automáticamente a `(auth)/login`.
- [ ] Registrar un usuario nuevo (email, password, display_name) crea una fila en `auth.users` y una fila correspondiente en `profiles` con ese `display_name`.
- [ ] Iniciar sesión con credenciales válidas redirige a `(tabs)`.
- [ ] Iniciar sesión con credenciales inválidas muestra un mensaje de error estilizado en español (no el texto crudo de Supabase en inglés).
- [ ] Intentar registrarse con un email sin formato válido muestra error de validación antes de llamar a Supabase.
- [ ] Intentar registrarse con password de menos de 6 caracteres muestra error de validación antes de llamar a Supabase.
- [ ] Cerrar y reabrir la app (o recargar) con una sesión ya iniciada NO vuelve a pedir login (sesión persistida).
- [ ] Tocar "Cerrar sesión" en el modal cierra la sesión y redirige a `(auth)/login`.
- [ ] Los botones de submit muestran estado de carga mientras se espera la respuesta de Supabase.

## Decisions

- **Sí:** email/password como único método de auth. Simple, control total sobre el estilo de las pantallas.
- **No:** magic link u OAuth social. Fuera de alcance por ahora, se puede sumar en otra spec.
- **Sí:** `@react-native-async-storage/async-storage` para persistir la sesión. Es el storage recomendado por Supabase para RN/Expo, sin límites de tamaño (a diferencia de `expo-secure-store`, que tiene un límite de ~2KB por valor y puede quedarse corto con el objeto de sesión completo).
- **No:** `expo-secure-store` para la sesión. Descartado por el límite de tamaño mencionado arriba.
- **Sí:** insertar en `profiles` desde el cliente después de `signUp`, no vía trigger de Supabase. La tabla ya existe pero no hay trigger configurado; agregar uno queda fuera del alcance de esta spec (es infraestructura de Supabase, no código de la app).
- **Sí:** redirección de rutas protegidas resuelta en `app/_layout.tsx` vía `AuthContext`, no con middleware de Expo Router. Es el patrón estándar y más simple para expo-router v57 sin dependencias extra.
- **No:** confirmación de email por link. Se asume desactivada en el proyecto Supabase; si está activada, no hay pantalla dedicada en esta spec.
- **No:** recuperar contraseña. Diferido a spec futura.
- **Sí:** validaciones mínimas en cliente (formato de email, password ≥6). Evita llamadas innecesarias a Supabase sin sobre-ingenierizar el formulario.

## What is **not** in this spec

- Recuperar / resetear contraseña.
- Login social (Google, Apple, etc.) o magic link.
- Edición de perfil después del registro.
- Pantalla de confirmación de email por link.
- Transmisión y recepción de latitud/longitud en tiempo real (Spec 02).
- Roles o permisos diferenciados entre usuarios.

Cada uno de estos, si se implementa, va en su propia spec.
