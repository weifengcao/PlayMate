import { FC, FormEvent, useCallback, useState } from "react";
import styled from "@emotion/styled";
import { askForFriend } from "../api";
import { Section } from "./Section";
import { ErrorMessage } from "./ErrorMessage";
import { FormControl } from "./FormControl";

const FriendAskForm = styled.form({
  display: "flex",
  flexDirection: "column",
  gap: 16,
});

const FriendAskCopy = styled.p({
  margin: 0,
  color: "var(--color-text-muted)",
});

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
      <FriendAskCopy>
        Invite guardians you trust to coordinate future playdates together.
      </FriendAskCopy>
      <FriendAskForm onSubmit={handleSubmitEvent}>
        <FormControl>
          <label htmlFor="friendname">Name</label>
          <input type="text" id="friendname" name="friendname" placeholder="Jamie" />
        </FormControl>
        <button type="submit">Send invite</button>
      </FriendAskForm>
      {errorMsg && <ErrorMessage>Error: {errorMsg}</ErrorMessage>}
    </Section>
  );
};
