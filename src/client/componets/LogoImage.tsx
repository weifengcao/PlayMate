import styled from "@emotion/styled";

const LogoContainer = styled.div({
  textAlign: "center",
  paddingBottom: 5,
});

const LogoTitle = styled.h1({
  fontSize: 48,
  color: "#3a7bd5",
  margin: 0,
});

const LogoSubtitle = styled.p({
  margin: 0,
  fontSize: 18,
  color: "#555",
});

export const LogoImage = () => {
  return (
    <LogoContainer>
      <LogoTitle>PlayMate</LogoTitle>
      <LogoSubtitle>Bringing neighborhood playdates to life</LogoSubtitle>
    </LogoContainer>
  );
};
