import styled from "@emotion/styled";

export const Header = styled.header({
  width: "100%",
  maxWidth: 960,
  margin: "0 auto",
  padding: "18px clamp(18px, 4vw, 32px)",
  borderRadius: "var(--border-radius-lg)",
  background:
    "linear-gradient(135deg, rgba(107, 91, 255, 0.94) 0%, rgba(95, 125, 255, 0.9) 100%)",
  color: "#ffffff",
  fontSize: "clamp(1.7rem, 2.2vw, 2.4rem)",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  position: "relative",
  overflow: "hidden",
  boxShadow: "var(--shadow-soft)",

  "&::after": {
    content: "\"\"",
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(120% 120% at 80% 0%, rgba(255, 235, 204, 0.35) 0%, transparent 60%)",
    pointerEvents: "none",
  },
});
