import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [map]);

  return null;
}

export default function MapWidget({ title, latitude, longitude }) {
  const position = [latitude ?? -6.914744, longitude ?? 107.60981];

  return (
    <div className="widget-bento-card" style={{ padding: 16 }}>
      <div className="card-header-bento" style={{ marginBottom: 10 }}>
        <h3>
          <span className="card-header-icon">
            <MapPin size={16} />
          </span>
          {title}
        </h3>
      </div>

      <div style={{ flex: 1, minHeight: 0, width: "100%", borderRadius: "18px", overflow: "hidden" }}>
        <MapContainer
          center={position}
          zoom={15}
          scrollWheelZoom={false}
          style={{ width: "100%", height: "100%" }}
        >
          <MapResizeHandler />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={position}>
            <Popup>
              <b>Device GPS Location</b>
              <br />
              Lat: {position[0].toFixed(6)}
              <br />
              Lng: {position[1].toFixed(6)}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}