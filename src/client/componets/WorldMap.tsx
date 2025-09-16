import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

import { Header } from "./Header";
import { getMyPlaydatePoint } from "../api";
import { PlaydatePoint } from "./PlaydatePoint";
import { LatLngExpression } from "leaflet";

export default function WorldMap() {
  const [playdatePoint, setPlaydatePoint] = useState<LatLngExpression>([0, 0]);

  const fetchData = async () => {
    const playdateJson = await getMyPlaydatePoint();
    console.log("playdateJson", playdateJson);
    setPlaydatePoint([playdateJson.playdate_latit, playdateJson.playdate_longi]);
  };

  useEffect(() => {
    try {
      fetchData();
    } catch (err) {
      console.log("failed to fetch playdate point", err);
    }
  }, []);

  return (
    <div style={{ width: "600px", height: "300px" }}>
      <Header>Playdate Point</Header>

      <MapContainer
        center={[51.505, -0.09]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ width: "600px", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={playdatePoint}>
          <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker>
      </MapContainer>
      <PlaydatePoint onUpdate={fetchData} />
      <a href="/dashboard">Back to dashboard</a>
    </div>
  );
}
