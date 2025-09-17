import { ChangeEvent, CSSProperties, FC, FormEvent } from "react";

interface PlaydatePointProps {
  latitude: string;
  longitude: string;
  onChange: (value: { latitude?: string; longitude?: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  statusMessage?: string | null;
  errorMessage?: string | null;
}

const fieldWrapperStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const labelStyle: CSSProperties = {
  fontWeight: 600,
  marginBottom: "4px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  maxWidth: "220px",
  padding: "8px 12px",
  fontSize: "1rem",
  borderRadius: "8px",
  border: "1px solid #bbb",
};

const formStyle: CSSProperties = {
  backgroundColor: "#f8f5ff",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(63, 53, 93, 0.12)",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const buttonStyle: CSSProperties = {
  alignSelf: "flex-start",
  backgroundColor: "#5138ee",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "0.95rem",
};

export const PlaydatePoint: FC<PlaydatePointProps> = ({
  latitude,
  longitude,
  onChange,
  onSubmit,
  isSubmitting,
  statusMessage,
  errorMessage,
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === "playdate_latit") {
      onChange({ latitude: value });
    }
    if (name === "playdate_longi") {
      onChange({ longitude: value });
    }
  };

  return (
    <form style={formStyle} onSubmit={onSubmit}>
      <div style={fieldWrapperStyle}>
        <label htmlFor="playdate_latit" style={labelStyle}>
          Latitude
        </label>
        <input
          id="playdate_latit"
          name="playdate_latit"
          type="number"
          inputMode="decimal"
          step="any"
          value={latitude}
          onChange={handleChange}
          style={inputStyle}
          placeholder="e.g. 51.505"
        />
      </div>
      <div style={fieldWrapperStyle}>
        <label htmlFor="playdate_longi" style={labelStyle}>
          Longitude
        </label>
        <input
          id="playdate_longi"
          name="playdate_longi"
          type="number"
          inputMode="decimal"
          step="any"
          value={longitude}
          onChange={handleChange}
          style={inputStyle}
          placeholder="e.g. -0.09"
        />
      </div>
      <button type="submit" style={buttonStyle} disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Submit Location"}
      </button>
      {statusMessage && (
        <div style={{ color: "#1b8755", fontWeight: 600 }}>{statusMessage}</div>
      )}
      {errorMessage && (
        <div style={{ color: "#c62828", fontWeight: 600 }}>{errorMessage}</div>
      )}
    </form>
  );
};
