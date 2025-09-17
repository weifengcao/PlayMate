import { useEffect, useState } from "react";
import {
  getFriendshipAsker,
  getFriendsConfirmed,
  getFriendsPending,
} from "../api";
import { Header } from "./Header";
import { FriendItem } from "./FriendItem";
import { FriendAsk } from "./FriendAsk";
import { Friend } from "../types";
import { Section } from "./Section";

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

  return (
    <div>
      <Header>Friends</Header>
      {friendsConfirmed.length > 0 && (
        <>
          <br />
          <Section title={`Friends: ${friendsConfirmed.length}`}>
            <div>
              {friendsConfirmed.map((friend) => (
                <FriendItem
                  key={friend.id}
                  friend={friend}
                  showButtons={false}
                  onUpdate={fetchData}
                />
              ))}
            </div>
          </Section>
        </>
      )}
      {friendsAsking.length > 0 && (
        <>
          <br />
          <Section
            title={`Persons asking to be your friend: ${friendsAsking.length}`}
          >
            <div>
              {friendsAsking.map((friend) => (
                <FriendItem
                  key={friend.id}
                  friend={friend}
                  showButtons={true}
                  onUpdate={fetchData}
                />
              ))}
            </div>
          </Section>
        </>
      )}
      {friendsPending.length > 0 && (
        <>
          <br />
          <Section
            title={`Persons you asked as friend: ${friendsPending.length}`}
          >
            <div>
              {friendsPending.map((friend) => (
                <FriendItem
                  key={friend.id}
                  friend={friend}
                  showButtons={false}
                  onUpdate={fetchData}
                />
              ))}
            </div>
          </Section>
        </>
      )}
      <br />
      <FriendAsk onUpdate={fetchData} />
      <br />
      <a href="/dashboard">Back to dashboard</a>
    </div>
  );
};
