import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GITE_COORDS } from "../data/giteData";

const CATEGORY_COLORS = {
  "Sport & Aventure": "#f97316",
  "Rando & Nature": "#10b981",
  "Visite & Patrimoine": "#38bdf8",
  "Terroir & Gastronomie": "#f59e0b"
};

export default function ActivitiesMap({ activities }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [GITE_COORDS.lat, GITE_COORDS.lng],
      zoom: 10,
      scrollWheelZoom: false
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // 1. Marqueur central du Gîte (Chez Aline & SPA - Maleville)
    const giteIcon = L.divIcon({
      className: "custom-gite-pin",
      html: `<div style="
        background: #f59e0b;
        color: #0f172a;
        font-weight: 800;
        font-size: 13px;
        padding: 5px 10px;
        border-radius: 999px;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 14px rgba(0,0,0,0.65);
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      ">🏡 Notre Gîte (Maleville)</div>`,
      iconSize: [165, 32],
      iconAnchor: [82, 16]
    });

    L.marker([GITE_COORDS.lat, GITE_COORDS.lng], { icon: giteIcon, zIndexOffset: 1000 })
      .bindPopup(
        `<div style="font-family: sans-serif; min-width: 200px;">
          <strong style="font-size: 14px; color: #0f172a;">🏡 Chez Aline & SPA (Notre Gîte)</strong>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">140 chemin du Foirail, 12350 Maleville</div>
          <div style="margin-top: 6px;">
            <a href="https://maps.app.goo.gl/qGhqDMQrX2c1n96s7" target="_blank" rel="noreferrer" style="color: #0284c7; font-weight: 700; font-size: 12px;">📍 Ouvrir dans Google Maps →</a>
          </div>
        </div>`
      )
      .addTo(layer);

    // 2. Marqueurs des activités filtrées
    const validCoords = [[GITE_COORDS.lat, GITE_COORDS.lng]];

    (activities || []).forEach((act) => {
      if (typeof act.lat !== "number" || typeof act.lng !== "number") return;
      validCoords.push([act.lat, act.lng]);

      const color = CATEGORY_COLORS[act.category] || "#38bdf8";
      const hotCount = Array.isArray(act.votesHot) ? act.votesHot.length : 0;

      const actIcon = L.divIcon({
        className: "custom-act-pin",
        html: `<div style="
          background: #0f172a;
          color: #f8fafc;
          font-weight: 700;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 999px;
          border: 2px solid ${color};
          box-shadow: 0 3px 10px rgba(0,0,0,0.55);
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        ">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
          <span>${act.locationName || act.title.slice(0, 22)}</span>
          ${hotCount > 0 ? `<span style="color: #fbbf24;">🔥${hotCount}</span>` : ""}
        </div>`,
        iconSize: [150, 26],
        iconAnchor: [75, 13]
      });

      const websiteHtml = act.websiteUrl
        ? `<div style="margin-top: 6px;"><a href="${act.websiteUrl}" target="_blank" rel="noreferrer" style="color: #0284c7; font-weight: 700; font-size: 12px;">🌐 ${act.websiteLabel || "Voir le site officiel"} →</a></div>`
        : "";

      L.marker([act.lat, act.lng], { icon: actIcon })
        .bindPopup(
          `<div style="font-family: sans-serif; max-width: 240px;">
            <div style="font-size: 11px; font-weight: 700; color: ${color}; text-transform: uppercase;">${act.category}</div>
            <strong style="font-size: 13.5px; color: #0f172a; display: block; margin-top: 2px;">${act.title}</strong>
            <div style="font-size: 12px; color: #d97706; font-weight: 700; margin-top: 4px;">🚗 ${act.distanceFromGite || act.day || "Autour du gîte"}</div>
            <div style="font-size: 11.5px; color: #334155; margin-top: 4px;">${act.description.slice(0, 120)}…</div>
            ${websiteHtml}
          </div>`
        )
        .addTo(layer);
    });

    if (validCoords.length > 1) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 12 });
    }
  }, [activities]);

  return (
    <div className="card" style={{ padding: "1.1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.85rem" }}>
        <div>
          <h3 style={{ fontSize: "1.18rem", fontWeight: 800 }}>
            🗺️ Carte Interactive des Activités & Distances depuis notre Gîte
          </h3>
          <p style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
            Clique sur un lieu sur la carte pour voir l'activité, le temps de route depuis notre lieu de couchage (🏡 Maleville) et ouvrir le site officiel.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.76rem" }}>
          <span className="badge" style={{ borderColor: "#f97316", color: "#fdba74" }}>● Sport & Aventure</span>
          <span className="badge" style={{ borderColor: "#10b981", color: "#6ee7b7" }}>● Rando & Nature</span>
          <span className="badge" style={{ borderColor: "#38bdf8", color: "#7dd3fc" }}>● Visite & Patrimoine</span>
          <span className="badge" style={{ borderColor: "#f59e0b", color: "#fde68a" }}>● Terroir & Vignobles</span>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "440px",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid var(--border-subtle)"
        }}
      />
    </div>
  );
}
