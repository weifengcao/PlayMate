import { FC } from "react";
import styled from "@emotion/styled";
import { Kid } from "../types";

const KidCard = styled.article({
  background: "var(--color-surface-solid)",
  borderRadius: "var(--border-radius-lg)",
  padding: "22px 24px",
  boxShadow: "var(--shadow-soft)",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  border: "1px solid rgba(107, 91, 255, 0.08)",
  transition: "transform var(--transition-base), box-shadow var(--transition-base)",

  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "var(--shadow-hover)",
  },
});

const KidName = styled.h3({
  fontSize: "1.2rem",
  fontWeight: 600,
  color: "var(--color-primary-dark)",
  margin: 0,
});

const KidMeta = styled.p({
  margin: 0,
  color: "var(--color-text-muted)",
  fontSize: "0.95rem",
});

interface KidItemProps {
  kid: Kid;
}

const KidItem: FC<KidItemProps> = ({ kid }) => {
  return (
    <KidCard>
      <KidName>{kid.name}</KidName>
      <KidMeta>Favorite activity: {kid.favoriteActivity}</KidMeta>
      <KidMeta>Age: {kid.age}</KidMeta>
    </KidCard>
  );
};

export default KidItem;
