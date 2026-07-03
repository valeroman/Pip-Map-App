# SPEC 02 — Mapa Leaflet + OpenStreetMap con ubicación en tiempo real

> **Status:** Aprobado
> **Depends on:** 01-login-registro-supabase (la pantalla del mapa vive dentro de las rutas protegidas `(tabs)`)
> **Date:** 2026-07-03
> **Objective:** Reemplazar el placeholder del mapa por un mapa Leaflet + OpenStreetMap real que muestre y siga mi propia ubicación GPS en tiempo real, con estética Pip-Boy.

## Scope

**In:**

- Dependencias: `expo-location`, `react-native-webview`, `leaflet`, `react-leaflet` (+ `@types/leaflet`).
- Componente DOM `components/PipMap.tsx` (`"use dom"`): renderiza `MapContainer` + `TileLayer` (OSM) y un marcador `DivIcon` estilo Pip-Boy en la posición actual, con círculo de precisión.
- Filtro CSS verde Pip-Boy sobre los tiles OSM (`.leaflet-tile-pane`).
- Auto-follow: el mapa recentra automáticamente sobre el marcador cuando llegan nuevas coordenadas.
- Hook `hooks/useLocation.ts`: pide permiso y hace `watchPositionAsync` (updates continuos), expone `{ coords, accuracy, status, error }`.
- Configuración de permisos de ubicación en `app.json` (plugin `expo-location` + strings iOS/Android, solo foreground).
- Integración en `app/(tabs)/index.tsx`: reemplaza el placeholder; conecta las píldoras `SEÑAL` (calidad según accuracy) y estados de UI.
- Estados de UI Pip-Boy: solicitando permiso, permiso denegado (con botón "ABRIR AJUSTES"), adquiriendo posición, sin señal.

**Out of scope (specs futuras):**

- Transmitir mi lat/lng a Supabase para que otros me vean (el `TransmitSwitch` queda inerte) → Spec 03.
- Mostrar la ubicación de OTROS usuarios / la píldora `SUJETOS` (queda en `00`).
- Ubicación en background (solo foreground mientras la app está abierta).
- Mapas offline / cache de tiles.
- Marcadores, rutas, geofencing, o cualquier capa sobre el mapa más allá de mi posición.
- Selector de estilo de tiles o proveedores alternativos.

## Data model

No introduce estructuras persistidas. Solo estado en cliente.

Estado del hook `useLocation` (`hooks/useLocation.ts`):

```ts
{
  coords: { lat: number; lng: number } | null,
  accuracy: number | null,              // metros
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable',
  error: string | null,
}
```

Props del DOM component `PipMap` (solo serializables):

```ts
{
  lat: number,
  lng: number,
  accuracy: number | null,
  follow: boolean,                       // recentrar al llegar nuevas coords
  dom: import('expo/dom').DOMProps,
}
```

## Implementation plan

1. **Instalar dependencias.** `npx expo install expo-location react-native-webview` (webview es el runtime de los DOM components) y `npm i leaflet react-leaflet` + `npm i -D @types/leaflet`. Test: `npx expo start` arranca sin errores de resolución.

2. **Configurar `app.json`.** Agregar plugin `expo-location` con `NSLocationWhenInUseUsageDescription` (iOS) y `locationAlwaysAndWhenInUsePermission` false (solo foreground); permisos Android `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION`. Test: `npx expo prebuild --no-install` (o dev-client) no arroja errores de config.

3. **Crear `hooks/useLocation.ts`.** `requestForegroundPermissionsAsync` → si denegado, `status='denied'`; si concedido, `watchPositionAsync({ accuracy: High, timeInterval, distanceInterval })` y actualizar `coords`/`accuracy` en cada tick; limpiar la suscripción en el cleanup del `useEffect`. Test: loguear `coords` por consola en un dispositivo/emulador y ver que actualiza al moverse.

