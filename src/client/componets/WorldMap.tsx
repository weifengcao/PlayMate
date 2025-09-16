import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

import { Header } from "./Header";
import { getMyDogwalkPoint } from "../api";
import { DogWalkPoint } from "./DogWalkPoint";
import { LatLngExpression } from "leaflet";

export default function WorldMap() {
  const [dogWalkPoint, setDogWalkPoint] = useState<LatLngExpression>([0, 0]);

  const fetchData = async () => {
    const dogWalkJson = await getMyDogwalkPoint();
    console.log("dogWalkJson", dogWalkJson);
    setDogWalkPoint([dogWalkJson.dogwalk_latit, dogWalkJson.dogwalk_longi]);
  };

  useEffect(() => {
    try {
      fetchData();
    } catch (err) {
      console.log("failed to fetch dogwalk point", err);
    }
  }, []);

  return (
    <div style={{ width: "600px", height: "300px" }}>
      <Header>Dogwalk Point</Header>

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
        <Marker position={dogWalkPoint}>
          <Popup>
            A pretty CSS3 popup. <br /> Easily customizable.
          </Popup>
        </Marker>
      </MapContainer>
      <DogWalkPoint onUpdate={fetchData} />
      <a href="/dashboard">Back to dashboard</a>
    </div>
  );
}