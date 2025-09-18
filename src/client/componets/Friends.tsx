import { useEffect, useState, useCallback } from "react";
import styled from "@emotion/styled";
import {
  getFriendshipAsker,
  getFriendsConfirmed,
  getFriendsPending,
  deleteFriend,
} from "../api";
import { Header } from "./Header";
import { FriendItem } from "./FriendItem";
import { FriendAsk } from "./FriendAsk";
import { Friend } from "../types";
import { Section } from "./Section";
import { Page } from "./Page";

const FriendsPage = styled(Page)({
  gap: 24,
});

const SectionContent = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 14,
});

const IntroCopy = styled.p({
  margin: 0,
  color: "var(--color-text-muted)",
  fontWeight: 500,
});

const BackLink = styled.a({
  alignSelf: "flex-start",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "var(--color-primary)",
});

export const Friends = () => {
  const [friendsConfirmed, setFriendsConfirmed] = useState<Friend[]>([]);
  const [friendsAsking, setFriendsAsking] = useState<Friend[]>([]);
  const [friendsPending, setFriendsPending] = useState<Friend[]>([]);

  const fetchData = async () => {
    try {
      const friendsConfirmed = await getFriendsConfirmed();
      setFriendsConfirmed(friendsConfirmed);
      const friendsAsking = await getFriendshipAsker();
      setFriendsAsking(friendsAsking);
      const friendsPending = await getFriendsPending();
      setFriendsPending(friendsPending);
    } catch (err) {
      console.log("failed to fetch friends", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteFriend = useCallback(async (friendId: number) => {
    try {
      await deleteFriend(friendId);
    } catch (error) {
      console.log("failed to delete friend", error);
    }
  }, []);

  const hasConnections =
    friendsConfirmed.length + friendsAsking.length + friendsPending.length > 0;

  return (
    <FriendsPage>
      <Header>Friends</Header>
      <IntroCopy>
        Manage your trusted circle, respond to new requests, and invite more
        guardians to join in.
      </IntroCopy>
      {!hasConnections && (
        <Section title="No connections yet">
          <SectionContent>
            <IntroCopy>
              Send an invite to start your network. The more trusted guardians
              you add, the easier it is to find perfect playmates.
            </IntroCopy>
          </SectionContent>
        </Section>
      )}
      {friendsConfirmed.length > 0 && (
        <Section title={`Friends: ${friendsConfirmed.length}`}>
          <SectionContent>
            {friendsConfirmed.map((friend) => (
              <FriendItem
                key={friend.id}
                friend={friend}
                showButtons={false}
                onUpdate={fetchData}
                allowDelete={true}
                onDelete={handleDeleteFriend}
              />
            ))}
          </SectionContent>
        </Section>
      )}
      {friendsAsking.length > 0 && (
        <Section
          title={`Requests waiting for you: ${friendsAsking.length}`}
        >
          <SectionContent>
            {friendsAsking.map((friend) => (
              <FriendItem
                key={friend.id}
                friend={friend}
                showButtons={true}
                onUpdate={fetchData}
              />
            ))}
          </SectionContent>
        </Section>
      )}
      {friendsPending.length > 0 && (
        <Section title={`Invites you have sent: ${friendsPending.length}`}>
          <SectionContent>
            {friendsPending.map((friend) => (
              <FriendItem
                key={friend.id}
                friend={friend}
                showButtons={false}
                onUpdate={fetchData}
              />
            ))}
          </SectionContent>
        </Section>
      )}
      <FriendAsk onUpdate={fetchData} />
      <BackLink href="/">Back to dashboard</BackLink>
    </FriendsPage>
  );
};
