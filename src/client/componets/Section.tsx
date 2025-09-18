import styled from "@emotion/styled";
import { FC } from "react";

const Wrapper = styled.section({
  padding: "clamp(20px, 4vw, 28px)",
  borderRadius: "var(--border-radius-lg)",
  background: "var(--color-surface)",
  backdropFilter: "blur(18px)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  boxShadow: "var(--shadow-soft)",
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

const Title = styled.h2({
  fontWeight: 600,
  fontSize: "1.1rem",
  margin: 0,
  color: "var(--color-text-primary)",
  display: "flex",
  alignItems: "center",
  gap: 10,
});

const TitleAccent = styled.span({
  display: "inline-block",
  width: 10,
  height: 10,
  borderRadius: "999px",
  background: "var(--color-accent)",
  boxShadow: "0 0 0 4px rgba(255, 179, 71, 0.25)",
});

interface SectionProps {
  title?: string;
  children: React.ReactNode;
}

export const Section: FC<SectionProps> = ({ title, children }) => {
  return (
    <Wrapper>
      {title && (
        <Title>
          <TitleAccent aria-hidden="true" />
          {title}
        </Title>
      )}
      {children}
    </Wrapper>
  );
};
