"use dom";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

interface Props {
  lat: number;
  lng: number;
  accuracy: number | null;
  follow: boolean;
  dom: import("expo/dom").DOMProps;
}

const pipIcon = L.divIcon({
  className: "pip-marker",
  html: '<div class="pip-marker-pulse"></div><div class="pip-marker-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FollowOnUpdate({
  lat,
  lng,
  follow,
}: {
  lat: number;
  lng: number;
  follow: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (follow) {
      map.setView([lat, lng], map.getZoom(), { animate: true });
    }
  }, [lat, lng, follow, map]);

  return null;
}

// The WebView may not have resolved its layout yet when Leaflet first
// measures the container, so the map can initialize at 0x0 and never
// recompute on its own. Re-measure once mounted and on every resize.
function InvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);

    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function PipMap({ lat, lng, accuracy, follow }: Props) {
  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);

  return (
    <>
      <style>{`
        html, body, #root { height: 100%; width: 100%; margin: 0; background: #0A0F0A; }
        .leaflet-container {
          width: 100vw;
          height: 100vh;
          background: #0A0F0A;
        }
        .leaflet-tile-pane {
          filter: grayscale(1) sepia(1) hue-rotate(60deg) saturate(3) brightness(0.7);
        }
        .leaflet-control-attribution {
          background: rgba(10, 15, 10, 0.75) !important;
          color: #3DCC7D !important;
        }
        .leaflet-control-attribution a {
          color: #21FF6C !important;
        }
        .pip-marker-dot {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #21FF6C;
          box-shadow: 0 0 6px 2px rgba(33, 255, 108, 0.9);
        }
        .pip-marker-pulse {
          position: absolute;
          top: 0;
          left: 0;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(33, 255, 108, 0.6);
          animation: pip-pulse 1.4s ease-out infinite;
        }
        @keyframes pip-pulse {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={17}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {accuracy != null && (
          <Circle
            center={center}
            radius={accuracy}
            pathOptions={{
              color: "#21FF6C",
              fillColor: "#21FF6C",
              fillOpacity: 0.12,
              weight: 1,
            }}
          />
        )}
        <Marker position={center} icon={pipIcon} />
        <FollowOnUpdate lat={lat} lng={lng} follow={follow} />
        <InvalidateOnResize />
      </MapContainer>
    </>
  );
}
