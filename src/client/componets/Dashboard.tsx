import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { useAuth } from "../hooks/AuthProvider";
import { getMyKids } from "../api";
import { Header } from "./Header";
import KidItem from "./KidItem";
import { Kid } from "../types";
import { Section } from "./Section";
import { Page } from "./Page";

const HeroCard = styled.section({
  padding: "clamp(24px, 4vw, 34px)",
  borderRadius: "var(--border-radius-lg)",
  background:
    "linear-gradient(135deg, rgba(255, 214, 153, 0.95) 0%, rgba(255, 179, 107, 0.92) 100%)",
  color: "#3c2713",
  display: "flex",
  flexDirection: "column",
  gap: 18,
  boxShadow: "var(--shadow-soft)",
  border: "1px solid rgba(255, 255, 255, 0.55)",
});

const HeroTitle = styled.h2({
  fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
  margin: 0,
  fontWeight: 700,
});

const SessionForm = styled.form({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 16,
  fontWeight: 600,
});

const SessionBadge = styled.span({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "rgba(255, 255, 255, 0.55)",
  padding: "8px 18px",
  borderRadius: 999,
  fontSize: "0.95rem",
});

const HeroDescription = styled.p({
  margin: 0,
  color: "rgba(60, 39, 19, 0.85)",
  fontWeight: 500,
  maxWidth: 520,
});

const QuickLinks = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
});

const QuickLinkCard = styled.a({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  background: "var(--color-surface-solid)",
  borderRadius: "var(--border-radius-lg)",
  padding: "20px clamp(18px, 3vw, 26px)",
  boxShadow: "var(--shadow-soft)",
  border: "1px solid rgba(107, 91, 255, 0.1)",
  transition: "transform var(--transition-base), box-shadow var(--transition-base)",
  color: "inherit",

  "& span": {
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "var(--color-text-muted)",
  },

  "&:hover": {
    transform: "translateY(-3px)",
    boxShadow: "var(--shadow-hover)",
  },
});

const KidGrid = styled.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
});

const EmptyState = styled.p({
  margin: 0,
  color: "var(--color-text-muted)",
  fontWeight: 500,
});

export const Dashboard = () => {
  const [kids, setKids] = useState<Kid[]>([]);
  const auth = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userKids = await getMyKids();
        setKids(userKids);
      } catch (err) {
        console.log("failed to fetch kids", err);
      }
    };
    fetchData();
  }, []);

  const handleSubmitEvent = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      console.log("handle logout");
      auth.logOut();
    },
    [auth]
  );

  const kidLabel = useMemo(
    () => `You support ${kids.length} kid${kids.length === 1 ? "" : "s"}`,
    [kids.length]
  );

  return (
    <Page>
      <Header>Dashboard</Header>

      <HeroCard>
        <HeroTitle>Welcome back!</HeroTitle>
        <HeroDescription>
          Keep tabs on your family's playdate plans, coordinate with friends,
          and discover nearby meetups tailored to your kids.
        </HeroDescription>
        <SessionForm onSubmit={handleSubmitEvent}>
          <SessionBadge>Signed in as {auth.user}</SessionBadge>
          <button type="submit">Logout</button>
        </SessionForm>
      </HeroCard>

      <Section title="Quick actions">
        <QuickLinks>
          <QuickLinkCard href="/map">
            Playdate map
            <span>Visualize neighborhood hotspots and manage your location.</span>
          </QuickLinkCard>
          <QuickLinkCard href="/friends">
            Manage friends
            <span>Review new requests and keep your trusted circle up to date.</span>
          </QuickLinkCard>
        </QuickLinks>
      </Section>

      <Section title={kidLabel}>
        {kids.length ? (
          <KidGrid>
            {kids.map((kid) => (
              <KidItem key={kid.id} kid={kid} />
            ))}
          </KidGrid>
        ) : (
          <EmptyState>
            It looks a little quiet here. Add your kids to start planning future
            playdates together.
          </EmptyState>
        )}
      </Section>
    </Page>
  );
};
