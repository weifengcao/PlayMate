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
      const form = e.currentTarget;
      const formData = new FormData(form);
      const friendname = (formData.get("friendname") ?? "").toString().trim();
      console.log("we will try to make friend with :", friendname);
      if (!friendname) {
        setErrorMsg("Please enter a name before submitting.");
        return;
      }
      try {
        await askForFriend(friendname);
        form.reset();
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
