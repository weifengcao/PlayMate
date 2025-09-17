import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/AuthProvider";
import { getAgentInbox, getMyKids, subscribeToAllTaskUpdates } from "../api";
import { Header } from "./Header";
import KidItem from "./KidItem";
import { AgentInboxItem, FriendRecommendationPayload, Kid } from "../types";
import { Section } from "./Section";

export const Dashboard = () => {
  const [kids, setKids] = useState<Kid[]>([]);
  const [agentInbox, setAgentInbox] = useState<AgentInboxItem<FriendRecommendationPayload>[]>([]);
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

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const items = await getAgentInbox();
        setAgentInbox(items);
      } catch (error) {
        console.log("failed to fetch agent inbox", error);
      }
    };
    fetchInbox();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAllTaskUpdates((update) => {
      if (update.type === 'friend.recommendations' && update.status === 'completed' && update.result) {
        const updatedAt = update.updatedAt ?? new Date().toISOString();
        setAgentInbox((previous) => {
          const next: AgentInboxItem<FriendRecommendationPayload>[] = [
            {
              id: update.id,
              type: update.type ?? 'friend.recommendations',
              result: update.result as FriendRecommendationPayload,
              updatedAt,
            },
            ...previous.filter((item) => item.id !== update.id),
          ];
          return next.slice(0, 10);
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleSubmitEvent = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      console.log("handle logout");
      auth.logOut();
    },
    [auth]
  );

  return (
    <div>
      <Header>Dashboard</Header>
      <div>
        <form onSubmit={handleSubmitEvent}>
          You are logged in as {auth.user}
          <span style={{ marginLeft: "50px" }}></span>
          <button>Logout</button>
        </form>
      </div>
      <br />
      <br />
      <div>
        <a href="/map">Go to playdate map</a>
        <br />
        <br />
        <a href="/friends">Manage your friends</a>
      </div>
      <br />
      <Section title={`You support ${kids.length} kid(s)`}>
        <div>
          {kids.map((kid) => (
            <KidItem key={kid.id} kid={kid} />
          ))}
        </div>
      </Section>
      {agentInbox.length > 0 && (
        <>
          <br />
          <Section title="Agent inbox">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {agentInbox.map((item) => (
                <div key={item.id}>
                  <div style={{ fontWeight: 600 }}>{item.result.headline ?? "Friend recommendations"}</div>
                  <div style={{ fontSize: "0.9em", opacity: 0.8 }}>
                    {new Date(item.updatedAt).toLocaleString()}
                  </div>
                  {item.result.message && <div>{item.result.message}</div>}
                  {item.result.recommendations && item.result.recommendations.length > 0 && (
                    <ul style={{ marginLeft: "18px" }}>
                      {item.result.recommendations.map((rec) => (
                        <li key={`${item.id}-${rec.kidId}`}>
                          Match {rec.kidName} with {rec.matchName} &mdash; {rec.matchActivity} (score {rec.compatibilityScore})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
};
