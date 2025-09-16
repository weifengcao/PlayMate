import { ChangeEvent, FormEvent, useCallback, useState } from "react";
import { useAuth } from "../hooks/AuthProvider";
import { LogoImage } from "./LogoImage";
import styled from "@emotion/styled";
import { Section } from "./Section";
import { FormControl } from "./FormControl";

const LoginSection = styled(Section)({
  textAlign: "center",
  width: 400,
  marginLeft: "20%",
});

const Subtext = styled.div({
  margin: 10,
  textAlign: "justify",
  fontStyle: "italic",
  fontSize: "0.85em",
});

export const H1 = styled.h1({
  textAlign: "center",
  paddingBottom: 10,
});

export const Login = () => {
  const [input, setInput] = useState({
    username: "",
    password: "",
  });

  const auth = useAuth();
  const handleSubmitEvent = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (input.username !== "" && input.password !== "") {
        console.log("we will try to log with :", input);
        console.log(auth);
        auth.loginAction(input);
        return;
      }
      alert("please provide a valid input");
    },
    [auth, input]
  );

  const handleInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInput((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  return (
    <>
      <H1>PlayMate</H1>
      <LogoImage />
      <LoginSection>
        <form onSubmit={handleSubmitEvent}>
          <FormControl>
            <label htmlFor="user-name">Name:</label>
            <input
              type="name"
              id="username"
              name="username"
              placeholder=""
              aria-describedby="user-name"
              aria-invalid="false"
              onChange={handleInput}
            />
          </FormControl>
          <FormControl>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              aria-describedby="user-password"
              aria-invalid="false"
              onChange={handleInput}
            />
          </FormControl>
          <button>Submit</button>
        </form>
      </LoginSection>
      <Subtext>
        PlayMate connects local families who want to coordinate fun playdates
        for their kids. Discover nearby guardians with similar schedules,
        match children by age and interests, and build a supportive community
        that makes planning playtime simple and enjoyable for everyone.
      </Subtext>
    </>
  );
};
