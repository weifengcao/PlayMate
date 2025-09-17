import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/AuthProvider";
import { getMyKids } from "../api";
import { Header } from "./Header";
import KidItem from "./KidItem";
import { Kid } from "../types";
import { Section } from "./Section";

export const Dashboard = () => {
  const [kids, setKids] = useState<Kid[]>([]);
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
    </div>
  );
};
