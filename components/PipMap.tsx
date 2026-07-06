"use dom";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  routePoints: { lat: number; lng: number }[];
  otherMembers: OtherMember[];
  dom: import("expo/dom").DOMProps;
}

type FollowTarget =
  | { type: "self" }
  | { type: "member"; userId: string }
  | { type: "none" };

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
  targetCoords,
}: {
  targetCoords: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (targetCoords) {
      map.setView([targetCoords.lat, targetCoords.lng], map.getZoom(), {
        animate: true,
      });
    }
  }, [targetCoords, map]);

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

function DragUnfollow({ onDragStart }: { onDragStart: () => void }) {
  const map = useMap();

  useEffect(() => {
    map.on("dragstart", onDragStart);
    return () => {
      map.off("dragstart", onDragStart);
    };
  }, [map, onDragStart]);

  return null;
}

function RecenterFab({
  lat,
  lng,
  followTargetType,
  onRecenter,
}: {
  lat: number;
  lng: number;
  followTargetType: "self" | "member" | "none";
  onRecenter: () => void;
}) {
  const map = useMap();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  const handleClick = () => {
    onRecenter();
    map.setView([lat, lng], map.getZoom(), { animate: true });
  };

  const fabClassName =
    followTargetType === "self"
      ? "pip-fab-active"
      : followTargetType === "member"
        ? "pip-fab-following-member"
        : "pip-fab-inactive";

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Recentrar en mi posición"
      aria-pressed={followTargetType === "self"}
      className={`pip-fab ${fabClassName}`}
      onClick={handleClick}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <line x1="12" y1="1" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="23" />
        <line x1="1" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="23" y2="12" />
      </svg>
    </button>
  );
}

export default function PipMap({
  lat,
  lng,
  accuracy,
  routePoints = [],
  otherMembers = [],
}: Props) {
  const [followTarget, setFollowTarget] = useState<FollowTarget>({
    type: "self",
  });
  const handleDragStart = useCallback(
    () => setFollowTarget({ type: "none" }),
    [],
  );
  const handleRecenter = useCallback(
    () => setFollowTarget({ type: "self" }),
    [],
  );
  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);
  const targetCoords = useMemo<{ lat: number; lng: number } | null>(() => {
    if (followTarget.type === "self") return { lat, lng };
    if (followTarget.type === "member") {
      const member = otherMembers.find(
        (m) => m.userId === followTarget.userId,
      );
      return member ? { lat: member.lat, lng: member.lng } : null;
    }
    return null;
  }, [followTarget, lat, lng, otherMembers]);
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
        .pip-fab {
          position: absolute;
          right: 16px;
          bottom: 44px;
          z-index: 1000;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .pip-fab-active {
          background: #21FF6C;
          color: #0A0F0A;
          border: 2px solid #21FF6C;
          box-shadow: 0 0 10px 2px rgba(33, 255, 108, 0.6);
        }
        .pip-fab-inactive {
          background: rgba(10, 15, 10, 0.75);
          color: #21FF6C;
          border: 2px solid #3DCC7D;
        }
        .pip-fab-following-member {
          background: #FFB642;
          color: #0A0F0A;
          border: 2px solid #FFB642;
          box-shadow: 0 0 10px 2px rgba(255, 182, 66, 0.6);
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
            icon={otherMemberIcon}
            eventHandlers={{
              click: () =>
                setFollowTarget({ type: "member", userId: member.userId }),
            }}>
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
        <FollowOnUpdate targetCoords={targetCoords} />
        <SizeToViewport />
        <DragUnfollow onDragStart={handleDragStart} />
        <RecenterFab
          lat={lat}
          lng={lng}
          followTargetType={followTarget.type}
          onRecenter={handleRecenter}
        />
      </MapContainer>
    </>
  );
}
