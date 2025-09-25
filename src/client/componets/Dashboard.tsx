import { ChangeEvent, FormEvent, MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../hooks/AuthProvider";
import {
  fetchPlaydateAudit,
  getMyKids,
  getMyPlaydatePoint,
  getPlaydateRecommendations,
  getPlaydatesOverview,
  getPlaydatesByHost,
  leavePlaydate,
  requestJoinPlaydate,
  respondToJoinRequest,
  schedulePlaydate,
  updatePlaydate,
} from "../api";
import KidItem from "./KidItem";
import {
  ActivityLeaderboardItem,
  FriendRecommendationPayload,
  JoinedPlaydateSummary,
  Kid,
  LeaderboardSort,
  PlaydateApplicantAudit,
  PlaydateHostSummary,
  PlaydateParticipantSummary,
  SchedulePlaydateRequest,
} from "../types";
import { Section } from "./Section";
import { Page } from "./Page";
import WorldMap from "./WorldMap";
import { Friends } from "./Friends";
import { FormControl } from "./FormControl";

const ONE_MILE_KM = 1.60934;
const EARTH_RADIUS_KM = 6371;
const RADIUS_OPTIONS = [1, 3, 5, 10];

type DashboardView = "overview" | "playdates" | "friends" | "profile" | "kids";

type Coordinates = { lat: number; lng: number };

type LeaderboardEntry = {
  item: ActivityLeaderboardItem;
  distanceKm: number | null;
};

interface LocationSuggestion {
  label: string;
  coordinates?: Coordinates;
}

interface OverviewJoinedPlaydate {
  id: number;
  activity: string;
  host: string;
  start: string;
  end: string;
  status: string;
}

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const formatTimeRange = (startIso: string, endIso: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${formatter.format(start)} – ${formatter.format(end)}`;
};

const createTimeWindow = (seed: number) => {
  const start = new Date();
  const baseHour = 11 + (seed % 7);
  const startMinutes = (seed % 2) * 30;
  start.setHours(baseHour, startMinutes, 0, 0);
  const end = new Date(start.getTime() + 1000 * 60 * 90);
  const formatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  return {
    start: formatter.format(start),
    end: formatter.format(end),
  };
};

const deriveTrustScore = (seed: number) => 72 + (seed % 23);
const derivePopularity = (seed: number) => 48 + (seed % 47);

const PLACE_LOOKUP: Array<{ label: string; lat: number; lng: number }> = [
  { label: "Central London, UK", lat: 51.5072, lng: -0.1276 },
  { label: "Manhattan, New York", lat: 40.7831, lng: -73.9712 },
  { label: "Brooklyn, New York", lat: 40.6782, lng: -73.9442 },
  { label: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
  { label: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
  { label: "Austin, TX", lat: 30.2672, lng: -97.7431 },
  { label: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 },
  { label: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
  { label: "Boston, MA", lat: 42.3601, lng: -71.0589 },
  { label: "Toronto, CA", lat: 43.65107, lng: -79.347015 },
];

const resolveLocationLabel = (point: Coordinates | null) => {
  if (!point) {
    return "Pin not set";
  }

  const nearest = PLACE_LOOKUP.reduce<{ label: string; distanceKm: number } | null>((carry, place) => {
    const distance = distanceKm(point.lat, point.lng, place.lat, place.lng);
    if (!carry || distance < carry.distanceKm) {
      return { label: place.label, distanceKm: distance };
    }
    return carry;
  }, null);

  if (nearest && nearest.distanceKm <= 25) {
    return nearest.label;
  }

  return `${point.lat.toFixed(3)}°, ${point.lng.toFixed(3)}°`;
};

const LOCATION_HINT_DATA: Array<{ keywords: string[]; locations: LocationSuggestion[] }> = [
  {
    keywords: ["san carlos"],
    locations: [
      { label: "Highlands Park, San Carlos", coordinates: { lat: 37.5073, lng: -122.2623 } },
      { label: "Burton Park, San Carlos", coordinates: { lat: 37.4989, lng: -122.259 } },
      { label: "San Carlos Youth Center", coordinates: { lat: 37.4997, lng: -122.2571 } },
      { label: "Laurel Street Courtyard, San Carlos", coordinates: { lat: 37.5065, lng: -122.262 } },
      { label: "Hiller Aviation Museum, San Carlos", coordinates: { lat: 37.5153, lng: -122.25 } },
    ],
  },
  {
    keywords: ["redwood city"],
    locations: [
      { label: "Red Morton Community Center, Redwood City", coordinates: { lat: 37.483, lng: -122.236 } },
      { label: "Magical Bridge Playground, Redwood City", coordinates: { lat: 37.4859, lng: -122.235 } },
      { label: "Marlin Park, Redwood City", coordinates: { lat: 37.5443, lng: -122.2623 } },
      { label: "Downtown Library Courtyard, Redwood City", coordinates: { lat: 37.4851, lng: -122.2287 } },
      { label: "Redwood City Maker Space", coordinates: { lat: 37.4865, lng: -122.2322 } },
    ],
  },
  {
    keywords: ["new york", "manhattan"],
    locations: [
      { label: "Central Park – Heckscher Playground, Manhattan", coordinates: { lat: 40.7694, lng: -73.977 } },
      { label: "Chelsea Waterside Park, Manhattan", coordinates: { lat: 40.7471, lng: -74.0077 } },
      { label: "Pier 25 Play Space, Manhattan", coordinates: { lat: 40.7202, lng: -74.0157 } },
      { label: "Bryant Park Reading Room, Manhattan", coordinates: { lat: 40.7536, lng: -73.9832 } },
    ],
  },
  {
    keywords: ["san francisco", "sf"],
    locations: [
      { label: "Golden Gate Park – Koret Playground, San Francisco", coordinates: { lat: 37.7706, lng: -122.4661 } },
      { label: "Yerba Buena Children's Garden, San Francisco", coordinates: { lat: 37.784, lng: -122.4023 } },
      { label: "Mission Dolores Park, San Francisco", coordinates: { lat: 37.7596, lng: -122.4269 } },
      { label: "Crissy Field Center, San Francisco", coordinates: { lat: 37.8027, lng: -122.4645 } },
    ],
  },
];

const LOCATION_LABEL_MAP = new Map<string, Coordinates>();
const LOCATION_INDEX: LocationSuggestion[] = [];
for (const hint of LOCATION_HINT_DATA) {
  for (const location of hint.locations) {
    if (location.coordinates) {
      LOCATION_LABEL_MAP.set(location.label.toLowerCase(), location.coordinates);
      LOCATION_INDEX.push(location);
    }
  }
}

const buildLocationSuggestions = (rawValue: string): LocationSuggestion[] => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return [];
  }
  const lower = trimmed.toLowerCase();
  const suggestions = new Map<string, LocationSuggestion>();
  for (const hint of LOCATION_HINT_DATA) {
    if (hint.keywords.some((keyword) => lower.includes(keyword))) {
      hint.locations.forEach((location) => {
        if (!suggestions.has(location.label)) {
          suggestions.set(location.label, location);
        }
      });
    }
  }

  if (suggestions.size === 0 && trimmed.length >= 3) {
    [
      `${trimmed} Community Center`,
      `${trimmed} Family Park`,
      `${trimmed} Public Library`,
    ].forEach((label) => {
      suggestions.set(label, { label });
    });
  }

  return Array.from(suggestions.values()).slice(0, 6);
};

const findCoordinatesForLabel = (label?: string | null): Coordinates | null => {
  if (!label) {
    return null;
  }
  const lower = label.trim().toLowerCase();
  if (!lower) {
    return null;
  }
  for (const [key, coords] of LOCATION_LABEL_MAP.entries()) {
    if (lower === key || key.includes(lower) || lower.includes(key)) {
      return coords;
    }
  }
  return null;
};

const findLabelNearCoordinates = (coords: Coordinates, maxDistanceKm = 0.8): string | null => {
  let closest: { label: string; distance: number } | null = null;
  for (const location of LOCATION_INDEX) {
    if (!location.coordinates) {
      continue;
    }
    const distance = distanceKm(coords.lat, coords.lng, location.coordinates.lat, location.coordinates.lng);
    if (!closest || distance < closest.distance) {
      closest = { label: location.label, distance };
    }
  }

  if (closest && closest.distance <= maxDistanceKm) {
    return closest.label;
  }
  return null;
};

const TopBar = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 16,
});

const Title = styled.h1({
  margin: 0,
  fontSize: "clamp(2rem, 5vw, 2.6rem)",
  fontWeight: 800,
  letterSpacing: "-0.01em",
  background:
    "linear-gradient(120deg, rgba(107, 91, 255, 1) 0%, rgba(255, 156, 120, 0.95) 100%)",
  color: "transparent",
  backgroundClip: "text",
  WebKitBackgroundClip: "text",
});

const TopActions = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
});

const TopBadge = styled.span({
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 18px",
  borderRadius: 999,
  background: "rgba(107, 91, 255, 0.16)",
  border: "1px solid rgba(107, 91, 255, 0.28)",
  color: "var(--color-primary-dark)",
  fontWeight: 600,
});

const Layout = styled.div({
  display: "grid",
  gridTemplateColumns: "minmax(220px, 280px) 1fr",
  gap: 24,
  alignItems: "start",

  "@media (max-width: 1024px)": {
    gridTemplateColumns: "1fr",
  },
});

const Sidebar = styled.nav({
  position: "sticky",
  top: 24,
  display: "flex",
  flexDirection: "column",
  gap: 24,
  background:
    "linear-gradient(165deg, rgba(249, 247, 255, 0.95) 0%, rgba(243, 247, 255, 0.96) 55%, rgba(255, 255, 255, 0.98) 100%)",
  borderRadius: "28px",
  padding: "30px clamp(18px, 3vw, 32px)",
  border: "1px solid rgba(107, 91, 255, 0.08)",
  boxShadow: "0 26px 60px rgba(31, 28, 50, 0.16)",
  backdropFilter: "blur(18px)",
});

const SidebarCard = styled.div({
  borderRadius: "22px",
  background: "linear-gradient(140deg, rgba(107, 91, 255, 0.94) 0%, rgba(255, 156, 120, 0.82) 100%)",
  color: "#ffffff",
  padding: "24px 26px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxShadow: "0 28px 56px rgba(37, 24, 73, 0.32)",
});

const SidebarCardHeadline = styled.h3({
  margin: 0,
  fontSize: "1.1rem",
  fontWeight: 700,
  letterSpacing: "0.02em",
});

const SidebarCardSubtitle = styled.p({
  margin: 0,
  fontSize: "0.85rem",
  color: "rgba(255, 255, 255, 0.85)",
});

const SidebarMetric = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

const SidebarMetricLabel = styled.span({
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(255, 255, 255, 0.75)",
});

const SidebarMetricValue = styled.span({
  fontSize: "1.15rem",
  fontWeight: 700,
});

const SidebarHint = styled.span({
  fontSize: "0.8rem",
  color: "rgba(255, 255, 255, 0.75)",
});

const SidebarTitle = styled.h2({
  margin: "12px 0 4px",
  fontSize: "1.2rem",
  fontWeight: 700,
  color: "var(--color-text-primary)",
});


const NavList = styled.ul({
  listStyle: "none",
  margin: "4px 0 0",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

const NavButton = styled.button<{ $active: boolean }>(({ $active }) => ({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 12,
  background: $active
    ? "linear-gradient(135deg, rgba(107, 91, 255, 0.24) 0%, rgba(255, 156, 120, 0.22) 100%)"
    : "rgba(255, 255, 255, 0.97)",
  color: "var(--color-text-primary)",
  fontWeight: 600,
  padding: "16px 18px",
  borderRadius: "var(--border-radius-sm)",
  border: $active ? "1px solid rgba(107, 91, 255, 0.45)" : "1px solid rgba(46, 42, 39, 0.08)",
  cursor: "pointer",
  transition: "transform var(--transition-base), box-shadow var(--transition-base)",
  position: "relative",

  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "var(--shadow-soft)",
  },

  "&::before": {
    content: '""',
    width: 8,
    height: 40,
    borderRadius: "12px",
    background: $active
      ? "linear-gradient(180deg, rgba(107, 91, 255, 0.9) 0%, rgba(255, 156, 120, 0.85) 100%)"
      : "rgba(107, 91, 255, 0.14)",
    display: "block",
  },
}));

const NavElementTitle = styled.span({
  fontSize: "0.96rem",
  fontWeight: 700,
  letterSpacing: "0.01em",
});

const MainPanel = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 24,
});

const AdventureCard = styled.section({
  borderRadius: "var(--border-radius-lg)",
  background:
    "linear-gradient(135deg, rgba(29, 22, 55, 0.96) 0%, rgba(57, 42, 102, 0.9) 45%, rgba(107, 91, 255, 0.86) 100%)",
  color: "#ffffff",
  padding: "clamp(24px, 4vw, 36px)",
  display: "flex",
  flexDirection: "column",
  gap: 24,
  boxShadow: "0 26px 56px rgba(25, 20, 45, 0.45)",
});

const AdventureHeader = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

const AdventureTitle = styled.h2({
  margin: 0,
  fontSize: "clamp(1.7rem, 3.6vw, 2.1rem)",
  fontWeight: 800,
  letterSpacing: "-0.01em",
});

const AdventureSubtext = styled.p({
  margin: 0,
  fontSize: "0.95rem",
  color: "rgba(238, 235, 255, 0.85)",
  maxWidth: 540,
});

const AdventureControls = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  alignItems: "center",
});

const ControlGroup = styled.label({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: 600,
  fontSize: "0.85rem",

  "& select": {
    minWidth: 150,
    borderRadius: "var(--border-radius-sm)",
    border: "1px solid rgba(238, 235, 255, 0.5)",
    padding: "10px 14px",
    background: "rgba(255, 255, 255, 0.08)",
    color: "#ffffff",
  },
});

const AdventureHint = styled.span({
  fontSize: "0.85rem",
  color: "rgba(238, 235, 255, 0.75)",
});

const AdventureMap = styled.div({
  borderRadius: "18px",
  overflow: "hidden",
  boxShadow: "0 20px 45px rgba(13, 10, 25, 0.45)",
  border: "1px solid rgba(238, 235, 255, 0.18)",
  height: 360,
});

const LeaderboardTable = styled.table({
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: "0 12px",
});

const LeaderboardHead = styled.thead({
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(238, 235, 255, 0.7)",
});

const LeaderboardHeadCell = styled.th({
  textAlign: "left",
  padding: "0 16px",
});

const LeaderboardBody = styled.tbody({
  fontSize: "0.95rem",
});

const LeaderboardRow = styled.tr({
  background: "rgba(255, 255, 255, 0.12)",
  backdropFilter: "blur(14px)",
  borderRadius: "16px",
});

const LeaderboardCell = styled.td({
  padding: "14px 16px",
  color: "#f6f5ff",
  verticalAlign: "middle",
});

const LeaderboardPrimary = styled.span({
  display: "block",
  fontWeight: 700,
});

const LeaderboardSecondary = styled.span({
  display: "block",
  fontSize: "0.82rem",
  color: "rgba(238, 235, 255, 0.75)",
  marginTop: 4,
});

const LeaderboardNumeric = styled(LeaderboardCell)({
  textAlign: "center",
  fontWeight: 600,
});

const LeaderboardActionCell = styled(LeaderboardCell)({
  textAlign: "center",
});

const EmptyLeaderboard = styled.p({
  margin: 0,
  fontSize: "0.92rem",
  color: "rgba(238, 235, 255, 0.8)",
});

const MapFilters = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  alignItems: "center",
});

const MapIntro = styled.p({
  margin: 0,
  color: "var(--color-text-muted)",
  fontSize: "0.92rem",
});

const FilterLabel = styled.label({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: 600,
  color: "var(--color-text-muted)",

  "& select": {
    minWidth: 160,
  },
});

const ScheduleButton = styled.button({
  background: "linear-gradient(135deg, rgba(255, 181, 120, 0.95) 0%, rgba(255, 120, 196, 0.92) 100%)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  boxShadow: "0 18px 40px rgba(255, 140, 120, 0.32)",
  color: "#43150b",
  fontWeight: 700,
});

const CurrentPlaydateGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 18,
});

const CurrentPlaydateCard = styled.div({
  borderRadius: "var(--border-radius-lg)",
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(107, 91, 255, 0.12) 100%)",
  border: "1px solid rgba(107, 91, 255, 0.18)",
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
});

const CurrentPlaydateTitle = styled.span({
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 700,
  color: "var(--color-text-muted)",
});

const CurrentPlaydateHeadline = styled.span({
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "var(--color-text-primary)",
});

const CurrentPlaydateMeta = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: "0.9rem",
  color: "var(--color-text-muted)",
});

const ContentCard = styled.section({
  padding: "clamp(24px, 4vw, 32px)",
  borderRadius: "var(--border-radius-lg)",
  background: "var(--color-surface)",
  border: "1px solid rgba(107, 91, 255, 0.08)",
  boxShadow: "var(--shadow-soft)",
  display: "flex",
  flexDirection: "column",
  gap: 20,
});

const MapCard = styled(ContentCard)({
  gap: 22,
});

const ProfileCard = styled(ContentCard)({
  gap: 18,
});

const EmbeddedPanel = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 18,
});

const OverviewActions = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 14,
});

const OverviewAction = styled.button({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  alignItems: "flex-start",
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(107, 91, 255, 0.1) 100%)",
  borderRadius: "var(--border-radius-sm)",
  padding: "16px 18px",
  border: "1px solid rgba(107, 91, 255, 0.18)",
  fontWeight: 600,
  color: "var(--color-text-primary)",
  cursor: "pointer",
  transition: "transform var(--transition-base), box-shadow var(--transition-base)",

  "& span": {
    fontSize: "0.85rem",
    color: "var(--color-text-muted)",
    fontWeight: 500,
  },

  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "var(--shadow-hover)",
  },
});

const ViewPill = styled.span({
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 600,
  background: "rgba(107, 91, 255, 0.14)",
  color: "var(--color-primary-dark)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

const SelectedPlaydateCard = styled.div({
  borderRadius: "var(--border-radius-lg)",
  background: "linear-gradient(135deg, rgba(107, 91, 255, 0.12), rgba(255, 156, 120, 0.14))",
  border: "1px solid rgba(107, 91, 255, 0.2)",
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

const SelectedTitle = styled.h3({
  margin: 0,
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "var(--color-primary-dark)",
});

const SelectedList = styled.ul({
  margin: 0,
  paddingLeft: 18,
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

const SelectedHint = styled.p({
  margin: 0,
  fontSize: "0.85rem",
  color: "var(--color-text-muted)",
});

const PlaydateBanner = styled.div<{ tone?: "neutral" | "error" }>(({ tone = "neutral" }) => ({
  padding: 12,
  borderRadius: 12,
  fontWeight: 600,
  background:
    tone === "error"
      ? "rgba(255, 116, 116, 0.16)"
      : "rgba(74, 201, 134, 0.18)",
  color: tone === "error" ? "#b23434" : "#0f9853",
}));

const PlaydateSectionBody = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

const PlaydateForm = styled.form({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
});

const PlaydateFullRow = styled.div({
  gridColumn: "1 / -1",
});

const PlaydateButtonRow = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
});

const PlaydateButton = styled.button<{ variant?: "primary" | "ghost" | "danger"; size?: "sm" | "md" }>(({ variant = "primary", size = "md" }) => ({
  border: "none",
  borderRadius: 999,
  padding: size === "sm" ? "8px 14px" : "10px 20px",
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
  background:
    variant === "primary"
      ? "linear-gradient(135deg, rgba(107, 91, 255, 1) 0%, rgba(255, 156, 120, 0.95) 100%)"
      : variant === "danger"
      ? "linear-gradient(135deg, rgba(255, 91, 91, 0.95) 0%, rgba(255, 156, 120, 0.85) 100%)"
      : "rgba(107, 91, 255, 0.12)",
  color: variant === "ghost" ? "var(--color-primary-dark)" : "#ffffff",
  boxShadow:
    variant === "ghost"
      ? "inset 0 0 0 1px rgba(107, 91, 255, 0.28)"
      : "0 14px 34px rgba(107, 91, 255, 0.2)",
  "&:disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
    transform: "none",
    boxShadow: "none",
  },
  "&:not(:disabled):hover": {
    transform: "translateY(-1px)",
  },
}));

const PlaydateCard = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 22,
  borderRadius: 22,
  background: "linear-gradient(170deg, rgba(255, 255, 255, 0.95) 0%, rgba(107, 91, 255, 0.12) 100%)",
  border: "1px solid rgba(107, 91, 255, 0.18)",
  boxShadow: "var(--shadow-soft)",
});

const PlaydateCardHeader = styled.div({
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 16,
});

const PlaydateCardTitle = styled.h3({
  margin: 0,
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "var(--color-text-primary)",
});

const PlaydateCardMeta = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "var(--color-text-muted)",
  fontWeight: 500,
});

const PlaydateTag = styled.span<{ tone?: "neutral" | "positive" | "warning" }>(({ tone = "neutral" }) => ({
  alignSelf: "flex-start",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  background:
    tone === "positive"
      ? "rgba(74, 201, 134, 0.18)"
      : tone === "warning"
      ? "rgba(255, 171, 105, 0.2)"
      : "rgba(107, 91, 255, 0.16)",
  color:
    tone === "positive"
      ? "#0f9853"
      : tone === "warning"
      ? "#d56a1a"
      : "var(--color-primary-dark)",
}));

const PlaydateParticipantList = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

const PlaydateParticipantRow = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 14,
  borderRadius: 14,
  background: "rgba(107, 91, 255, 0.08)",
});

const PlaydateAuditCard = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 14,
  borderRadius: 14,
  background: "rgba(74, 201, 134, 0.1)",
  border: "1px solid rgba(74, 201, 134, 0.28)",
});

const PlaydateEmpty = styled.div({
  padding: 18,
  borderRadius: 16,
  background: "rgba(107, 91, 255, 0.08)",
  color: "var(--color-text-muted)",
  fontWeight: 500,
});

const LocationSuggestionSelect = styled.select({
  width: "100%",
  borderRadius: "var(--border-radius-sm)",
  border: "1px solid rgba(107, 91, 255, 0.28)",
  padding: "10px 14px",
  fontWeight: 600,
  color: "var(--color-primary-dark)",
  background: "rgba(107, 91, 255, 0.12)",
  cursor: "pointer",
});

const PlaydateMapCard = styled.div({
  display: "flex",
  flexDirection: "column",
  borderRadius: 22,
  border: "1px solid rgba(107, 91, 255, 0.18)",
  background: "linear-gradient(170deg, rgba(255, 255, 255, 0.95) 0%, rgba(107, 91, 255, 0.12) 100%)",
  boxShadow: "var(--shadow-soft)",
  overflow: "hidden",
});

const PlaydateMapHeader = styled.div({
  padding: "18px 22px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
});

const PlaydateMapTitle = styled.h3({
  margin: 0,
  fontSize: "1.05rem",
  fontWeight: 700,
  color: "var(--color-text-primary)",
});

const PlaydateMapHint = styled.span({
  fontSize: "0.85rem",
  color: "var(--color-text-muted)",
});

const PlaydateMapViewport = styled.div({
  height: 360,
  width: "100%",
});

const toPlaydateDateTimeValue = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (num: number) => `${num}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildDefaultPlaydateForm = () => {
  const start = new Date();
  start.setHours(start.getHours() + 48, 0, 0, 0);
  const end = new Date(start.getTime() + 1000 * 60 * 90);
  return {
    title: "Neighborhood explorers",
    activity: "Playground hangout",
    locationName: "",
    description: "",
    notes: "",
    maxGuests: "4",
    startTime: toPlaydateDateTimeValue(start),
    endTime: toPlaydateDateTimeValue(end),
  };
};

type PlaydateScheduleFormState = ReturnType<typeof buildDefaultPlaydateForm>;
type PlaydateBusyMap = Record<number, boolean>;
type PlaydateAuditState = Record<number, { loading: boolean; error?: string; audit?: PlaydateApplicantAudit }>;

export const Dashboard = () => {
  const [kids, setKids] = useState<Kid[]>([]);
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [overviewRadius, setOverviewRadius] = useState<number>(1);
  const [selectedPlaydate, setSelectedPlaydate] = useState<FriendRecommendationPayload | null>(null);
  const [playdatePoint, setPlaydatePoint] = useState<Coordinates | null>(null);
  const [overviewLeaderboard, setOverviewLeaderboard] = useState<ActivityLeaderboardItem[]>([]);
  const [isOverviewLoading, setOverviewLoading] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [joiningPlaydate, setJoiningPlaydate] = useState<ActivityLeaderboardItem | null>(null);
  const [joinForm, setJoinForm] = useState({ guardianName: "", guardianEmail: "", kidName: "", notes: "" });
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinedPlaydates, setJoinedPlaydates] = useState<OverviewJoinedPlaydate[]>([]);
  const auth = useAuth();

  const [playdatesOverview, setPlaydatesOverview] = useState<{ hosted: PlaydateHostSummary[]; joined: JoinedPlaydateSummary[] } | null>(null);
  const [playdatesLoading, setPlaydatesLoading] = useState(true);
  const [playdatesError, setPlaydatesError] = useState<string | null>(null);
  const [playdatesBanner, setPlaydatesBanner] = useState<string | null>(null);

  const [playdateScheduleForm, setPlaydateScheduleForm] = useState<PlaydateScheduleFormState>(() => buildDefaultPlaydateForm());
  const [playdateCreating, setPlaydateCreating] = useState(false);
  const [showScheduleSuggestions, setShowScheduleSuggestions] = useState(true);
  const [scheduleMapPosition, setScheduleMapPosition] = useState<Coordinates | null>(null);

  const [editingPlaydateId, setEditingPlaydateId] = useState<number | null>(null);
  const [editPlaydateDraft, setEditPlaydateDraft] = useState<PlaydateScheduleFormState | null>(null);
  const [savingPlaydateId, setSavingPlaydateId] = useState<number | null>(null);

  const [playdateDecisionBusy, setPlaydateDecisionBusy] = useState<PlaydateBusyMap>({});
  const [playdateMembershipBusy, setPlaydateMembershipBusy] = useState<PlaydateBusyMap>({});
  const [playdateAuditState, setPlaydateAuditState] = useState<PlaydateAuditState>({});
  const [editSuggestionVisibility, setEditSuggestionVisibility] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchKids = async () => {
      try {
        const userKids = await getMyKids();
        setKids(userKids);
      } catch (err) {
        console.log("failed to fetch kids", err);
      }
    };
    fetchKids();
  }, []);

  useEffect(() => {
    const loadOverview = async () => {
      setOverviewLoading(true);
      setOverviewError(null);
      try {
        const [location, recommendations] = await Promise.all([
          getMyPlaydatePoint().catch(() => null),
          getPlaydateRecommendations({ sort: "popularity" as LeaderboardSort }).catch(() => null),
        ]);

        if (location) {
          const lat = Number(location.playdate_latit);
          const lng = Number(location.playdate_longi);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setPlaydatePoint({ lat, lng });
          }
        }

        if (recommendations?.leaderboard) {
          setOverviewLeaderboard(recommendations.leaderboard);
        } else {
          setOverviewLeaderboard([]);
        }
      } catch (err) {
        console.log("failed to load overview info", err);
        setOverviewError("Unable to load live playdates right now.");
      } finally {
        setOverviewLoading(false);
      }
    };

    loadOverview();
  }, []);

  const loadPlaydatesOverview = useCallback(async () => {
    try {
      setPlaydatesLoading(true);
      setPlaydatesBanner(null);
      setPlaydatesError(null);
      const data = await getPlaydatesOverview();
      setPlaydatesOverview(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load playdates.";
      setPlaydatesError(message);
    } finally {
      setPlaydatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlaydatesOverview();
  }, [loadPlaydatesOverview]);

  useEffect(() => {
    if (playdatePoint && !scheduleMapPosition) {
      setScheduleMapPosition(playdatePoint);
    }
  }, [playdatePoint, scheduleMapPosition]);

  useEffect(() => {
    const coords = findCoordinatesForLabel(playdateScheduleForm.locationName);
    if (!coords) {
      return;
    }
    setScheduleMapPosition((prev) => {
      if (prev && Math.abs(prev.lat - coords.lat) < 0.0001 && Math.abs(prev.lng - coords.lng) < 0.0001) {
        return prev;
      }
      return coords;
    });
  }, [playdateScheduleForm.locationName]);

  const hostedPlaydates = playdatesOverview?.hosted ?? [];
  const joinedPlaydateSummaries = playdatesOverview?.joined ?? [];

  const handlePlaydateScheduleChange = (field: keyof PlaydateScheduleFormState) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setPlaydateScheduleForm((prev) => ({ ...prev, [field]: value }));
    if (field === "locationName") {
      setShowScheduleSuggestions(true);
    }
  };

  const submitPlaydateSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setPlaydatesBanner(null);
      setPlaydatesError(null);
      setPlaydateCreating(true);
      const trimmedMax = playdateScheduleForm.maxGuests.trim();
      const parsedMax = trimmedMax === "" ? null : Number(trimmedMax);
      const payload: SchedulePlaydateRequest = {
        title: playdateScheduleForm.title.trim() || "Neighborhood playdate",
        activity: playdateScheduleForm.activity.trim() || "Playground hangout",
        locationName: playdateScheduleForm.locationName.trim() || "Community park",
        description: playdateScheduleForm.description.trim() || null,
        notes: playdateScheduleForm.notes.trim() || null,
        maxGuests: parsedMax != null && !Number.isNaN(parsedMax) ? parsedMax : null,
        startTime: new Date(playdateScheduleForm.startTime).toISOString(),
        endTime: new Date(playdateScheduleForm.endTime).toISOString(),
      };
      await schedulePlaydate(payload);
      setPlaydatesBanner("Playdate scheduled.");
      setPlaydateScheduleForm(buildDefaultPlaydateForm());
      setShowScheduleSuggestions(false);
      await loadPlaydatesOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not schedule playdate.";
      setPlaydatesError(message);
    } finally {
      setPlaydateCreating(false);
    }
  };

  const beginPlaydateEditing = (playdate: PlaydateHostSummary) => {
    setEditingPlaydateId(playdate.id);
    setEditPlaydateDraft({
      title: playdate.title,
      activity: playdate.activity,
      locationName: playdate.locationName,
      description: playdate.description ?? "",
      notes: playdate.notes ?? "",
      maxGuests: playdate.maxGuests != null ? `${playdate.maxGuests}` : "",
      startTime: toPlaydateDateTimeValue(playdate.startTime),
      endTime: toPlaydateDateTimeValue(playdate.endTime),
    });
    setEditSuggestionVisibility((prev) => ({ ...prev, [playdate.id]: true }));
    const coords = findCoordinatesForLabel(playdate.locationName);
    if (coords) {
      setScheduleMapPosition(coords);
    }
  };

  const updatePlaydateDraft = (
    field: keyof PlaydateScheduleFormState,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setEditPlaydateDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    if (field === "locationName" && editingPlaydateId != null) {
      setEditSuggestionVisibility((prev) => ({ ...prev, [editingPlaydateId]: true }));
    }
  };

  const cancelPlaydateEditing = () => {
    if (editingPlaydateId != null) {
      setEditSuggestionVisibility((prev) => {
        const next = { ...prev };
        delete next[editingPlaydateId];
        return next;
      });
    }
    setEditingPlaydateId(null);
    setEditPlaydateDraft(null);
  };

  const applyPlaydateUpdate = async (playdateId: number, payload: Record<string, unknown>) => {
    try {
      setPlaydatesBanner(null);
      setPlaydatesError(null);
      setSavingPlaydateId(playdateId);
      await updatePlaydate(playdateId, payload);
      await loadPlaydatesOverview();
      setPlaydatesBanner("Playdate updated.");
      setEditSuggestionVisibility((prev) => {
        const next = { ...prev };
        delete next[playdateId];
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed.";
      setPlaydatesError(message);
    } finally {
      setSavingPlaydateId(null);
    }
  };

  const submitPlaydateEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingPlaydateId == null || !editPlaydateDraft) {
      return;
    }
    const trimmedLimit = editPlaydateDraft.maxGuests.trim();
    const parsedLimit = trimmedLimit === "" ? null : Number(trimmedLimit);
    await applyPlaydateUpdate(editingPlaydateId, {
      title: editPlaydateDraft.title.trim(),
      activity: editPlaydateDraft.activity.trim(),
      locationName: editPlaydateDraft.locationName.trim(),
      description: editPlaydateDraft.description.trim() || null,
      notes: editPlaydateDraft.notes.trim() || null,
      maxGuests: parsedLimit != null && !Number.isNaN(parsedLimit) ? parsedLimit : null,
      startTime: new Date(editPlaydateDraft.startTime).toISOString(),
      endTime: new Date(editPlaydateDraft.endTime).toISOString(),
    });
    cancelPlaydateEditing();
  };

  const togglePlaydateStatus = async (playdate: PlaydateHostSummary) => {
    await applyPlaydateUpdate(playdate.id, { status: playdate.status === "scheduled" ? "closed" : "scheduled" });
  };

  const setPlaydateDecisionBusyFlag = (participantId: number, busy: boolean) => {
    setPlaydateDecisionBusy((prev) => ({ ...prev, [participantId]: busy }));
  };

  const handlePlaydateParticipant = async (
    playdateId: number,
    participant: PlaydateParticipantSummary,
    status: "approved" | "rejected" | "pending"
  ) => {
    try {
      setPlaydatesBanner(null);
      setPlaydatesError(null);
      setPlaydateDecisionBusyFlag(participant.id, true);
      await respondToJoinRequest(playdateId, participant.id, status);
      await loadPlaydatesOverview();
      const actionMessage =
        status === "approved"
          ? `${participant.user?.name ?? "Guest"} approved.`
          : status === "rejected"
          ? `${participant.user?.name ?? "Guest"} removed from guest list.`
          : "Request moved back to pending.";
      setPlaydatesBanner(actionMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update request.";
      setPlaydatesError(message);
    } finally {
      setPlaydateDecisionBusyFlag(participant.id, false);
    }
  };

  const loadPlaydateAudit = async (playdateId: number, participant: PlaydateParticipantSummary) => {
    setPlaydateAuditState((prev) => ({
      ...prev,
      [participant.id]: {
        audit: prev[participant.id]?.audit,
        loading: true,
        error: undefined,
      },
    }));
    try {
      const audit = await fetchPlaydateAudit(playdateId, participant.id);
      setPlaydateAuditState((prev) => ({
        ...prev,
        [participant.id]: {
          loading: false,
          audit,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load AI audit.";
      setPlaydateAuditState((prev) => ({
        ...prev,
        [participant.id]: {
          loading: false,
          error: message,
        },
      }));
    }
  };

  const setPlaydateMembershipBusyFlag = (playdateId: number, busy: boolean) => {
    setPlaydateMembershipBusy((prev) => ({ ...prev, [playdateId]: busy }));
  };

  const leavePlaydateMembership = async (playdateId: number) => {
    try {
      setPlaydatesBanner(null);
      setPlaydatesError(null);
      setPlaydateMembershipBusyFlag(playdateId, true);
      await leavePlaydate(playdateId);
      await loadPlaydatesOverview();
      setPlaydatesBanner("You have left the playdate.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not leave playdate.";
      setPlaydatesError(message);
    } finally {
      setPlaydateMembershipBusyFlag(playdateId, false);
    }
  };

  const requestPlaydateRejoin = async (playdateId: number) => {
    try {
      setPlaydatesBanner(null);
      setPlaydatesError(null);
      setPlaydateMembershipBusyFlag(playdateId, true);
      await requestJoinPlaydate(playdateId);
      await loadPlaydatesOverview();
      setPlaydatesBanner("Join request submitted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit join request.";
      setPlaydatesError(message);
    } finally {
      setPlaydateMembershipBusyFlag(playdateId, false);
    }
  };

  const scheduleLocationSuggestions = useMemo(
    () => buildLocationSuggestions(playdateScheduleForm.locationName),
    [playdateScheduleForm.locationName]
  );

  const playdatesMapCenter = useMemo<Coordinates>(() => {
    if (scheduleMapPosition) {
      return scheduleMapPosition;
    }
    if (playdatePoint) {
      return playdatePoint;
    }
    return { lat: 40.7831, lng: -73.9712 };
  }, [scheduleMapPosition, playdatePoint]);

  const playdatesMapZoom = scheduleMapPosition ? 14 : 12;

  const playdatesMapMarkers = useMemo(() => {
    const markers: Array<{ id: string; position: Coordinates; label: string }> = [];
    hostedPlaydates.forEach((playdate) => {
      const coords = findCoordinatesForLabel(playdate.locationName);
      if (coords) {
        markers.push({
          id: `hosted-${playdate.id}`,
          position: coords,
          label: `${playdate.title} • Hosted by you`,
        });
      }
    });
    joinedPlaydateSummaries.forEach((membership) => {
      const coords = findCoordinatesForLabel(membership.playdate.locationName);
      if (coords) {
        markers.push({
          id: `joined-${membership.playdateId}-${membership.participantId}`,
          position: coords,
          label: `${membership.playdate.title} • Host: ${membership.playdate.host?.name ?? "Unknown"}`,
        });
      }
    });
    return markers;
  }, [hostedPlaydates, joinedPlaydateSummaries]);

  const joinedOverviewEntries = useMemo(() => {
    type Entry = { key: string; activity: string; host: string; range: string; status: string; startValue: number };
    const entries: Entry[] = [];
    const seen = new Set<string>();

    joinedPlaydateSummaries.forEach((membership) => {
      const key = `server-${membership.participantId}`;
      if (seen.has(key)) {
        return;
      }
      const statusLabel =
        membership.status === 'approved'
          ? 'Approved'
          : membership.status === 'pending'
          ? 'Pending approval'
          : membership.status === 'rejected'
          ? 'Rejected'
          : 'Left';
      entries.push({
        key,
        activity: membership.playdate.activity,
        host: membership.playdate.host?.name ?? 'Unknown',
        range: formatTimeRange(membership.playdate.startTime, membership.playdate.endTime),
        status: statusLabel,
        startValue: new Date(membership.playdate.startTime).getTime(),
      });
      seen.add(key);
    });

    joinedPlaydates.forEach((local, index) => {
      const key = `local-${local.id ?? index}`;
      if (seen.has(key)) {
        return;
      }
      entries.push({
        key,
        activity: local.activity,
        host: local.host,
        range: `${local.start} – ${local.end}`,
        status: local.status,
        startValue: Date.now() + index,
      });
      seen.add(key);
    });

    return entries
      .sort((a, b) => a.startValue - b.startValue)
      .slice(0, 2);
  }, [joinedPlaydateSummaries, joinedPlaydates]);

  const handleScheduleMapSelect = (coords: Coordinates) => {
    setScheduleMapPosition(coords);
    const nearbyLabel = findLabelNearCoordinates(coords);
    setPlaydateScheduleForm((prev) => ({
      ...prev,
      locationName: nearbyLabel ? nearbyLabel : `Pinned at ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
    }));
    setShowScheduleSuggestions(false);
  };

  const PlaydateMapClickHandler = ({ onSelect }: { onSelect: (coords: Coordinates) => void }) => {
    useMapEvents({
      click: (event) => {
        onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
      },
    });
    return null;
  };

  const PlaydateMapAutoCenter = ({ center, zoom }: { center: Coordinates; zoom: number }) => {
    const map = useMap();
    useEffect(() => {
      map.setView([center.lat, center.lng], zoom);
    }, [center, zoom, map]);
    return null;
  };

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    []
  );

  const timeLabel = useMemo(
    () => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()),
    []
  );

  const locationLabel = useMemo(() => resolveLocationLabel(playdatePoint), [playdatePoint]);

  const weatherLabel = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 6) return "Calm & cool · 62°F";
    if (hour < 12) return "Sunny vibes · 68°F";
    if (hour < 18) return "Warm breeze · 74°F";
    return "Mild evening · 66°F";
  }, []);

  const filteredLeaderboard: LeaderboardEntry[] = useMemo(() => {
    if (!overviewLeaderboard.length) {
      return [];
    }

    const withCoords = overviewLeaderboard.filter(
      (item) =>
        typeof item.friendLatitude === "number" &&
        Number.isFinite(item.friendLatitude) &&
        typeof item.friendLongitude === "number" &&
        Number.isFinite(item.friendLongitude)
    );

    if (!withCoords.length) {
      return [];
    }

    if (!playdatePoint) {
      return [];
    }

    const radiusKm = overviewRadius * ONE_MILE_KM;

    return withCoords
      .map((item) => ({
        item,
        distanceKm: distanceKm(
          playdatePoint.lat,
          playdatePoint.lng,
          item.friendLatitude as number,
          item.friendLongitude as number
        ),
      }))
      .filter((row) => row.distanceKm !== null && row.distanceKm <= radiusKm)
      .slice(0, 8);
  }, [overviewLeaderboard, playdatePoint, overviewRadius]);

  const overviewCircleRadiusMeters = useMemo(() => overviewRadius * 1609.34, [overviewRadius]);

  const overviewZoom = useMemo(() => {
    if (overviewRadius <= 1) return 15;
    if (overviewRadius <= 3) return 13;
    if (overviewRadius <= 5) return 12;
    return 11;
  }, [overviewRadius]);

  const overviewMapCenter = useMemo<Coordinates>(() => {
    if (playdatePoint) {
      return playdatePoint;
    }
    return { lat: 40.7831, lng: -73.9712 };
  }, [playdatePoint]);

  const overviewMarkers = useMemo(
    () =>
      filteredLeaderboard
        .filter(({ item }) =>
          typeof item.friendLatitude === "number" && Number.isFinite(item.friendLatitude) &&
          typeof item.friendLongitude === "number" && Number.isFinite(item.friendLongitude)
        )
        .map(({ item }) => ({
          item,
          id: item.friendId,
          activity: item.activity,
          host: item.friendName ?? "Friendly host",
          position: [item.friendLatitude as number, item.friendLongitude as number] as [number, number],
          locationLabel: resolveLocationLabel({
            lat: item.friendLatitude as number,
            lng: item.friendLongitude as number,
          }),
        })),
    [filteredLeaderboard]
  );

  const adventureStatusMessage = useMemo(() => {
    if (isOverviewLoading) {
      return "Loading live playdates...";
    }
    if (overviewError) {
      return overviewError;
    }
    if (!overviewLeaderboard.length) {
      return "No live playdates have landed just yet. Check back soon.";
    }
    if (!filteredLeaderboard.length) {
      return playdatePoint
        ? `No live playdates within ${overviewRadius} mile${overviewRadius > 1 ? "s" : ""}. Try widening the radius or inviting more friends.`
        : "Drop your playdate pin on the map to unlock local matches.";
    }
    return null;
  }, [filteredLeaderboard.length, isOverviewLoading, overviewError, overviewLeaderboard.length, playdatePoint, overviewRadius]);

  const kidLabel = useMemo(
    () =>
      kids.length
        ? `Your crew roster (${kids.length})`
        : "Your crew roster",
    [kids.length]
  );

  const renderKidsSection = () => (
    <Section title={kidLabel}>
      {kids.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
          {kids.map((kid) => (
            <KidItem key={kid.id} kid={kid} />
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, color: "var(--color-text-muted)", fontWeight: 500 }}>
          It looks a little quiet here. Add your kids to start planning future playdates together.
        </p>
      )}
    </Section>
  );

  const renderPlaydates = () => (
    <>
      {playdatesBanner && <PlaydateBanner>{playdatesBanner}</PlaydateBanner>}
      {playdatesError && <PlaydateBanner tone="error">{playdatesError}</PlaydateBanner>}

      <PlaydateMapCard>
        <PlaydateMapHeader>
          <PlaydateMapTitle>Live map</PlaydateMapTitle>
          <PlaydateMapHint>
            Click the map to drop a pin or zoom to scout nearby venues. Hosted and joined playdates appear when we recognise their location.
          </PlaydateMapHint>
        </PlaydateMapHeader>
        <PlaydateMapViewport>
          <MapContainer
            center={[playdatesMapCenter.lat, playdatesMapCenter.lng]}
            zoom={playdatesMapZoom}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <PlaydateMapAutoCenter center={playdatesMapCenter} zoom={playdatesMapZoom} />
            <PlaydateMapClickHandler onSelect={handleScheduleMapSelect} />
            {scheduleMapPosition && (
              <>
                <Marker position={[scheduleMapPosition.lat, scheduleMapPosition.lng]}>
                  <Popup>Selected playdate location</Popup>
                </Marker>
                <Circle
                  center={[scheduleMapPosition.lat, scheduleMapPosition.lng]}
                  radius={120}
                  pathOptions={{ color: "#6b5bff", fillColor: "#6b5bff", fillOpacity: 0.12 }}
                />
              </>
            )}
            {playdatesMapMarkers.map((marker) => (
              <Marker key={marker.id} position={[marker.position.lat, marker.position.lng]}>
                <Popup>{marker.label}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </PlaydateMapViewport>
      </PlaydateMapCard>

      <Section title="Schedule a playdate">
        <PlaydateSectionBody>
          <PlaydateForm onSubmit={submitPlaydateSchedule}>
            <FormControl>
              <label htmlFor="playdate-title">Title</label>
              <input
                id="playdate-title"
                type="text"
                value={playdateScheduleForm.title}
                onChange={handlePlaydateScheduleChange("title")}
                placeholder="Saturday explorers"
                required
              />
            </FormControl>
            <FormControl>
              <label htmlFor="playdate-activity">Activity</label>
              <input
                id="playdate-activity"
                type="text"
                value={playdateScheduleForm.activity}
                onChange={handlePlaydateScheduleChange("activity")}
                placeholder="STEM lab, park meetup..."
                required
              />
            </FormControl>
            <FormControl>
              <label htmlFor="playdate-location">Location</label>
              <input
                id="playdate-location"
                type="text"
                value={playdateScheduleForm.locationName}
                onChange={handlePlaydateScheduleChange("locationName")}
                placeholder="Central Park – North Meadow"
                required
              />
            </FormControl>
            {scheduleLocationSuggestions.length > 0 && showScheduleSuggestions && (
              <PlaydateFullRow>
                <LocationSuggestionSelect
                  value=""
                  onChange={(event) => {
                    const suggestion = event.target.value;
                    if (!suggestion) {
                      return;
                    }
                    const match = scheduleLocationSuggestions.find((item) => item.label === suggestion);
                    setPlaydateScheduleForm((prev) => ({
                      ...prev,
                      locationName: suggestion,
                    }));
                    if (match?.coordinates) {
                      setScheduleMapPosition(match.coordinates);
                    }
                    setShowScheduleSuggestions(false);
                  }}
                >
                  <option value="">Suggested locations…</option>
                  {scheduleLocationSuggestions.map((suggestion) => (
                    <option key={`schedule-${suggestion.label}`} value={suggestion.label}>
                      {suggestion.label}
                    </option>
                  ))}
                </LocationSuggestionSelect>
              </PlaydateFullRow>
            )}
            <FormControl>
              <label htmlFor="playdate-max">Max guests</label>
              <input
                id="playdate-max"
                type="number"
                min={0}
                value={playdateScheduleForm.maxGuests}
                onChange={handlePlaydateScheduleChange("maxGuests")}
                placeholder="4"
              />
            </FormControl>
            <FormControl>
              <label htmlFor="playdate-start">Starts</label>
              <input
                id="playdate-start"
                type="datetime-local"
                value={playdateScheduleForm.startTime}
                onChange={handlePlaydateScheduleChange("startTime")}
                required
              />
            </FormControl>
            <FormControl>
              <label htmlFor="playdate-end">Ends</label>
              <input
                id="playdate-end"
                type="datetime-local"
                value={playdateScheduleForm.endTime}
                onChange={handlePlaydateScheduleChange("endTime")}
                required
              />
            </FormControl>
            <PlaydateFullRow>
              <FormControl>
                <label htmlFor="playdate-description">Description</label>
                <textarea
                  id="playdate-description"
                  value={playdateScheduleForm.description}
                  onChange={handlePlaydateScheduleChange("description")}
                  rows={3}
                  placeholder="Share supplies or tips for guardians."
                />
              </FormControl>
            </PlaydateFullRow>
            <PlaydateFullRow>
              <FormControl>
                <label htmlFor="playdate-notes">Host notes</label>
                <textarea
                  id="playdate-notes"
                  value={playdateScheduleForm.notes}
                  onChange={handlePlaydateScheduleChange("notes")}
                  rows={2}
                  placeholder="Reminder: bring sunscreen and reusable bottles."
                />
              </FormControl>
            </PlaydateFullRow>
            <PlaydateFullRow>
              <PlaydateButtonRow>
                <PlaydateButton type="submit" disabled={playdateCreating}>
                  {playdateCreating ? "Scheduling..." : "Schedule playdate"}
                </PlaydateButton>
                <PlaydateButton
                  type="button"
                  variant="ghost"
                  disabled={playdateCreating}
                  onClick={() => setPlaydateScheduleForm(buildDefaultPlaydateForm())}
                >
                  Reset form
                </PlaydateButton>
              </PlaydateButtonRow>
            </PlaydateFullRow>
        </PlaydateForm>
      </PlaydateSectionBody>
    </Section>

      <Section title={`Hosted playdates (${hostedPlaydates.length})`}>
        <PlaydateSectionBody>
          {playdatesLoading && <div>Loading hosted playdates...</div>}
          {!playdatesLoading && hostedPlaydates.length === 0 && (
            <PlaydateEmpty>Start your first playdate above to see it listed here.</PlaydateEmpty>
          )}
          {!playdatesLoading &&
            hostedPlaydates.map((playdate) => {
              const participants = playdate.participants ?? [];
              const approvedGuests = participants.filter(
                (participant) => participant.role === "guest" && participant.status === "approved"
              );
              const pendingGuests = participants.filter(
                (participant) => participant.role === "guest" && participant.status === "pending"
              );
              const isEditing = editingPlaydateId === playdate.id && editPlaydateDraft;
              const editLocationSuggestions = isEditing && editPlaydateDraft
                ? buildLocationSuggestions(editPlaydateDraft.locationName)
                : [];
              const showEditSuggestions = editSuggestionVisibility[playdate.id] !== false && editLocationSuggestions.length > 0;
              return (
                <PlaydateCard key={playdate.id}>
                  <PlaydateCardHeader>
                    <div>
                      <PlaydateCardTitle>{playdate.title}</PlaydateCardTitle>
                      <PlaydateCardMeta>
                        <span>{playdate.activity}</span>
                        <span>
                          {new Date(playdate.startTime).toLocaleString()} →
                          {" "}
                          {new Date(playdate.endTime).toLocaleTimeString()}
                        </span>
                        <span>{playdate.locationName}</span>
                        {playdate.maxGuests != null && (
                          <span>
                            {approvedGuests.length}/{playdate.maxGuests} guests approved
                          </span>
                        )}
                        <span>Pending requests: {pendingGuests.length}</span>
                      </PlaydateCardMeta>
                    </div>
                    <PlaydateTag tone={playdate.status === "scheduled" ? "positive" : "warning"}>
                      {playdate.status === "scheduled" ? "Open" : "Closed"}
                    </PlaydateTag>
                  </PlaydateCardHeader>

                  {isEditing && editPlaydateDraft ? (
                    <PlaydateSectionBody>
                      <PlaydateForm onSubmit={submitPlaydateEdit}>
                        <FormControl>
                          <label htmlFor={`edit-title-${playdate.id}`}>Title</label>
                          <input
                            id={`edit-title-${playdate.id}`}
                            type="text"
                            value={editPlaydateDraft.title}
                            onChange={(event) => updatePlaydateDraft("title", event)}
                            required
                          />
                        </FormControl>
                        <FormControl>
                          <label htmlFor={`edit-activity-${playdate.id}`}>Activity</label>
                          <input
                            id={`edit-activity-${playdate.id}`}
                            type="text"
                            value={editPlaydateDraft.activity}
                            onChange={(event) => updatePlaydateDraft("activity", event)}
                            required
                          />
                        </FormControl>
                        <FormControl>
                          <label htmlFor={`edit-location-${playdate.id}`}>Location</label>
                          <input
                            id={`edit-location-${playdate.id}`}
                            type="text"
                            value={editPlaydateDraft.locationName}
                            onChange={(event) => updatePlaydateDraft("locationName", event)}
                            required
                          />
                        </FormControl>
                        {showEditSuggestions && (
                          <PlaydateFullRow>
                            <LocationSuggestionSelect
                              value=""
                              onChange={(event) => {
                                const suggestion = event.target.value;
                                if (!suggestion) {
                                  return;
                                }
                                const match = editLocationSuggestions.find((item) => item.label === suggestion);
                                setEditPlaydateDraft((prev) =>
                                  prev ? { ...prev, locationName: suggestion } : prev
                                );
                                if (match?.coordinates && editingPlaydateId === playdate.id) {
                                  setScheduleMapPosition(match.coordinates);
                                }
                                setEditSuggestionVisibility((prev) => ({
                                  ...prev,
                                  [playdate.id]: false,
                                }));
                              }}
                            >
                              <option value="">Suggested locations…</option>
                              {editLocationSuggestions.map((suggestion) => (
                                <option key={`edit-${playdate.id}-${suggestion.label}`} value={suggestion.label}>
                                  {suggestion.label}
                                </option>
                              ))}
                            </LocationSuggestionSelect>
                          </PlaydateFullRow>
                        )}
                        <FormControl>
                          <label htmlFor={`edit-max-${playdate.id}`}>Max guests</label>
                          <input
                            id={`edit-max-${playdate.id}`}
                            type="number"
                            min={0}
                            value={editPlaydateDraft.maxGuests}
                            onChange={(event) => updatePlaydateDraft("maxGuests", event)}
                          />
                        </FormControl>
                        <FormControl>
                          <label htmlFor={`edit-start-${playdate.id}`}>Starts</label>
                          <input
                            id={`edit-start-${playdate.id}`}
                            type="datetime-local"
                            value={editPlaydateDraft.startTime}
                            onChange={(event) => updatePlaydateDraft("startTime", event)}
                            required
                          />
                        </FormControl>
                        <FormControl>
                          <label htmlFor={`edit-end-${playdate.id}`}>Ends</label>
                          <input
                            id={`edit-end-${playdate.id}`}
                            type="datetime-local"
                            value={editPlaydateDraft.endTime}
                            onChange={(event) => updatePlaydateDraft("endTime", event)}
                            required
                          />
                        </FormControl>
                        <PlaydateFullRow>
                          <FormControl>
                            <label htmlFor={`edit-description-${playdate.id}`}>Description</label>
                            <textarea
                              id={`edit-description-${playdate.id}`}
                              value={editPlaydateDraft.description}
                              onChange={(event) => updatePlaydateDraft("description", event)}
                              rows={3}
                            />
                          </FormControl>
                        </PlaydateFullRow>
                        <PlaydateFullRow>
                          <FormControl>
                            <label htmlFor={`edit-notes-${playdate.id}`}>Host notes</label>
                            <textarea
                              id={`edit-notes-${playdate.id}`}
                              value={editPlaydateDraft.notes}
                              onChange={(event) => updatePlaydateDraft("notes", event)}
                              rows={2}
                            />
                          </FormControl>
                        </PlaydateFullRow>
                        <PlaydateFullRow>
                          <PlaydateButtonRow>
                            <PlaydateButton type="submit" disabled={savingPlaydateId === playdate.id}>
                              {savingPlaydateId === playdate.id ? "Saving..." : "Save changes"}
                            </PlaydateButton>
                            <PlaydateButton type="button" variant="ghost" onClick={cancelPlaydateEditing}>
                              Cancel
                            </PlaydateButton>
                          </PlaydateButtonRow>
                        </PlaydateFullRow>
                      </PlaydateForm>
                    </PlaydateSectionBody>
                  ) : (
                    <PlaydateButtonRow>
                      <PlaydateButton
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={savingPlaydateId === playdate.id}
                        onClick={() => togglePlaydateStatus(playdate)}
                      >
                        {savingPlaydateId === playdate.id
                          ? "Updating..."
                          : playdate.status === "scheduled"
                          ? "Close playdate"
                          : "Reopen playdate"}
                      </PlaydateButton>
                      <PlaydateButton type="button" size="sm" onClick={() => beginPlaydateEditing(playdate)}>
                        Reschedule / edit
                      </PlaydateButton>
                    </PlaydateButtonRow>
                  )}

                  {pendingGuests.length > 0 && (
                    <PlaydateSectionBody>
                      <PlaydateCardMeta>Pending guest requests</PlaydateCardMeta>
                      <PlaydateParticipantList>
                        {pendingGuests.map((participant) => {
                          const audit = playdateAuditState[participant.id];
                          return (
                            <PlaydateParticipantRow key={`${playdate.id}-${participant.id}-pending`}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <strong>{participant.user?.name ?? "Unknown guardian"}</strong>
                                <PlaydateCardMeta>
                                  <span>Status: Pending review</span>
                                </PlaydateCardMeta>
                              </div>
                              <IntroCopy>
                                AI checks mutual friends, distance, PlayDate history, and future plans so you can approve with confidence.
                              </IntroCopy>
                              <PlaydateButtonRow>
                                <PlaydateButton
                                  type="button"
                                  size="sm"
                                  disabled={playdateDecisionBusy[participant.id]}
                                  onClick={() => handlePlaydateParticipant(playdate.id, participant, "approved")}
                                >
                                  Approve
                                </PlaydateButton>
                                <PlaydateButton
                                  type="button"
                                  size="sm"
                                  variant="danger"
                                  disabled={playdateDecisionBusy[participant.id]}
                                  onClick={() => handlePlaydateParticipant(playdate.id, participant, "rejected")}
                                >
                                  Reject
                                </PlaydateButton>
                                <PlaydateButton
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={audit?.loading}
                                  onClick={() => loadPlaydateAudit(playdate.id, participant)}
                                >
                                  {audit?.loading ? "Loading AI audit..." : audit?.audit ? "Refresh AI audit" : "Run AI audit"}
                                </PlaydateButton>
                              </PlaydateButtonRow>
                              {audit?.error && <PlaydateBanner tone="error">{audit.error}</PlaydateBanner>}
                              {audit?.audit && (
                                <PlaydateAuditCard>
                                  <strong>{audit.audit.summary}</strong>
                                  <PlaydateCardMeta>
                                    <span>Trust score: {audit.audit.trustScore} · Risk level: {audit.audit.riskLevel}</span>
                                    <span>
                                      Mutual friends: {audit.audit.mutualFriends}
                                      {audit.audit.distanceKm != null && ` · ${audit.audit.distanceKm.toFixed(1)} km away`}
                                    </span>
                                    {audit.audit.kidHighlights.length > 0 && (
                                      <span>
                                        Kid interests:
                                        {" "}
                                        {audit.audit.kidHighlights
                                          .map((kid) => `${kid.kidName} (${kid.favoriteActivity})`)
                                          .join(", ")}
                                      </span>
                                    )}
                                  </PlaydateCardMeta>
                                  <PlaydateParticipantList>
                                    {audit.audit.factors.map((factor) => (
                                      <PlaydateParticipantRow key={`${participant.id}-${factor.label}`}>
                                        <strong>{factor.label}</strong>
                                        <span>{factor.detail}</span>
                                      </PlaydateParticipantRow>
                                    ))}
                                  </PlaydateParticipantList>
                                </PlaydateAuditCard>
                              )}
                            </PlaydateParticipantRow>
                          );
                        })}
                      </PlaydateParticipantList>
                    </PlaydateSectionBody>
                  )}
                </PlaydateCard>
              );
            })}
        </PlaydateSectionBody>
      </Section>

      <Section title={`Playdates you're joining (${joinedPlaydateSummaries.length})`}>
        <PlaydateSectionBody>
          {playdatesLoading && <div>Loading your playdates...</div>}
          {!playdatesLoading && joinedPlaydateSummaries.length === 0 && (
            <PlaydateEmpty>Ask a trusted friend for an invite to get started.</PlaydateEmpty>
          )}
          {!playdatesLoading &&
            joinedPlaydateSummaries.map((membership) => {
              const playdate = membership.playdate;
              const busy = playdateMembershipBusy[membership.playdateId];
              const statusTone =
                membership.status === "approved"
                  ? "positive"
                  : membership.status === "pending"
                  ? "neutral"
                  : "warning";
              const statusLabel =
                membership.status === "approved"
                  ? "Approved"
                  : membership.status === "pending"
                  ? "Pending host review"
                  : membership.status === "rejected"
                  ? "Rejected"
                  : "Left";
              return (
                <PlaydateCard key={`${membership.playdateId}-${membership.participantId}`}>
                  <PlaydateCardHeader>
                    <div>
                      <PlaydateCardTitle>{playdate.title}</PlaydateCardTitle>
                      <PlaydateCardMeta>
                        <span>{playdate.activity}</span>
                        <span>
                          {new Date(playdate.startTime).toLocaleString()} →
                          {" "}
                          {new Date(playdate.endTime).toLocaleTimeString()}
                        </span>
                        <span>{playdate.locationName}</span>
                        <span>Host: {playdate.host?.name ?? "Unknown"}</span>
                      </PlaydateCardMeta>
                    </div>
                    <PlaydateTag tone={statusTone}>{statusLabel}</PlaydateTag>
                  </PlaydateCardHeader>
                  <PlaydateButtonRow>
                    {(membership.status === "approved" || membership.status === "pending") && (
                      <PlaydateButton
                        type="button"
                        size="sm"
                        variant={membership.status === "approved" ? "danger" : "ghost"}
                        disabled={busy}
                        onClick={() => leavePlaydateMembership(membership.playdateId)}
                      >
                        {busy
                          ? "Updating..."
                          : membership.status === "approved"
                          ? "Leave playdate"
                          : "Cancel request"}
                      </PlaydateButton>
                    )}
                    {(membership.status === "left" || membership.status === "rejected") && (
                      <PlaydateButton
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => requestPlaydateRejoin(membership.playdateId)}
                      >
                        {busy ? "Sending..." : "Request to rejoin"}
                      </PlaydateButton>
                    )}
                  </PlaydateButtonRow>
                  {membership.decisionNote && <PlaydateCardMeta>{membership.decisionNote}</PlaydateCardMeta>}
                </PlaydateCard>
              );
            })}
        </PlaydateSectionBody>
      </Section>
    </>
  );

  const hostedPlaydate = useMemo(() => {
    if (hostedPlaydates.length === 0) {
      return null;
    }
    const sorted = [...hostedPlaydates].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const nextPlaydate = sorted[0];
    const range = formatTimeRange(nextPlaydate.startTime, nextPlaydate.endTime).split(' – ');
    return {
      activity: nextPlaydate.activity,
      start: range[0],
      end: range[1] ?? '',
      kids:
        nextPlaydate.participants.filter((participant) => participant.role === 'guest' && participant.status === 'approved')
          .length,
      trust: 95,
    };
  }, [hostedPlaydates]);

  const handleLogout = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      auth.logOut();
    },
    [auth]
  );

  useEffect(() => {
    if (activeView !== "map") {
      setSelectedPlaydate(null);
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView !== "overview") {
      setJoiningPlaydate(null);
      setJoinMessage(null);
    }
  }, [activeView]);

  const handleOverviewRadiusChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setOverviewRadius(Number(event.target.value));
  }, []);

  const handleJoinChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setJoinForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleJoinSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!joiningPlaydate) {
        return;
      }
      if (!joinForm.guardianName.trim() || !joinForm.guardianEmail.trim() || !joinForm.kidName.trim()) {
        setJoinMessage("Please complete guardian and kid information before applying.");
        return;
      }
      try {
        let candidate: PlaydateHostSummary | null = null;
        try {
          const hostPlaydates = await getPlaydatesByHost(joiningPlaydate.friendId);
          if (hostPlaydates.length > 0) {
            candidate = hostPlaydates.find((playdate) =>
              playdate.activity.toLowerCase() === joiningPlaydate.activity.toLowerCase()
            ) ?? hostPlaydates[0];
          }
        } catch (lookupError) {
          // ignore – we'll fall back to synthetic candidate
        }

        if (candidate) {
          await requestJoinPlaydate(candidate.id);
          await loadPlaydatesOverview();

          const startTime = new Date(candidate.startTime);
          const endTime = new Date(candidate.endTime);
          const formatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

          setJoinedPlaydates((previous) => [
            ...previous,
            {
              id: candidate!.id,
              activity: candidate!.activity,
              host: candidate!.participants.find((p) => p.role === 'host')?.user?.name ?? joiningPlaydate.friendName ?? "Local guardian",
              start: formatter.format(startTime),
              end: formatter.format(endTime),
              status: "Pending approval",
            },
          ]);
        } else {
          const now = new Date();
          const start = new Date(now.getTime() + 1000 * 60 * 60 * 24);
          const end = new Date(start.getTime() + 1000 * 60 * 90);
          const locationLabel =
            typeof joiningPlaydate.friendLatitude === "number" && typeof joiningPlaydate.friendLongitude === "number"
              ? resolveLocationLabel({ lat: joiningPlaydate.friendLatitude, lng: joiningPlaydate.friendLongitude })
              : "Location shared after approval";

          const syntheticId = Date.now();
          setJoinedPlaydates((previous) => [
            ...previous,
            {
              id: syntheticId,
              activity: joiningPlaydate.activity,
              host: joiningPlaydate.friendName ?? "Local guardian",
              start: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(start),
              end: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(end),
              status: "Pending approval",
            },
          ]);

          setPlaydatesOverview((previous) => {
            if (!previous) {
              return previous;
            }
            const participantId = syntheticId + 1;
            const newMembership: JoinedPlaydateSummary = {
              playdateId: syntheticId,
              participantId,
              role: 'guest',
              status: 'pending',
              joinedAt: null,
              decisionNote: null,
              playdate: {
                id: syntheticId,
                title: joiningPlaydate.activity,
                activity: joiningPlaydate.activity,
                description: null,
                locationName: locationLabel,
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                status: 'scheduled',
                maxGuests: null,
                notes: null,
                host: {
                  id: joiningPlaydate.friendId,
                  name: joiningPlaydate.friendName ?? 'Local guardian',
                },
              },
            };
            return {
              hosted: previous.hosted,
              joined: [newMembership, ...previous.joined],
            };
          });
        }

        setJoinMessage(
          `Your request to join ${joiningPlaydate.activity} has been sent to ${joiningPlaydate.friendName ?? "the host"}. They will review and respond soon.`
        );
        setJoinForm({ guardianName: "", guardianEmail: "", kidName: "", notes: "" });
        setJoiningPlaydate(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to submit join request right now.';
        setJoinMessage(message);
      }
    },
    [joinForm, joiningPlaydate, loadPlaydatesOverview]
  );

  const renderOverview = () => (
    <>
      <AdventureCard>
        <AdventureHeader>
          <AdventureTitle>Ready for your next adventure?</AdventureTitle>
          <AdventureSubtext>
            Tap into the live leaderboard to discover which guardians are rallying nearby and grab the next playdate slot
            before it fills up.
          </AdventureSubtext>
        </AdventureHeader>

        <AdventureControls>
          <ControlGroup>
            Distance
            <select value={overviewRadius} onChange={handleOverviewRadiusChange}>
              {RADIUS_OPTIONS.map((radius) => (
                <option key={radius} value={radius}>
                  {radius} mile{radius > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </ControlGroup>
          <AdventureHint>
            Showing live playdates {playdatePoint ? `around your pin` : `once you drop a pin`} · refreshed moments ago.
          </AdventureHint>
        </AdventureControls>

        <AdventureMap>
          <MapContainer
            key={`${overviewMapCenter.lat}-${overviewMapCenter.lng}-${overviewZoom}-${overviewRadius}`}
            center={[overviewMapCenter.lat, overviewMapCenter.lng]}
            zoom={overviewZoom}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {playdatePoint && (
              <>
                <Marker position={[playdatePoint.lat, playdatePoint.lng]}>
                  <Popup>Your meetup hub</Popup>
                </Marker>
                <Circle
                  center={[playdatePoint.lat, playdatePoint.lng]}
                  radius={overviewCircleRadiusMeters}
                  pathOptions={{ color: "#6b5bff", fillColor: "#6b5bff", fillOpacity: 0.08 }}
                />
              </>
            )}
            {overviewMarkers.map((marker) => (
              <Marker
                key={marker.id}
                position={marker.position}
                eventHandlers={{
                  click: () => {
                    setJoiningPlaydate(marker.item);
                    setJoinMessage(null);
                  },
                }}
              >
                <Popup>
                  <strong>{marker.activity}</strong>
                  <br />
                  Host: {marker.host}
                  <br />
                  Location: {marker.locationLabel}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </AdventureMap>
        {!playdatePoint && !adventureStatusMessage && (
          <AdventureHint>Drop a pin on the Playdate Map view to unlock nearby matches.</AdventureHint>
        )}

        {adventureStatusMessage ? (
          <EmptyLeaderboard>{adventureStatusMessage}</EmptyLeaderboard>
        ) : (
          <LeaderboardTable>
            <LeaderboardHead>
              <tr>
                <LeaderboardHeadCell>Activity</LeaderboardHeadCell>
                <LeaderboardHeadCell>Host</LeaderboardHeadCell>
                <LeaderboardHeadCell>Start</LeaderboardHeadCell>
                <LeaderboardHeadCell>End</LeaderboardHeadCell>
                <LeaderboardHeadCell>Kids</LeaderboardHeadCell>
                <LeaderboardHeadCell>Trust score</LeaderboardHeadCell>
                <LeaderboardHeadCell>Popularity</LeaderboardHeadCell>
                <LeaderboardHeadCell style={{ textAlign: "center" }}>Join</LeaderboardHeadCell>
              </tr>
            </LeaderboardHead>
            <LeaderboardBody>
              {filteredLeaderboard.map(({ item, distanceKm }) => {
                const times = createTimeWindow(item.friendId);
                const trust = deriveTrustScore(item.friendId);
                const popularity = derivePopularity(item.friendId);
                const distanceMiles =
                  distanceKm !== null ? Number((distanceKm / ONE_MILE_KM).toFixed(1)) : null;

                return (
                  <LeaderboardRow key={item.friendId}>
                    <LeaderboardCell>
                      <LeaderboardPrimary>{item.activity}</LeaderboardPrimary>
                      <LeaderboardSecondary>
                        {(item.friendName || "Neighborhood circle")}
                        {distanceMiles !== null ? ` · ${distanceMiles} mi away` : ""}
                      </LeaderboardSecondary>
                    </LeaderboardCell>
                    <LeaderboardCell>
                      <LeaderboardPrimary>{item.friendName ?? "Friendly host"}</LeaderboardPrimary>
                      <LeaderboardSecondary>
                        {item.closestFriend ? `Closest match: ${item.closestFriend}` : "Local favorite"}
                      </LeaderboardSecondary>
                    </LeaderboardCell>
                    <LeaderboardNumeric>{times.start}</LeaderboardNumeric>
                    <LeaderboardNumeric>{times.end}</LeaderboardNumeric>
                    <LeaderboardNumeric>{item.kidCount ?? 0}</LeaderboardNumeric>
                    <LeaderboardNumeric>{trust}%</LeaderboardNumeric>
                    <LeaderboardNumeric>{popularity}</LeaderboardNumeric>
                    <LeaderboardActionCell>
                      <button
                        type="button"
                        onClick={() => {
                          setJoiningPlaydate(item);
                          setJoinMessage(null);
                        }}
                      >
                        Join
                      </button>
                    </LeaderboardActionCell>
                  </LeaderboardRow>
                );
              })}
            </LeaderboardBody>
          </LeaderboardTable>
      )}

      {joiningPlaydate && (
        <Section title="Request to join">
          <p style={{ margin: 0 }}>
              Apply to join <strong>{joiningPlaydate.activity}</strong> hosted by {joiningPlaydate.friendName ?? "a local guardian"}.
              The host receives your request instantly and can approve or reject it from their Playdate Inbox.
            </p>
            <form onSubmit={handleJoinSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              <FormControl>
                <label htmlFor="guardianName">Your name</label>
                <input
                  id="guardianName"
                  name="guardianName"
                  value={joinForm.guardianName}
                  onChange={handleJoinChange}
                  placeholder="Sam Rivera"
                />
              </FormControl>
              <FormControl>
                <label htmlFor="guardianEmail">Email</label>
                <input
                  id="guardianEmail"
                  name="guardianEmail"
                  value={joinForm.guardianEmail}
                  onChange={handleJoinChange}
                  placeholder="sam@example.com"
                  type="email"
                />
              </FormControl>
              <FormControl>
                <label htmlFor="kidName">Kid joining</label>
                <input
                  id="kidName"
                  name="kidName"
                  value={joinForm.kidName}
                  onChange={handleJoinChange}
                  placeholder="Avery (age 7)"
                />
              </FormControl>
              <FormControl>
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={joinForm.notes}
                  onChange={handleJoinChange}
                  placeholder="Share allergies, favorite activities, or timing preferences"
                  rows={3}
                />
              </FormControl>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit">Send request</button>
                <button
                  type="button"
                  onClick={() => {
                    setJoiningPlaydate(null);
                    setJoinMessage(null);
                  }}
                >
                  Cancel
                </button>
              </div>
              {joinMessage && <p style={{ margin: 0, color: "var(--color-text-muted)" }}>{joinMessage}</p>}
            </form>
          </Section>
        )}
      </AdventureCard>

      {renderKidsSection()}

      <Section title="Your current playdates">
        <CurrentPlaydateGrid>
          <CurrentPlaydateCard>
            <CurrentPlaydateTitle>Hosted</CurrentPlaydateTitle>
            {hostedPlaydate ? (
              <>
                <CurrentPlaydateHeadline>{hostedPlaydate.activity}</CurrentPlaydateHeadline>
                <CurrentPlaydateMeta>
                  <span>
                    {hostedPlaydate.start} – {hostedPlaydate.end}
                  </span>
                  <span>{hostedPlaydate.kids} kid(s) confirmed · Trust {hostedPlaydate.trust}%</span>
                </CurrentPlaydateMeta>
              </>
            ) : (
              <CurrentPlaydateMeta>
                <span>No hosted playdates yet. Drop a pin and invite your circle.</span>
              </CurrentPlaydateMeta>
            )}
          </CurrentPlaydateCard>

          <CurrentPlaydateCard>
            <CurrentPlaydateTitle>Joined</CurrentPlaydateTitle>
            {joinedOverviewEntries.length ? (
              joinedOverviewEntries.map((entry) => (
                <div key={entry.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <CurrentPlaydateHeadline>{entry.activity}</CurrentPlaydateHeadline>
                  <CurrentPlaydateMeta>
                    <span>Host: {entry.host}</span>
                    <span>{entry.range}</span>
                    <span>Status: {entry.status}</span>
                  </CurrentPlaydateMeta>
                </div>
              ))
            ) : (
              <CurrentPlaydateMeta>
                <span>No joined playdates yet. Send a request from the live map when something catches your eye.</span>
              </CurrentPlaydateMeta>
            )}
          </CurrentPlaydateCard>
        </CurrentPlaydateGrid>
      </Section>
    </>
  );

  const renderFriends = () => (
    <EmbeddedPanel>
      <ViewPill>Friends hub</ViewPill>
      <Friends />
    </EmbeddedPanel>
  );

  const renderKids = () => renderKidsSection();

  const renderProfile = () => (
    <ProfileCard>
      <ViewPill>Your profile</ViewPill>
      <p>
        Personalize your guardian and family details, update favorite activities, and control who can view your playdate
        availability.
      </p>
      <OverviewActions>
        <OverviewAction as="a" href="#">
          Edit guardian info
          <span>Keep your contact details and intro up to date.</span>
        </OverviewAction>
        <OverviewAction as="a" href="#">
          Manage kids
          <span>Add hobbies, ages, and preferences for better matches.</span>
        </OverviewAction>
        <OverviewAction as="a" href="#">
          Privacy settings
          <span>Choose who can see your schedule and send invites.</span>
        </OverviewAction>
      </OverviewActions>
    </ProfileCard>
  );

  const renderView = () => {
    switch (activeView) {
      case "playdates":
        return renderPlaydates();
      case "friends":
        return renderFriends();
      case "kids":
        return renderKids();
      case "profile":
        return renderProfile();
      default:
        return renderOverview();
    }
  };

  return (
    <Page>
      <TopBar>
        <Title>Playdate Pulse</Title>
        <TopActions>
          <TopBadge>Hello, {auth.user ?? "there"}!</TopBadge>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </TopActions>
      </TopBar>
      <Layout>
        <Sidebar>
          <SidebarCard>
            <SidebarCardHeadline>Daily pulse</SidebarCardHeadline>
            <SidebarCardSubtitle>
              Snapshot of your world before you dive into planning.
            </SidebarCardSubtitle>
            <SidebarMetric>
              <SidebarMetricLabel>Today</SidebarMetricLabel>
              <SidebarMetricValue>{dateLabel}</SidebarMetricValue>
            </SidebarMetric>
            <SidebarMetric>
              <SidebarMetricLabel>Local time</SidebarMetricLabel>
              <SidebarMetricValue>{timeLabel}</SidebarMetricValue>
            </SidebarMetric>
            <SidebarMetric>
              <SidebarMetricLabel>Your playdate pin</SidebarMetricLabel>
              <SidebarMetricValue>{locationLabel}</SidebarMetricValue>
            </SidebarMetric>
            <SidebarMetric>
              <SidebarMetricLabel>Weather</SidebarMetricLabel>
              <SidebarMetricValue>{weatherLabel}</SidebarMetricValue>
            </SidebarMetric>
            {!playdatePoint && (
              <SidebarHint>Drop a pin on the map to tailor matches to your neighborhood.</SidebarHint>
            )}
          </SidebarCard>

          <NavList>
            <li>
              <NavButton type="button" onClick={() => setActiveView("overview")} $active={activeView === "overview"}>
                <NavElementTitle>Overview</NavElementTitle>
              </NavButton>
            </li>
            <li>
              <NavButton type="button" onClick={() => setActiveView("playdates")} $active={activeView === "playdates"}>
                <NavElementTitle>Playdates</NavElementTitle>
              </NavButton>
            </li>
            <li>
              <NavButton type="button" onClick={() => setActiveView("kids")} $active={activeView === "kids"}>
                <NavElementTitle>Kids</NavElementTitle>
              </NavButton>
            </li>
            <li>
          <NavButton type="button" onClick={() => setActiveView("friends")} $active={activeView === "friends"}>
            <NavElementTitle>Friends</NavElementTitle>
          </NavButton>
        </li>
        <li>
          <NavButton type="button" onClick={() => setActiveView("profile")} $active={activeView === "profile"}>
            <NavElementTitle>Profile</NavElementTitle>
          </NavButton>
        </li>
          </NavList>
        </Sidebar>

        <MainPanel>{renderView()}</MainPanel>
      </Layout>
    </Page>
  );
};
