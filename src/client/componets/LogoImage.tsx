import styled from "@emotion/styled";

const LogoContainer = styled.div({
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
});

const LogoTitle = styled.h1({
  margin: 0,
  fontSize: "clamp(2.4rem, 6vw, 3.4rem)",
  fontWeight: 800,
  background:
    "linear-gradient(120deg, rgba(107, 91, 255, 1) 0%, rgba(134, 203, 255, 0.95) 100%)",
  color: "transparent",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
});

const LogoSubtitle = styled.p({
  margin: 0,
  fontSize: "0.95rem",
  color: "var(--color-text-muted)",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
});

export const LogoImage = () => {
  return (
    <LogoContainer>
      <LogoTitle>PlayMate</LogoTitle>
      <LogoSubtitle>Bringing neighborhood playdates to life</LogoSubtitle>
    </LogoContainer>
  );
};
