import styled from "@emotion/styled";

export const FormControl = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  textAlign: "left",
  marginBottom: 16,
  width: "100%",

  "& label": {
    fontWeight: 600,
    color: "var(--color-text-muted)",
  },

  "& input, & select, & textarea": {
    width: "100%",
  },
});