4. **Crear `components/PipMap.tsx` (`"use dom"`).** `import 'leaflet/dist/leaflet.css'` + CSS Pip-Boy inline. `MapContainer` con `TileLayer` OSM (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, atribución OSM). Marcador con `L.divIcon` (punto verde pulsante, reutiliza el look de `PulsingDot`) + `Circle` de radio = accuracy. Sub-componente interno con `useMap()` que hace `map.setView([lat,lng])` en `useEffect` cuando `follow` y cambian las coords. Filtro CSS: `.leaflet-tile-pane { filter: grayscale(1) sepia(1) hue-rotate(60deg) saturate(3) brightness(.7) }` (afinar). Test: montar con coords fijas y ver el mapa verde centrado.

5. **Integrar en `app/(tabs)/index.tsx`.** Reemplazar el bloque `mapCenter` placeholder: usar `useLocation()`; si `status==='granted' && coords` → `<PipMap lat lng accuracy follow dom={{scrollEnabled:false}} />` ocupando el área del mapa; si no, mostrar el estado Pip-Boy correspondiente (solicitando / adquiriendo / denegado con botón `Linking.openSettings` / sin señal). Píldora `SEÑAL`: `ESTABLE` si accuracy ≤ ~30m, `DÉBIL` si mayor, `—` sin fix. `SUJETOS` sigue en `00`. Test end-to-end (abajo).

## Acceptance criteria

- [ ] La app instala y arranca sin errores tras agregar las dependencias.
- [ ] Al abrir la pantalla del mapa por primera vez, se solicita permiso de ubicación (foreground).
- [ ] Con permiso concedido, se ve un mapa Leaflet con tiles de OpenStreetMap teñidos en verde Pip-Boy.
- [ ] Aparece un marcador en mi posición actual con un círculo de precisión acorde a la accuracy.
- [ ] Al moverme (o cambiar la posición simulada del emulador), el marcador se actualiza y el mapa recentra automáticamente sobre él.
- [ ] Si deniego el permiso, se muestra un estado Pip-Boy "PERMISO DENEGADO" con botón que abre los ajustes del sistema.
- [ ] Mientras aún no hay fix de GPS, se muestra "ADQUIRIENDO POSICIÓN…" en lugar del mapa vacío.
- [ ] La píldora `SEÑAL` refleja la calidad del fix (ESTABLE / DÉBIL / —) según la accuracy.
- [ ] El `TransmitSwitch` sigue siendo un toggle visual sin efecto (no transmite nada).
- [ ] La suscripción de `watchPositionAsync` se limpia al desmontar la pantalla (sin warnings de leak).

## Decisions

- **Sí:** DOM component (`"use dom"`) + `react-leaflet`. Leaflet es web; el DOM component de SDK 57 corre el mismo código en WebView (nativo) y as-is (web), sin escribir HTML a mano. react-leaflet v5 requiere React 19 (ya lo tenemos).
- **No:** `react-native-webview` con string HTML inline. Descartado: pasar datos y estilos es más artesanal y no reutiliza el modelo de props de React.
- **No:** librería de mapa nativa (react-native-maps / Google/Apple). El pedido es explícitamente Leaflet + OSM, y evita API keys.
- **Sí:** `watchPositionAsync` con auto-follow. Es "tiempo real"; el mapa sigue al usuario.
- **Sí:** marcador con `L.divIcon` (punto Pip-Boy), no el marker por defecto de Leaflet. Los iconos por defecto se rompen con bundlers y además el DivIcon encaja con la estética.
- **Sí:** filtro CSS verde sobre los tiles. Mantiene coherencia con el CRT verde de la app.
- **No:** transmitir ubicación a Supabase ni mostrar otros usuarios. Fuera de alcance → Spec 03. Esta spec es solo "ver MI ubicación".
- **No:** ubicación en background. Solo foreground; simplifica permisos y evita revisiones de tienda.

## Identified risks

- **Iconos/assets de Leaflet en el WebView del DOM component.** Mitigado usando `L.divIcon` (CSS) en vez de imágenes de marker.
- **Tiles OSM requieren red.** Sin conexión el mapa queda gris; aceptable (offline fuera de alcance). Respetar la política de uso de tiles de OSM (atribución + volumen razonable).
- **Simular ubicación en emulador.** El GPS real no existe en emulador; verificar con la posición simulada del emulador/simulador.
- **Rendimiento del WebView.** Un solo mapa liviano; si hay jank, perfilar (nota del skill use-dom).
