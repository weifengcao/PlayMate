import { FC, FormEvent, useCallback, useState } from "react";
import { askForFriend } from "../api";
import { Section } from "./Section";
import { ErrorMessage } from "./ErrorMessage";
import { FormControl } from "./FormControl";

interface FriendAskProps {
  onUpdate: () => void;
}

export const FriendAsk: FC<FriendAskProps> = ({ onUpdate }) => {
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmitEvent = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const friendname = e.target.friendname.value;
      console.log("we will try to make friend with :", friendname);
      try {
        await AskForFriend(friendname);
        setErrorMsg("");
        onUpdate();
      } catch (error: any) {
        setErrorMsg(error.message);
      }
    },
    [onUpdate]
  );

  return (
    <Section title="Make new friends">
      <form onSubmit={handleSubmitEvent}>
        <FormControl>
          <label htmlFor="friendname">Name:</label>
          <input type="text" id="friendname" name="friendname" />
        </FormControl>
        <button>Ask for friend</button>
      </form>
      {errorMsg && <ErrorMessage>Error: {errorMsg}</ErrorMessage>}
    </Section>
  );
};
