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
import {
  getMyPlaydatePoint,
  setMyPlaydatePoint,
  getPlaydateRecommendations,
} from "../api";
import { PlaydatePoint } from "./PlaydatePoint";
import { PlaydateCoordinates, AvailabilityPlan, LocalInsight, FriendRecommendationEnvelope, LeaderboardSort, ActivityLeaderboardItem } from "../types";

const DEFAULT_POSITION: LatLngLiteral = { lat: 51.505, lng: -0.09 };

const EARTH_RADIUS_KM = 6371;
const ONE_MILE_KM = 1.60934;

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

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
  const [availabilityPlan, setAvailabilityPlan] = useState<AvailabilityPlan | null>(null);
  const [localInsight, setLocalInsight] = useState<LocalInsight | null>(null);
  const [recommendations, setRecommendations] = useState<FriendRecommendationEnvelope | null>(null);
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSort>('popularity');
  const [filterActivityInput, setFilterActivityInput] = useState('');
  const [filterMinAgeInput, setFilterMinAgeInput] = useState('');
  const [filterMaxAgeInput, setFilterMaxAgeInput] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterMinAge, setFilterMinAge] = useState('');
  const [filterMaxAge, setFilterMaxAge] = useState('');

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

  const fetchRecommendations = useCallback(async () => {
    try {
      const params: { sort?: LeaderboardSort; activity?: string; minAge?: number; maxAge?: number } = {
        sort: leaderboardSort,
      };

      if (filterActivity) {
        params.activity = filterActivity;
      }

      const minAgeNumber = filterMinAge !== '' ? Number(filterMinAge) : undefined;
      if (minAgeNumber !== undefined && Number.isFinite(minAgeNumber)) {
        params.minAge = minAgeNumber;
      }

      const maxAgeNumber = filterMaxAge !== '' ? Number(filterMaxAge) : undefined;
      if (maxAgeNumber !== undefined && Number.isFinite(maxAgeNumber)) {
        params.maxAge = maxAgeNumber;
      }

      const response = await getPlaydateRecommendations(params);
      setRecommendations(response);
    } catch (error) {
      console.log("Failed to fetch playdate recommendations", error);
    }
  }, [leaderboardSort, filterActivity, filterMinAge, filterMaxAge]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

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
        await fetchRecommendations();
      } catch (error) {
        const err = error as Error;
        setErrorMessage(err.message || "Unable to save location.");
      } finally {
        setIsSaving(false);
      }
    },
    [formValues.latitude, formValues.longitude, fetchRecommendations]
  );

  const handleLeaderboardChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setLeaderboardSort(event.target.value as LeaderboardSort);
  }, []);

  const handleFilterApply = useCallback(() => {
    setFilterActivity(filterActivityInput);
    setFilterMinAge(filterMinAgeInput);
    setFilterMaxAge(filterMaxAgeInput);
  }, [filterActivityInput, filterMinAgeInput, filterMaxAgeInput]);

  const handleFilterReset = useCallback(() => {
    setFilterActivityInput('');
    setFilterMinAgeInput('');
    setFilterMaxAgeInput('');
    setFilterActivity('');
    setFilterMinAge('');
    setFilterMaxAge('');
  }, []);

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
  const activityOptions = useMemo(() => {
    if (!recommendations) {
      return [] as string[];
    }
    const uniqueActivities = new Set<string>();
    recommendations.leaderboard.forEach((item) => {
      uniqueActivities.add(item.activity);
    });
    return Array.from(uniqueActivities).sort((a, b) => a.localeCompare(b));
  }, [recommendations]);

  const currentPosition = useMemo(() => {
    if (Array.isArray(mapPosition)) {
      return { lat: mapPosition[0], lng: mapPosition[1] };
    }
    const candidate = mapPosition as LatLngLiteral & { lat?: number; lng?: number };
    if (typeof candidate.lat === 'number' && typeof candidate.lng === 'number') {
      return { lat: candidate.lat, lng: candidate.lng };
    }
    const lat = Number(formValues.latitude);
    const lng = Number(formValues.longitude);
    return { lat, lng };
  }, [mapPosition, formValues.latitude, formValues.longitude]);

  const nearbyFriendRecs = useMemo(() => {
    if (!recommendations) {
      return [] as FriendRecommendationEnvelope['friendRecommendations'];
    }
    const { lat, lng } = currentPosition;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }
    return recommendations.friendRecommendations.filter((rec) => {
      if (typeof rec.friendLatitude !== 'number' || typeof rec.friendLongitude !== 'number') {
        return false;
      }
      return distanceKm(lat, lng, rec.friendLatitude, rec.friendLongitude) <= ONE_MILE_KM;
    });
  }, [recommendations, currentPosition]);

  const friendMarkers = useMemo(
    () =>
      nearbyFriendRecs
        .filter(
          (rec) =>
            typeof rec.friendLatitude === 'number' && Number.isFinite(rec.friendLatitude) &&
            typeof rec.friendLongitude === 'number' && Number.isFinite(rec.friendLongitude)
        )
        .map((rec) => ({
          friendId: rec.friendId,
          friendName: rec.friendName ?? 'Playmate',
          position: [rec.friendLatitude as number, rec.friendLongitude as number] as LatLngExpression,
          headline: rec.headline ?? '',
        })),
    [nearbyFriendRecs]
  );

  const nearbyLeaderboard = useMemo<ActivityLeaderboardItem[]>(() => {
    if (!recommendations) {
      return [];
    }
    const { lat, lng } = currentPosition;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return [];
    }
    return recommendations.leaderboard.filter((item) => {
      if (typeof item.friendLatitude !== 'number' || typeof item.friendLongitude !== 'number') {
        return false;
      }
      return distanceKm(lat, lng, item.friendLatitude, item.friendLongitude) <= ONE_MILE_KM;
    });
  }, [recommendations, currentPosition]);

  const playmates = recommendations?.playmates ?? [];

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
        {friendMarkers.map((marker) => (
          <Marker key={marker.friendId} position={marker.position}>
            <Popup>
              <div style={{ fontWeight: 600 }}>{marker.friendName}</div>
              <div>{marker.headline}</div>
            </Popup>
          </Marker>
        ))}
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

      {recommendations && friendMarkers.length === 0 && (
        <div style={{ fontStyle: "italic" }}>
          No nearby playdate spots within 1 mile yet. Try adjusting your location or inviting more friends.
        </div>
      )}

      {recommendations && (
        <Section title="Find playmates by criteria">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <label htmlFor="playmate-activity" style={{ fontWeight: 600, marginRight: "8px" }}>
                  Activity
                </label>
                <select
                  id="playmate-activity"
                  value={filterActivityInput}
                  onChange={(event) => setFilterActivityInput(event.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbb" }}
                >
                  <option value="">Any activity</option>
                  {activityOptions.map((activity) => (
                    <option key={activity} value={activity}>
                      {activity}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="playmate-min-age" style={{ fontWeight: 600, marginRight: "8px" }}>
                  Min age
                </label>
                <input
                  id="playmate-min-age"
                  type="number"
                  min={0}
                  value={filterMinAgeInput}
                  onChange={(event) => setFilterMinAgeInput(event.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbb", width: "120px" }}
                />
              </div>
              <div>
                <label htmlFor="playmate-max-age" style={{ fontWeight: 600, marginRight: "8px" }}>
                  Max age
                </label>
                <input
                  id="playmate-max-age"
                  type="number"
                  min={0}
                  value={filterMaxAgeInput}
                  onChange={(event) => setFilterMaxAgeInput(event.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbb", width: "120px" }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <button type="button" onClick={handleFilterApply} style={{ padding: "8px 16px" }}>
                  Apply filters
                </button>
                <button type="button" onClick={handleFilterReset} style={{ padding: "8px 16px" }}>
                  Reset
                </button>
              </div>
            </div>
            <div>
              {playmates.length === 0 ? (
                <div>No playmates match the current filters yet.</div>
              ) : (
                <ul style={{ marginLeft: "18px", display: "grid", gap: "8px" }}>
                  {playmates.map((playmate) => (
                    <li key={playmate.kidId}>
                      <strong>{playmate.kidName}</strong> ({playmate.age}) — {playmate.favoriteActivity} · Guardian: {playmate.guardianName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>
      )}

      {recommendations && (
        <Section title="Nearby activity leaderboard">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label htmlFor="leaderboard-sort" style={{ fontWeight: 600, marginRight: "12px" }}>
                Sort by:
              </label>
              <select
                id="leaderboard-sort"
                value={leaderboardSort}
                onChange={handleLeaderboardChange}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbb" }}
              >
                <option value="popularity">Popularity</option>
                <option value="distance">Closest Friends</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
            {nearbyLeaderboard.length === 0 && (
              <div>No activities within a 1 mile radius yet.</div>
            )}
            {nearbyLeaderboard.length > 0 && (
              <div style={{ display: "grid", gap: "8px" }}>
                {nearbyLeaderboard.map((item) => (
                  <div key={`${leaderboardSort}-${item.activity}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{item.activity}</div>
                    <div style={{ fontSize: '0.9em' }}>
                      {item.kidCount} kid{item.kidCount === 1 ? '' : 's'} enjoy this activity
                      {item.avgDistanceKm != null && (
                        <> · avg distance {item.avgDistanceKm} km</>
                      )}
                      {item.closestFriend && (
                        <> · closest match: {item.closestFriend}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {recommendations && (
        <Section title="Friends to visit next (within 1 mile)">
          {nearbyFriendRecs.length === 0 ? (
            <div>No nearby friend playdates yet. Invite more friends or adjust your location.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {nearbyFriendRecs.map((friendRec) => {
                const matches = friendRec.recommendations ?? [];
                if (matches.length === 0) {
                  return null;
                }
                return (
                  <div key={friendRec.friendId}>
                    <div style={{ fontWeight: 600 }}>{friendRec.headline ?? `Playdate ideas with ${friendRec.friendName ?? 'a friend'}`}</div>
                    <ul style={{ marginLeft: "18px" }}>
                      {matches.map((rec) => (
                        <li key={`${friendRec.friendId}-${rec.kidId}`}>
                          Match {rec.kidName} with {rec.matchName} — {rec.matchActivity} (score {rec.compatibilityScore}) · {rec.suggestedSlot}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
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

      {recommendations && (
        <Section title="Activity leaderboard">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label htmlFor="leaderboard-sort" style={{ fontWeight: 600, marginRight: "12px" }}>
                Sort by:
              </label>
              <select
                id="leaderboard-sort"
                value={leaderboardSort}
                onChange={handleLeaderboardChange}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbb" }}
              >
                <option value="popularity">Popularity</option>
                <option value="distance">Closest Friends</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
            {nearbyLeaderboard.length === 0 && (
              <div>No activities within a 1 mile radius yet.</div>
            )}
            {nearbyLeaderboard.length > 0 && (
              <div style={{ display: "grid", gap: "8px" }}>
                {nearbyLeaderboard.map((item) => (
                  <div key={`${leaderboardSort}-${item.activity}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{item.activity}</div>
                    <div style={{ fontSize: '0.9em' }}>
                      {item.kidCount} kid{item.kidCount === 1 ? '' : 's'} enjoy this activity
                      {item.avgDistanceKm != null && (
                        <> · avg distance {item.avgDistanceKm} km</>
                      )}
                      {item.closestFriend && (
                        <> · closest match: {item.closestFriend}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      <a href="/">Back to dashboard</a>
    </div>
  );
}
