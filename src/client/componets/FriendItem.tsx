import { FC, useCallback } from "react";
import styled from "@emotion/styled";
import { setFriendState } from "../api";
import { Friend } from "../types";

const FriendCard = styled.article({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  background: "var(--color-surface-solid)",
  borderRadius: "var(--border-radius-sm)",
  padding: "16px 20px",
  boxShadow: "var(--shadow-soft)",
  border: "1px solid rgba(107, 91, 255, 0.08)",
});

const FriendName = styled.span({
  fontWeight: 600,
  color: "var(--color-text-primary)",
  fontSize: "1rem",
});

const ActionGroup = styled.div({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
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
    <FriendCard>
      <FriendName>{friend.name}</FriendName>
      <ActionGroup>
        {showButtons && (
          <>
            <button type="button" onClick={handleAcceptEvent}>
              Accept
            </button>
            <button type="button" onClick={handleIgnoreEvent}>
              Ignore
            </button>
          </>
        )}
        {allowDelete && (
          <button type="button" onClick={handleDeleteEvent}>
            Remove
          </button>
        )}
      </ActionGroup>
    </FriendCard>
  );
};
