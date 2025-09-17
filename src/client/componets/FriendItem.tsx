import { FC, useCallback } from "react";
import { setFriendState } from "../api";
import { Friend } from "../types";
import styled from "@emotion/styled";

const FriendButton = styled.button({
  fontSize: "0.95em",
  padding: "4px 10px",
  margin: "3px 0 2px 30px",
});

interface FriendItemProps {
  friend: Friend;
  showButtons: boolean;
  onUpdate: () => void;
  allowDelete?: boolean;
  onDelete?: (friendId: number) => Promise<void>;
}

export const FriendItem: FC<FriendItemProps> = ({
  friend,
  showButtons,
  onUpdate,
  allowDelete = false,
  onDelete,
}) => {
  const handleAcceptEvent = useCallback(async () => {
    await setFriendState(friend.id, 1);
    onUpdate();
  }, [friend.id, onUpdate]);

  const handleIgnoreEvent = useCallback(async () => {
    await setFriendState(friend.id, 2);
    onUpdate();
  }, [friend.id, onUpdate]);

  const handleDeleteEvent = useCallback(async () => {
    if (!allowDelete || !onDelete) {
      return;
    }
    await onDelete(friend.id);
    onUpdate();
  }, [allowDelete, onDelete, friend.id, onUpdate]);

  return (
    <div>
      - {friend.name}
      {showButtons && (
        <>
          <FriendButton onClick={handleAcceptEvent}>Accept</FriendButton>
          <FriendButton onClick={handleIgnoreEvent}>Ignore</FriendButton>
        </>
      )}
      {allowDelete && (
        <FriendButton onClick={handleDeleteEvent}>Remove</FriendButton>
      )}
    </div>
  );
};
