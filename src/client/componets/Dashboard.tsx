import { ChangeEvent, FormEvent, MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Circle, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../hooks/AuthProvider";
import { getMyKids, getMyPlaydatePoint, getPlaydateRecommendations } from "../api";
import KidItem from "./KidItem";
import { FriendRecommendationPayload, Kid, ActivityLeaderboardItem, LeaderboardSort } from "../types";
import { Section } from "./Section";
import { Page } from "./Page";
import WorldMap from "./WorldMap";
import { Friends } from "./Friends";
import { FormControl } from "./FormControl";

const ONE_MILE_KM = 1.60934;
const EARTH_RADIUS_KM = 6371;
const RADIUS_OPTIONS = [1, 3, 5, 10];

type DashboardView = "overview" | "map" | "friends" | "profile" | "kids";

type Coordinates = { lat: number; lng: number };

type LeaderboardEntry = {
  item: ActivityLeaderboardItem;
  distanceKm: number | null;
};

interface JoinedPlaydate {
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

export const Dashboard = () => {
  const navigate = useNavigate();
  const [kids, setKids] = useState<Kid[]>([]);
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [playdateScope, setPlaydateScope] = useState("nearby");
  const [playdateSort, setPlaydateSort] = useState("upcoming");
  const [overviewRadius, setOverviewRadius] = useState<number>(1);
  const [selectedPlaydate, setSelectedPlaydate] = useState<FriendRecommendationPayload | null>(null);
  const [playdatePoint, setPlaydatePoint] = useState<Coordinates | null>(null);
  const [overviewLeaderboard, setOverviewLeaderboard] = useState<ActivityLeaderboardItem[]>([]);
  const [isOverviewLoading, setOverviewLoading] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [joiningPlaydate, setJoiningPlaydate] = useState<ActivityLeaderboardItem | null>(null);
  const [joinForm, setJoinForm] = useState({ guardianName: "", guardianEmail: "", kidName: "", notes: "" });
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinedPlaydates, setJoinedPlaydates] = useState<JoinedPlaydate[]>([]);
  const auth = useAuth();

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

  const hostedPlaydate = useMemo(() => {
    if (!auth.user) {
      return null;
    }
    const match = overviewLeaderboard.find(
      (item) => item.friendName && item.friendName.toLowerCase() === auth.user.toLowerCase()
    );
    if (!match) {
      return null;
    }
    const times = createTimeWindow(match.friendId);
    return {
      activity: match.activity,
      start: times.start,
      end: times.end,
      kids: match.kidCount ?? 0,
      trust: deriveTrustScore(match.friendId),
    };
  }, [auth.user, overviewLeaderboard]);

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
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!joiningPlaydate) {
        return;
      }
      if (!joinForm.guardianName.trim() || !joinForm.guardianEmail.trim() || !joinForm.kidName.trim()) {
        setJoinMessage("Please complete guardian and kid information before applying.");
        return;
      }
      const times = createTimeWindow(joiningPlaydate.friendId);
      setJoinedPlaydates((previous) => [
        ...previous,
        {
          id: Date.now(),
          activity: joiningPlaydate.activity,
          host: joiningPlaydate.friendName ?? "Local guardian",
          start: times.start,
          end: times.end,
          status: "Pending approval",
        },
      ]);
      setJoinMessage(
        `Your request to join ${joiningPlaydate.activity} has been sent to ${joiningPlaydate.friendName ?? "the host"}. They will review and respond soon.`
      );
      setJoinForm({ guardianName: "", guardianEmail: "", kidName: "", notes: "" });
      setJoiningPlaydate(null);
    },
    [joinForm, joiningPlaydate]
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
            {joinedPlaydates.length ? (
              joinedPlaydates.slice(-2).map((entry) => (
                <div key={entry.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <CurrentPlaydateHeadline>{entry.activity}</CurrentPlaydateHeadline>
                  <CurrentPlaydateMeta>
                    <span>Host: {entry.host}</span>
                    <span>
                      {entry.start} – {entry.end}
                    </span>
                    <span>Status: {entry.status}</span>
                  </CurrentPlaydateMeta>
                </div>
              ))
            ) : (
              <CurrentPlaydateMeta>
                <span>No pending requests. Browse the map to join an upcoming playdate.</span>
              </CurrentPlaydateMeta>
            )}
          </CurrentPlaydateCard>
        </CurrentPlaydateGrid>
      </Section>
    </>
  );

  const renderMap = () => (
    <MapCard>
      <ViewPill>Playdates · manage</ViewPill>
      <MapIntro>
        Fine-tune the live map to match your filters, query nearby hosts, approve or decline requests, and launch new
        playdates in seconds.
      </MapIntro>
      <WorldMap showHeader={false} onPlaydateSelect={setSelectedPlaydate} />
      <MapFilters>
        <FilterLabel>
          Show
          <select value={playdateScope} onChange={(event) => setPlaydateScope(event.target.value)}>
            <option value="nearby">Within 1 mile</option>
            <option value="city">Across the city</option>
            <option value="favorites">Favorited spots</option>
          </select>
        </FilterLabel>
        <FilterLabel>
          Sort by
          <select value={playdateSort} onChange={(event) => setPlaydateSort(event.target.value)}>
            <option value="upcoming">Upcoming first</option>
            <option value="distance">Distance</option>
            <option value="popularity">Popularity</option>
          </select>
        </FilterLabel>
        <ScheduleButton type="button">Plan a new playdate</ScheduleButton>
      </MapFilters>
      {selectedPlaydate && (
        <SelectedPlaydateCard>
          <SelectedTitle>{selectedPlaydate.headline ?? "Playdate idea"}</SelectedTitle>
          {selectedPlaydate.message && <p style={{ margin: 0 }}>{selectedPlaydate.message}</p>}
          {selectedPlaydate.recommendations && selectedPlaydate.recommendations.length > 0 && (
            <SelectedList>
              {selectedPlaydate.recommendations.map((detail) => (
                <li key={`${detail.kidId}-${detail.matchName}`}>
                  Match {detail.kidName} with {detail.matchName} for {detail.matchActivity.toLowerCase()} — score {detail.compatibilityScore}
                  {" "}
                  ({detail.suggestedSlot})
                </li>
              ))}
            </SelectedList>
          )}
          {!selectedPlaydate.recommendations?.length && (
            <SelectedHint>Click another pin to preview more recommendations.</SelectedHint>
          )}
        </SelectedPlaydateCard>
      )}
    </MapCard>
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
      case "map":
        return renderMap();
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
              <NavButton type="button" onClick={() => navigate("/playdates")} $active={false}>
                <NavElementTitle>Playdates</NavElementTitle>
              </NavButton>
            </li>
            <li>
              <NavButton type="button" onClick={() => setActiveView("map")} $active={activeView === "map"}>
                <NavElementTitle>Live map</NavElementTitle>
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
