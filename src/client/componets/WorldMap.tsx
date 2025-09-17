import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LatLngExpression, LatLngLiteral, LeafletMouseEvent } from "leaflet";

import { Header } from "./Header";
import { Section } from "./Section";
import KidItem from "./KidItem";
import {
  getAllKids,
  getMyPlaydatePoint,
  setMyPlaydatePoint,
} from "../api";
import { PlaydatePoint } from "./PlaydatePoint";
import { Kid, PlaydateCoordinates, AvailabilityPlan, LocalInsight } from "../types";

const DEFAULT_POSITION: LatLngLiteral = { lat: 51.505, lng: -0.09 };

const MapClickHandler = ({ onSelect }: { onSelect: (coords: LatLngLiteral) => void }) => {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
};

export default function WorldMap() {
  const [mapPosition, setMapPosition] = useState<LatLngExpression>([
    DEFAULT_POSITION.lat,
    DEFAULT_POSITION.lng,
  ]);
  const [formValues, setFormValues] = useState<{ latitude: string; longitude: string}>(
    {
      latitude: DEFAULT_POSITION.lat.toFixed(5),
      longitude: DEFAULT_POSITION.lng.toFixed(5),
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [kids, setKids] = useState<Kid[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [availabilityPlan, setAvailabilityPlan] = useState<AvailabilityPlan | null>(null);
  const [localInsight, setLocalInsight] = useState<LocalInsight | null>(null);

  const fetchLocation = useCallback(async () => {
    try {
      const playdateJson = await getMyPlaydatePoint();
      if (!playdateJson) {
        return;
      }
      const nextCoords: PlaydateCoordinates = playdateJson;
      const lat = Number(nextCoords.playdate_latit);
      const lng = Number(nextCoords.playdate_longi);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setMapPosition([lat, lng]);
        setFormValues({
          latitude: lat.toFixed(5),
          longitude: lng.toFixed(5),
        });
        setHasSubmitted(true);
      }
    } catch (err) {
      console.log("failed to fetch playdate point", err);
    }
  }, []);

  const handleMapClick = useCallback((coords: LatLngLiteral) => {
    const latitude = Number(coords.lat.toFixed(5));
    const longitude = Number(coords.lng.toFixed(5));
    setMapPosition([latitude, longitude]);
    setFormValues({
      latitude: latitude.toFixed(5),
      longitude: longitude.toFixed(5),
    });
    setStatusMessage("Coordinates updated from map.");
    setErrorMessage(null);
  }, []);

  const handleCoordinateChange = useCallback(
    (updates: { latitude?: string; longitude?: string }) => {
      setFormValues((previous) => {
        const next = { ...previous, ...updates };
        const parsedLat = Number.parseFloat(next.latitude);
        const parsedLng = Number.parseFloat(next.longitude);
        if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
          setMapPosition([parsedLat, parsedLng]);
        }
        return next;
      });
    },
    []
  );

  const loadKids = useCallback(async () => {
    try {
      const kidsList = await getAllKids();
      setKids(kidsList);
    } catch (error) {
      console.log("Failed to load kids", error);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  useEffect(() => {
    if (hasSubmitted && kids.length === 0) {
      loadKids();
    }
  }, [hasSubmitted, kids.length, loadKids]);

  const handleLocationSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStatusMessage(null);
      setErrorMessage(null);

      const parsedLat = Number.parseFloat(formValues.latitude);
      const parsedLng = Number.parseFloat(formValues.longitude);

      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        setErrorMessage("Please provide valid coordinates.");
        return;
      }
      if (parsedLat < -90 || parsedLat > 90) {
        setErrorMessage("Latitude must be between -90 and 90.");
        return;
      }
      if (parsedLng < -180 || parsedLng > 180) {
        setErrorMessage("Longitude must be between -180 and 180.");
        return;
      }

      setIsSaving(true);
      try {
        const updated = await setMyPlaydatePoint(parsedLat, parsedLng);
        if (updated) {
          setMapPosition([updated.coordinates.playdate_latit, updated.coordinates.playdate_longi]);
          setFormValues({
            latitude: updated.coordinates.playdate_latit.toFixed(5),
            longitude: updated.coordinates.playdate_longi.toFixed(5),
          });
          setAvailabilityPlan(updated.availabilityPlan ?? null);
          setLocalInsight(updated.localInsight ?? null);
        }
        setStatusMessage(updated?.message ?? "Playdate location saved.");
        setHasSubmitted(true);
        if (kids.length === 0) {
          await loadKids();
        }
      } catch (error) {
        const err = error as Error;
        setErrorMessage(err.message || "Unable to save location.");
      } finally {
        setIsSaving(false);
      }
    },
    [formValues.latitude, formValues.longitude, kids.length, loadKids]
  );

  const handleActivityChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedActivity(event.target.value);
  }, []);

  const activities = useMemo(() => {
    if (!kids.length) {
      return [] as string[];
    }
    const uniqueActivities = new Set<string>();
    kids.forEach((kid) => {
      if (kid.favoriteActivity) {
        uniqueActivities.add(kid.favoriteActivity);
      }
    });
    return Array.from(uniqueActivities).sort((a, b) => a.localeCompare(b));
  }, [kids]);

  const filteredKids = useMemo(() => {
    if (!selectedActivity) {
      return [] as Kid[];
    }
    return kids.filter((kid) => kid.favoriteActivity === selectedActivity);
  }, [kids, selectedActivity]);

  const containerStyle = useMemo(
    () => ({
      maxWidth: "900px",
      margin: "0 auto",
      padding: "0 16px 32px",
      display: "flex",
      flexDirection: "column" as const,
      gap: "24px",
    }),
    []
  );

  const mapStyle = useMemo(
    () => ({
      width: "100%",
      height: "420px",
      borderRadius: "12px",
      overflow: "hidden" as const,
      boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
    }),
    []
  );

  return (
    <div style={containerStyle}>
      <Header>Playdate Point</Header>

      <MapContainer
        center={mapPosition}
        zoom={13}
        scrollWheelZoom={false}
        style={mapStyle}
      >
        <MapClickHandler onSelect={handleMapClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={mapPosition}>
          <Popup>
            Latitude: {formValues.latitude}
            <br />
            Longitude: {formValues.longitude}
          </Popup>
        </Marker>
      </MapContainer>

      <PlaydatePoint
        latitude={formValues.latitude}
        longitude={formValues.longitude}
        onChange={handleCoordinateChange}
        onSubmit={handleLocationSubmit}
        isSubmitting={isSaving}
        statusMessage={statusMessage}
        errorMessage={errorMessage}
      />

      {hasSubmitted && (
        <Section title="Find playmates by favourite activity">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label htmlFor="activity-filter" style={{ fontWeight: 600, marginRight: "12px" }}>
                Choose an activity:
              </label>
              <select
                id="activity-filter"
                value={selectedActivity}
                onChange={handleActivityChange}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbb" }}
              >
                <option value="">Select an activity</option>
                {activities.map((activity) => (
                  <option key={activity} value={activity}>
                    {activity}
                  </option>
                ))}
              </select>
            </div>
            {selectedActivity && filteredKids.length === 0 && (
              <div>No kids match this activity yet. Invite more friends!</div>
            )}
            {filteredKids.length > 0 && (
              <div style={{ display: "grid", gap: "12px" }}>
                {filteredKids.map((kid) => (
                  <KidItem key={kid.id} kid={kid} />
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {hasSubmitted && availabilityPlan && availabilityPlan.suggestions.length > 0 && (
        <Section title={availabilityPlan.message}>
          <div style={{ display: "grid", gap: "12px" }}>
            {availabilityPlan.suggestions.map((suggestion) => (
              <div key={`${suggestion.kidName}-${suggestion.suggestedDay}-${suggestion.suggestedSlot}`}>
                <strong>{suggestion.kidName}</strong> → {suggestion.suggestedDay} {suggestion.suggestedSlot}
                <br />
                Suggested focus: {suggestion.activityHint}
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasSubmitted && localInsight && (
        <Section title={localInsight.headline}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>{localInsight.summary}</div>
            <ul style={{ marginLeft: "18px" }}>
              {localInsight.actions.map((action) => (
                <li key={action.label}>
                  <strong>{action.label}:</strong> {action.description}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <a href="/">Back to dashboard</a>
    </div>
  );
}
