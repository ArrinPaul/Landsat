
"use client";

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// Next.js bundles Leaflet's default marker icon assets under paths the library can't resolve at
// runtime; not used for polygon drawing, but leaflet-draw references the default icon class, so
// this avoids broken-icon requests. Point it at Leaflet's own CDN-hosted assets instead.
const DEFAULT_ICON_BASE = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/";
// @ts-expect-error - _getIconUrl exists at runtime but isn't in the public Icon.Default type.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: `${DEFAULT_ICON_BASE}marker-icon-2x.png`,
  iconUrl: `${DEFAULT_ICON_BASE}marker-icon.png`,
  shadowUrl: `${DEFAULT_ICON_BASE}marker-shadow.png`,
});

export interface FlyToTarget {
  latitude: number;
  longitude: number;
  boundingBox?: [number, number, number, number]; // [south, north, west, east]
  // Bump this on every search selection (even re-selecting the same place) so the effect fires.
  token: number;
}

interface BoundaryMapProps {
  center: [number, number]; // [lat, lon]
  initialPolygon?: [number, number][]; // [lng, lat] pairs
  onPolygonChange: (coords: [number, number][] | null) => void;
  flyTo?: FlyToTarget | null;
}

function FlyToController({ flyTo }: { flyTo?: FlyToTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (!flyTo) return;
    if (flyTo.boundingBox) {
      const [south, north, west, east] = flyTo.boundingBox;
      map.fitBounds([
        [south, west],
        [north, east],
      ]);
    } else {
      map.flyTo([flyTo.latitude, flyTo.longitude], 15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo?.token]);
  return null;
}

// Converts a Leaflet layer's lat/lngs into a closed [lng, lat] ring matching GeoJSON order.
function layerToRing(layer: any): [number, number][] {
  const latlngs: { lat: number; lng: number }[] = layer.getLatLngs()[0];
  const ring: [number, number][] = latlngs.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }
  return ring;
}

export default function BoundaryMap({ center, initialPolygon, onPolygonChange, flyTo }: BoundaryMapProps) {
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  // Draw the restored polygon (from history) once, on mount.
  useEffect(() => {
    const group = featureGroupRef.current;
    if (!group || !initialPolygon || initialPolygon.length < 4) return;
    const latlngs = initialPolygon.map(([lng, lat]) => L.latLng(lat, lng));
    const polygon = L.polygon(latlngs);
    group.addLayer(polygon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreated = (e: any) => {
    // Boundary drawing is single-shape: replace any previously drawn polygon.
    const group = featureGroupRef.current;
    if (group) {
      group.eachLayer((layer) => {
        if (layer !== e.layer) group.removeLayer(layer);
      });
    }
    onPolygonChange(layerToRing(e.layer));
  };

  const handleEdited = (e: any) => {
    let ring: [number, number][] | null = null;
    e.layers.eachLayer((layer: any) => {
      ring = layerToRing(layer);
    });
    onPolygonChange(ring);
  };

  const handleDeleted = () => {
    onPolygonChange(null);
  };

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border">
      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToController flyTo={flyTo} />
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
            draw={{
              polygon: {
                allowIntersection: false,
                showArea: true,
                shapeOptions: { color: "#22c55e" },
              },
              polyline: false,
              rectangle: false,
              circle: false,
              marker: false,
              circlemarker: false,
            }}
          />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
}
