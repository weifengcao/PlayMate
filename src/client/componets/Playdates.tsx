import styled from "@emotion/styled";
import { Link } from "react-router-dom";
import { Header } from "./Header";
import { Page } from "./Page";
import { Section } from "./Section";

const PlaydatesPage = styled(Page)({
  gap: 24,
});

const IntroCopy = styled.p({
  margin: 0,
  color: "var(--color-text-muted)",
  fontWeight: 500,
});

const SectionBody = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

const Highlight = styled.span({
  fontWeight: 700,
  color: "var(--color-primary)",
});

const ActionList = styled.ol({
  margin: 0,
  paddingLeft: 18,
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

const ActionItem = styled.li({
  lineHeight: 1.6,
  color: "var(--color-text-primary)",
});

const BackLink = styled(Link)({
  alignSelf: "flex-start",
  fontWeight: 600,
  color: "var(--color-primary)",
});

export const Playdates = () => {
  return (
    <PlaydatesPage>
      <Header>Playdates</Header>
      <IntroCopy>
        Everything you need to run safe, joyful playdates in one place.
      </IntroCopy>

      <Section title="What you can do">
        <SectionBody>
          <ActionList>
            <ActionItem>
              <Highlight>Schedule a playdate.</Highlight> Choose the ideal time, place, and activity so invited guardians
              know exactly what to expect. Share details up front to keep everyone aligned.
            </ActionItem>
            <ActionItem>
              <Highlight>Approve or reject requests with AI help.</Highlight> Review applicants for your hosted playdates
              using reputation signals, social connections, location proximity, and their PlayDate history before giving the
              green light.
            </ActionItem>
            <ActionItem>
              <Highlight>Manage every playdate you touch.</Highlight> See both the sessions you host and the ones you join, close or
              reschedule anything you organized, and leave or rejoin other playdates whenever plans change.
            </ActionItem>
          </ActionList>
        </SectionBody>
      </Section>

      <Section title="Need a different view?">
        <SectionBody>
          <IntroCopy>
            Jump back to the <Link to="/dashboard">dashboard</Link> for live progress or open the <Link to="/map">map</Link> to
            adjust locations.
          </IntroCopy>
        </SectionBody>
      </Section>

      <Section>
        <BackLink to="/dashboard">← Back to dashboard</BackLink>
      </Section>
    </PlaydatesPage>
  );
};

export default Playdates;
