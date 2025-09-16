import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/AuthProvider";
import { getMyDogs } from "../api";
import { Header } from "./Header";
import { DogItem } from "./DogItem";
import { Dog } from "../types";
import { Section } from "./Section";

export const Dashboard = () => {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const auth = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      const userDogs = await getMyDogs();
      console.log(userDogs);
      setDogs(userDogs);
      console.log("dogs are set");
    };
    try {
      fetchData();
    } catch (err) {
      console.log("failed to fetch dogs", err);
    }
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
        <a href="/worldmap">Go to worldmap</a>
        <br />
        <br />
        <a href="/friends">Manage your friends</a>
      </div>
      <br />
      <Section title={`You have ${dogs.length} dog(s)`}>
        <div>
          {dogs.map((dog) => (
            <DogItem key={dog.id} dog={dog} />
          ))}
        </div>
      </Section>
    </div>
  );
};