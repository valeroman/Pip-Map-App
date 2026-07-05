"use dom";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

// Android's WebView renders pages without a viewport meta tag by default,
// laying them out like a desktop page. That breaks every height:100%/vh
// chain in this file (html/body/#root all compute to 0), leaving Leaflet
// with a 0x0 container. Force a real mobile viewport before anything mounts.
if (
  typeof document !== "undefined" &&
  !document.querySelector('meta[name="viewport"]')
) {
  const viewportMeta = document.createElement("meta");
  viewportMeta.name = "viewport";
  viewportMeta.content =
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
  document.head.appendChild(viewportMeta);
}

interface OtherMember {
  userId: string;
  displayName: string;
  lat: number;
  lng: number;
  routePoints: { lat: number; lng: number }[];
}

interface Props {
  lat: number;
  lng: number;
  accuracy: number | null;
  follow: boolean;
  routePoints: { lat: number; lng: number }[];
  otherMembers: OtherMember[];
  dom: import("expo/dom").DOMProps;
}

const pipIcon = L.divIcon({
  className: "pip-marker",
  html: '<div class="pip-marker-pulse"></div><div class="pip-marker-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const otherMemberIcon = L.divIcon({
  className: "pip-marker-other",
  html: '<div class="pip-marker-other-pulse"></div><div class="pip-marker-other-dot"></div>',
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

// Android WebView has been observed computing `vh`/`vw` (and ancestor-based
// `%`) as 0 for this container, leaving Leaflet with a 0x0 map. Size it in
// real pixels from window dimensions instead, which is unaffected by that.
function SizeToViewport() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const applySize = () => {
      container.style.width = `${window.innerWidth}px`;
      container.style.height = `${window.innerHeight}px`;
      map.invalidateSize();
    };

    applySize();
    window.addEventListener("resize", applySize);
    return () => window.removeEventListener("resize", applySize);
  }, [map]);

  return null;
}

export default function PipMap({
  lat,
  lng,
  accuracy,
  follow,
  routePoints = [],
  otherMembers = [],
}: Props) {
  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);
  const routePositions = useMemo<[number, number][]>(
    () => routePoints.map((p) => [p.lat, p.lng]),
    [routePoints],
  );

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
        .pip-marker-other-dot {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #FFB642;
          box-shadow: 0 0 6px 2px rgba(255, 182, 66, 0.9);
        }
        .pip-marker-other-pulse {
          position: absolute;
          top: 0;
          left: 0;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255, 182, 66, 0.6);
          animation: pip-pulse 1.4s ease-out infinite;
        }
        .leaflet-popup-content-wrapper {
          background: #152218;
          color: #21FF6C;
          border: 1px solid #3DCC7D;
          border-radius: 0;
        }
        .leaflet-popup-tip {
          background: #152218;
        }
      `}</style>
      <MapContainer center={center} zoom={20} zoomControl={false}>
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
        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#21FF6C",
              weight: 4,
              opacity: 0.9,
            }}
          />
        )}
        <Marker position={center} icon={pipIcon} />
        {otherMembers.map((member) => (
          <Marker
            key={member.userId}
            position={[member.lat, member.lng]}
            icon={otherMemberIcon}>
            <Popup>{member.displayName}</Popup>
          </Marker>
        ))}
        {otherMembers.map(
          (member) =>
            member.routePoints.length > 1 && (
              <Polyline
                key={`route-${member.userId}`}
                positions={member.routePoints.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  color: "#FFB642",
                  weight: 4,
                  opacity: 0.9,
                }}
              />
            ),
        )}
        <FollowOnUpdate lat={lat} lng={lng} follow={follow} />
        <SizeToViewport />
      </MapContainer>
    </>
  );
}
