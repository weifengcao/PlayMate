import styled from "@emotion/styled";
import { FC } from "react";

const Wrapper = styled.section({
  padding: 10,
  borderRadius: 12,
  background: "#613803",
  lineHeight: "1.5em",
});

const Title = styled.div({
  fontWeight: "bold",
});

interface SectionProps {
  title?: string;
  children: React.ReactNode;
}

export const Section: FC<SectionProps> = ({ title, children }) => {
  return (
    <Wrapper>
      {title && <Title>{title}</Title>}
      {children}
    </Wrapper>
  );
};
